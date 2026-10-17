import { type ResultSnapshot, validateResultSnapshot } from '../capsules/capsuleData'
import { canonicalJson, decodeBase64Url, encodeBase64Url } from '../capsules/capsuleSchema'
import type { CapsuleJsonValue } from '../capsules/capsuleTypes'
import { compressRevisitBytes, decompressRevisitBytes, RevisitCompressionError } from './revisitCompression'

export const REVISIT_VERSION = 'v1' as const
export const REVISIT_COMPRESSION = 'lzss' as const
export const REVISIT_LIMITS = Object.freeze({
  encodedPayloadCharacters: 12 * 1024,
  decodedSnapshotBytes: 64 * 1024,
})

export type RevisitErrorCode =
  | 'invalid-snapshot'
  | 'malformed-payload'
  | 'missing-payload'
  | 'oversized-input'
  | 'unsupported-compression'
  | 'unsupported-version'

const messages: Record<RevisitErrorCode, string> = {
  'invalid-snapshot': 'This revisit link does not contain a valid saved KinkAtlas result.',
  'malformed-payload': 'This revisit link is incomplete or damaged.',
  'missing-payload': 'This revisit link does not include a saved result.',
  'oversized-input': 'This saved result is too large for a Revisit Link.',
  'unsupported-compression': 'This revisit link uses an unsupported encoding.',
  'unsupported-version': 'This revisit link was created by an unsupported KinkAtlas version.',
}

export class RevisitError extends Error {
  readonly code: RevisitErrorCode

  constructor(code: RevisitErrorCode) {
    super(messages[code])
    this.name = 'RevisitError'
    this.code = code
  }
}

export interface RevisitArtifact {
  fragment: string
  link: string
  canonicalBytes: number
  compressedBytes: number
  encodedCharacters: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

function normalizedSnapshot(snapshot: ResultSnapshot): ResultSnapshot {
  validateResultSnapshot(snapshot, { allowHistoricalRevisions: true })
  try {
    const normalized = JSON.parse(JSON.stringify(snapshot)) as unknown
    validateResultSnapshot(normalized, { allowHistoricalRevisions: true })
    return normalized
  } catch {
    throw new RevisitError('invalid-snapshot')
  }
}

export function serializeRevisitSnapshot(snapshot: ResultSnapshot): string {
  try {
    return canonicalJson(normalizedSnapshot(snapshot) as unknown as CapsuleJsonValue)
  } catch (error) {
    if (error instanceof RevisitError) throw error
    throw new RevisitError('invalid-snapshot')
  }
}

export async function createRevisitArtifact(snapshot: ResultSnapshot, origin: string): Promise<RevisitArtifact> {
  const canonical = encoder.encode(serializeRevisitSnapshot(snapshot))
  if (canonical.byteLength > REVISIT_LIMITS.decodedSnapshotBytes) throw new RevisitError('oversized-input')

  const compressed = compressRevisitBytes(canonical)
  const encoded = encodeBase64Url(compressed)
  if (encoded.length > REVISIT_LIMITS.encodedPayloadCharacters) throw new RevisitError('oversized-input')
  const fragment = `#r=${REVISIT_VERSION}.${REVISIT_COMPRESSION}.${encoded}`
  return {
    fragment,
    link: `${origin.replace(/\/$/u, '')}/revisit${fragment}`,
    canonicalBytes: canonical.byteLength,
    compressedBytes: compressed.byteLength,
    encodedCharacters: encoded.length,
  }
}

export async function parseRevisitFragment(hash: string): Promise<ResultSnapshot> {
  if (!hash) throw new RevisitError('missing-payload')
  if (!hash.startsWith('#r=')) throw new RevisitError('malformed-payload')
  const parts = hash.slice(3).split('.')
  if (parts.length !== 3) throw new RevisitError('malformed-payload')
  const [version, compression, encoded] = parts
  if (version !== REVISIT_VERSION) throw new RevisitError('unsupported-version')
  if (compression !== REVISIT_COMPRESSION) throw new RevisitError('unsupported-compression')
  if (!encoded || encoded.length > REVISIT_LIMITS.encodedPayloadCharacters) throw new RevisitError(encoded ? 'oversized-input' : 'malformed-payload')

  let compressed: Uint8Array
  try {
    compressed = decodeBase64Url(encoded)
  } catch {
    throw new RevisitError('malformed-payload')
  }

  let bytes: Uint8Array
  try {
    bytes = decompressRevisitBytes(compressed, REVISIT_LIMITS.decodedSnapshotBytes)
  } catch (error) {
    if (error instanceof RevisitCompressionError && error.code === 'oversized') throw new RevisitError('oversized-input')
    throw new RevisitError('malformed-payload')
  }

  let serialized: string
  let parsed: unknown
  try {
    serialized = decoder.decode(bytes)
    parsed = JSON.parse(serialized)
  } catch {
    throw new RevisitError('malformed-payload')
  }

  try {
    validateResultSnapshot(parsed, { allowHistoricalRevisions: true })
    if (canonicalJson(parsed as unknown as CapsuleJsonValue) !== serialized) throw new RevisitError('malformed-payload')
    if (encodeBase64Url(compressRevisitBytes(bytes)) !== encoded) throw new RevisitError('malformed-payload')
    return parsed
  } catch (error) {
    if (error instanceof RevisitError) throw error
    throw new RevisitError('invalid-snapshot')
  }
}

export function revisitErrorMessage(error: unknown): string {
  return error instanceof RevisitError ? error.message : messages['malformed-payload']
}
