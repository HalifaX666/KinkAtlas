import { CapsuleError } from './capsuleError'
import { CAPSULE_LIMITS, canonicalJson, decodeBase64Url, encodeBase64Url } from './capsuleSchema'
import {
  VIEWER_KEYPRINT_VERSION,
  VIEWER_LOCKED_SUITE,
  VIEWER_REQUEST_MAGIC,
  VIEWER_REQUEST_VERSION,
  type CapsuleJsonValue,
  type ViewerKeyprint,
  type ViewerRequest,
} from './capsuleTypes'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype'])
const keyprintDomain = 'kinkatlas-viewer-keyprint'

function subtleCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new CapsuleError('unsupported-algorithm')
  return globalThis.crypto.subtle
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value)
  return actual.length === keys.length
    && actual.every((key) => !dangerousKeys.has(key) && keys.includes(key))
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new CapsuleError('viewer-request-invalid')
  return value as Record<string, unknown>
}

function concatBytes(...values: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(values.reduce((total, value) => total + value.byteLength, 0))
  let offset = 0
  for (const value of values) {
    output.set(value, offset)
    offset += value.byteLength
  }
  return output
}

function hexadecimal(value: Uint8Array): string {
  return [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
}

export async function fingerprintViewerPublicKey(rawPublicKey: Uint8Array, version: number = VIEWER_KEYPRINT_VERSION): Promise<Uint8Array> {
  if (!Number.isSafeInteger(version) || version < 1 || version > 255) throw new CapsuleError('viewer-request-invalid')
  const domain = encoder.encode(`${keyprintDomain}\0${version}\0${VIEWER_LOCKED_SUITE}\0`)
  return new Uint8Array(await subtleCrypto().digest('SHA-256', Uint8Array.from(concatBytes(domain, rawPublicKey)).buffer))
}

export async function deriveViewerKeyprint(rawPublicKey: Uint8Array): Promise<ViewerKeyprint> {
  const fingerprintBytes = await fingerprintViewerPublicKey(rawPublicKey)
  const comparison = hexadecimal(fingerprintBytes).slice(0, 11)
  const checksumValue = ((fingerprintBytes[6] << 8) | fingerprintBytes[7]) % 100
  return {
    version: VIEWER_KEYPRINT_VERSION,
    short: `${comparison.slice(0, 4)}-${comparison.slice(4, 8)}-${comparison.slice(8)}`,
    checksum: checksumValue.toString().padStart(2, '0'),
    fingerprint: hexadecimal(fingerprintBytes),
  }
}

export async function importViewerPublicKey(encodedPublicKey: string): Promise<CryptoKey> {
  let raw: Uint8Array
  try {
    raw = decodeBase64Url(encodedPublicKey)
  } catch {
    throw new CapsuleError('viewer-request-invalid')
  }
  if (raw.byteLength !== CAPSULE_LIMITS.p256PublicKeyBytes || raw[0] !== 0x04) {
    throw new CapsuleError('viewer-request-invalid')
  }
  try {
    return await subtleCrypto().importKey('raw', Uint8Array.from(raw).buffer, { name: 'ECDH', namedCurve: 'P-256' }, true, [])
  } catch {
    throw new CapsuleError('viewer-request-invalid')
  }
}

export async function validateViewerRequest(value: unknown): Promise<ViewerRequest> {
  const request = asRecord(value)
  if (!exactKeys(request, ['magic', 'viewerRequestVersion', 'requestId', 'suite', 'recipientPublicKey', 'keyprint'])) {
    throw new CapsuleError('viewer-request-invalid')
  }
  if (request.magic !== VIEWER_REQUEST_MAGIC) throw new CapsuleError('viewer-request-invalid')
  if (request.viewerRequestVersion !== VIEWER_REQUEST_VERSION) throw new CapsuleError('unsupported-version')
  if (request.suite !== VIEWER_LOCKED_SUITE) throw new CapsuleError('unsupported-algorithm')
  if (typeof request.requestId !== 'string' || typeof request.recipientPublicKey !== 'string') {
    throw new CapsuleError('viewer-request-invalid')
  }
  let requestId: Uint8Array
  let publicKeyBytes: Uint8Array
  try {
    requestId = decodeBase64Url(request.requestId)
    publicKeyBytes = decodeBase64Url(request.recipientPublicKey)
  } catch {
    throw new CapsuleError('viewer-request-invalid')
  }
  if (requestId.byteLength !== CAPSULE_LIMITS.requestIdBytes
    || publicKeyBytes.byteLength !== CAPSULE_LIMITS.p256PublicKeyBytes
    || publicKeyBytes[0] !== 0x04) {
    throw new CapsuleError('viewer-request-invalid')
  }
  await importViewerPublicKey(request.recipientPublicKey)
  const keyprint = asRecord(request.keyprint)
  if (!exactKeys(keyprint, ['version', 'short', 'checksum', 'fingerprint'])
    || keyprint.version !== VIEWER_KEYPRINT_VERSION
    || typeof keyprint.short !== 'string'
    || typeof keyprint.checksum !== 'string'
    || typeof keyprint.fingerprint !== 'string') {
    throw new CapsuleError('viewer-request-invalid')
  }
  const expected = await deriveViewerKeyprint(publicKeyBytes)
  if (keyprint.short !== expected.short || keyprint.checksum !== expected.checksum || keyprint.fingerprint !== expected.fingerprint) {
    throw new CapsuleError('viewer-request-invalid')
  }
  return request as unknown as ViewerRequest
}

export async function generateViewerRequestKeyPair(): Promise<{ request: ViewerRequest; privateKey: CryptoKey }> {
  if (!globalThis.crypto?.getRandomValues) throw new CapsuleError('unsupported-algorithm')
  const pair = await subtleCrypto().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
  if (!('privateKey' in pair) || pair.privateKey.extractable) {
    throw new CapsuleError('unsupported-algorithm')
  }
  const rawPublicKey = new Uint8Array(await subtleCrypto().exportKey('raw', pair.publicKey))
  const request: ViewerRequest = {
    magic: VIEWER_REQUEST_MAGIC,
    viewerRequestVersion: VIEWER_REQUEST_VERSION,
    requestId: encodeBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(CAPSULE_LIMITS.requestIdBytes))),
    suite: VIEWER_LOCKED_SUITE,
    recipientPublicKey: encodeBase64Url(rawPublicKey),
    keyprint: await deriveViewerKeyprint(rawPublicKey),
  }
  await validateViewerRequest(request)
  return { request, privateKey: pair.privateKey }
}

export async function serializeViewerRequest(requestValue: ViewerRequest): Promise<string> {
  const request = await validateViewerRequest(requestValue)
  return canonicalJson(request as unknown as CapsuleJsonValue)
}

export async function parseViewerRequest(serialized: string): Promise<ViewerRequest> {
  if (typeof serialized !== 'string' || encoder.encode(serialized).byteLength > CAPSULE_LIMITS.userVisibleStringBytes) {
    throw new CapsuleError('oversized-input')
  }
  let value: unknown
  try {
    value = JSON.parse(decoder.decode(encoder.encode(serialized)))
  } catch {
    throw new CapsuleError('viewer-request-invalid')
  }
  return validateViewerRequest(value)
}
