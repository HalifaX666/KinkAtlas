import { getStore } from '@netlify/blobs'
import { decodeBase64Url, encodeBase64Url } from '../../src/capsules/capsuleSchema'
import {
  HOSTED_BODY_MAX_BYTES,
  type HostedContentKind,
  validateConsentCapsuleEnvelope,
  validateSavedAssessmentEnvelope,
} from '../../src/sharing/hostedContracts'
import { validateSharePackage } from '../../src/sharing/sharePackage'

const responseHeaders = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
}
const stores: Record<HostedContentKind, string> = {
  'quick-share': 'kinkatlas-quick-shares',
  'consent-capsule': 'kinkatlas-consent-capsules',
  'saved-assessment': 'kinkatlas-saved-assessments',
}
const opaqueId = /^[A-Za-z0-9_-]{22}$/u
const token = /^[A-Za-z0-9_-]{43}$/u
const createAttempts = 3

interface StoredContent {
  kind: HostedContentKind
  createdAt: string
  payload: unknown
  deleteTokenHash: string
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...responseHeaders, ...extraHeaders } })
}

function exactRecord(value: unknown, fields: readonly string[]): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.keys(value).length === fields.length
    && fields.every((field) => Object.hasOwn(value, field))
    && Object.keys(value).every((field) => field !== '__proto__' && field !== 'constructor' && field !== 'prototype')
}

function validKind(value: unknown): value is HostedContentKind {
  return typeof value === 'string' && Object.hasOwn(stores, value)
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  return origin === null || origin === new URL(request.url).origin
}

function validatePayload(kind: HostedContentKind, payload: unknown): void {
  if (kind === 'quick-share') validateSharePackage(payload)
  else if (kind === 'consent-capsule') validateConsentCapsuleEnvelope(payload)
  else validateSavedAssessmentEnvelope(payload)
}

function requestKindAndId(request: Request): { kind: HostedContentKind; id: string } | null {
  const url = new URL(request.url)
  const kind = url.searchParams.get('kind')
  const id = url.searchParams.get('id')
  if (!validKind(kind) || !id || !opaqueId.test(id) || [...url.searchParams.keys()].some((key) => key !== 'kind' && key !== 'id')) return null
  return { kind, id }
}

async function hashDeleteToken(value: string): Promise<string> {
  return encodeBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = decodeBase64Url(left)
  const rightBytes = decodeBase64Url(right)
  if (leftBytes.length !== rightBytes.length) return false
  let difference = 0
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index]
  return difference === 0
}

async function create(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403)
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') return json({ error: 'Content-Type must be application/json' }, 415)
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declared) && declared > HOSTED_BODY_MAX_BYTES) return json({ error: 'Request too large' }, 413)
  const serialized = await request.text()
  if (new TextEncoder().encode(serialized).byteLength > HOSTED_BODY_MAX_BYTES) return json({ error: 'Request too large' }, 413)
  let body: unknown
  try { body = JSON.parse(serialized) } catch { return json({ error: 'Invalid request' }, 400) }
  if (!exactRecord(body, ['kind', 'payload', 'deleteTokenHash']) || !validKind(body.kind)
    || typeof body.deleteTokenHash !== 'string' || !token.test(body.deleteTokenHash)) return json({ error: 'Invalid request' }, 400)
  try { validatePayload(body.kind, body.payload) } catch { return json({ error: 'Invalid request' }, 400) }
  const store = getStore(stores[body.kind])
  const createdAt = new Date().toISOString()
  const stored: StoredContent = { kind: body.kind, createdAt, payload: body.payload, deleteTokenHash: body.deleteTokenHash }
  for (let attempt = 0; attempt < createAttempts; attempt += 1) {
    const id = encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)))
    const result = await store.setJSON(id, stored, { onlyIfNew: true })
    if (result.modified) return json({ id, createdAt }, 201)
  }
  return json({ error: 'Storage busy' }, 503)
}

async function read(request: Request): Promise<Response> {
  const target = requestKindAndId(request)
  if (!target) return json({ error: 'Invalid request' }, 400)
  const stored = await getStore(stores[target.kind]).get(target.id, { consistency: 'strong', type: 'json' }) as StoredContent | null
  if (!stored || !exactRecord(stored, ['kind', 'createdAt', 'payload', 'deleteTokenHash']) || stored.kind !== target.kind) return json({ error: 'Not found' }, 404)
  try { validatePayload(target.kind, stored.payload) } catch { return json({ error: 'Unavailable' }, 503) }
  return json({ kind: stored.kind, createdAt: stored.createdAt, payload: stored.payload })
}

async function remove(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403)
  const target = requestKindAndId(request)
  if (!target) return json({ error: 'Invalid request' }, 400)
  const supplied = request.headers.get('x-kinkatlas-delete-token')
  if (!supplied || !token.test(supplied)) return json({ error: 'Forbidden' }, 403)
  const store = getStore(stores[target.kind])
  const stored = await store.get(target.id, { consistency: 'strong', type: 'json' }) as StoredContent | null
  if (!stored || !exactRecord(stored, ['kind', 'createdAt', 'payload', 'deleteTokenHash']) || stored.kind !== target.kind || !token.test(stored.deleteTokenHash)) return json({ error: 'Not found' }, 404)
  if (!constantTimeEqual(stored.deleteTokenHash, await hashDeleteToken(supplied))) return json({ error: 'Forbidden' }, 403)
  await store.delete(target.id)
  return new Response(null, { status: 204, headers: responseHeaders })
}

export default async function handler(request: Request) {
  try {
    if (request.method === 'POST') return await create(request)
    if (request.method === 'GET') return await read(request)
    if (request.method === 'DELETE') return await remove(request)
    return json({ error: 'Method not allowed' }, 405, { allow: 'GET, POST, DELETE' })
  } catch {
    return json({ error: 'Hosted content unavailable' }, 503)
  }
}
