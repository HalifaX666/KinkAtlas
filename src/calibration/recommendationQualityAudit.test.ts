import { describe, expect, it, vi } from 'vitest'
import { boundaryItems, boundaryOptions } from '../data/boundaries'
import { discoveryQuestions } from '../data/questions'
import { readinessQuestions } from '../data/readiness'
import { roles } from '../data/roles'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { selectNextDiscoveryQuestion } from '../engine/adaptiveQuestioning'
import { optimizeRoleProfile } from '../engine/roleProfileOptimizer'
import { roleLibrary } from '../taxonomy/roleLibrary'
import type { AssessmentAnswers } from '../types'
import { recommendationResults } from './recommendationPersonas'
import { phaseJ3JourneySeeds, phaseJ3SensitivityPairs, runPhaseJ3Journey, sensitivityVariantSeed } from './phaseJ3Journeys'
import { buildRecommendationQualityAudit } from './recommendationQualityAudit'

const canonicalSource = () => JSON.stringify({
  roles,
  roleLibrary,
  recommendationResults: recommendationResults.map((result) => ({
    id: result.persona.id,
    roleIds: result.optimization.recommendations.map((item) => item.candidate.roleId),
    primaryRoleId: result.optimization.primary?.candidate.roleId,
    failures: result.failures,
  })),
  readinessQuestions,
  boundaryItems,
  boundaryOptions,
})

