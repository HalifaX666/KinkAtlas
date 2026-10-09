import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASSESSMENT_ENGINE_REVISION,
  ROLE_LIBRARY_REVISION,
  ROLE_LIBRARY_SCHEMA_VERSION,
} from '../src/capsules/capsuleVersions.ts'
import { contentRevision } from './capsule-revisions.mjs'

describe('Capsule revisions', () => {
  it('pins role-library schema and content to the canonical source deterministically', async () => {
    const source = JSON.parse(await readFile(resolve('src/data/role-library/role-library.source.json'), 'utf8'))
    expect(source.schemaVersion).toBe(ROLE_LIBRARY_SCHEMA_VERSION)
    expect(contentRevision(source)).toBe(ROLE_LIBRARY_REVISION)
    expect(contentRevision(structuredClone(source))).toBe(ROLE_LIBRARY_REVISION)
  })

  it('keeps the assessment engine revision independent from the package release version', async () => {
    const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'))
    expect(ASSESSMENT_ENGINE_REVISION).not.toBe(packageJson.version)
  })
})
