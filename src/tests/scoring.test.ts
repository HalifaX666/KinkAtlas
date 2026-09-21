import { describe, expect, it } from 'vitest'
import { discoveryQuestionById, discoveryQuestions } from '../data/questions'
import { roleById, roles } from '../data/roles'
import { questionDiscrimination, selectNextDiscoveryQuestion } from '../engine/adaptiveQuestioning'
import { activityRecommendations } from '../engine/activityRecommendations'
import { boundaryItems } from '../data/boundaries'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { evaluateReadiness, generateBlindSpots, scoreReadiness } from '../engine/readinessScoring'
import { matchRole, matchRoles } from '../engine/roleMatching'
import type { AssessmentAnswers, Role, TraitScores } from '../types'

const empty = (): AssessmentAnswers => ({ discovery: {}, readiness: {}, boundaries: {}, negotiation: {} })

describe('role data contracts', () => {
  it('loads the audited data-driven scored roles after the taxonomy checkpoint', () => {
    expect(roles).toHaveLength(101)
    expect(new Set(roles.map((role) => role.id)).size).toBe(roles.length)
    roles.forEach((role) => {
      expect(role.facets).toContain(role.primaryCategory)
      expect(role.vocabularyKind).toBe('scored-role')
      expect(Object.keys(role.differentiatingTraits).length).toBeGreaterThan(0)
      Object.values({ ...role.traits, ...role.differentiatingTraits, ...role.contraryTraits }).forEach((weight) => {
        expect(weight).toBeGreaterThanOrEqual(0)
        expect(weight).toBeLessThanOrEqual(1)
      })
    })
  })

  it('supports cross-taxonomy facets without changing a primary category', () => {
    expect(roleById['service-dominant'].primaryCategory).toBe('service')
    expect(roleById['service-dominant'].facets).toContain('power-exchange')
    expect(roleById.owner.facets).toEqual(expect.arrayContaining(['pet-owner','power-exchange','caregiving','roleplay']))
  })
})

describe('differentiated discovery scoring', () => {
  it('lets one rope answer distinguish tying from being tied', () => {
    const tying = calculateTraitScores({ 'd-rope': 'strong' })
    const tied = calculateTraitScores({ 'd-rope': 'some' })
    expect(tying.ropeGiving?.value).toBeGreaterThan(tying.ropeReceiving?.value ?? 0)
    expect(tied.ropeReceiving?.value).toBeGreaterThan(tied.ropeGiving?.value ?? 0)
  })

  it('lets care answers distinguish giving and receiving care', () => {
    const giving = calculateTraitScores({ 'd-care': 'strong' })
    const receiving = calculateTraitScores({ 'd-care': 'some' })
    expect(giving.caregiving?.value).toBeGreaterThan(giving.beingCaredFor?.value ?? 0)
    expect(receiving.beingCaredFor?.value).toBeGreaterThan(receiving.caregiving?.value ?? 0)
  })

  it('keeps dominance and submission independent and can support Switch', () => {
    const discovery = { 'd-power-give': 'strong', 'd-power-receive': 'strong', 'd-flexibility': 'strong', 'r-both-power': 'strong' }
    const traits = calculateTraitScores(discovery)
    expect(traits.dominance?.value).toBeGreaterThan(.7)
    expect(traits.submission?.value).toBeGreaterThan(.7)
    expect(matchRole(roleById.switch, traits, discovery).alignment).toBe('strong')
  })

  it('keeps unrelated strong interests from cancelling one another', () => {
    const traits = calculateTraitScores({ 'd-intensity': 'strong', 'd-care': 'strong' })
    expect(traits.painGiving?.value).toBeGreaterThan(.8)
    expect(traits.caregiving?.value).toBeGreaterThan(.8)
  })

  it('gives unknown and prefer-not answers no score or evidence', () => {
    expect(calculateTraitScores({ 'd-power-give': 'prefer-not', 'd-power-receive': 'unknown' })).toEqual({})
  })

  it('recalculates cleanly when an answer changes', () => {
    const positive = calculateTraitScores({ 'd-power-give': 'strong' })
    const negative = calculateTraitScores({ 'd-power-give': 'no' })
    expect(positive.dominance?.value).toBeGreaterThan(negative.dominance?.value ?? 1)
  })
})

