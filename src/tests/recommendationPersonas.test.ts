import { describe, expect, it } from 'vitest'
import { addRoleProfileEntry } from '../engine/roleProfileOptimizer'
import { recommendationPersonas, recommendationResults } from '../calibration/recommendationPersonas'
import { roleLibrary } from '../taxonomy/roleLibrary'

describe('adversarial recommendation personas', () => {
  it('covers fifty distinct behaviorally named profiles', () => {
    expect(recommendationPersonas).toHaveLength(50)
    expect(new Set(recommendationPersonas.map((persona) => persona.id))).toHaveProperty('size', 50)
    expect(new Set(recommendationPersonas.map((persona) => persona.focus))).toEqual(new Set(['broad-specific', 'directional', 'service', 'sparse-unsure', 'contradictory', 'near-tie', 'general']))
  })

  it('passes must-include, must-exclude, primary, redundancy, and set-quality expectations', () => {
    const failures = recommendationResults.flatMap((result) => result.failures.map((failure) => `${result.persona.id} [${failure.kind}]: ${failure.message}`))
    expect(failures).toEqual([])
  })

  it('preserves exact labels, eligibility, determinism, and five-slot limits across every profile', () => {
    const libraryLabels = new Set(roleLibrary.roles.map((role) => role.label))
    recommendationResults.forEach((result) => {
      expect(result.labels.length).toBeLessThanOrEqual(5)
      expect(result.labels.every((label) => libraryLabels.has(label))).toBe(true)
      expect(result.optimization.recommendations.every((item) => item.candidate.eligible)).toBe(true)
      expect(result.failures.filter((failure) => ['eligibility-policy', 'rejection', 'confirmation', 'determinism'].includes(failure.kind))).toEqual([])
      expect(result.clarifications.length).toBeLessThanOrEqual(6)
    })
  })

  it('keeps a manual-only addition user-attributed and scoreless', () => {
    const manual = addRoleProfileEntry([], { roleId: roleLibrary.roles.find((role) => role.label === 'Fetishist')!.id, label: 'Fetishist', source: 'user-selected' })
    expect(manual).toEqual([{ roleId: expect.any(String), label: 'Fetishist', source: 'user-selected' }])
    expect(manual[0]).not.toHaveProperty('rawAlignment')
    expect(manual[0]).not.toHaveProperty('confidence')
  })
})
