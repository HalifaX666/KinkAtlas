import { CapsuleError } from './capsuleError'
import { CAPSULE_LIMITS, canonicalJson, decodeBase64Url, encodeBase64Url } from './capsuleSchema'
import {
  REVEAL_REQUEST_MAGIC,
  REVEAL_REQUEST_SECTION_IDS,
  REVEAL_REQUEST_VERSION,
  type CapsuleJsonValue,
  type RevealRequest,
  type RevealRequestSectionId,
  type ViewerRequest,
} from './capsuleTypes'
import { validateViewerRequest } from './viewerRequest'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype'])
const allowedSections = new Set<string>(REVEAL_REQUEST_SECTION_IDS)

export const REVEAL_REQUEST_LIMITS = Object.freeze({
  serializedBytes: 2 * 1024,
  requestedSections: REVEAL_REQUEST_SECTION_IDS.length,
})

function invalid(): never {
  throw new CapsuleError('reveal-request-invalid')
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid()
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  const actual = Object.keys(value)
  if (actual.length !== keys.length || actual.some((key) => dangerousKeys.has(key) || !keys.includes(key))) invalid()
}

function validateRequestId(value: unknown): string {
  if (typeof value !== 'string') invalid()
  let bytes: Uint8Array
  try {
    bytes = decodeBase64Url(value)
  } catch {
    invalid()
  }
  if (bytes.byteLength !== CAPSULE_LIMITS.requestIdBytes) invalid()
  return value
}

function validateRequestedSections(value: unknown): RevealRequestSectionId[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > REVEAL_REQUEST_LIMITS.requestedSections) invalid()
  if (value.some((section) => typeof section !== 'string' || !allowedSections.has(section))) invalid()
  const sections = value as RevealRequestSectionId[]
  if (new Set(sections).size !== sections.length) invalid()
  const canonicalOrder = REVEAL_REQUEST_SECTION_IDS.filter((section) => sections.includes(section))
  if (canonicalOrder.some((section, index) => section !== sections[index])) invalid()
  return sections
}

export async function validateRevealRequest(value: unknown): Promise<RevealRequest> {
  const request = asRecord(value)
  exactKeys(request, ['magic', 'revealRequestVersion', 'requestId', 'requestedSections', 'recipientViewerRequest'])
  if (request.magic !== REVEAL_REQUEST_MAGIC) invalid()
  if (request.revealRequestVersion !== REVEAL_REQUEST_VERSION) throw new CapsuleError('unsupported-version')
  const requestId = validateRequestId(request.requestId)
  const requestedSections = validateRequestedSections(request.requestedSections)
  let recipientViewerRequest: ViewerRequest
  try {
    recipientViewerRequest = await validateViewerRequest(request.recipientViewerRequest)
  } catch (error) {
    if (error instanceof CapsuleError && (error.code === 'unsupported-version' || error.code === 'unsupported-algorithm')) throw error
    invalid()
  }
  return {
    magic: REVEAL_REQUEST_MAGIC,
    revealRequestVersion: REVEAL_REQUEST_VERSION,
    requestId,
    requestedSections,
    recipientViewerRequest,
  }
}

export async function createRevealRequest(
  recipientViewerRequest: ViewerRequest,
  requestedSections: readonly RevealRequestSectionId[],
): Promise<RevealRequest> {
  if (!globalThis.crypto?.getRandomValues) throw new CapsuleError('unsupported-algorithm')
  const orderedSections = REVEAL_REQUEST_SECTION_IDS.filter((section) => requestedSections.includes(section))
  if (orderedSections.length !== requestedSections.length) invalid()
  return validateRevealRequest({
    magic: REVEAL_REQUEST_MAGIC,
    revealRequestVersion: REVEAL_REQUEST_VERSION,
    requestId: encodeBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(CAPSULE_LIMITS.requestIdBytes))),
    requestedSections: orderedSections,
    recipientViewerRequest,
  })
}

export async function serializeRevealRequest(value: RevealRequest): Promise<string> {
  const request = await validateRevealRequest(value)
  const serialized = canonicalJson(request as unknown as CapsuleJsonValue)
  if (encoder.encode(serialized).byteLength > REVEAL_REQUEST_LIMITS.serializedBytes) throw new CapsuleError('oversized-input')
  return serialized
}

export async function parseRevealRequest(serialized: string): Promise<RevealRequest> {
  if (typeof serialized !== 'string' || encoder.encode(serialized).byteLength > REVEAL_REQUEST_LIMITS.serializedBytes) {
    throw new CapsuleError('oversized-input')
  }
  let value: unknown
  try {
    value = JSON.parse(decoder.decode(encoder.encode(serialized)))
  } catch {
    invalid()
  }
  const request = await validateRevealRequest(value)
  if (canonicalJson(request as unknown as CapsuleJsonValue) !== serialized) invalid()
  return request
}
