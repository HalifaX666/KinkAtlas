import { encodeBase64Url } from '../capsules/capsuleSchema'
import type { ConsentCapsuleEnvelope, HostedContentKind, SavedAssessmentEnvelope } from './hostedContracts'
import type { SharePackage } from './sharePackage'

export const HOSTED_STORAGE_ENDPOINT = '/.netlify/functions/hosted-content'

export interface HostedCreation {
  id: string
  createdAt: string
  deleteToken: string
}

type HostedPayload = SharePackage | ConsentCapsuleEnvelope | SavedAssessmentEnvelope

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  const value = await response.json().catch(() => ({}))
  if (!response.ok || typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Hosted content is unavailable')
  return value as Record<string, unknown>
}

async function deleteToken(): Promise<{ token: string; hash: string }> {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle) throw new Error('Secure sharing is unavailable')
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32))
  const token = encodeBase64Url(bytes)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return { token, hash: encodeBase64Url(new Uint8Array(digest)) }
}

export async function createHostedContent(kind: HostedContentKind, payload: HostedPayload): Promise<HostedCreation> {
  const management = await deleteToken()
  const response = await fetch(HOSTED_STORAGE_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, payload, deleteTokenHash: management.hash }),
  })
  const result = await responseJson(response)
  if (typeof result.id !== 'string' || typeof result.createdAt !== 'string') throw new Error('Hosted content is unavailable')
  return { id: result.id, createdAt: result.createdAt, deleteToken: management.token }
}

export async function getHostedContent<T extends HostedPayload>(kind: HostedContentKind, id: string): Promise<T> {
  const query = new URLSearchParams({ kind, id })
  const result = await responseJson(await fetch(`${HOSTED_STORAGE_ENDPOINT}?${query}`, { headers: { accept: 'application/json' } }))
  if (!Object.hasOwn(result, 'payload')) throw new Error('Hosted content is unavailable')
  return result.payload as T
}

export async function deleteHostedContent(kind: HostedContentKind, id: string, token: string): Promise<void> {
  const query = new URLSearchParams({ kind, id })
  const response = await fetch(`${HOSTED_STORAGE_ENDPOINT}?${query}`, { method: 'DELETE', headers: { 'x-kinkatlas-delete-token': token } })
  if (!response.ok) throw new Error('Hosted content could not be deleted')
}

export function hostedShareUrl(kind: 'quick-share' | 'consent-capsule', id: string, origin = globalThis.location?.origin ?? 'https://kinkatlas.ca'): string {
  return `${origin.replace(/\/$/u, '')}/${kind === 'quick-share' ? 's' : 'p'}/${id}`
}
