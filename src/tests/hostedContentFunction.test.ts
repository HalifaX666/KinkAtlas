// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildResultSnapshot } from '../capsules/capsuleData'
import { encodeBase64Url } from '../capsules/capsuleSchema'
import { HOSTED_BODY_MAX_BYTES, type ConsentCapsuleEnvelope, type SavedAssessmentEnvelope } from '../sharing/hostedContracts'
import { buildSharePackage } from '../sharing/sharePackage'
import { createHostedContent, deleteHostedContent, getHostedContent } from '../sharing/hostedStorage'
import { assessmentPersonas } from './fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from './helpers/assessmentPersonaRunner'

const namespaces = vi.hoisted(() => new Map<string, Map<string, unknown>>())

vi.mock('@netlify/blobs', () => ({
  getStore: (name: string) => {
    const entries = namespaces.get(name) ?? new Map<string, unknown>()
    namespaces.set(name, entries)
    return {
      setJSON: vi.fn(async (id: string, value: unknown, options: { onlyIfNew?: boolean }) => {
        if (options.onlyIfNew && entries.has(id)) return { modified: false }
        entries.set(id, structuredClone(value))
        return { modified: true }
      }),
      get: vi.fn(async (id: string) => structuredClone(entries.get(id) ?? null)),
      delete: vi.fn(async (id: string) => { entries.delete(id) }),
    }
  },
}))

import handler from '../../netlify/functions/hosted-content.mjs'

const origin = 'https://kinkatlas.example'
const endpoint = `${origin}/.netlify/functions/hosted-content`
const persona = assessmentPersonas[0]
const evaluation = evaluateAssessmentPersona(persona)
const sharePackage = buildSharePackage(buildResultSnapshot(persona.answers, evaluation.yourRoleSet), evaluation.yourRoleSet, evaluation.roleResults)
const b64 = (size: number, fill: number) => encodeBase64Url(new Uint8Array(size).fill(fill))
const consentEnvelope: ConsentCapsuleEnvelope = {
  magic: 'kinkatlas-consent-capsule', consentCapsuleVersion: 1,
  suite: 'ECDH-P256+HKDF-SHA-256+A256GCM', compression: 'gzip', recipientKeyId: b64(16, 1),
  ephemeralPublicKey: b64(65, 2), kdf: { algorithm: 'HKDF-SHA-256' }, salt: b64(16, 3), iv: b64(12, 4), ciphertext: b64(32, 5),
}
const savedEnvelope: SavedAssessmentEnvelope = {
  magic: 'kinkatlas-saved-assessment', savedAssessmentVersion: 1, suite: 'A256GCM', compression: 'gzip', iv: b64(12, 6), ciphertext: b64(32, 7),
}

async function create(kind: string, payload: unknown, hash = b64(32, 9)) {
  return handler(new Request(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ kind, payload, deleteTokenHash: hash }) }))
}

beforeEach(() => namespaces.clear())
afterEach(() => vi.unstubAllGlobals())

