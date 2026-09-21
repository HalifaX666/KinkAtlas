import { describe, expect, it } from 'vitest'
import { roles } from '../data/roles'
import { analyzeRoleHealth, highOverlapPairs, roleSimilarity } from '../calibration/roleHealth'

describe('role health and similarity diagnostics', () => {
  it('analyzes every role with reachable evidence and nearest neighbors', () => {
    const diagnostics = analyzeRoleHealth()
    expect(diagnostics).toHaveLength(roles.length)
    diagnostics.forEach((role) => {
      expect(role.questionCount).toBeGreaterThan(0)
      expect(role.estimatedEvidenceCoverage).toBeGreaterThan(0)
      expect(role.nearestNeighbors).toHaveLength(3)
    })
  })

  it('produces symmetric bounded role similarity', () => {
    const left = roles[0]
    const right = roles[1]
    expect(roleSimilarity(left, left)).toBeCloseTo(1)
    expect(roleSimilarity(left, right)).toBeCloseTo(roleSimilarity(right, left))
    expect(roleSimilarity(left, right)).toBeGreaterThanOrEqual(0)
    expect(roleSimilarity(left, right)).toBeLessThanOrEqual(1)
  })

  it('reports high-overlap pairs once without automatically merging roles', () => {
    const pairs = highOverlapPairs(analyzeRoleHealth())
    const keys = pairs.map((pair) => `${pair.left}|${pair.right}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(pairs.every((pair) => pair.similarity >= .9)).toBe(true)
  })

  it('detects an intentionally duplicated role fingerprint', () => {
    const original = roles[0]
    const duplicate = { ...original, id: 'synthetic-duplicate', name: 'Synthetic duplicate' }
    const diagnostics = analyzeRoleHealth([original, duplicate])
    expect(diagnostics.every((role) => role.issues.includes('POSSIBLE_DUPLICATE_ROLE'))).toBe(true)
  })

  it('does not require a contrary trait for the independent Bottom activity position', () => {
    const bottom = analyzeRoleHealth().find((role) => role.roleId === 'bottom')!
    expect(bottom.contraryTraitCount).toBe(0)
    expect(bottom.issues).not.toContain('NO_CONTRARY_TRAITS_WHERE_EXPECTED')
  })
})
