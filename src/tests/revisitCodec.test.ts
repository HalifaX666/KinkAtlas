import { describe, expect, it } from 'vitest'
import { buildResultSnapshot, type ResultSnapshot } from '../capsules/capsuleData'
import { encodeBase64Url } from '../capsules/capsuleSchema'
import {
  createRevisitArtifact,
  parseRevisitFragment,
  REVISIT_COMPRESSION,
  REVISIT_LIMITS,
  RevisitError,
  serializeRevisitSnapshot,
} from '../revisit/revisitCodec'
import { compressRevisitBytes } from '../revisit/revisitCompression'
import { assessmentPersonas } from './fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from './helpers/assessmentPersonaRunner'

const persona = assessmentPersonas.find(({ id }) => id === 'multiple-hard-limits-pattern')!
const evaluation = evaluateAssessmentPersona(persona)
const snapshot = buildResultSnapshot(persona.answers, evaluation.yourRoleSet)
const encoder = new TextEncoder()

function copySnapshot(): ResultSnapshot {
  return structuredClone(snapshot)
}

async function fragmentForJson(serialized: string): Promise<string> {
  const compressed = compressRevisitBytes(encoder.encode(serialized))
  return `#r=v1.${REVISIT_COMPRESSION}.${encodeBase64Url(compressed)}`
}

