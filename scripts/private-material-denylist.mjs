const sourceKey = 'source'
const rawKey = 'raw'
const provenanceKey = 'Provenance'
const dateKey = 'Date'
const atKey = 'At'
const configuredTerms = (process.env.PUBLIC_PROHIBITED_TERMS ?? '')
  .split(',')
  .map((term) => term.trim())
  .filter(Boolean)
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const privateMaterialTextChecks = [
  { label: 'source URL-like fields', pattern: new RegExp(`${sourceKey}(?:Url|Href)`, 'gi') },
  {
    label: 'provenance keys',
    pattern: new RegExp(
      `accepted${sourceKey}${provenanceKey}|${sourceKey}(?:${provenanceKey}|SnapshotPath|Type|Match|Hash)|verification${dateKey}|captured${atKey}|extracted${atKey}|${rawKey}(?:Html|Text)`,
      'gi',
    ),
  },
  {
    label: 'private-material path markers',
    pattern: /(?:data\/sources\/|(?:data|docs|src)\/(?:private|history|harvest|source-material)(?:[-_/]|$))/gi,
  },
  ...(configuredTerms.length
    ? [{ label: 'configured prohibited terms', pattern: new RegExp(configuredTerms.map(escapePattern).join('|'), 'gi') }]
    : []),
]

export const privateMaterialFileNamePattern = /^(?:data\/sources(?:\/|$)|(?:data|docs|src)\/(?:private|history|harvest|source-material)(?:[-_/]|$))/i
