import type { PrivateRestoreState } from '../capsules/capsuleData'
import type { SharePackage } from './sharePackage'

export const CONSENT_CAPSULE_MAGIC = 'kinkatlas-consent-capsule' as const
export const CONSENT_CAPSULE_VERSION = 1 as const
export const SAVED_ASSESSMENT_MAGIC = 'kinkatlas-saved-assessment' as const
export const SAVED_ASSESSMENT_VERSION = 1 as const
export const SAVED_ASSESSMENT_BUNDLE_MAGIC = 'kinkatlas-saved-assessment-bundle' as const
export const SAVED_ASSESSMENT_BUNDLE_VERSION = 1 as const
export const HOSTED_BODY_MAX_BYTES = 384 * 1024
export const HOSTED_CIPHERTEXT_MAX_BYTES = 256 * 1024

export type HostedContentKind = 'quick-share' | 'consent-capsule' | 'saved-assessment'

export interface ConsentCapsuleEnvelope {
  magic: typeof CONSENT_CAPSULE_MAGIC
  consentCapsuleVersion: typeof CONSENT_CAPSULE_VERSION
  suite: 'ECDH-P256+HKDF-SHA-256+A256GCM'
  compression: 'gzip'
  recipientKeyId: string
  ephemeralPublicKey: string
  kdf: { algorithm: 'HKDF-SHA-256' }
  salt: string
  iv: string
  ciphertext: string
}

export interface SavedAssessmentEnvelope {
  magic: typeof SAVED_ASSESSMENT_MAGIC
  savedAssessmentVersion: typeof SAVED_ASSESSMENT_VERSION
  suite: 'A256GCM'
  compression: 'gzip'
  iv: string
  ciphertext: string
}

export interface SavedAssessmentBundle {
  magic: typeof SAVED_ASSESSMENT_BUNDLE_MAGIC
  savedAssessmentBundleVersion: typeof SAVED_ASSESSMENT_BUNDLE_VERSION
  restore: PrivateRestoreState
  sharePackage: SharePackage
}

const base64Url = /^[A-Za-z0-9_-]+$/u
const exact = (value: Record<string, unknown>, fields: readonly string[]) => Object.keys(value).length === fields.length
  && fields.every((field) => Object.hasOwn(value, field))
  && Object.keys(value).every((field) => field !== '__proto__' && field !== 'constructor' && field !== 'prototype')

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid hosted artifact')
  return value as Record<string, unknown>
}

function encoded(value: unknown, decodedBytes?: number): string {
  if (typeof value !== 'string' || !base64Url.test(value)) throw new Error('Invalid hosted artifact')
  if (decodedBytes !== undefined && Math.floor(value.length * 3 / 4) !== decodedBytes) throw new Error('Invalid hosted artifact')
  return value
}

export function validateConsentCapsuleEnvelope(value: unknown): asserts value is ConsentCapsuleEnvelope {
  const envelope = record(value)
  if (!exact(envelope, ['magic', 'consentCapsuleVersion', 'suite', 'compression', 'recipientKeyId', 'ephemeralPublicKey', 'kdf', 'salt', 'iv', 'ciphertext'])) throw new Error('Invalid hosted artifact')
  if (envelope.magic !== CONSENT_CAPSULE_MAGIC || envelope.consentCapsuleVersion !== CONSENT_CAPSULE_VERSION
    || envelope.suite !== 'ECDH-P256+HKDF-SHA-256+A256GCM' || envelope.compression !== 'gzip') throw new Error('Invalid hosted artifact')
  encoded(envelope.recipientKeyId, 16); encoded(envelope.ephemeralPublicKey, 65); encoded(envelope.salt, 16); encoded(envelope.iv, 12)
  const kdf = record(envelope.kdf)
  if (!exact(kdf, ['algorithm']) || kdf.algorithm !== 'HKDF-SHA-256') throw new Error('Invalid hosted artifact')
  const ciphertext = encoded(envelope.ciphertext)
  if (Math.floor(ciphertext.length * 3 / 4) < 16 || Math.floor(ciphertext.length * 3 / 4) > HOSTED_CIPHERTEXT_MAX_BYTES) throw new Error('Invalid hosted artifact')
}

export function validateSavedAssessmentEnvelope(value: unknown): asserts value is SavedAssessmentEnvelope {
  const envelope = record(value)
  if (!exact(envelope, ['magic', 'savedAssessmentVersion', 'suite', 'compression', 'iv', 'ciphertext'])) throw new Error('Invalid hosted artifact')
  if (envelope.magic !== SAVED_ASSESSMENT_MAGIC || envelope.savedAssessmentVersion !== SAVED_ASSESSMENT_VERSION
    || envelope.suite !== 'A256GCM' || envelope.compression !== 'gzip') throw new Error('Invalid hosted artifact')
  encoded(envelope.iv, 12)
  const ciphertext = encoded(envelope.ciphertext)
  if (Math.floor(ciphertext.length * 3 / 4) < 16 || Math.floor(ciphertext.length * 3 / 4) > HOSTED_CIPHERTEXT_MAX_BYTES) throw new Error('Invalid hosted artifact')
}