describe('alignment, evidence ranking, and confidence', () => {
  it('uses an explicit deterministic fallback instead of caller insertion order for exact ties', () => {
    const alpha: Role = { ...roleById.dominant, id: 'alpha-tie', name: 'Alpha Tie' }
    const omega: Role = { ...roleById.dominant, id: 'omega-tie', name: 'Omega Tie' }
    const discovery = { 'd-power-give': 'strong' }
    const traitScores = calculateTraitScores(discovery)
    const forward = matchRoles(traitScores, discovery, [omega, alpha]).map((result) => result.role.id)
    const reversed = matchRoles(traitScores, discovery, [alpha, omega]).map((result) => result.role.id)

    expect(forward).toEqual(['alpha-tie', 'omega-tie'])
    expect(reversed).toEqual(forward)
  })

  it('keeps raw alignment distinct from evidence-moderated ranking', () => {
    const discovery = { 'r-rope-give': 'strong' }
    const result = matchRole(roleById.rigger, calculateTraitScores(discovery), discovery)
    expect(result.rawScore).toBeGreaterThan(result.rankedScore)
    expect(result.alignment).toBe('strong')
    expect(result.confidence).toBe('low')
  })

  it('increases evidence-adjusted ranking and confidence with relevant coverage', () => {
    const sparse = { 'r-rope-give': 'strong' }
    const covered = { ...sparse, 'd-rope': 'strong', 'r-rope-both': 'some', 'r-lead': 'some', 'd-position-give': 'strong', 'd-exploration': 'some' }
    const sparseResult = matchRole(roleById.rigger, calculateTraitScores(sparse), sparse)
    const coveredResult = matchRole(roleById.rigger, calculateTraitScores(covered), covered)
    expect(coveredResult.rankedScore).toBeGreaterThan(sparseResult.rankedScore)
    expect(coveredResult.confidence).not.toBe('low')
  })

  it('keeps high raw rope alignment cautious until evidence quantity catches up', () => {
    const sparse = { 'd-rope': 'strong', 'r-rope-give': 'strong' }
    const covered = { ...sparse, 'r-rope-motivation': 'strong', 'd-position-give': 'strong', 'r-top': 'strong', 'r-lead': 'strong', 'd-material': 'some' }
    const sparseResult = matchRole(roleById.rigger, calculateTraitScores(sparse), sparse)
    const coveredResult = matchRole(roleById.rigger, calculateTraitScores(covered), covered)
    expect(sparseResult.alignment).toBe('strong')
    expect(sparseResult.confidence).toBe('low')
    expect(sparseResult.rankedScore).toBeLessThan(sparseResult.rawScore)
    expect(coveredResult.alignment).toBe('strong')
    expect(coveredResult.confidence).toBe('high')
    expect(coveredResult.rankedScore).toBeGreaterThan(sparseResult.rankedScore)
  })

  it('uses differentiating traits to separate otherwise nearby roles', () => {
    const discovery = { 'd-power-give': 'strong', 'd-service': 'strong', 'r-service-direct': 'strong', 'r-lead': 'some' }
    const results = matchRoles(calculateTraitScores(discovery), discovery)
    expect(results.findIndex((item) => item.role.id === 'service-dominant')).toBeLessThan(results.findIndex((item) => item.role.id === 'dominant'))
  })

  it('records and penalizes explicit contrary evidence', () => {
    const base: Role = { ...roleById.dominant, id: 'base', name: 'Base', contraryTraits: {} }
    const contrary: Role = { ...base, id: 'contrary', name: 'Contrary', contraryTraits: { receivingControl: 1 } }
    const discovery = { 'd-power-give': 'strong', 'd-power-receive': 'strong' }
    const traits = calculateTraitScores(discovery)
    const baseResult = matchRole(base, traits, discovery)
    const contraryResult = matchRole(contrary, traits, discovery)
    expect(contraryResult.rawScore).toBeLessThan(baseResult.rawScore)
    expect(contraryResult.contradictoryEvidence).toContainEqual(expect.objectContaining({ id: 'receivingControl' }))
  })

  it('does not accept boundaries as an input to identity matching', () => {
    const answers = empty()
    answers.discovery = { 'd-rope': 'strong', 'r-rope-give': 'strong' }
    answers.boundaries.rope = 'hard-limit'
    const before = matchRoles(calculateTraitScores(answers.discovery), answers.discovery)
    answers.boundaries.rope = 'love'
    const after = matchRoles(calculateTraitScores(answers.discovery), answers.discovery)
    expect(after).toEqual(before)
  })

  it('uses boundaries only for separate activity guidance', () => {
    const guidance = activityRecommendations({ rope: 'hard-limit', sensation: 'curious' }, boundaryItems)
    expect(guidance.find((item) => item.item.id === 'rope')).toMatchObject({ status: 'off-table' })
    expect(guidance.find((item) => item.item.id === 'sensation')).toMatchObject({ status: 'discuss' })
  })
})

