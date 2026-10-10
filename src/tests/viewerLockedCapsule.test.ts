// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { buildSharedDisclosurePayload } from '../capsules/capsuleData'
import { decodeBase64Url, encodeBase64Url, validateViewerLockedEnvelope } from '../capsules/capsuleSchema'
import type { ViewerLockedCapsuleEnvelope } from '../capsules/capsuleTypes'
import { createViewerLockedCapsule, deriveViewerContentKey, openViewerLockedCapsule, VIEWER_LOCKED_HKDF_INFO } from '../capsules/viewerLockedCodec'
import { createStoredViewerRequest, listStoredViewerRequests, viewerRequestStorageRecordFields } from '../capsules/viewerKeyStore'
import {
  deriveViewerKeyprint,
  fingerprintViewerPublicKey,
  generateViewerRequestKeyPair,
  importViewerPublicKey,
  parseViewerRequest,
  serializeViewerRequest,
  validateViewerRequest,
} from '../capsules/viewerRequest'

const payload = buildSharedDisclosurePayload([{
  roleId: 'role:test-viewer',
  label: 'Test Viewer',
  definition: 'A synthetic role definition for recipient-bound Capsule tests.',
  source: 'user-selected',
}])

function changedBytes(length: number, fill: number): string {
  return encodeBase64Url(new Uint8Array(length).fill(fill))
}

describe('Viewer Request cryptography and validation', () => {
  it('limits IndexedDB records to key material and minimal public metadata', async () => {
    expect(viewerRequestStorageRecordFields).toEqual(['requestId', 'createdAt', 'label', 'request', 'privateKey'])
    expect(viewerRequestStorageRecordFields.join(' ')).not.toMatch(/answer|result|boundary|readiness|negotiation|restore|secret|disclosure/i)
    await expect(listStoredViewerRequests()).rejects.toMatchObject({ code: 'key-storage-unavailable' })
    await expect(createStoredViewerRequest('x'.repeat(121))).rejects.toMatchObject({ code: 'viewer-request-invalid' })
  })

  it('creates random request-specific non-exportable keys and strictly round trips public requests', async () => {
    const first = await generateViewerRequestKeyPair()
    const second = await generateViewerRequestKeyPair()
    expect(first.privateKey.extractable).toBe(false)
    expect(first.privateKey.type).toBe('private')
    await expect(crypto.subtle.exportKey('pkcs8', first.privateKey)).rejects.toThrow()
    expect(first.request.requestId).toMatch(/^[A-Za-z0-9_-]{22}$/u)
    expect(first.request.requestId).not.toBe(second.request.requestId)
    expect(first.request.recipientPublicKey).not.toBe(second.request.recipientPublicKey)
    expect(await parseViewerRequest(await serializeViewerRequest(first.request))).toEqual(first.request)
    await expect(validateViewerRequest({ ...first.request, unexpected: true })).rejects.toMatchObject({ code: 'viewer-request-invalid' })
    await expect(validateViewerRequest({ ...first.request, magic: 'other' })).rejects.toMatchObject({ code: 'viewer-request-invalid' })
    await expect(validateViewerRequest({ ...first.request, viewerRequestVersion: 2 })).rejects.toMatchObject({ code: 'unsupported-version' })
    await expect(validateViewerRequest({ ...first.request, suite: 'ECDH-P384+HKDF-SHA-256+A256GCM' })).rejects.toMatchObject({ code: 'unsupported-algorithm' })
    await expect(validateViewerRequest({ ...first.request, requestId: changedBytes(17, 1) })).rejects.toMatchObject({ code: 'viewer-request-invalid' })
    const pollutedRequest = { ...first.request } as Record<string, unknown>
    Object.defineProperty(pollutedRequest, '__proto__', { value: true, enumerable: true })
    await expect(validateViewerRequest(pollutedRequest)).rejects.toMatchObject({ code: 'viewer-request-invalid' })
  })

  it('rejects malformed and wrong-curve public keys', async () => {
    const generated = await generateViewerRequestKeyPair()
    await expect(validateViewerRequest({ ...generated.request, recipientPublicKey: changedBytes(64, 1) })).rejects.toMatchObject({ code: 'viewer-request-invalid' })
    const invalidPoint = new Uint8Array(65).fill(1)
    invalidPoint[0] = 0x04
    await expect(validateViewerRequest({ ...generated.request, recipientPublicKey: encodeBase64Url(invalidPoint) })).rejects.toMatchObject({ code: 'viewer-request-invalid' })
    const p384 = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveBits'])
    const p384Raw = new Uint8Array(await crypto.subtle.exportKey('raw', p384.publicKey))
    await expect(validateViewerRequest({ ...generated.request, recipientPublicKey: encodeBase64Url(p384Raw) })).rejects.toMatchObject({ code: 'viewer-request-invalid' })
  })

  it('derives deterministic versioned Keyprints and detects key changes', async () => {
    const first = await generateViewerRequestKeyPair()
    const second = await generateViewerRequestKeyPair()
    const firstRaw = decodeBase64Url(first.request.recipientPublicKey)
    const secondRaw = decodeBase64Url(second.request.recipientPublicKey)
    expect(await deriveViewerKeyprint(firstRaw)).toEqual(first.request.keyprint)
    expect(await deriveViewerKeyprint(firstRaw)).not.toEqual(await deriveViewerKeyprint(secondRaw))
    expect(await fingerprintViewerPublicKey(firstRaw, 1)).not.toEqual(await fingerprintViewerPublicKey(firstRaw, 2))
    expect(first.request.keyprint.short).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{3}$/u)
    expect(first.request.keyprint.checksum).toMatch(/^\d{2}$/u)
    expect(first.request.keyprint.fingerprint).toMatch(/^[0-9A-F]{64}$/u)
  })

  it('agrees on ECDH/HKDF keys and separates changed HKDF info domains', async () => {
    const first = await generateViewerRequestKeyPair()
    const second = await generateViewerRequestKeyPair()
    const firstPublic = await importViewerPublicKey(first.request.recipientPublicKey)
    const secondPublic = await importViewerPublicKey(second.request.recipientPublicKey)
    const salt = new Uint8Array(16).fill(7)
    const senderKey = await deriveViewerContentKey(first.privateKey, secondPublic, salt, ['encrypt'])
    const recipientKey = await deriveViewerContentKey(second.privateKey, firstPublic, salt, ['decrypt'])
    const iv = new Uint8Array(12).fill(9)
    const plaintext = new TextEncoder().encode('domain-separated viewer capsule')
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, senderKey, plaintext)
    expect(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, recipientKey, encrypted))).toBe('domain-separated viewer capsule')

    const changedInfoKey = await deriveViewerContentKey(
      second.privateKey,
      firstPublic,
      salt,
      ['decrypt'],
      new TextEncoder().encode(`${VIEWER_LOCKED_HKDF_INFO} changed`),
    )
    await expect(crypto.subtle.decrypt({ name: 'AES-GCM', iv }, changedInfoKey, encrypted)).rejects.toThrow()
  })
})