describe('Deterministic Revisit codec', () => {
  it('generates the exact same canonical link repeatedly and round trips the authoritative snapshot', async () => {
    const encoded = encodeBase64Url(compressRevisitBytes(encoder.encode(serializeRevisitSnapshot(snapshot))))
    expect(encoded.length).toBeLessThanOrEqual(REVISIT_LIMITS.encodedPayloadCharacters)
    const first = await createRevisitArtifact(snapshot, 'https://example.test')
    const second = await createRevisitArtifact(copySnapshot(), 'https://example.test/')

    expect(second.link).toBe(first.link)
    expect(first.fragment).toMatch(/^#r=v1\.lzss\.[A-Za-z0-9_-]+$/)
    expect(await parseRevisitFragment(first.fragment)).toEqual(JSON.parse(JSON.stringify(snapshot)))
    expect(first.canonicalBytes).toBeGreaterThan(first.compressedBytes)
    expect(first.encodedCharacters).toBeLessThanOrEqual(REVISIT_LIMITS.encodedPayloadCharacters)
  })

  it('canonicalizes object ordering, preserves array order and Unicode, omits undefined, and adds no timestamp', () => {
    const plain = JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>
    const reordered = Object.fromEntries(Object.entries(plain).reverse()) as unknown as ResultSnapshot
    const withUndefined = copySnapshot()
    withUndefined.chosenPrimaryRoleId = undefined
    const canonical = serializeRevisitSnapshot(snapshot)

    expect(serializeRevisitSnapshot(reordered)).toBe(canonical)
    expect(serializeRevisitSnapshot(withUndefined)).not.toContain('chosenPrimaryRoleId')
    expect(canonical).toContain('\u2019')
    expect(canonical).not.toMatch(/createdAt|timestamp/i)

    const changedArrayOrder = copySnapshot()
    changedArrayOrder.currentRoleSet.reverse()
    expect(serializeRevisitSnapshot(changedArrayOrder)).not.toBe(canonical)
  })

  it('returns the exact same link after encode, decode, and encode', async () => {
    const first = await createRevisitArtifact(snapshot, 'https://example.test')
    const decoded = await parseRevisitFragment(first.fragment)
    const second = await createRevisitArtifact(decoded, 'https://example.test')
    expect(second.link).toBe(first.link)
  })

  it('changes the link when one meaningful historical value changes', async () => {
    const changed = copySnapshot()
    changed.currentRoleSet[0].label = `${changed.currentRoleSet[0].label} changed`
    const [original, different] = await Promise.all([
      createRevisitArtifact(snapshot, 'https://example.test'),
      createRevisitArtifact(changed, 'https://example.test'),
    ])
    expect(different.link).not.toBe(original.link)
  })

  it('contains only the reviewed ResultSnapshot schema and excludes restore/session inputs', () => {
    const serialized = serializeRevisitSnapshot(snapshot)
    const parsed = JSON.parse(serialized) as unknown
    const keys = new Set<string>()
    const collectKeys = (value: unknown) => {
      if (!value || typeof value !== 'object') return
      if (Array.isArray(value)) value.forEach(collectKeys)
      else Object.entries(value).forEach(([key, child]) => { keys.add(key); collectKeys(child) })
    }
    collectKeys(parsed)
    for (const prohibited of [
      'answers', 'discoveryAnswers', 'refinementAnswers', 'readinessAnswers', 'boundaryAnswers',
      'negotiationAnswers', 'navigation', 'assessmentNavigation', 'discoveryHistory', 'refinementHistory',
      'privateRestoreState', 'completionRequested', 'privateKey', 'secret', 'recipientPublicKey',
      'viewerRequest', 'requestId', 'keyId',
    ]) expect(keys).not.toContain(prohibited)
    expect(serialized).toContain('"roleDiscovery"')
    expect(serialized).toContain('"currentRoleSet"')
  })

  it('keeps every constructed assessment persona within the declared Revisit limits', async () => {
    const measurements = await Promise.all(assessmentPersonas.map(async (candidate) => {
      const result = evaluateAssessmentPersona(candidate)
      return createRevisitArtifact(buildResultSnapshot(candidate.answers, result.yourRoleSet), 'https://example.test')
    }))
    expect(Math.max(...measurements.map(({ canonicalBytes }) => canonicalBytes))).toBeLessThanOrEqual(REVISIT_LIMITS.decodedSnapshotBytes)
    expect(Math.max(...measurements.map(({ encodedCharacters }) => encodedCharacters))).toBeLessThanOrEqual(REVISIT_LIMITS.encodedPayloadCharacters)
  })

  it('renders historical revisions without requiring current engine or library revisions', async () => {
    const historical = copySnapshot()
    const historicalVersions = historical as unknown as { assessmentSchemaVersion: number; roleLibrarySchemaVersion: number }
    historicalVersions.assessmentSchemaVersion = 99
    historicalVersions.roleLibrarySchemaVersion = 77
    historical.engineRevision = 'historical-engine'
    historical.roleLibraryRevision = 'historical-library'
    const artifact = await createRevisitArtifact(historical, 'https://example.test')
    const decoded = await parseRevisitFragment(artifact.fragment)
    expect(decoded.engineRevision).toBe('historical-engine')
    expect(decoded.roleLibraryRevision).toBe('historical-library')
  })

  it.each([
    ['', 'missing-payload'],
    ['#wrong=value', 'malformed-payload'],
    ['#r=v2.lzss.AAAA', 'unsupported-version'],
    ['#r=v1.none.AAAA', 'unsupported-compression'],
    ['#r=v1.lzss.not+base64', 'malformed-payload'],
    ['#r=v1.lzss.A', 'malformed-payload'],
  ])('rejects malformed or unsupported fragment %s', async (fragment, code) => {
    await expect(parseRevisitFragment(fragment)).rejects.toMatchObject({ code })
  })

  it('rejects unknown fields, prototype-pollution keys, noncanonical JSON, and corrupted compression', async () => {
    const unknown = JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>
    unknown.unreviewed = true
    await expect(parseRevisitFragment(await fragmentForJson(JSON.stringify(unknown)))).rejects.toBeInstanceOf(RevisitError)

    const canonical = serializeRevisitSnapshot(snapshot)
    const polluted = canonical.replace('{', '{"__proto__":{"polluted":true},')
    await expect(parseRevisitFragment(await fragmentForJson(polluted))).rejects.toBeInstanceOf(RevisitError)

    const noncanonical = JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(canonical) as Record<string, unknown>).reverse()))
    await expect(parseRevisitFragment(await fragmentForJson(noncanonical))).rejects.toMatchObject({ code: 'malformed-payload' })
    await expect(parseRevisitFragment(await fragmentForJson('{'))).rejects.toMatchObject({ code: 'malformed-payload' })
    await expect(parseRevisitFragment('#r=v1.lzss.AAAA')).rejects.toMatchObject({ code: 'malformed-payload' })
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
  })

  it('rejects truncated compression and a structurally invalid ResultSnapshot', async () => {
    const canonical = encoder.encode(serializeRevisitSnapshot(snapshot))
    const compressed = compressRevisitBytes(canonical)
    const truncated = compressed.slice(0, -1)
    await expect(parseRevisitFragment(`#r=v1.lzss.${encodeBase64Url(truncated)}`)).rejects.toMatchObject({ code: 'malformed-payload' })

    const invalid = JSON.parse(serializeRevisitSnapshot(snapshot)) as Record<string, unknown>
    delete invalid.currentRoleSet
    await expect(parseRevisitFragment(await fragmentForJson(JSON.stringify(invalid)))).rejects.toMatchObject({ code: 'invalid-snapshot' })
  })

  it('rejects nonminimal trailing compressed bytes', async () => {
    const canonical = encoder.encode(serializeRevisitSnapshot(snapshot))
    const compressed = compressRevisitBytes(canonical)
    const withExtraPadding = Uint8Array.from([...compressed, 0])
    await expect(parseRevisitFragment(`#r=v1.lzss.${encodeBase64Url(withExtraPadding)}`)).rejects.toMatchObject({ code: 'malformed-payload' })
  })

  it('rejects encoded input above the dedicated Revisit limit before decoding', async () => {
    const fragment = `#r=v1.lzss.${'A'.repeat(REVISIT_LIMITS.encodedPayloadCharacters + 1)}`
    await expect(parseRevisitFragment(fragment)).rejects.toMatchObject({ code: 'oversized-input' })
  })

  it('rejects a declared decoded size above the dedicated limit before allocating output', async () => {
    const declared = REVISIT_LIMITS.decodedSnapshotBytes + 1
    const compressed = Uint8Array.from([declared >>> 24, declared >>> 16, declared >>> 8, declared, 0])
    await expect(parseRevisitFragment(`#r=v1.lzss.${encodeBase64Url(compressed)}`)).rejects.toMatchObject({ code: 'oversized-input' })
  })
})
