import { describe, expect, it } from 'vitest'
import { discoveryQuestions } from '../data/questions'
import { roles } from '../data/roles'
import { roleLibrary } from '../taxonomy/roleLibrary'
import { analyzeReflectionFixtures, buildPhaseJAssessmentAudit } from './phaseJAssessmentAudit'

describe('Phase J.0 assessment-quality audit', () => {
  it('is deterministic and leaves canonical data unchanged', () => {
    const before = JSON.stringify({ roleLibrary, roles, discoveryQuestions })
    const journeys = [{ id: 'fixture-one', questionIds: ['d-power-give', 'r-authority-style'] }]

    const first = buildPhaseJAssessmentAudit(journeys)
    const second = buildPhaseJAssessmentAudit(journeys)

    expect(first).toEqual(second)
    expect(JSON.stringify({ roleLibrary, roles, discoveryQuestions })).toBe(before)
  })

  it('captures the protected taxonomy, question, and recommendation baseline', () => {
    const audit = buildPhaseJAssessmentAudit()

    expect(audit.taxonomy).toMatchObject({
      totalLibraryRoles: 1107,
      totalScoredRoles: 101,
      totalDefinitions: 1107,
      totalFamilies: 26,
    })
    expect(audit.questions).toMatchObject({
      broadDiscoveryQuestions: 20,
      adaptiveDiscoveryQuestions: 52,
      maximumDiscoveryQuestions: 26,
      maximumRefineQuestions: 6,
    })
    expect(audit.recommendations).toMatchObject({
      scenarioCount: 50,
      passedScenarioCount: 50,
      deterministicRepeat: true,
      thresholds: { minimumBaseScore: 0.58, minimumAdjustedScore: 0.52, maximumSuggestedRoles: 5 },
    })
    expect(audit.calibration).toMatchObject({
      criticalFailureCount: 0,
      adaptivePassed: 7,
      adaptiveTotal: 7,
      boundaryIndependence: true,
      readinessCriticalPersistence: true,
    })
    expect(audit.taxonomy.relationshipCoverage.invalidRelationships).toEqual([])
  })

  it('separates static bank coverage from observed adaptive journeys', () => {
    const adaptiveId = discoveryQuestions.find((question) => question.phase === 'refine')!.id
    const audit = buildPhaseJAssessmentAudit([{ id: 'observed', questionIds: [adaptiveId] }])
    const effective = audit.questions.staticVersusEffective.effectiveFixtureCoverage

    expect(audit.questions.staticVersusEffective.staticAdaptiveQuestionCount).toBe(52)
    expect(effective.observedAdaptiveQuestionCount).toBe(1)
    expect(effective.observedQuestionIds).toContainEqual({ questionId: adaptiveId, journeyCount: 1 })
    expect(effective.unobservedAdaptiveQuestionIds).not.toContain(adaptiveId)
  })

  it('audits Full Reflection wording without retaining assessment inputs', () => {
    const fixtures = [{
      id: 'sample',
      scenarioId: 'synthetic-output-only',
      description: 'Text-only audit fixture.',
      output: 'KinkAtlas is a private self-reflection tool\nGenerated privately with KinkAtlas.\nResults do not certify safety',
    }]
    const analysis = analyzeReflectionFixtures(fixtures)
    const keys = new Set<string>()
    const collectKeys = (value: unknown) => {
      if (!value || typeof value !== 'object') return
      Object.entries(value).forEach(([key, child]) => {
        keys.add(key)
        collectKeys(child)
      })
    }
    collectKeys(analysis)

    expect(analysis.fixtureCount).toBe(1)
    expect(analysis.sectionCoverage.Reflection).toBe(0)
    expect(analysis.repeatedPhrases.find((item) => item.phrase === 'Generated privately with KinkAtlas.')).toMatchObject({ fixtureCount: 1, totalOccurrences: 1 })
    for (const forbidden of ['discoveryAnswers', 'readinessAnswers', 'boundaries', 'negotiation']) expect(keys.has(forbidden)).toBe(false)
  })
})
