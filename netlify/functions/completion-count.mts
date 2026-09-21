import { getStore } from '@netlify/blobs'

const store = getStore('assessment-completions')
const countKey = 'completed-assessments'
const maximumWriteAttempts = 5

const responseHeaders = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders })
}

function isValidCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

async function readCount() {
  const value = await store.get(countKey, { consistency: 'strong', type: 'json' })
  if (value === null) return 0
  if (!isValidCount(value)) throw new Error('Invalid aggregate completion count')
  return value
}

async function incrementCount() {
  for (let attempt = 0; attempt < maximumWriteAttempts; attempt += 1) {
    const current = await store.getWithMetadata(countKey, { consistency: 'strong', type: 'json' })

    if (current === null) {
      const created = await store.setJSON(countKey, 1, { onlyIfNew: true })
      if (created.modified) return 1
      continue
    }

    if (!isValidCount(current.data) || !current.etag || current.data === Number.MAX_SAFE_INTEGER) {
      throw new Error('Invalid aggregate completion count')
    }

    const nextCount = current.data + 1
    const updated = await store.setJSON(countKey, nextCount, { onlyIfMatch: current.etag })
    if (updated.modified) return nextCount
  }

  throw new Error('Aggregate completion count was busy')
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return origin === null || origin === new URL(request.url).origin
}

export default async function handler(request: Request) {
  try {
    if (request.method === 'GET') return jsonResponse({ count: await readCount() })

    if (request.method === 'POST') {
      if (!isSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403)
      if ((await request.text()).length !== 0) return jsonResponse({ error: 'Request body must be empty' }, 400)
      return jsonResponse({ count: await incrementCount() })
    }

    return new Response(null, { status: 405, headers: { ...responseHeaders, allow: 'GET, POST' } })
  } catch {
    return jsonResponse({ error: 'Completion count unavailable' }, 503)
  }
}
