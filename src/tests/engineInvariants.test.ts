import { describe, expect, it } from 'vitest'
import { discoveryQuestions } from '../data/questions'
import { refinementQuestions } from '../data/refinement'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { matchRoles } from '../engine/roleMatching'
import { preferredPrimaryRoleIdsFromRefinement } from '../engine/refinementEvidence'
import { MAX_REFINEMENT_QUESTIONS, selectRefinementQuestions } from '../engine/refinementRouting'
import { buildRoleProfileCandidates, buildSuggestedRoleProfileEntries, optimizeRoleProfile } from '../engine/roleProfileOptimizer'
import type { AssessmentAnswers } from '../types'

const seeds = [0x12345678, 0x1badb002, 0x5eedc0de, 0x7f4a7c15, 0x9e3779b9, 0xc0ffee42]
const casesPerSeed = 8

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

function reverseRecord(record: Record<string, string>) {
  return Object.fromEntries(Object.entries(record).reverse())
}

function generatedAssessment(seed: number, caseIndex: number): AssessmentAnswers {
  const random = seededRandom((seed + Math.imul(caseIndex + 1, 0x9e3779b1)) >>> 0)
  const discovery: Record<string, string> = {}

  discoveryQuestions.forEach((question) => {
    if (random() < 0.68) {
      discovery[question.id] = question.answers[Math.floor(random() * question.answers.length)].id
    }
  })

  const base: AssessmentAnswers = { discovery, refinement: {}, readiness: {}, boundaries: {}, negotiation: {} }
  const scores = calculateTraitScores(discovery)
  const refinement: Record<string, string> = {}
  selectRefinementQuestions(base, scores).forEach((question) => {
    if (random() < 0.8) refinement[question.id] = question.answers[Math.floor(random() * question.answers.length)].id
  })

  return { ...base, refinement }
}

function evaluate(answers: AssessmentAnswers) {
  const traitScores = calculateTraitScores(answers.discovery)
  const roleResults = matchRoles(traitScores, answers.discovery)
  const candidates = buildRoleProfileCandidates(roleResults, answers.refinement, answers.discovery)
  const suggested = buildSuggestedRoleProfileEntries(roleResults, answers.refinement, answers.discovery)
  return {
    traitScores,
    roleResults: roleResults.map((result) => ({
      roleId: result.role.id,
      rawScore: result.rawScore,
      rankedScore: result.rankedScore,
      alignment: result.alignment,
      confidence: result.confidence,
    })),
    candidates,
    suggestedRoleIds: suggested.map((role) => role.roleId),
  }
}

function expectTraitScoresEquivalent(actual: ReturnType<typeof calculateTraitScores>, expected: ReturnType<typeof calculateTraitScores>, label: string) {
  expect(Object.keys(actual).sort(), `${label}: trait keys`).toEqual(Object.keys(expected).sort())
  Object.entries(expected).forEach(([traitId, expectedScore]) => {
    const actualScore = actual[traitId as keyof typeof actual]
    expect(actualScore?.evidence, `${label}: ${traitId} evidence`).toBe(expectedScore?.evidence)
    expect(actualScore?.value, `${label}: ${traitId} value`).toBeCloseTo(expectedScore?.value ?? 0, 14)
  })
}

function expectRoleResultsEquivalent(actual: ReturnType<typeof evaluate>['roleResults'], expected: ReturnType<typeof evaluate>['roleResults'], label: string) {
  expect(actual.map(({ roleId }) => roleId), `${label}: role order`).toEqual(expected.map(({ roleId }) => roleId))
  actual.forEach((result, index) => {
    const expectedResult = expected[index]
    expect(result.alignment, `${label}: ${result.roleId} alignment`).toBe(expectedResult.alignment)
    expect(result.confidence, `${label}: ${result.roleId} confidence`).toBe(expectedResult.confidence)
    expect(result.rawScore, `${label}: ${result.roleId} raw score`).toBeCloseTo(expectedResult.rawScore, 14)
    expect(result.rankedScore, `${label}: ${result.roleId} ranked score`).toBeCloseTo(expectedResult.rankedScore, 14)
  })
}

