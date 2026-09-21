import { describe, expect, it } from 'vitest'
import { traits as traitDefinitions } from '../data/traits'
import { analyzeQuestionCoverage, analyzeTraitCorrelations, analyzeTraitCoverage } from '../calibration/questionCoverage'

describe('trait and question coverage diagnostics', () => {
  it('accounts for every trait and every discovery question', () => {
    const traitCoverage = analyzeTraitCoverage()
    const questions = analyzeQuestionCoverage()
    expect(traitCoverage).toHaveLength(traitDefinitions.length)
    expect(questions.length).toBeGreaterThanOrEqual(58)
    expect(traitCoverage.every((trait) => trait.roleCount > 0)).toBe(true)
  })

  it('keeps every role-used trait reachable through more than one question', () => {
    const underCovered = analyzeTraitCoverage().filter((trait) => trait.issues.includes('UNUSED_TRAIT') || trait.issues.includes('TOUCHED_ONCE'))
    expect(underCovered).toEqual([])
    expect(analyzeTraitCoverage().find((trait) => trait.traitId === 'objectification')?.questionCount).toBeGreaterThanOrEqual(2)
    expect(analyzeTraitCoverage().find((trait) => trait.traitId === 'serviceReceiving')?.questionCount).toBeGreaterThanOrEqual(2)
  })

  it('reports only materially co-moving trait pairs', () => {
    const pairs = analyzeTraitCorrelations()
    expect(pairs.every((pair) => pair.sharedQuestionCount >= 2 && pair.coOccurrenceRatio >= .7 && pair.meanEffectDifference <= .18 && pair.maxEffectDifference <= .25)).toBe(true)
    const keys = pairs.map((pair) => [pair.left, pair.right].sort().join('|'))
    expect(keys).not.toContain(['protocol', 'ritual'].sort().join('|'))
    expect(keys).not.toContain(['exploration', 'communityConnection'].sort().join('|'))
    expect(keys).not.toContain(['submission', 'surrender'].sort().join('|'))
    expect(keys).not.toContain(['pleasureReceiving', 'sensorySeeking'].sort().join('|'))
  })
})
