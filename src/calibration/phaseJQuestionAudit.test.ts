import { describe, expect, it } from 'vitest'
import { discoveryQuestions } from '../data/questions'
import { roles } from '../data/roles'
import { selectNextDiscoveryQuestion } from '../engine/adaptiveQuestioning'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { roleLibrary } from '../taxonomy/roleLibrary'
import { traits } from '../data/traits'
import type { AssessmentAnswers } from '../types'
import { assessmentPersonas } from '../tests/fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from '../tests/helpers/assessmentPersonaRunner'
import { buildPhaseJ2Audit } from './phaseJQuestionAudit'
import { phaseJ2JourneySeeds, runPhaseJ2Journey } from './phaseJ2Journeys'

const originalJourneys = assessmentPersonas.map(evaluateAssessmentPersona).map((evaluation) => ({ id: evaluation.persona.id, questionIds: evaluation.adaptiveQuestionIds }))

describe('Phase J.2 question coverage and discrimination audit', () => {
  it('is deterministic and leaves canonical source data unchanged', () => {
    const before = JSON.stringify({ discoveryQuestions, roles, roleLibrary })
    expect(buildPhaseJ2Audit(originalJourneys)).toEqual(buildPhaseJ2Audit(originalJourneys))
    expect(JSON.stringify({ discoveryQuestions, roles, roleLibrary })).toBe(before)
  })

  it('uses valid answers and the production selector for every journey', () => {
    const questions = new Map(discoveryQuestions.map((question) => [question.id, question]))
    phaseJ2JourneySeeds.forEach((seed) => {
      const journey = runPhaseJ2Journey(seed)
      const replay: AssessmentAnswers = { discovery: {}, refinement: {}, readiness: {}, boundaries: {}, negotiation: {} }
      expect(journey.selectedQuestionIds.length).toBeGreaterThanOrEqual(20)
      expect(journey.selectedQuestionIds.length).toBeLessThanOrEqual(26)
      expect(journey.selectedQuestionIds.slice(0, 20)).toEqual(discoveryQuestions.filter((question) => question.phase === 'broad').map((question) => question.id))
      journey.selectedQuestionIds.forEach((questionId) => {
        expect(selectNextDiscoveryQuestion(replay, calculateTraitScores(replay.discovery))?.id).toBe(questionId)
        const answerId = journey.broadAnswers[questionId] ?? journey.adaptiveAnswers[questionId]
        if (!answerId) throw new Error(`Missing replay answer for ${questionId}`)
        replay.discovery[questionId] = answerId
      })
      journey.selectedAdaptiveQuestionIds.forEach((questionId) => expect(questions.get(questionId)?.phase).toBe('refine'))
      Object.entries({ ...journey.broadAnswers, ...journey.adaptiveAnswers }).forEach(([questionId, answerId]) => expect(questions.get(questionId)?.answers.some((answer) => answer.id === answerId)).toBe(true))
    })
    expect(selectNextDiscoveryQuestion).toBeTypeOf('function')
  })

  it('keeps static, selected, usable, explicit-gate, and eligibility layers distinct', () => {
    const audit = buildPhaseJ2Audit(originalJourneys)
    const preferNot = audit.evidenceMap.questions.flatMap((question) => question.answers).find((answer) => answer.pathKind === 'prefer-not')
    const qualifying = audit.evidenceMap.questions.flatMap((question) => question.answers).find((answer) => answer.qualificationEvidence.length > 0)
    expect(audit.evidenceMap.counts).toMatchObject({ questions: 72, broadQuestions: 20, adaptiveQuestions: 52, traits: 44, scoredRoles: 101, families: 26 })
    expect(preferNot).toMatchObject({ usableEvidence: false })
    expect(qualifying?.satisfiesExplicitRequirementsForRoleIds.length).toBeGreaterThan(0)
    expect(audit.evidenceMap.questions.flatMap((question) => question.answers).every((answer) => !answer.recommendationEligibility.sufficientByItself)).toBe(true)

    const traitIds = new Set(traits.map((trait) => trait.id))
    const roleIds = new Set(roles.map((role) => role.id))
    const familyIds = new Set(Object.keys(roleLibrary.families))
    audit.evidenceMap.questions.forEach((question) => {
      question.declaredTraits.forEach((traitId) => expect(traitIds.has(traitId)).toBe(true))
      question.relatedScoredRoleIds.forEach((roleId) => expect(roleIds.has(roleId)).toBe(true))
      question.relatedFamilies.forEach((familyId) => expect(familyIds.has(familyId)).toBe(true))
      question.answers.forEach((answer) => {
        answer.emittedTraits.forEach(({ traitId }) => expect(traitIds.has(traitId as never)).toBe(true))
        answer.satisfiesExplicitRequirementsForRoleIds.forEach((roleId) => expect(roleIds.has(roleId)).toBe(true))
      })
    })
  })

  it('preserves accepted diagnostics and reports architectural gaps without changing behavior', () => {
    const audit = buildPhaseJ2Audit(originalJourneys)
    expect(audit.reachability.original).toMatchObject({ journeyCount: 37, observedAdaptiveQuestionCount: 42, totalAdaptiveQuestionCount: 52 })
    expect(audit.reachability.expanded).toMatchObject({ observedAdaptiveQuestionCount: 52, totalAdaptiveQuestionCount: 52 })
    expect(audit.reachability.originallyUnobserved).toHaveLength(10)
    expect(audit.reachability.originallyUnobserved.every((question) => question.classification === 'reachable-and-observed-by-new-valid-journey')).toBe(true)
    expect(audit.acceptedDiagnostics).toHaveLength(5)
    expect(audit.acceptedDiagnostics.every((item) => item.remainsVisible)).toBe(true)
    expect(audit.authorityHolder).toMatchObject({ scoredRoleExists: true, exactPublicNodeCount: 0, conclusion: 'missing-public-role-node-not-a-reporting-artifact' })
    expect(audit.directInterest).toMatchObject({ candidateConstructionEligible: false })
    expect(audit.safeguards).toEqual({ observationalOnly: true, productionQuestionDataChanged: false, scoringChanged: false, routingChanged: false, eligibilityChanged: false, recommendationBehaviorChanged: false, privacyOrSnapshotBehaviorChanged: false })
  })
})
