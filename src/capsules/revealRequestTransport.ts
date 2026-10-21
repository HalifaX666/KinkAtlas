import { CapsuleError } from './capsuleError'
import { CAPSULE_LIMITS, decodeBase64Url, encodeBase64Url } from './capsuleSchema'
import type { RevealRequest } from './capsuleTypes'
import { parseRevealRequest, serializeRevealRequest } from './revealRequest'

export const REVEAL_REQUEST_EXTENSION = '.kinkatlas-reveal-request'
export const REVEAL_REQUEST_MIME = 'application/vnd.kinkatlas.reveal-request'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

export interface RevealRequestArtifact {
  serializedRequest: string
  link: string
  file: File
}

function encodedFragment(serialized: string): string {
  const fragment = `#request=${encodeBase64Url(encoder.encode(serialized))}`
  if (encoder.encode(fragment).byteLength > CAPSULE_LIMITS.fragmentBytes) throw new CapsuleError('oversized-input')
  return fragment
}

function decodeFragment(hash: string): string {
  if (encoder.encode(hash).byteLength > CAPSULE_LIMITS.fragmentBytes) throw new CapsuleError('oversized-input')
  const match = /^#request=([A-Za-z0-9_-]+)$/u.exec(hash)
  if (!match) throw new CapsuleError('reveal-request-invalid')
  try {
    return decoder.decode(decodeBase64Url(match[1]))
  } catch (error) {
    if (error instanceof CapsuleError) throw error
    throw new CapsuleError('reveal-request-invalid')
  }
}

export async function createRevealRequestArtifact(
  request: RevealRequest,
  origin = globalThis.location?.origin ?? 'https://kinkatlas.ca',
): Promise<RevealRequestArtifact> {
  const serializedRequest = await serializeRevealRequest(request)
  return {
    serializedRequest,
    link: `${origin.replace(/\/$/u, '')}/reveal-request${encodedFragment(serializedRequest)}`,
    file: new File([serializedRequest], `kinkatlas-reveal-request${REVEAL_REQUEST_EXTENSION}`, { type: REVEAL_REQUEST_MIME }),
  }
}

export async function parseRevealRequestInput(input: string): Promise<RevealRequest> {
  if (input.startsWith('{')) return parseRevealRequest(input)
  const trimmed = input.trim()
  let hash = trimmed
  try {
    const url = new URL(trimmed)
    if (url.pathname.replace(/\/+$/u, '') !== '/reveal-request' || url.search) throw new CapsuleError('reveal-request-invalid')
    hash = url.hash
  } catch (error) {
    if (error instanceof CapsuleError) throw error
    if (!trimmed.startsWith('#request=')) throw new CapsuleError('reveal-request-invalid')
  }
  return parseRevealRequest(decodeFragment(hash))
}

export async function readRevealRequestFile(file: File): Promise<RevealRequest> {
  if (file.size > CAPSULE_LIMITS.userVisibleStringBytes) throw new CapsuleError('oversized-input')
  return parseRevealRequest(await file.text())
}