describe('Phase K hosted content Netlify Function', () => {
  it.each([
    ['quick-share', sharePackage, 'kinkatlas-quick-shares'],
    ['consent-capsule', consentEnvelope, 'kinkatlas-consent-capsules'],
    ['saved-assessment', savedEnvelope, 'kinkatlas-saved-assessments'],
  ] as const)('strictly creates and fetches %s in its separate namespace', async (kind, payload, namespace) => {
    const created = await create(kind, payload)
    expect(created.status).toBe(201)
    const { id } = await created.json() as { id: string }
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/u)
    expect(namespaces.get(namespace)?.size).toBe(1)
    const fetched = await handler(new Request(`${endpoint}?kind=${kind}&id=${id}`))
    expect(fetched.status).toBe(200)
    await expect(fetched.json()).resolves.toEqual(expect.objectContaining({ kind, payload }))
  })

  it('requires the separate delete capability and makes a deleted share unavailable', async () => {
    const token = b64(32, 11)
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))
    const created = await create('quick-share', sharePackage, encodeBase64Url(digest))
    const { id } = await created.json() as { id: string }
    const target = `${endpoint}?kind=quick-share&id=${id}`
    expect((await handler(new Request(target, { method: 'DELETE' }))).status).toBe(403)
    expect((await handler(new Request(target, { method: 'DELETE', headers: { origin, 'x-kinkatlas-delete-token': b64(32, 12) } }))).status).toBe(403)
    expect((await handler(new Request(target, { method: 'DELETE', headers: { origin, 'x-kinkatlas-delete-token': token } }))).status).toBe(204)
    expect((await handler(new Request(target))).status).toBe(404)
  })

  it.each([
    ['quick-share', sharePackage],
    ['consent-capsule', consentEnvelope],
    ['saved-assessment', savedEnvelope],
  ] as const)('uses one client/server delete-capability representation for %s', async (kind, payload) => {
    const requests: Request[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(new URL(String(input), origin), init)
      requests.push(request.clone())
      return handler(request)
    }))

    const created = await createHostedContent(kind, payload)
    const createBody = await requests[0].json() as Record<string, unknown>
    expect(createBody).not.toHaveProperty('deleteToken')
    expect(createBody.deleteTokenHash).toMatch(/^[A-Za-z0-9_-]{43}$/u)
    await expect(deleteHostedContent(kind, created.id, b64(32, 12))).rejects.toThrow(/could not be deleted/u)
    await expect(getHostedContent(kind, created.id)).resolves.toEqual(payload)
    await expect(deleteHostedContent(kind, created.id, created.deleteToken)).resolves.toBeUndefined()
    await expect(getHostedContent(kind, created.id)).rejects.toThrow(/unavailable/u)
  })

  it('rejects malformed requests without creating objects', async () => {
    expect((await handler(new Request(endpoint, { method: 'PUT' }))).status).toBe(405)
    expect((await handler(new Request(endpoint, { method: 'POST', headers: { origin }, body: '{}' }))).status).toBe(415)
    expect((await handler(new Request(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'quick-share', payload: sharePackage, deleteTokenHash: b64(32, 1), extra: true }) }))).status).toBe(400)
    expect((await handler(new Request(`${endpoint}?kind=quick-share&id=predictable`))).status).toBe(400)
    expect((await handler(new Request(`${endpoint}?kind=quick-share&id=${b64(16, 1)}&list=true`))).status).toBe(400)
    expect((await handler(new Request(`${endpoint}?kind=quick-share&id=${b64(16, 1)}`))).status).toBe(404)
    expect((await handler(new Request(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json', 'content-length': String(HOSTED_BODY_MAX_BYTES + 1) }, body: '{}' }))).status).toBe(413)
    expect([...namespaces.values()].every((entries) => entries.size === 0)).toBe(true)
  })

  it('stores only ciphertext envelopes for private shares and saved assessments', async () => {
    await create('consent-capsule', consentEnvelope)
    await create('saved-assessment', savedEnvelope)
    const stored = JSON.stringify([...namespaces.values()].flatMap((entries) => [...entries.values()]))
    expect(stored).toContain('ciphertext')
    expect(stored).not.toContain('answers')
    expect(stored).not.toContain(sharePackage.cards[0].label)
    expect((await create('saved-assessment', { ...savedEnvelope, answers: persona.answers })).status).toBe(400)
  })

  it('rejects malformed, oversized, or plaintext-augmented encrypted envelopes', async () => {
    expect((await create('consent-capsule', { ...consentEnvelope, result: sharePackage })).status).toBe(400)
    expect((await create('consent-capsule', { ...consentEnvelope, ephemeralPublicKey: b64(64, 2) })).status).toBe(400)
    expect((await create('consent-capsule', { ...consentEnvelope, ciphertext: b64(256 * 1024 + 1, 5) })).status).toBe(400)
    expect((await create('saved-assessment', { ...savedEnvelope, restore: { answers: persona.answers } })).status).toBe(400)
    expect((await create('saved-assessment', { ...savedEnvelope, ciphertext: b64(256 * 1024 + 1, 7) })).status).toBe(400)
  })
})
