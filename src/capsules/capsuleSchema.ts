import { CapsuleError } from './capsuleError'
import {
  CAPSULE_ENVELOPE_VERSION,
  CAPSULE_MAGIC,
  CAPSULE_PAYLOAD_VERSION,
  DISCLOSURE_SECTION_IDS,
  SECRET_CAPSULE_KDF,
  SECRET_CAPSULE_SUITE,
  type CapsuleEnvelopeTransport,
  type CapsuleJsonValue,
  type CapsulePayload,
  type DisclosureManifest,
  type DisclosureSectionId,
  type SecretCapsuleEnvelope,
  type SharedDisclosurePayload,
} from './capsuleTypes'
import {
  ASSESSMENT_ENGINE_REVISION,
  ASSESSMENT_SCHEMA_VERSION,
  ROLE_LIBRARY_REVISION,
  ROLE_LIBRARY_SCHEMA_VERSION,
} from './capsuleVersions'

export const CAPSULE_LIMITS = Object.freeze({
  fragmentBytes: 16 * 1024,
  fileBytes: 256 * 1024,
  ciphertextBytes: 128 * 1024,
  sharedDecompressedBytes: 128 * 1024,
  restoreDecompressedBytes: 256 * 1024,
  jsonDepth: 12,
  collectionItems: 256,
  objectFields: 256,
  currentRoleSetItems: 5,
  roleDefinitionItems: 5,
  userVisibleStringBytes: 4 * 1024,
  objectKeyBytes: 256,
  saltBytes: 16,
  ivBytes: 12,
  authenticationTagBytes: 16,
  secretBytesMin: 16,
  secretBytesMax: 1024,
  pbkdf2IterationsMin: 100_000,
  pbkdf2IterationsDefault: 600_000,
  pbkdf2IterationsMax: 1_000_000,
})

const textEncoder = new TextEncoder()
const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype'])
const payloadContextKeys = [
  'payloadType',
  'payloadVersion',
  'assessmentSchemaVersion',
  'engineRevision',
  'roleLibrarySchemaVersion',
  'roleLibraryRevision',
] as const
const disclosureSectionSet = new Set<string>(DISCLOSURE_SECTION_IDS)
const implementedDisclosureSections = new Set<DisclosureSectionId>(['currentRoleSet', 'roleDefinitions'])

function fail(code: ConstructorParameters<typeof CapsuleError>[0]): never {
  throw new CapsuleError(code)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireRecord(value: unknown, code: ConstructorParameters<typeof CapsuleError>[0]): Record<string, unknown> {
  if (!isRecord(value)) fail(code)
  return value
}

function requireExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  code: ConstructorParameters<typeof CapsuleError>[0],
): void {
  const allowed = new Set([...required, ...optional])
  if (Object.keys(value).some((key) => dangerousKeys.has(key) || !allowed.has(key))) fail(code)
  if (required.some((key) => !Object.hasOwn(value, key))) fail(code)
}

function requireBoundedString(value: unknown, code: ConstructorParameters<typeof CapsuleError>[0]): string {
  if (typeof value !== 'string' || textEncoder.encode(value).byteLength > CAPSULE_LIMITS.userVisibleStringBytes) fail(code)
  return value
}

function requireNonEmptyBoundedString(value: unknown, code: ConstructorParameters<typeof CapsuleError>[0]): string {
  const text = requireBoundedString(value, code)
  if (text.length === 0) fail(code)
  return text
}

function validateJsonValue(value: unknown, depth = 0, sharedDisclosure = false): asserts value is CapsuleJsonValue {
  if (depth > CAPSULE_LIMITS.jsonDepth) fail('payload-validation-failed')
  if (value === null || typeof value === 'boolean') return
  if (typeof value === 'string') {
    requireBoundedString(value, 'payload-validation-failed')
    return
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) fail('payload-validation-failed')
    return
  }
  if (Array.isArray(value)) {
    if (value.length > CAPSULE_LIMITS.collectionItems) fail('payload-validation-failed')
    value.forEach((item) => validateJsonValue(item, depth + 1, sharedDisclosure))
    return
  }
  if (!isRecord(value)) fail('payload-validation-failed')
  const entries = Object.entries(value)
  if (entries.length > CAPSULE_LIMITS.objectFields) fail('payload-validation-failed')
  for (const [key, child] of entries) {
    if (dangerousKeys.has(key) || textEncoder.encode(key).byteLength > CAPSULE_LIMITS.objectKeyBytes) {
      fail('payload-validation-failed')
    }
    if (sharedDisclosure && /(?:^|[-_])(?:raw)?answers?$/i.test(key)) fail('payload-validation-failed')
    validateJsonValue(child, depth + 1, sharedDisclosure)
  }
}

