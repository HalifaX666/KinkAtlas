const endpoint = '/.netlify/functions/completion-count'
const countUpdatedEvent = 'kinkatlas:completion-count-updated'

function parseCount(value: unknown): number | null {
  if (!value || typeof value !== 'object' || !('count' in value)) return null
  const count = value.count
  return Number.isSafeInteger(count) && Number(count) >= 0 ? Number(count) : null
}

async function readResponse(response: Response) {
  if (!response.ok) return null
  return parseCount(await response.json())
}

export async function loadCompletionCount(signal?: AbortSignal) {
  try {
    const response = await fetch(endpoint, {
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal,
    })
    return await readResponse(response)
  } catch {
    return null
  }
}

export async function recordAssessmentCompletion() {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'omit',
      keepalive: true,
      referrerPolicy: 'no-referrer',
    })
    const count = await readResponse(response)
    if (count !== null) window.dispatchEvent(new CustomEvent(countUpdatedEvent, { detail: count }))
  } catch {
    // Counting is deliberately best-effort and must never interrupt assessment completion.
  }
}

export function listenForCompletionCount(listener: (count: number) => void) {
  const handleUpdate = (event: Event) => {
    const count = (event as CustomEvent<unknown>).detail
    if (Number.isSafeInteger(count) && Number(count) >= 0) listener(Number(count))
  }
  window.addEventListener(countUpdatedEvent, handleUpdate)
  return () => window.removeEventListener(countUpdatedEvent, handleUpdate)
}
