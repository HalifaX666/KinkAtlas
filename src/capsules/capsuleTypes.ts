export const CAPSULE_MAGIC = 'kinkatlas-capsule' as const
export const CAPSULE_ENVELOPE_VERSION = 1 as const
export const CAPSULE_PAYLOAD_VERSION = 1 as const

export const SECRET_CAPSULE_SUITE = 'PBKDF2-HMAC-SHA-256+A256GCM' as const
export const SECRET_CAPSULE_KDF = 'PBKDF2-HMAC-SHA-256' as const
export const VIEWER_REQUEST_MAGIC = 'kinkatlas-viewer-request' as const
export const VIEWER_REQUEST_VERSION = 1 as const
export const VIEWER_KEYPRINT_VERSION = 1 as const
export const VIEWER_LOCKED_SUITE = 'ECDH-P256+HKDF-SHA-256+A256GCM' as const
export const VIEWER_LOCKED_KDF = 'HKDF-SHA-256' as const

export const DISCLOSURE_SECTION_IDS = [
  'currentRoleSet',
  'roleDefinitions',
  'roleProvenance',
  'alignment',
  'confidence',
  'evidenceBreadth',
  'suggestedRoleSet',
  'roleDiscovery',
  'communicationProfile',
  'negotiationPreferences',
  'readiness',
  'blindSpots',
  'criticalFlags',
  'boundaries',
  'assessmentEvidence',
] as const

export type DisclosureSectionId = (typeof DISCLOSURE_SECTION_IDS)[number]
export type DisclosureManifest = Record<DisclosureSectionId, boolean>

export const SHARED_DISCLOSURE_DEFAULTS: Readonly<DisclosureManifest> = Object.freeze({
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

export type CapsuleJsonPrimitive = null | boolean | number | string
export type CapsuleJsonValue = CapsuleJsonPrimitive | CapsuleJsonValue[] | { [key: string]: CapsuleJsonValue }
export type CapsuleJsonObject = { [key: string]: CapsuleJsonValue }

export type SharedRoleReference = CapsuleJsonObject & {
  roleId: string
  label: string
  primary: boolean
}

export type SharedRoleDefinition = CapsuleJsonObject & {
  roleId: string
  definition: string
}

export type SharedDisclosureSections = Partial<Record<DisclosureSectionId, CapsuleJsonValue>> & {
  currentRoleSet?: SharedRoleReference[]
  roleDefinitions?: SharedRoleDefinition[]
}

interface CapsulePayloadContext {
  payloadVersion: typeof CAPSULE_PAYLOAD_VERSION
  assessmentSchemaVersion: number
  engineRevision: string
  roleLibrarySchemaVersion: number
  roleLibraryRevision: string
}

export interface SharedDisclosurePayload extends CapsulePayloadContext {
  payloadType: 'shared-disclosure'
  disclosureManifest: DisclosureManifest
  sections: SharedDisclosureSections
}

export interface PrivateRestorePayload extends CapsulePayloadContext {
  payloadType: 'private-restore'
  restore: CapsuleJsonObject
}

export type CapsulePayload = SharedDisclosurePayload | PrivateRestorePayload
export type CapsuleCompression = 'gzip' | 'none'

export interface SecretCapsuleEnvelope {
  magic: typeof CAPSULE_MAGIC
  envelopeVersion: typeof CAPSULE_ENVELOPE_VERSION
  mode: 'secret'
  suite: typeof SECRET_CAPSULE_SUITE
  compression: CapsuleCompression
  kdf: {
    algorithm: typeof SECRET_CAPSULE_KDF
    iterations: number
  }
  salt: string
  iv: string
  ciphertext: string
}

export interface ViewerKeyprint {
  version: typeof VIEWER_KEYPRINT_VERSION
  short: string
  checksum: string
  fingerprint: string
}

export interface ViewerRequest {
  magic: typeof VIEWER_REQUEST_MAGIC
  viewerRequestVersion: typeof VIEWER_REQUEST_VERSION
  requestId: string
  suite: typeof VIEWER_LOCKED_SUITE
  recipientPublicKey: string
  keyprint: ViewerKeyprint
}

export interface ViewerLockedCapsuleEnvelope {
  magic: typeof CAPSULE_MAGIC
  envelopeVersion: typeof CAPSULE_ENVELOPE_VERSION
  mode: 'viewer-locked'
  suite: typeof VIEWER_LOCKED_SUITE
  compression: CapsuleCompression
  recipientKeyId: string
  ephemeralPublicKey: string
  kdf: {
    algorithm: typeof VIEWER_LOCKED_KDF
  }
  salt: string
  iv: string
  ciphertext: string
}

export type CapsuleEnvelope = SecretCapsuleEnvelope | ViewerLockedCapsuleEnvelope

export type CapsuleEnvelopeTransport = 'fragment' | 'file'
