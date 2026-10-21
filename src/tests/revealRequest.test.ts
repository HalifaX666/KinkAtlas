// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { CapsuleError } from '../capsules/capsuleError'
import { encodeBase64Url } from '../capsules/capsuleSchema'
import { buildRevealRequestDisclosure, revealRequestPrivacyReceipt } from '../capsules/revealRequestDecision'
import {
  createRevealRequest,
  parseRevealRequest,
  REVEAL_REQUEST_LIMITS,
  serializeRevealRequest,
  validateRevealRequest,
} from '../capsules/revealRequest'
import {
  createRevealRequestArtifact,
  parseRevealRequestInput,
  readRevealRequestFile,
} from '../capsules/revealRequestTransport'
import { REVEAL_REQUEST_SECTION_IDS } from '../capsules/capsuleTypes'
import { generateViewerRequestKeyPair } from '../capsules/viewerRequest'
import { createViewerLockedCapsule, openViewerLockedCapsule } from '../capsules/viewerLockedCodec'

async function fixture(sections: (typeof REVEAL_REQUEST_SECTION_IDS)[number][] = [...REVEAL_REQUEST_SECTION_IDS]) {
  const viewer = await generateViewerRequestKeyPair()
  return { viewer, request: await createRevealRequest(viewer.request, sections) }
}

describe('Reveal Request schema and transport', () => {
  it('creates random, canonical, recipient-bound requests from only the exact supported section enum', async () => {
    const viewer = await generateViewerRequestKeyPair()
    const first = await createRevealRequest(viewer.request, ['roleDefinitions', 'currentRoleSet'])
    const second = await createRevealRequest(viewer.request, ['currentRoleSet'])

    expect(first.requestId).toMatch(/^[A-Za-z0-9_-]{22}$/u)
    expect(first.requestId).not.toBe(second.requestId)
    expect(first.requestedSections).toEqual(['currentRoleSet', 'roleDefinitions'])
    expect(first.recipientViewerRequest).toEqual(viewer.request)
    expect(await parseRevealRequest(await serializeRevealRequest(first))).toEqual(first)
    const sameBodyWithFirstId = { ...(await createRevealRequest(viewer.request, ['currentRoleSet', 'roleDefinitions'])), requestId: first.requestId }
    expect(await serializeRevealRequest(sameBodyWithFirstId)).toBe(await serializeRevealRequest(first))
    expect(JSON.stringify(first)).not.toMatch(/privateKey|local label|answers|readiness|boundar|negotiation|restore|result/i)
    expect(REVEAL_REQUEST_SECTION_IDS).toEqual(['currentRoleSet', 'roleDefinitions'])
  })

  it('applies one strict canonical parser to text, fragment, link, and file transports', async () => {
    const { request } = await fixture()
    const artifact = await createRevealRequestArtifact(request, 'https://example.test')

    expect(artifact.link).toMatch(/^https:\/\/example\.test\/reveal-request#request=/u)
    expect(await parseRevealRequestInput(artifact.serializedRequest)).toEqual(request)
    expect(await parseRevealRequestInput(new URL(artifact.link).hash)).toEqual(request)
    expect(await parseRevealRequestInput(artifact.link)).toEqual(request)
    expect(await readRevealRequestFile(artifact.file)).toEqual(request)
    await expect(parseRevealRequestInput(artifact.link.replace('/reveal-request', '/viewer-request'))).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(parseRevealRequestInput(`${artifact.link.split('#')[0]}?request=x${new URL(artifact.link).hash}`)).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(parseRevealRequestInput('#request=%')).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(parseRevealRequestInput(`#other=${new URL(artifact.link).hash.slice('#request='.length)}`)).rejects.toMatchObject({ code: 'reveal-request-invalid' })
  })

  it('rejects unknown, duplicate, prototype, noncanonical, oversized, and malformed input without partial acceptance', async () => {
    const { request } = await fixture()
    const serialized = await serializeRevealRequest(request)
    const duplicate = serialized.replace(
      `"requestId":"${request.requestId}"`,
      `"requestId":"${request.requestId}","requestId":"${request.requestId}"`,
    )
    const polluted = { ...request } as Record<string, unknown>
    Object.defineProperty(polluted, '__proto__', { enumerable: true, value: true })

    await expect(parseRevealRequest(` ${serialized}`)).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(parseRevealRequest(`${serialized}x`)).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(parseRevealRequest(duplicate)).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(parseRevealRequest('x'.repeat(REVEAL_REQUEST_LIMITS.serializedBytes + 1))).rejects.toMatchObject({ code: 'oversized-input' })
    await expect(validateRevealRequest({ ...request, unexpected: true })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest(polluted)).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest({ ...request, magic: 'other' })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest({ ...request, revealRequestVersion: 2 })).rejects.toMatchObject({ code: 'unsupported-version' })
    const { magic: _magic, ...missingMagic } = request
    await expect(validateRevealRequest(missingMagic)).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest({ ...request, requestId: encodeBase64Url(new Uint8Array(15)) })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest({ ...request, requestedSections: [] })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest({ ...request, requestedSections: ['currentRoleSet', 'currentRoleSet'] })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest({ ...request, requestedSections: ['currentRoleSet', 'roleDefinitions', 'currentRoleSet'] })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest({ ...request, requestedSections: ['rawAnswers'] })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest({ ...request, requestedSections: ['CurrentRoleSet'] })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest({ ...request, requestedSections: ['currentRoleSet '] })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest({ ...request, requestedSections: ['roleDefinitions', 'currentRoleSet'] })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(validateRevealRequest({ ...request, recipientViewerRequest: { ...request.recipientViewerRequest, recipientPublicKey: 'invalid' } })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    const wrongCurve = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveBits'])
    const wrongCurvePublicKey = encodeBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', wrongCurve.publicKey)))
    await expect(validateRevealRequest({ ...request, recipientViewerRequest: { ...request.recipientViewerRequest, recipientPublicKey: wrongCurvePublicKey } })).rejects.toMatchObject({ code: 'reveal-request-invalid' })
    await expect(readRevealRequestFile(new File(['x'.repeat(4097)], 'large.kinkatlas-reveal-request'))).rejects.toMatchObject({ code: 'oversized-input' })
  })

  it('fails closed when randomness is unavailable', async () => {
    const viewer = await generateViewerRequestKeyPair()
    const originalCrypto = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { subtle: originalCrypto.subtle } })
    try {
      await expect(createRevealRequest(viewer.request, ['currentRoleSet'])).rejects.toEqual(new CapsuleError('unsupported-algorithm'))
    } finally {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto })
    }
  })
})

