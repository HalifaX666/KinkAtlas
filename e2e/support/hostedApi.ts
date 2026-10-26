import type { Page, Request as PlaywrightRequest } from '@playwright/test'

export type HostedKind = 'quick-share' | 'consent-capsule' | 'saved-assessment'

interface StoredObject {
  kind: HostedKind
  payload: unknown
  deleteTokenHash: string
  createdAt: string
}

export interface HostedRequestRecord {
  method: string
  kind: HostedKind | null
  id: string | null
  body: string | null
  request: PlaywrightRequest
}

export interface HostedApiState {
  objects: Map<string, StoredObject>
  requests: HostedRequestRecord[]
  nextId: number
}

export function createHostedApiState(): HostedApiState {
  return { objects: new Map(), requests: [], nextId: 1 }
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

async function hashCapability(value: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
}

function key(kind: string | null, id: string | null) {
  return `${kind ?? ''}:${id ?? ''}`
}

export async function installHostedApi(page: Page, state: HostedApiState) {
  await page.route('**/.netlify/functions/hosted-content**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const kind = url.searchParams.get('kind') as HostedKind | null
    const id = url.searchParams.get('id')
    const body = request.postData()
    state.requests.push({ method, kind, id, body, request })

    if (method === 'POST') {
      const value = JSON.parse(body ?? '{}') as { kind: HostedKind; payload: unknown; deleteTokenHash: string }
      const nextId = String(state.nextId++).padStart(22, 'A')
      const createdAt = '2026-10-24T12:00:00.000Z'
      state.objects.set(key(value.kind, nextId), { kind: value.kind, payload: structuredClone(value.payload), deleteTokenHash: value.deleteTokenHash, createdAt })
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: nextId, createdAt }) })
      return
    }

    if (!kind || !id) {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid request' }) })
      return
    }

    const objectKey = key(kind, id)
    const stored = state.objects.get(objectKey)
    if (!stored) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not found' }) })
      return
    }

    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ kind, createdAt: stored.createdAt, payload: stored.payload }) })
      return
    }

    if (method === 'DELETE') {
      const supplied = request.headers()['x-kinkatlas-delete-token']
      if (!supplied || await hashCapability(supplied) !== stored.deleteTokenHash) {
        await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Forbidden' }) })
        return
      }
      state.objects.delete(objectKey)
      await route.fulfill({ status: 204, body: '' })
      return
    }

    await route.fulfill({ status: 405, contentType: 'application/json', body: JSON.stringify({ error: 'Method not allowed' }) })
  })
}
