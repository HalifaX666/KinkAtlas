import { parseCapsuleEnvelope, serializeCapsuleEnvelope } from './capsuleCodec'
import { CapsuleError } from './capsuleError'
import { CAPSULE_LIMITS, decodeBase64Url, encodeBase64Url } from './capsuleSchema'
import type { CapsuleEnvelopeTransport, SharedDisclosurePayload, ViewerLockedCapsuleEnvelope, ViewerRequest } from './capsuleTypes'
import { getStoredViewerRequest } from './viewerKeyStore'
import { createViewerLockedCapsule, openViewerLockedCapsule, validateViewerLockedEnvelopePublicKey } from './viewerLockedCodec'
import { parseViewerRequest, serializeViewerRequest } from './viewerRequest'

export const VIEWER_REQUEST_EXTENSION = '.kinkatlas-viewer-request'
export const VIEWER_REQUEST_MIME = 'application/vnd.kinkatlas.viewer-request'
export const VIEWER_LOCKED_EXTENSION = '.kinkatlas-capsule'
export const VIEWER_LOCKED_MIME = 'application/vnd.kinkatlas.capsule'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

export interface ViewerRequestArtifact {
  serializedRequest: string
  link: string
  file: File
}

export interface ViewerLockedArtifact {
  serializedEnvelope: string
  fragment: string
  link: string
  file: File
}

function artifactFile(contents: string, name: string, type: string): File {
  return new File([contents], name, { type })
}

function encodedFragment(name: 'request' | 'capsule', serialized: string): string {
  const fragment = `#${name}=${encodeBase64Url(encoder.encode(serialized))}`
  if (encoder.encode(fragment).byteLength > CAPSULE_LIMITS.fragmentBytes) throw new CapsuleError('oversized-input')
  return fragment
}

function decodeFragment(hash: string, name: 'request' | 'capsule'): string {
  if (encoder.encode(hash).byteLength > CAPSULE_LIMITS.fragmentBytes) throw new CapsuleError('oversized-input')
  const match = new RegExp(`^#${name}=([A-Za-z0-9_-]+)$`, 'u').exec(hash)
  if (!match) throw new CapsuleError(name === 'request' ? 'viewer-request-invalid' : 'malformed-envelope')
  try {
    return decoder.decode(decodeBase64Url(match[1]))
  } catch (error) {
    if (error instanceof CapsuleError) throw error
    throw new CapsuleError(name === 'request' ? 'viewer-request-invalid' : 'malformed-envelope')
  }
}

export async function createViewerRequestArtifact(
  request: ViewerRequest,
  origin = globalThis.location?.origin ?? 'https://kinkatlas.ca',
): Promise<ViewerRequestArtifact> {
  const serializedRequest = await serializeViewerRequest(request)
  const fragment = encodedFragment('request', serializedRequest)
  return {
    serializedRequest,
    link: `${origin.replace(/\/$/u, '')}/viewer-request${fragment}`,
    file: artifactFile(serializedRequest, `kinkatlas-viewer-request${VIEWER_REQUEST_EXTENSION}`, VIEWER_REQUEST_MIME),
  }
}

export async function parseViewerRequestInput(input: string): Promise<ViewerRequest> {
  const trimmed = input.trim()
  if (trimmed.startsWith('{')) return parseViewerRequest(trimmed)
  let hash = trimmed
  try {
    const url = new URL(trimmed)
    if (url.pathname.replace(/\/+$/u, '') !== '/viewer-request' || url.search) throw new CapsuleError('viewer-request-invalid')
    hash = url.hash
  } catch (error) {
    if (error instanceof CapsuleError) throw error
    if (!trimmed.startsWith('#request=')) throw new CapsuleError('viewer-request-invalid')
  }
  return parseViewerRequest(decodeFragment(hash, 'request'))
}

export async function readViewerRequestFile(file: File): Promise<ViewerRequest> {
  if (file.size > CAPSULE_LIMITS.userVisibleStringBytes) throw new CapsuleError('oversized-input')
  return parseViewerRequest(await file.text())
}

export async function createViewerLockedDisclosureArtifact(
  payload: SharedDisclosurePayload,
  viewerRequest: ViewerRequest,
  origin = globalThis.location?.origin ?? 'https://kinkatlas.ca',
): Promise<ViewerLockedArtifact> {
  const envelope = await createViewerLockedCapsule(payload, viewerRequest)
  const serializedEnvelope = serializeCapsuleEnvelope(envelope, 'fragment')
  const fragment = encodedFragment('capsule', serializedEnvelope)
  return {
    serializedEnvelope,
    fragment,
    link: `${origin.replace(/\/$/u, '')}/capsule${fragment}`,
    file: artifactFile(serializedEnvelope, `kinkatlas-viewer-locked${VIEWER_LOCKED_EXTENSION}`, VIEWER_LOCKED_MIME),
  }
}

export async function parseViewerLockedEnvelope(
  serializedEnvelope: string,
  transport: CapsuleEnvelopeTransport = 'fragment',
): Promise<ViewerLockedCapsuleEnvelope> {
  const envelope = parseCapsuleEnvelope(serializedEnvelope, transport)
  if (envelope.mode !== 'viewer-locked') throw new CapsuleError('unsupported-algorithm')
  return validateViewerLockedEnvelopePublicKey(envelope)
}

export async function decryptViewerLockedDisclosure(
  serializedEnvelope: string,
  transport: CapsuleEnvelopeTransport = 'fragment',
): Promise<SharedDisclosurePayload> {
  const envelope = await parseViewerLockedEnvelope(serializedEnvelope, transport)
  const stored = await getStoredViewerRequest(envelope.recipientKeyId)
  if (!stored) throw new CapsuleError('missing-recipient-key')
  return openViewerLockedCapsule(envelope, stored.privateKey)
}