export function canonicalJsonFromValidatedValue(value: CapsuleJsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJsonFromValidatedValue(item)).join(',')}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJsonFromValidatedValue(value[key])}`).join(',')}}`
}

export function canonicalJson(value: CapsuleJsonValue): string {
  validateJsonValue(value)
  return canonicalJsonFromValidatedValue(value)
}

function validatePayloadContext(value: Record<string, unknown>): void {
  if (value.payloadVersion !== CAPSULE_PAYLOAD_VERSION) fail('unsupported-version')
  if (value.assessmentSchemaVersion !== ASSESSMENT_SCHEMA_VERSION) fail('unsupported-version')
  if (value.roleLibrarySchemaVersion !== ROLE_LIBRARY_SCHEMA_VERSION) fail('unsupported-version')
  requireNonEmptyBoundedString(value.engineRevision, 'payload-validation-failed')
  requireNonEmptyBoundedString(value.roleLibraryRevision, 'payload-validation-failed')
}

function validateDisclosureManifest(value: unknown): asserts value is DisclosureManifest {
  const manifest = requireRecord(value, 'payload-validation-failed')
  requireExactKeys(manifest, DISCLOSURE_SECTION_IDS, [], 'payload-validation-failed')
  for (const section of DISCLOSURE_SECTION_IDS) {
    if (typeof manifest[section] !== 'boolean') fail('payload-validation-failed')
  }
}

function validateCurrentRoleSet(value: unknown): void {
  if (!Array.isArray(value) || value.length > CAPSULE_LIMITS.currentRoleSetItems) fail('payload-validation-failed')
  let primaryCount = 0
  const roleIds = new Set<string>()
  value.forEach((item) => {
    const role = requireRecord(item, 'payload-validation-failed')
    requireExactKeys(role, ['roleId', 'label', 'primary'], [], 'payload-validation-failed')
    const roleId = requireNonEmptyBoundedString(role.roleId, 'payload-validation-failed')
    requireNonEmptyBoundedString(role.label, 'payload-validation-failed')
    if (typeof role.primary !== 'boolean' || roleIds.has(roleId)) fail('payload-validation-failed')
    roleIds.add(roleId)
    if (role.primary) primaryCount += 1
  })
  if (primaryCount > 1) fail('payload-validation-failed')
}

function validateRoleDefinitions(value: unknown): void {
  if (!Array.isArray(value) || value.length > CAPSULE_LIMITS.roleDefinitionItems) fail('payload-validation-failed')
  const roleIds = new Set<string>()
  value.forEach((item) => {
    const role = requireRecord(item, 'payload-validation-failed')
    requireExactKeys(role, ['roleId', 'definition'], [], 'payload-validation-failed')
    const roleId = requireNonEmptyBoundedString(role.roleId, 'payload-validation-failed')
    requireNonEmptyBoundedString(role.definition, 'payload-validation-failed')
    if (roleIds.has(roleId)) fail('payload-validation-failed')
    roleIds.add(roleId)
  })
}

function validateSharedDisclosure(value: Record<string, unknown>): void {
  requireExactKeys(value, [...payloadContextKeys, 'disclosureManifest', 'sections'], [], 'payload-validation-failed')
  validatePayloadContext(value)
  validateDisclosureManifest(value.disclosureManifest)
  for (const section of DISCLOSURE_SECTION_IDS) {
    if (value.disclosureManifest[section] && !implementedDisclosureSections.has(section)) {
      fail('payload-validation-failed')
    }
  }
  const sections = requireRecord(value.sections, 'payload-validation-failed')
  if (Object.keys(sections).length > DISCLOSURE_SECTION_IDS.length) fail('payload-validation-failed')
  for (const [section, content] of Object.entries(sections)) {
    if (!disclosureSectionSet.has(section)
      || !implementedDisclosureSections.has(section as DisclosureSectionId)
      || !value.disclosureManifest[section as DisclosureSectionId]) {
      fail('payload-validation-failed')
    }
    validateJsonValue(content, 1, true)
    if (section === 'currentRoleSet') validateCurrentRoleSet(content)
    if (section === 'roleDefinitions') validateRoleDefinitions(content)
  }
  for (const section of DISCLOSURE_SECTION_IDS) {
    if (value.disclosureManifest[section] !== Object.hasOwn(sections, section)) fail('payload-validation-failed')
  }
}