describe('deterministic generated engine invariants', () => {
  it(`preserves scoring, independence, policy, caps, and caller-order contracts across ${seeds.length * casesPerSeed} generated cases`, () => {
    for (const seed of seeds) {
      for (let caseIndex = 0; caseIndex < casesPerSeed; caseIndex += 1) {
        const label = `seed ${seed.toString(16)} case ${caseIndex}`
        const answers = generatedAssessment(seed, caseIndex)
        const first = evaluate(answers)
        const repeated = evaluate(answers)

        expect(repeated, `${label}: repeat evaluation`).toEqual(first)
        expect(first.suggestedRoleIds.length, `${label}: recommendation cap`).toBeLessThanOrEqual(5)
        expect(selectRefinementQuestions(answers, first.traitScores).length, `${label}: Refine presentation cap`).toBeLessThanOrEqual(MAX_REFINEMENT_QUESTIONS)

        const policyByRoleId = new Map(first.candidates.map((candidate) => [candidate.roleId, candidate.decisionPathway]))
        expect(first.suggestedRoleIds.every((roleId) => policyByRoleId.get(roleId) !== 'manual-only'), `${label}: manual-only recommendation policy`).toBe(true)

        first.candidates.filter((candidate) => candidate.evidenceType === 'exact-label').forEach((candidate) => {
          expect(candidate.rawAlignment, `${label}: ${candidate.label} exact-label alignment`).toBeUndefined()
          expect(candidate.confidence, `${label}: ${candidate.label} exact-label confidence`).toBeUndefined()
        })

        const changedBoundaries = evaluate({ ...answers, boundaries: { activity: 'hard-limit' } })
        expect(changedBoundaries.traitScores, `${label}: boundary-independent traits`).toEqual(first.traitScores)
        expect(changedBoundaries.roleResults, `${label}: boundary-independent roles`).toEqual(first.roleResults)
        expect(changedBoundaries.suggestedRoleIds, `${label}: boundary-independent suggestions`).toEqual(first.suggestedRoleIds)

        const changedReadiness = evaluate({ ...answers, readiness: { consent: 'prefer-not' } })
        expect(changedReadiness.traitScores, `${label}: readiness-independent traits`).toEqual(first.traitScores)
        expect(changedReadiness.roleResults, `${label}: readiness-independent roles`).toEqual(first.roleResults)
        expect(changedReadiness.suggestedRoleIds, `${label}: readiness-independent suggestions`).toEqual(first.suggestedRoleIds)

        const reorderedAnswers = { ...answers, discovery: reverseRecord(answers.discovery), refinement: reverseRecord(answers.refinement) }
        const reordered = evaluate(reorderedAnswers)
        expectTraitScoresEquivalent(reordered.traitScores, first.traitScores, `${label}: answer insertion-order`)
        expectRoleResultsEquivalent(reordered.roleResults, first.roleResults, `${label}: answer insertion-order`)
        expect(reordered.suggestedRoleIds, `${label}: answer insertion-order suggestions`).toEqual(first.suggestedRoleIds)

        const preferredPrimaryRoleIds = preferredPrimaryRoleIdsFromRefinement(answers.refinement, answers.discovery)
        const normalOptimization = optimizeRoleProfile(first.candidates, 5, { preferredPrimaryRoleIds })
        const reversedOptimization = optimizeRoleProfile([...first.candidates].reverse(), 5, { preferredPrimaryRoleIds })
        expect(reversedOptimization.recommendations.map((item) => item.candidate.roleId), `${label}: candidate caller-order stability`).toEqual(normalOptimization.recommendations.map((item) => item.candidate.roleId))
      }
    }
  })

  it('rejects an injected stale Refine answer and keeps exact-label vocabulary scoreless', () => {
    const staleDiscovery = {
      'd-power-receive': 'no',
      'd-position-give': 'strong',
      'r-top': 'strong',
      'r-lead': 'strong',
    }
    const staleResults = matchRoles(calculateTraitScores(staleDiscovery), staleDiscovery)
    const staleCandidate = buildRoleProfileCandidates(staleResults, { 'ref-sub-top': 'yes' }, staleDiscovery).find((candidate) => candidate.label === 'Submissive Top')
    expect(staleCandidate).toMatchObject({ evidenceType: 'hybrid', eligible: false })

    const primalDiscovery = { 'd-primal': 'strong', 'r-primal-give': 'strong' }
    const primalResults = matchRoles(calculateTraitScores(primalDiscovery), primalDiscovery)
    const primalCandidate = buildRoleProfileCandidates(primalResults, { 'ref-primal-vocabulary': 'yes' }, primalDiscovery).find((candidate) => candidate.label === 'Primal')
    expect(primalCandidate).toMatchObject({ evidenceType: 'exact-label', eligible: true, rawAlignment: undefined, confidence: undefined })
  })

  it('keeps the generator aligned with the reviewed question inventories', () => {
    expect(discoveryQuestions.length).toBeGreaterThan(0)
    expect(refinementQuestions.length).toBeGreaterThan(0)
  })
})
