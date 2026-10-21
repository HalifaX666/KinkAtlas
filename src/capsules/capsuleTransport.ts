import { createSecretCapsule, decodeSecretCapsule, parseCapsuleEnvelope, serializeCapsuleEnvelope } from './capsuleCodec'
import { CapsuleError, type CapsuleErrorCode } from './capsuleError'
import { CAPSULE_LIMITS, decodeBase64Url, encodeBase64Url } from './capsuleSchema'
import type { CapsuleEnvelopeTransport, CapsulePayload, SharedDisclosurePayload } from './capsuleTypes'
import { privateRestorePayload, validatePrivateRestoreState, type PrivateRestoreState } from './capsuleData'

export const PRIVATE_RESTORE_EXTENSION = '.kinkatlas-restore'
export const PRIVATE_RESTORE_MIME = 'application/vnd.kinkatlas.restore'
export const SHARED_CAPSULE_EXTENSION = '.kinkatlas-capsule'
export const SHARED_CAPSULE_MIME = 'application/vnd.kinkatlas.capsule'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

export interface EncryptedCapsuleArtifact {
  secret: string
  serializedEnvelope: string
  file: File
}

export interface SharedCapsuleArtifact extends EncryptedCapsuleArtifact {
  fragment: string
  link: string
}

export function generateCapsuleSecret(): string {
  if (!globalThis.crypto?.getRandomValues) throw new CapsuleError('unsupported-algorithm')
  const random = globalThis.crypto.getRandomValues(new Uint8Array(32))
  const encoded = encodeBase64Url(random)
  return `KA1-${encoded.match(/.{1,6}/gu)?.join('.') ?? encoded}`
}

function artifactFile(serializedEnvelope: string, name: string, type: string): File {
  return new File([serializedEnvelope], name, { type })
}

export async function createPrivateRestoreArtifact(state: PrivateRestoreState): Promise<EncryptedCapsuleArtifact> {
  validatePrivateRestoreState(state)
  const secret = generateCapsuleSecret()
  const envelope = await createSecretCapsule(privateRestorePayload(state), secret, { compression: 'gzip' })
  const serializedEnvelope = serializeCapsuleEnvelope(envelope, 'file')
  return {
    secret,
    serializedEnvelope,
    file: artifactFile(serializedEnvelope, `kinkatlas-private-restore${PRIVATE_RESTORE_EXTENSION}`, PRIVATE_RESTORE_MIME),
  }
}

export async function createSharedDisclosureArtifact(
  payload: SharedDisclosurePayload,
  origin = globalThis.location?.origin ?? 'https://kinkatlas.ca',
): Promise<SharedCapsuleArtifact> {
  const secret = generateCapsuleSecret()
  const envelope = await createSecretCapsule(payload, secret, { compression: 'gzip' })
  const serializedEnvelope = serializeCapsuleEnvelope(envelope, 'fragment')
  const encodedEnvelope = encodeBase64Url(encoder.encode(serializedEnvelope))
  const fragment = `#capsule=${encodedEnvelope}`
  if (encoder.encode(fragment).byteLength > CAPSULE_LIMITS.fragmentBytes) throw new CapsuleError('oversized-input')
  return {
    secret,
    serializedEnvelope,
    fragment,
    link: `${origin.replace(/\/$/u, '')}/capsule${fragment}`,
    file: artifactFile(serializedEnvelope, `kinkatlas-shared-disclosure${SHARED_CAPSULE_EXTENSION}`, SHARED_CAPSULE_MIME),
  }
}

export function parseSharedCapsuleFragment(hash: string): string {
  if (encoder.encode(hash).byteLength > CAPSULE_LIMITS.fragmentBytes) throw new CapsuleError('oversized-input')
  const match = /^#capsule=([A-Za-z0-9_-]+)$/u.exec(hash)
  if (!match) throw new CapsuleError('malformed-envelope')
  let serialized: string
  try {
    serialized = decoder.decode(decodeBase64Url(match[1]))
  } catch (error) {
    if (error instanceof CapsuleError) throw error
    throw new CapsuleError('malformed-envelope')
  }
  // The shared parser validates the complete canonical envelope before a caller removes the fragment.
  parseCapsuleEnvelope(serialized, 'fragment')
  return serialized
}

