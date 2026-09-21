import { describe, expect, it } from 'vitest'
import { evaluatePersona, failedExpectations } from '../calibration/evaluatePersona'
import { calibrationPersonas } from '../calibration/personas'

describe('calibration personas', () => {
  it('contains at least 20 nuanced profiles with explicit rationale and intent', () => {
    expect(calibrationPersonas.length).toBeGreaterThanOrEqual(20)
    calibrationPersonas.forEach((persona) => {
      expect(persona.description.length).toBeGreaterThan(20)
      expect(persona.rationale.length).toBeGreaterThan(20)
      expect(persona.expectations.length).toBeGreaterThan(0)
    })
  })

  calibrationPersonas.forEach((persona) => {
    it(`${persona.id}: meets robust ranking, band, confidence, readiness, and boundary expectations`, () => {
      const evaluation = evaluatePersona(persona)
      expect(failedExpectations(evaluation), JSON.stringify(evaluation.roleResults.slice(0, 12).map((result) => ({ id: result.role.id, raw: result.rawScore, ranked: result.rankedScore, band: result.alignment, confidence: result.confidence })), null, 2)).toEqual([])
    })
  })
})