describe('Reveal Request sender decisions', () => {
  const roleSet = [{
    roleId: 'role:test-reveal',
    label: 'Test Reveal',
    definition: 'A synthetic role definition used only for Reveal Request tests.',
    source: 'user-selected' as const,
  }]

  it('builds a partial response only from the sender-selected subset and derives the receipt from the final manifest', async () => {
    const { request, viewer } = await fixture(['currentRoleSet', 'roleDefinitions'])
    const payload = buildRevealRequestDisclosure(roleSet, request, ['currentRoleSet'])
    const opened = await openViewerLockedCapsule(await createViewerLockedCapsule(payload, request.recipientViewerRequest), viewer.privateKey)
    const receipt = revealRequestPrivacyReceipt(request, payload)

    expect(payload.disclosureManifest.currentRoleSet).toBe(true)
    expect(payload.disclosureManifest.roleDefinitions).toBe(false)
    expect(payload.sections.currentRoleSet).toHaveLength(1)
    expect(payload.sections.roleDefinitions).toBeUndefined()
    expect(opened).toEqual(payload)
    expect(receipt.requested).toEqual(['Current Role Set', 'Role definitions'])
    expect(receipt.selected).toEqual(['Current Role Set'])
    expect(receipt.excluded).toContain('Role definitions')
    expect(JSON.stringify(payload.sections)).not.toMatch(/answers|navigation|restore|readiness|boundar|negotiation/i)
  })

  it('builds and decrypts a full response only after the sender explicitly selects both requested sections', async () => {
    const { request, viewer } = await fixture(['currentRoleSet', 'roleDefinitions'])
    const payload = buildRevealRequestDisclosure(roleSet, request, ['currentRoleSet', 'roleDefinitions'])
    const opened = await openViewerLockedCapsule(await createViewerLockedCapsule(payload, request.recipientViewerRequest), viewer.privateKey)
    const receipt = revealRequestPrivacyReceipt(request, opened)

    expect(opened.sections.currentRoleSet).toHaveLength(1)
    expect(opened.sections.roleDefinitions).toHaveLength(1)
    expect(receipt.requested).toEqual(['Current Role Set', 'Role definitions'])
    expect(receipt.selected).toEqual(['Current Role Set', 'Role definitions'])
    expect(receipt.excluded).toContain('Raw assessment answers')
    expect(receipt.excluded).toContain('Private restore state')
    expect(receipt.excluded).not.toContain('Current Role Set')
    expect(receipt.excluded).not.toContain('Role definitions')
    expect(Object.keys(opened.sections)).toEqual(['currentRoleSet', 'roleDefinitions'])
    expect(JSON.stringify(opened.sections)).not.toMatch(/answers|discovery|refinement|readiness|boundar|negotiation|navigation|restore/i)
  })

  it('does not allow a response builder to add an unrequested section', async () => {
    const { request } = await fixture(['currentRoleSet'])
    expect(() => buildRevealRequestDisclosure(roleSet, request, ['roleDefinitions'])).toThrow(/subset/u)
  })
})
