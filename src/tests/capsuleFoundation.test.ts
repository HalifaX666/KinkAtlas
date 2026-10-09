// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  createSecretCapsule,
  decodeSecretCapsule,
  openSecretCapsule,
  parseCapsuleEnvelope,
  parseCapsulePayload,
  serializeCapsuleEnvelope,
  serializeCapsulePayload,
} from '../capsules/capsuleCodec'
import { compressCapsuleBytes, decompressCapsuleBytes } from '../capsules/capsuleCompression'
import { CapsuleError } from '../capsules/capsuleError'
import {
  CAPSULE_LIMITS,
  decodeBase64Url,
  encodeBase64Url,
  createCurrentPayloadContext,
  validateCapsulePayload,
  validateSecretEnvelope,
} from '../capsules/capsuleSchema'
import {
  CAPSULE_ENVELOPE_VERSION,
  CAPSULE_MAGIC,
  SECRET_CAPSULE_KDF,
  SECRET_CAPSULE_SUITE,
  SHARED_DISCLOSURE_DEFAULTS,
  type PrivateRestorePayload,
  type SecretCapsuleEnvelope,
  type SharedDisclosurePayload,
} from '../capsules/capsuleTypes'

const testSecret = 'synthetic-capsule-secret-2026'
const testIterations = CAPSULE_LIMITS.pbkdf2IterationsMin
const encoder = new TextEncoder()

function sharedPayload(): SharedDisclosurePayload {
  return {
    payloadType: 'shared-disclosure',
    ...createCurrentPayloadContext(),
    disclosureManifest: { ...SHARED_DISCLOSURE_DEFAULTS },
    sections: {
      currentRoleSet: [
        { roleId: 'role:synthetic-one', label: 'Synthetic One', primary: true },
        { roleId: 'role:synthetic-two', label: 'Synthetic Two', primary: false },
      ],
      roleDefinitions: [
        { roleId: 'role:synthetic-one', definition: 'A synthetic definition used only for validation.' },
        { roleId: 'role:synthetic-two', definition: 'Another synthetic definition used only for validation.' },
      ],
    },
  }
}

function restorePayload(): PrivateRestorePayload {
  return {
    payloadType: 'private-restore',
    ...createCurrentPayloadContext(),
    restore: {
      fixture: 'synthetic-only',
      nested: { values: [1, true, null, 'text'] },
    },
  }
}

function expectCapsuleError(action: () => unknown, code: CapsuleError['code']): void {
  try {
    action()
    throw new Error('Expected a CapsuleError.')
  } catch (error) {
    expect(error).toBeInstanceOf(CapsuleError)
    expect((error as CapsuleError).code).toBe(code)
  }
}

async function expectAsyncCapsuleError(action: () => Promise<unknown>, code: CapsuleError['code']): Promise<void> {
  try {
    await action()
    throw new Error('Expected a CapsuleError.')
  } catch (error) {
    expect(error).toBeInstanceOf(CapsuleError)
    expect((error as CapsuleError).code).toBe(code)
  }
}

function cloneEnvelope(envelope: SecretCapsuleEnvelope): SecretCapsuleEnvelope {
  return structuredClone(envelope)
}