describe('Phase J.3 recommendation quality audit', () => {
  it('is deterministic, isolated, and exactly reproduces production optimization', () => {
    const before = canonicalSource()
    const first = buildRecommendationQualityAudit()
    const second = buildRecommendationQualityAudit()

    expect(second).toEqual(first)
    expect(first.counts).toMatchObject({ existingRecommendationScenarios: 50, productionSelectorJourneys: 19, totalScenarios: 69 })
    expect(first.adapterEquivalence).toEqual({ matchedScenarios: 69, totalScenarios: 69, exact: true })
    expect(canonicalSource()).toBe(before)
  })

  it('preserves every existing recommendation baseline and selection invariant', () => {
    const audit = buildRecommendationQualityAudit()
    const existing = new Map(audit.baseline.filter((scenario) => scenario.kind === 'existing-recommendation-persona').map((scenario) => [scenario.scenarioId, scenario]))

    recommendationResults.forEach((result) => {
      const scenario = existing.get(result.persona.id)
      expect(scenario?.suggestedRoleIds).toEqual(result.optimization.recommendations.map((item) => item.candidate.roleId))
      expect(scenario?.suggestedPrimaryRoleId).toBe(result.optimization.primary?.candidate.roleId)
    })

    audit.baseline.forEach((scenario) => {
      expect(scenario.suggestedRoleIds.length).toBeLessThanOrEqual(5)
      scenario.suggestedRoleIds.forEach((roleId) => {
        const candidate = scenario.candidates.find((item) => item.roleId === roleId)
        expect(candidate?.eligible).toBe(true)
        expect(candidate?.decisionPathway).not.toBe('manual-only')
      })
      const primary = scenario.candidates.find((item) => item.roleId === scenario.suggestedPrimaryRoleId)
      if (primary) expect(['direct-primary', 'competitive']).toContain(primary.primaryPolicy)
    })
  })

  it('keeps direct-interest and production taxonomy policy unchanged', () => {
    const beforeRelationships = JSON.stringify(roleLibrary.relationships)
    const beforeFamilies = JSON.stringify(roleLibrary.roles.map((role) => ({ id: role.id, familyIds: role.familyIds })))
    const audit = buildRecommendationQualityAudit()

    expect(audit.directInterest).toMatchObject({
      roleCount: 94,
      productionSelectorEligibleOccurrences: 0,
      explicitEvidenceStoredByCurrentDiscovery: false,
    })
    expect(audit.safeguards).toMatchObject({
      observationalOnly: true,
      productionOptimizerChanged: false,
      scoringChanged: false,
      eligibilityChanged: false,
      roleMetadataChanged: false,
      readinessOrBoundariesChanged: false,
      networkCallsIntroduced: false,
    })
    expect(JSON.stringify(roleLibrary.relationships)).toBe(beforeRelationships)
    expect(JSON.stringify(roleLibrary.roles.map((role) => ({ id: role.id, familyIds: role.familyIds })))).toBe(beforeFamilies)
  })

  it('uses valid production-selector journeys and valid answer choices', () => {
    const questions = new Map(discoveryQuestions.map((question) => [question.id, question]))
    phaseJ3JourneySeeds.forEach((seed) => {
      const journey = runPhaseJ3Journey(seed)
      const replay: AssessmentAnswers = { discovery: {}, refinement: {}, readiness: {}, boundaries: {}, negotiation: {} }
      journey.selectedQuestionIds.forEach((questionId) => {
        expect(selectNextDiscoveryQuestion(replay, calculateTraitScores(replay.discovery))?.id).toBe(questionId)
        const answerId = journey.broadAnswers[questionId] ?? journey.adaptiveAnswers[questionId]
        expect(questions.get(questionId)?.answers.some((answer) => answer.id === answerId)).toBe(true)
        replay.discovery[questionId] = answerId
      })
      expect(journey.selectedAdaptiveQuestionIds.length).toBeLessThanOrEqual(6)
    })
  })

  it('does not treat missing or prefer-not evidence as negative evidence', () => {
    const unknown = calculateTraitScores({ 'd-power-give': 'unknown' })
    const preferNot = calculateTraitScores({ 'd-power-give': 'prefer-not' })
    const contrary = calculateTraitScores({ 'd-power-give': 'no' })
    expect(unknown.givingControl?.evidence ?? 0).toBe(0)
    expect(preferNot.givingControl?.evidence ?? 0).toBe(0)
    expect(contrary.givingControl?.evidence ?? 0).toBeGreaterThan(0)
  })

  it('keeps counterfactual references valid and leaves later production runs unchanged', () => {
    const before = recommendationResults.map((result) => result.optimization.recommendations.map((item) => item.candidate.roleId))
    const audit = buildRecommendationQualityAudit()
    const roleIds = new Set(roleLibrary.roles.map((role) => role.id))
    const familyIds = new Set(Object.keys(roleLibrary.families))

    audit.relationshipCounterfactual.individual.forEach((proposal) => {
      expect(roleIds.has(proposal.leftRoleId)).toBe(true)
      expect(roleIds.has(proposal.rightRoleId)).toBe(true)
    })
    audit.familyCounterfactual.forEach((proposal) => {
      expect(roleIds.has(proposal.roleId)).toBe(true)
      proposal.proposedFamilyIds.forEach((familyId) => expect(familyIds.has(familyId)).toBe(true))
    })

    const after = recommendationResults.map((result) => optimizeRoleProfile(result.persona.candidates, 5, result.persona.options).recommendations.map((item) => item.candidate.roleId))
    expect(after).toEqual(before)
  })

  it('does not misclassify canonical aliases as omitted independent interests', () => {
    const audit = buildRecommendationQualityAudit()
    expect(audit.qualitySummary.scenariosWithOmittedIndependentInterests.map((item) => item.scenarioId)).not.toContain('near-synonymous-rope-labels')
  })

  it('records bounded one-dimension sensitivity comparisons', () => {
    const audit = buildRecommendationQualityAudit()
    expect(audit.sensitivity).toHaveLength(phaseJ3SensitivityPairs.length)
    phaseJ3SensitivityPairs.forEach((pair) => {
      const baseline = runPhaseJ3Journey(phaseJ3JourneySeeds.find((seed) => seed.id === pair.baselineId)!)
      const variant = runPhaseJ3Journey(sensitivityVariantSeed(pair))
      const result = audit.sensitivity.find((item) => item.id === pair.id)
      expect(result?.baselineRoleIds).toEqual(baseline.suggestedRoleIds)
      expect(result?.variantRoleIds).toEqual(variant.suggestedRoleIds)
      expect(['expected-sensitivity', 'acceptable-uncertainty', 'potential-instability', 'stable']).toContain(result?.classification)
    })
  })

  it('does not perform production network calls while generating the audit', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    buildRecommendationQualityAudit()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