export async function readCapsuleFile(file: File): Promise<string> {
  if (file.size > CAPSULE_LIMITS.fileBytes) throw new CapsuleError('oversized-input')
  const serialized = await file.text()
  // The shared parser validates the complete canonical envelope before the secret is requested or used.
  parseCapsuleEnvelope(serialized, 'file')
  return serialized
}

export async function decryptPrivateRestore(serializedEnvelope: string, secret: string): Promise<PrivateRestoreState> {
  const payload = await decodeSecretCapsule(serializedEnvelope, secret, 'file')
  if (payload.payloadType !== 'private-restore') throw new CapsuleError('payload-validation-failed')
  validatePrivateRestoreState(payload.restore)
  return payload.restore
}

export async function decryptSharedDisclosure(
  serializedEnvelope: string,
  secret: string,
  transport: CapsuleEnvelopeTransport = 'fragment',
): Promise<SharedDisclosurePayload> {
  const payload: CapsulePayload = await decodeSecretCapsule(serializedEnvelope, secret, transport)
  if (payload.payloadType !== 'shared-disclosure') throw new CapsuleError('payload-validation-failed')
  return payload
}

export function capsuleErrorMessage(error: unknown): string {
  const code: CapsuleErrorCode | undefined = error instanceof CapsuleError ? error.code : undefined
  if (code === 'authentication-failed' || code === 'invalid-secret') return 'This Capsule could not be unlocked. Check the secret and try again.'
  if (code === 'missing-recipient-key') return 'This Capsule is locked to a Viewer Request that is not available in this browser profile.'
  if (code === 'key-storage-unavailable') return 'Local Viewer Request key storage is unavailable in this browser context.'
  if (code === 'viewer-request-invalid') return 'This Viewer Request appears incomplete or invalid.'
  if (code === 'unsupported-version' || code === 'unsupported-algorithm') return 'This Capsule was created by a KinkAtlas version this browser cannot open.'
  if (code === 'oversized-input') return 'This Capsule exceeds KinkAtlas safety limits.'
  if (code === 'malformed-envelope' || code === 'compression-failed' || code === 'payload-validation-failed') return 'This Capsule appears incomplete or damaged.'
  return 'This Capsule could not be opened.'
}

export function viewerRequestErrorMessage(error: unknown): string {
  const code: CapsuleErrorCode | undefined = error instanceof CapsuleError ? error.code : undefined
  if (code === 'unsupported-version') return 'This Viewer Request was created by a KinkAtlas version this browser cannot use.'
  if (code === 'unsupported-algorithm') return 'This Viewer Request uses a protection format this browser cannot use.'
  if (code === 'oversized-input') return 'This Viewer Request exceeds KinkAtlas safety limits.'
  if (code === 'viewer-request-invalid' || code === 'malformed-envelope') return 'This Viewer Request appears incomplete or invalid. Check the complete link, text, or file and try again.'
  return capsuleErrorMessage(error)
}

export function revealRequestErrorMessage(error: unknown): string {
  const code: CapsuleErrorCode | undefined = error instanceof CapsuleError ? error.code : undefined
  if (code === 'unsupported-version') return 'This Reveal Request was created by a KinkAtlas version this browser cannot use.'
  if (code === 'unsupported-algorithm') return 'This Reveal Request has an invalid or unsupported recipient binding.'
  if (code === 'oversized-input') return 'This Reveal Request exceeds KinkAtlas safety limits.'
  if (code === 'reveal-request-invalid' || code === 'viewer-request-invalid' || code === 'malformed-envelope') {
    return 'This Reveal Request appears incomplete or invalid. Check the complete link, text, or file and try again.'
  }
  return 'This Reveal Request could not be opened.'
}

export function downloadCapsuleFile(file: File): void {
  let url = ''
  let anchor: HTMLAnchorElement | null = null
  try {
    if (!URL.createObjectURL || !URL.revokeObjectURL) throw new Error('Object URL unavailable')
    url = URL.createObjectURL(file)
    anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    document.body.append(anchor)
    anchor.click()
  } catch {
    throw new Error('Download unavailable')
  } finally {
    anchor?.remove()
    if (url) window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}