describe('Capsule schema and deterministic serialization', () => {
  it('encodes the locked shared-disclosure defaults without a raw-answer section', () => {
    expect(SHARED_DISCLOSURE_DEFAULTS).toEqual({
      currentRoleSet: true,
      roleDefinitions: true,
      roleProvenance: false,
      alignment: false,
      confidence: false,
      evidenceBreadth: false,
      suggestedRoleSet: false,
      roleDiscovery: false,
      communicationProfile: false,
      negotiationPreferences: false,
      readiness: false,
      blindSpots: false,
      criticalFlags: false,
      boundaries: false,
      assessmentEvidence: false,
    })
    expect(SHARED_DISCLOSURE_DEFAULTS).not.toHaveProperty('rawAnswers')
  })

  it('has a fixed canonical plaintext vector independent of object insertion order', () => {
    const payload = sharedPayload()
    const reordered = {
      sections: payload.sections,
      roleLibraryRevision: payload.roleLibraryRevision,
      payloadType: payload.payloadType,
      disclosureManifest: payload.disclosureManifest,
      assessmentSchemaVersion: payload.assessmentSchemaVersion,
      roleLibrarySchemaVersion: payload.roleLibrarySchemaVersion,
      engineRevision: payload.engineRevision,
      payloadVersion: payload.payloadVersion,
    } as SharedDisclosurePayload
    const serialized = serializeCapsulePayload(payload)
    expect(serializeCapsulePayload(reordered)).toBe(serialized)
    expect(serialized).not.toMatch(/timestamp|createdAt|updatedAt/i)
    expect(serialized).toBe('{"assessmentSchemaVersion":1,"disclosureManifest":{"alignment":false,"assessmentEvidence":false,"blindSpots":false,"boundaries":false,"communicationProfile":false,"confidence":false,"criticalFlags":false,"currentRoleSet":true,"evidenceBreadth":false,"negotiationPreferences":false,"readiness":false,"roleDefinitions":true,"roleDiscovery":false,"roleProvenance":false,"suggestedRoleSet":false},"engineRevision":"kinkatlas-assessment-engine-1","payloadType":"shared-disclosure","payloadVersion":1,"roleLibraryRevision":"sha256:28e0dcf6d531573d6b8d60e72046006016515e542695bef4ffcbd71ae2f9e712","roleLibrarySchemaVersion":2,"sections":{"currentRoleSet":[{"label":"Synthetic One","primary":true,"roleId":"role:synthetic-one"},{"label":"Synthetic Two","primary":false,"roleId":"role:synthetic-two"}],"roleDefinitions":[{"definition":"A synthetic definition used only for validation.","roleId":"role:synthetic-one"},{"definition":"Another synthetic definition used only for validation.","roleId":"role:synthetic-two"}]}}')
    expect(parseCapsulePayload(encoder.encode(serialized))).toEqual(payload)
  })

  it('preserves Unicode predictably without locale-sensitive ordering or normalization', () => {
    const payload = restorePayload()
    payload.restore = { zulu: 'Élan 🧭', alpha: 'e\u0301lan' }
    const serialized = serializeCapsulePayload(payload)
    expect(serialized).toContain('"alpha":"élan","zulu":"Élan 🧭"')
    expect(serializeCapsulePayload(structuredClone(payload))).toBe(serialized)
  })

  it('keeps shared disclosure and private restore payloads structurally distinct', () => {
    expect(parseCapsulePayload(encoder.encode(serializeCapsulePayload(restorePayload())))).toEqual(restorePayload())
    expectCapsuleError(
      () => validateCapsulePayload({ ...sharedPayload(), payloadType: 'private-restore' }),
      'payload-validation-failed',
    )
  })

  it('rejects unsupported payload versions, unknown fields, raw answers, excessive role sets, and excessive nesting', () => {
    expectCapsuleError(() => validateCapsulePayload({ ...sharedPayload(), payloadVersion: 2 }), 'unsupported-version')
    expectCapsuleError(() => validateCapsulePayload({ ...sharedPayload(), unknown: true }), 'payload-validation-failed')

    const rawAnswers = sharedPayload() as unknown as Record<string, unknown>
    rawAnswers.sections = {
      ...(rawAnswers.sections as Record<string, unknown>),
      currentRoleSet: [{ roleId: 'role:test', label: 'Test', primary: true, rawAnswers: ['prohibited'] }],
    }
    expectCapsuleError(() => validateCapsulePayload(rawAnswers), 'payload-validation-failed')

    const tooManyRoles = sharedPayload()
    tooManyRoles.sections.currentRoleSet = Array.from({ length: 6 }, (_, index) => ({
      roleId: `role:synthetic-${index}`,
      label: `Synthetic ${index}`,
      primary: index === 0,
    }))
    expectCapsuleError(() => validateCapsulePayload(tooManyRoles), 'payload-validation-failed')

    let nested: Record<string, unknown> = {}
    const restore = nested
    for (let index = 0; index <= CAPSULE_LIMITS.jsonDepth; index += 1) {
      nested.next = {}
      nested = nested.next as Record<string, unknown>
    }
    expectCapsuleError(() => validateCapsulePayload({ ...restorePayload(), restore }), 'payload-validation-failed')
  })

  it('rejects prototype-pollution keys, excessive strings and collections, and invalid numbers', () => {
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      const pollutedPayload = serializeCapsulePayload(restorePayload()).replace(
        '"fixture":"synthetic-only"',
        `${JSON.stringify(key)}:{"polluted":true},"fixture":"synthetic-only"`,
      )
      expectCapsuleError(() => parseCapsulePayload(encoder.encode(pollutedPayload)), 'payload-validation-failed')
    }
    expectCapsuleError(
      () => validateCapsulePayload({ ...restorePayload(), restore: { text: 'x'.repeat(CAPSULE_LIMITS.userVisibleStringBytes + 1) } }),
      'payload-validation-failed',
    )
    expectCapsuleError(
      () => validateCapsulePayload({
        ...restorePayload(),
        restore: { items: Array.from({ length: CAPSULE_LIMITS.collectionItems + 1 }, () => null) },
      }),
      'payload-validation-failed',
    )
    expectCapsuleError(
      () => validateCapsulePayload({ ...restorePayload(), restore: { value: Number.POSITIVE_INFINITY } }),
      'payload-validation-failed',
    )
    expectCapsuleError(
      () => validateCapsulePayload({ ...restorePayload(), restore: { value: Number.MAX_SAFE_INTEGER + 1 } }),
      'payload-validation-failed',
    )
  })

  it('rejects truncated payload JSON and reserved disclosure sections that do not yet have v1 schemas', () => {
    const serialized = serializeCapsulePayload(sharedPayload())
    expectCapsuleError(() => parseCapsulePayload(encoder.encode(serialized.slice(0, -1))), 'payload-validation-failed')
    const unsupportedSection = sharedPayload()
    unsupportedSection.disclosureManifest.alignment = true
    unsupportedSection.sections.alignment = { display: 'synthetic' }
    expectCapsuleError(() => validateCapsulePayload(unsupportedSection), 'payload-validation-failed')
  })
})