describe('Viewer-Locked Capsule cryptography', () => {
  it('uses fresh ephemeral keys, salts, IVs, and ciphertext while round-tripping the same disclosure', async () => {
    const recipient = await generateViewerRequestKeyPair()
    const first = await createViewerLockedCapsule(payload, recipient.request)
    const second = await createViewerLockedCapsule(payload, recipient.request)
    expect(first.ephemeralPublicKey).not.toBe(second.ephemeralPublicKey)
    expect(first.salt).not.toBe(second.salt)
    expect(first.iv).not.toBe(second.iv)
    expect(first.ciphertext).not.toBe(second.ciphertext)
    expect(await openViewerLockedCapsule(first, recipient.privateKey)).toEqual(payload)
  })

  it('rejects the wrong recipient private key', async () => {
    const intended = await generateViewerRequestKeyPair()
    const wrong = await generateViewerRequestKeyPair()
    const envelope = await createViewerLockedCapsule(payload, intended.request)
    await expect(openViewerLockedCapsule(envelope, wrong.privateKey)).rejects.toMatchObject({ code: 'authentication-failed' })
  })

  it('authenticates meaning-critical metadata as AAD', async () => {
    const recipient = await generateViewerRequestKeyPair()
    const replacementKey = await generateViewerRequestKeyPair()
    const envelope = await createViewerLockedCapsule(payload, recipient.request)
    const meaningfulTampering: ViewerLockedCapsuleEnvelope[] = [
      { ...envelope, recipientKeyId: changedBytes(16, 2) },
      { ...envelope, ephemeralPublicKey: replacementKey.request.recipientPublicKey },
      { ...envelope, salt: changedBytes(16, 3) },
      { ...envelope, iv: changedBytes(12, 4) },
      { ...envelope, compression: envelope.compression === 'gzip' ? 'none' : 'gzip' },
    ]
    for (const tampered of meaningfulTampering) {
      await expect(openViewerLockedCapsule(tampered, recipient.privateKey)).rejects.toMatchObject({ code: 'authentication-failed' })
    }
    expect(() => validateViewerLockedEnvelope({ ...envelope, kdf: { algorithm: 'HKDF-SHA-1' } })).toThrowError(expect.objectContaining({ code: 'unsupported-algorithm' }))
    expect(() => validateViewerLockedEnvelope({ ...envelope, magic: 'other' })).toThrowError(expect.objectContaining({ code: 'malformed-envelope' }))
    expect(() => validateViewerLockedEnvelope({ ...envelope, envelopeVersion: 99 })).toThrowError(expect.objectContaining({ code: 'unsupported-version' }))
  })

  it('rejects truncated public keys, unknown fields, and unsupported suites', async () => {
    const recipient = await generateViewerRequestKeyPair()
    const envelope = await createViewerLockedCapsule(payload, recipient.request)
    expect(() => validateViewerLockedEnvelope({ ...envelope, ephemeralPublicKey: changedBytes(64, 1) })).toThrowError(expect.objectContaining({ code: 'malformed-envelope' }))
    expect(() => validateViewerLockedEnvelope({ ...envelope, hidden: true })).toThrowError(expect.objectContaining({ code: 'malformed-envelope' }))
    const pollutedEnvelope = { ...envelope } as Record<string, unknown>
    Object.defineProperty(pollutedEnvelope, '__proto__', { value: true, enumerable: true })
    expect(() => validateViewerLockedEnvelope(pollutedEnvelope)).toThrowError(expect.objectContaining({ code: 'malformed-envelope' }))
    expect(() => validateViewerLockedEnvelope({ ...envelope, suite: 'ECDH-P384+HKDF-SHA-256+A256GCM' })).toThrowError(expect.objectContaining({ code: 'unsupported-algorithm' }))
  })
})
