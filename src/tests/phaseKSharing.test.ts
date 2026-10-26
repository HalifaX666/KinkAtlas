// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildPrivateRestoreState, buildResultSnapshot } from '../capsules/capsuleData'
import { encodeBase64Url } from '../capsules/capsuleSchema'
import { generateViewerRequestKeyPair } from '../capsules/viewerRequest'
import { createConsentCapsule } from '../sharing/consentCapsule'
import {
  SAVED_ASSESSMENT_BUNDLE_MAGIC,
  SAVED_ASSESSMENT_BUNDLE_VERSION,
  type SavedAssessmentBundle,
} from '../sharing/hostedContracts'
import { decryptSavedAssessment, encryptSavedAssessment } from '../sharing/localVault'
import { createHostedContent } from '../sharing/hostedStorage'
import { buildSharePackage, parseSharePackage, serializeSharePackage } from '../sharing/sharePackage'
import { assessmentPersonas } from './fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from './helpers/assessmentPersonaRunner'

const persona = assessmentPersonas.find(({ id }) => id === 'balanced-authority-pattern')!
const evaluation = evaluateAssessmentPersona(persona)
const snapshot = buildResultSnapshot(persona.answers, evaluation.yourRoleSet)
const sharePackage = buildSharePackage(snapshot, evaluation.yourRoleSet, evaluation.roleResults, '2026-10-23T12:00:00.000Z')

afterEach(() => vi.unstubAllGlobals())

function allKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => allKeys(item, keys))
  else if (typeof value === 'object' && value !== null) Object.entries(value).forEach(([key, item]) => { keys.add(key); allKeys(item, keys) })
  return keys
}

describe('Phase K historical SharePackage', () => {
  it('preserves exact Current Role Set order and immutable card presentation data', () => {
    expect(sharePackage.cards.map(({ roleId }) => roleId)).toEqual(evaluation.yourRoleSet.map(({ roleId }) => roleId))
    expect(sharePackage.result.currentRoleSet.map(({ roleId }) => roleId)).toEqual(evaluation.yourRoleSet.map(({ roleId }) => roleId))
    expect(sharePackage.cards).toEqual(evaluation.exportRoles.map((card) => ({
      roleId: card.roleId,
      label: card.label,
      familyLabel: card.familyLabel,
      summary: card.summary ?? '',
      attributes: card.attributes.map(({ label, value }) => ({ label, value })),
      emblem: card.emblem,
      sourceLabel: card.sourceLabel,
      assessmentDetails: card.assessmentDetails,
    })))
    expect(parseSharePackage(serializeSharePackage(sharePackage))).toEqual(sharePackage)
  })

  it('excludes every raw answer map and restore/navigation field recursively', () => {
    const keys = allKeys(sharePackage)
    expect([...keys]).not.toEqual(expect.arrayContaining([
      'answers', 'discovery', 'refinement', 'negotiation', 'navigation', 'completionRequested',
      'discoveryHistory', 'refinementHistory', 'resultSnapshot', 'restore', 'privateKey', 'vaultKey',
      'sourceQuestionIds', 'response',
    ]))
    expect(serializeSharePackage(sharePackage)).not.toContain('d-power-give')
    expect(sharePackage.manifest.rawAnswers).toBe(false)
  })

  it('rejects unknown fields and card/result mismatches', () => {
    expect(() => parseSharePackage(JSON.stringify({ ...sharePackage, unexpected: true }))).toThrow(/Invalid KinkAtlas share package/)
    const mismatched = structuredClone(sharePackage)
    mismatched.cards[0].roleId = 'role:not-the-historical-card'
    expect(() => parseSharePackage(JSON.stringify(mismatched))).toThrow(/Invalid KinkAtlas share package/)
  })
})

describe('Phase K client encryption', () => {
  const restore = buildPrivateRestoreState({
    answers: persona.answers,
    navigation: { phase: 'negotiation', discoveryHistory: [], discoveryCursor: null, refinementHistory: [], refinementCursor: null, readinessIndex: 0, negotiationIndex: 0 },
    currentRoleSet: evaluation.yourRoleSet,
    historicalResultSnapshot: snapshot,
    completionRequested: true,
  })
  const bundle: SavedAssessmentBundle = {
    magic: SAVED_ASSESSMENT_BUNDLE_MAGIC,
    savedAssessmentBundleVersion: SAVED_ASSESSMENT_BUNDLE_VERSION,
    restore,
    sharePackage,
  }

  it('round trips a full saved assessment with a non-exportable AES-256-GCM key', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    const envelope = await encryptSavedAssessment(bundle, key)
    const second = await encryptSavedAssessment(bundle, key)
    expect(key.extractable).toBe(false)
    expect(envelope.suite).toBe('A256GCM')
    expect(envelope.iv).not.toBe(second.iv)
    expect(envelope.ciphertext).not.toBe(second.ciphertext)
    expect(JSON.stringify(envelope)).not.toContain('d-power-give')
    expect(await decryptSavedAssessment(envelope, key)).toEqual(bundle)
    const tampered = { ...envelope, ciphertext: `${envelope.ciphertext.slice(0, -1)}${envelope.ciphertext.endsWith('A') ? 'B' : 'A'}` }
    await expect(decryptSavedAssessment(tampered, key)).rejects.toThrow(/could not be decrypted/u)
  })

  it('creates recipient-bound ConsentCapsule ciphertext without plaintext result content', async () => {
    const recipient = await generateViewerRequestKeyPair()
    const envelope = await createConsentCapsule(sharePackage, recipient.request)
    const second = await createConsentCapsule(sharePackage, recipient.request)
    expect(envelope.recipientKeyId).toBe(recipient.request.requestId)
    expect(envelope.suite).toBe('ECDH-P256+HKDF-SHA-256+A256GCM')
    expect(envelope.ephemeralPublicKey).not.toBe(second.ephemeralPublicKey)
    expect(envelope.salt).not.toBe(second.salt)
    expect(envelope.iv).not.toBe(second.iv)
    expect(JSON.stringify(envelope)).not.toContain(sharePackage.cards[0].label)
    expect(JSON.stringify(envelope)).not.toContain('d-power-give')
  })
})

describe('Phase K hosted storage client', () => {
  it('keeps the delete capability local and sends the matching SHA-256 verifier', async () => {
    const id = 'AAAAAAAAAAAAAAAAAAAAAA'
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { deleteTokenHash: string }
      return new Response(JSON.stringify({ id, createdAt: '2026-10-23T12:00:00.000Z', verifier: body.deleteTokenHash }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const created = await createHostedContent('quick-share', sharePackage)
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { deleteTokenHash: string; payload: unknown }
    const expected = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(created.deleteToken)))

    expect(created.id).toBe(id)
    expect(requestBody.deleteTokenHash).toBe(encodeBase64Url(expected))
    expect(requestBody).not.toHaveProperty('deleteToken')
    expect(requestBody.payload).toEqual(sharePackage)
  })
})