describe('Capsule compression', () => {
  it.each(['gzip', 'none'] as const)('round trips %s data', async (compression) => {
    const input = encoder.encode('Synthetic compression content. '.repeat(20))
    const compressed = await compressCapsuleBytes(input, compression)
    expect(await decompressCapsuleBytes(compressed, compression, input.byteLength)).toEqual(input)
  })

  it('fails closed for corrupted gzip and bounded decompression output', async () => {
    await expectAsyncCapsuleError(
      () => decompressCapsuleBytes(Uint8Array.from([1, 2, 3, 4]), 'gzip', 1024),
      'compression-failed',
    )
    const compressed = await compressCapsuleBytes(encoder.encode('x'.repeat(4096)), 'gzip')
    await expectAsyncCapsuleError(() => decompressCapsuleBytes(compressed, 'gzip', 128), 'oversized-input')
  })
})

describe('Secret Capsule encryption', () => {
  it.each(['gzip', 'none'] as const)('encrypts and decrypts a %s Capsule', async (compression) => {
    const payload = compression === 'gzip' ? sharedPayload() : restorePayload()
    const envelope = await createSecretCapsule(payload, testSecret, { compression, iterations: testIterations })
    expect(await openSecretCapsule(envelope, testSecret)).toEqual(payload)
    const serialized = serializeCapsuleEnvelope(envelope, 'file')
    expect(await decodeSecretCapsule(serialized, testSecret, 'file')).toEqual(payload)
  })

  it('uses bounded, versioned KDF metadata and exact cryptographic field sizes', async () => {
    expect(CAPSULE_LIMITS.pbkdf2IterationsDefault).toBe(600_000)
    const envelope = await createSecretCapsule(sharedPayload(), testSecret, { compression: 'none' })
    expect(envelope).toMatchObject({
      magic: CAPSULE_MAGIC,
      envelopeVersion: CAPSULE_ENVELOPE_VERSION,
      mode: 'secret',
      suite: SECRET_CAPSULE_SUITE,
      kdf: { algorithm: SECRET_CAPSULE_KDF, iterations: CAPSULE_LIMITS.pbkdf2IterationsDefault },
    })
    expect(decodeBase64Url(envelope.salt)).toHaveLength(CAPSULE_LIMITS.saltBytes)
    expect(decodeBase64Url(envelope.iv)).toHaveLength(CAPSULE_LIMITS.ivBytes)
  })

  it('fails authentication with a wrong secret or modified ciphertext', async () => {
    const envelope = await createSecretCapsule(sharedPayload(), testSecret, { iterations: testIterations })
    await expectAsyncCapsuleError(() => openSecretCapsule(envelope, 'different-synthetic-secret'), 'authentication-failed')
    const changed = cloneEnvelope(envelope)
    const ciphertext = decodeBase64Url(changed.ciphertext)
    ciphertext[0] ^= 1
    changed.ciphertext = encodeBase64Url(ciphertext)
    await expectAsyncCapsuleError(() => openSecretCapsule(changed, testSecret), 'authentication-failed')

    const truncated = cloneEnvelope(envelope)
    truncated.ciphertext = encodeBase64Url(decodeBase64Url(truncated.ciphertext).slice(0, -1))
    await expectAsyncCapsuleError(() => openSecretCapsule(truncated, testSecret), 'authentication-failed')
  })

  it('authenticates IV, salt, compression, and KDF metadata as AAD-sensitive operational fields', async () => {
    const envelope = await createSecretCapsule(sharedPayload(), testSecret, { iterations: testIterations })
    const variants: SecretCapsuleEnvelope[] = []
    for (const field of ['iv', 'salt'] as const) {
      const changed = cloneEnvelope(envelope)
      const bytes = decodeBase64Url(changed[field])
      bytes[0] ^= 1
      changed[field] = encodeBase64Url(bytes)
      variants.push(changed)
    }
    const compression = cloneEnvelope(envelope)
    compression.compression = 'none'
    variants.push(compression)
    const iterations = cloneEnvelope(envelope)
    iterations.kdf.iterations += 1
    variants.push(iterations)
    for (const changed of variants) {
      await expectAsyncCapsuleError(() => openSecretCapsule(changed, testSecret), 'authentication-failed')
    }
  })

  it('uses unique random salt, IV, and ciphertext for identical plaintext', async () => {
    const first = await createSecretCapsule(sharedPayload(), testSecret, { iterations: testIterations })
    const second = await createSecretCapsule(sharedPayload(), testSecret, { iterations: testIterations })
    expect(second.salt).not.toBe(first.salt)
    expect(second.iv).not.toBe(first.iv)
    expect(second.ciphertext).not.toBe(first.ciphertext)
  })
})

