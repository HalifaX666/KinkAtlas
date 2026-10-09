import { createHash } from 'node:crypto'

export function canonicalizeRevisionInput(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalizeRevisionInput).join(',')}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalizeRevisionInput(value[key])}`).join(',')}}`
}

export function contentRevision(value) {
  return `sha256:${createHash('sha256').update(canonicalizeRevisionInput(value)).digest('hex')}`
}