describe('readiness separation and persistent critical flags', () => {
  it('does not use readiness answers in role alignment', () => {
    const discovery = { 'd-power-give': 'strong', 'r-lead': 'strong' }
    const before = matchRole(roleById.dominant, calculateTraitScores(discovery), discovery)
    scoreReadiness({ 'c-ongoing-1': 'c', 'c-power-1': 'c' })
    const after = matchRole(roleById.dominant, calculateTraitScores(discovery), discovery)
    expect(after).toEqual(before)
  })

  it('assigns explicit severity and cumulative evidence to blind spots', () => {
    const partial = generateBlindSpots({ 'c-ongoing-1': 'b' }).find((spot) => spot.id === 'prior-negotiation')
    const critical = generateBlindSpots({ 'c-ongoing-1': 'c' }).find((spot) => spot.id === 'prior-negotiation')
    expect(partial).toMatchObject({ severity: 'notice', evidence: 1, critical: false })
    expect(critical).toMatchObject({ severity: 'critical', evidence: 2.5, critical: true })
  })

  it('does not average away a critical concept response', () => {
    const assessment = evaluateReadiness({ 'c-ongoing-1': 'c', 'c-ongoing-2': 'a', 'c-neg-1': 'a', 'c-comm-1': 'a' })
    expect(assessment.criticalFlags).toContainEqual(expect.objectContaining({ id: 'prior-negotiation' }))
  })

  it('preserves authority-scope and safeword-only misconceptions amid otherwise strong answers', () => {
    const assessment = evaluateReadiness({
      'c-neg-2': 'c',
      'c-power-2': 'a',
      'c-stop-1': 'c',
      'c-stop-2': 'a',
      'c-ongoing-1': 'a',
      'c-bound-1': 'a',
      'c-risk-1': 'a',
    })
    expect(assessment.criticalFlags.map((flag) => flag.id)).toEqual(expect.arrayContaining(['authority-scope', 'safeword-only']))
  })
})

describe('role-discrimination adaptive questioning', () => {
  const broadAnswers = (overrides: Record<string, string> = {}) => Object.fromEntries(
    discoveryQuestions.filter((question) => question.phase === 'broad').map((question) => [question.id, overrides[question.id] ?? 'no']),
  )

  it('scores a service question as discriminating between Dominant and Service Dominant', () => {
    const serviceQuestion = discoveryQuestionById['r-service-direct']
    const genericPowerQuestion = discoveryQuestionById['r-lead']
    const nearbyRoles = [roleById.dominant, roleById['service-dominant']]
    expect(questionDiscrimination(serviceQuestion, nearbyRoles)).toBeGreaterThan(questionDiscrimination(genericPowerQuestion, nearbyRoles))
  })

  it('selects a follow-up that separates plausible roles', () => {
    const answers = empty()
    answers.discovery = broadAnswers({ 'd-power-give': 'strong', 'd-service': 'strong' })
    const next = selectNextDiscoveryQuestion(answers, calculateTraitScores(answers.discovery))
    expect(next?.phase).toBe('refine')
    expect(next?.traits.some((trait) => ['serviceGiving','pleasureGiving','responsibility','dominance'].includes(trait))).toBe(true)
    expect(['r-service-direct', 'r-service-give', 'r-tamer', 'r-discipline-give']).toContain(next?.id)
  })

  it('selects directional rope refinement instead of a generic position question', () => {
    const answers = empty()
    answers.discovery = broadAnswers({ 'd-rope': 'curious' })
    const next = selectNextDiscoveryQuestion(answers, calculateTraitScores(answers.discovery))
    expect(['r-rope-give', 'r-rope-receive', 'r-rope-both', 'r-rope-motivation']).toContain(next?.id)
  })

  it('does not probe a consistently rejected rope domain', () => {
    const answers = empty()
    answers.discovery = broadAnswers({ 'd-power-give': 'strong', 'd-rope': 'no' })
    const next = selectNextDiscoveryQuestion(answers, calculateTraitScores(answers.discovery))
    expect(next?.domain).not.toBe('rope-bondage')
  })
})