describe('hostile envelope handling', () => {
  it('rejects malformed, truncated, oversized, and unknown envelope input', async () => {
    expectCapsuleError(() => parseCapsuleEnvelope('{'), 'malformed-envelope')
    expectCapsuleError(() => parseCapsuleEnvelope('x'.repeat(CAPSULE_LIMITS.fragmentBytes + 1)), 'oversized-input')

    const envelope = await createSecretCapsule(sharedPayload(), testSecret, { iterations: testIterations })
    expectCapsuleError(() => parseCapsuleEnvelope(`${serializeCapsuleEnvelope(envelope).slice(0, -2)}`), 'malformed-envelope')
    expectCapsuleError(() => validateSecretEnvelope({ ...envelope, envelopeVersion: 2 }), 'unsupported-version')
    expectCapsuleError(() => validateSecretEnvelope({ ...envelope, suite: 'unknown' }), 'unsupported-algorithm')
    expectCapsuleError(() => validateSecretEnvelope({ ...envelope, recipientKeyId: 'future-field' }), 'malformed-envelope')
    expectCapsuleError(() => validateSecretEnvelope({ ...envelope, iv: '***' }), 'malformed-envelope')
  })

  it('rejects oversized ciphertext and extreme PBKDF2 work factors before crypto', async () => {
    const envelope = await createSecretCapsule(sharedPayload(), testSecret, { iterations: testIterations })
    expectCapsuleError(
      () => validateSecretEnvelope({
        ...envelope,
        ciphertext: encodeBase64Url(new Uint8Array(CAPSULE_LIMITS.ciphertextBytes + 1)),
      }),
      'oversized-input',
    )
    expectCapsuleError(
      () => validateSecretEnvelope({
        ...envelope,
        kdf: { ...envelope.kdf, iterations: CAPSULE_LIMITS.pbkdf2IterationsMax + 1 },
      }),
      'malformed-envelope',
    )
    expectCapsuleError(
      () => validateSecretEnvelope({
        ...envelope,
        kdf: { ...envelope.kdf, iterations: CAPSULE_LIMITS.pbkdf2IterationsMin - 1 },
      }),
      'malformed-envelope',
    )
    expect(() => validateSecretEnvelope({
      ...envelope,
      kdf: { ...envelope.kdf, iterations: CAPSULE_LIMITS.pbkdf2IterationsMax },
    })).not.toThrow()
    expectCapsuleError(
      () => validateSecretEnvelope({ ...envelope, salt: encodeBase64Url(new Uint8Array(15)) }),
      'malformed-envelope',
    )
  })
})