export function validateCapsulePayload(value: unknown): asserts value is CapsulePayload {
  const payload = requireRecord(value, 'payload-validation-failed')
  if (payload.payloadType !== 'shared-disclosure' && payload.payloadType !== 'private-restore') {
    fail('payload-validation-failed')
  }
  if (payload.payloadType === 'shared-disclosure') {
    validateSharedDisclosure(payload)
    return
  }
  requireExactKeys(payload, [...payloadContextKeys, 'restore'], [], 'payload-validation-failed')
  validatePayloadContext(payload)
  const restore = requireRecord(payload.restore, 'payload-validation-failed')
  validateJsonValue(restore)
}

function decodeBase64UrlUnchecked(value: string): Uint8Array {
  const standard = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = standard.padEnd(standard.length + (4 - standard.length % 4) % 4, '=')
  try {
    const binary = atob(padded)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    fail('malformed-envelope')
  }
}

export function encodeBase64Url(value: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < value.length; index += chunkSize) {
    binary += String.fromCharCode(...value.subarray(index, index + chunkSize))
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

export function decodeBase64Url(value: unknown): Uint8Array {
  if (typeof value !== 'string' || value.length === 0 || !/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1) {
    fail('malformed-envelope')
  }
  const decoded = decodeBase64UrlUnchecked(value)
  if (encodeBase64Url(decoded) !== value) fail('malformed-envelope')
  return decoded
}

export function validateSecretEnvelope(value: unknown): SecretCapsuleEnvelope {
  const envelope = requireRecord(value, 'malformed-envelope')
  requireExactKeys(
    envelope,
    ['magic', 'envelopeVersion', 'mode', 'suite', 'compression', 'kdf', 'salt', 'iv', 'ciphertext'],
    [],
    'malformed-envelope',
  )
  if (envelope.magic !== CAPSULE_MAGIC) fail('malformed-envelope')
  if (envelope.envelopeVersion !== CAPSULE_ENVELOPE_VERSION) fail('unsupported-version')
  if (envelope.mode !== 'secret' || envelope.suite !== SECRET_CAPSULE_SUITE) fail('unsupported-algorithm')
  if (envelope.compression !== 'gzip' && envelope.compression !== 'none') fail('unsupported-algorithm')
  const kdf = requireRecord(envelope.kdf, 'malformed-envelope')
  requireExactKeys(kdf, ['algorithm', 'iterations'], [], 'malformed-envelope')
  if (kdf.algorithm !== SECRET_CAPSULE_KDF) fail('unsupported-algorithm')
  if (!Number.isSafeInteger(kdf.iterations)
    || (kdf.iterations as number) < CAPSULE_LIMITS.pbkdf2IterationsMin
    || (kdf.iterations as number) > CAPSULE_LIMITS.pbkdf2IterationsMax) {
    fail('malformed-envelope')
  }
  const salt = decodeBase64Url(envelope.salt)
  const iv = decodeBase64Url(envelope.iv)
  const ciphertext = decodeBase64Url(envelope.ciphertext)
  if (salt.byteLength !== CAPSULE_LIMITS.saltBytes || iv.byteLength !== CAPSULE_LIMITS.ivBytes) fail('malformed-envelope')
  if (ciphertext.byteLength < CAPSULE_LIMITS.authenticationTagBytes) fail('malformed-envelope')
  if (ciphertext.byteLength > CAPSULE_LIMITS.ciphertextBytes) fail('oversized-input')
  return envelope as unknown as SecretCapsuleEnvelope
}

export function transportByteLimit(transport: CapsuleEnvelopeTransport): number {
  return transport === 'fragment' ? CAPSULE_LIMITS.fragmentBytes : CAPSULE_LIMITS.fileBytes
}

export function createCurrentPayloadContext() {
  return {
    payloadVersion: CAPSULE_PAYLOAD_VERSION,
    assessmentSchemaVersion: ASSESSMENT_SCHEMA_VERSION,
    engineRevision: ASSESSMENT_ENGINE_REVISION,
    roleLibrarySchemaVersion: ROLE_LIBRARY_SCHEMA_VERSION,
    roleLibraryRevision: ROLE_LIBRARY_REVISION,
  } as const
}

export function isSharedDisclosurePayload(payload: CapsulePayload): payload is SharedDisclosurePayload {
  return payload.payloadType === 'shared-disclosure'
}
