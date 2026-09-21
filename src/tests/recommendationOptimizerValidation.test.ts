import { describe, expect, it } from 'vitest'
import { evaluateRecommendationOptimizerScenarios } from '../calibration/recommendationOptimizerValidation'

describe('constructed Top-5 recommendation optimizer scenarios', () => {
  it('passes all behavioral scenarios', () => {
    const results = evaluateRecommendationOptimizerScenarios()
    expect(results).toHaveLength(12)
    expect(results.filter((result) => !result.passed)).toEqual([])
  })
})
