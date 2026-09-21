import { discoveryQuestionById } from '../data/questions'
import { roles } from '../data/roles'
import { confidenceFor } from './confidence'
import type { AssessmentAnswers, Role, RoleEvidenceRequirement, RoleResult, TraitId, TraitScores } from '../types'

const clamp = (value: number) => Math.max(0, Math.min(1, value))

const alignmentFor = (rawScore: number, evidence: number): RoleResult['alignment'] => {
  if (evidence === 0) return 'insufficient'
  if (rawScore >= .72) return 'strong'
  if (rawScore >= .5) return 'explore'
  return 'some'
}

const entries = (weights: Partial<Record<TraitId, number>> = {}) => Object.entries(weights) as [TraitId, number][]

function weightedMean(weightedTraits: [TraitId, number][], traitScores: TraitScores, fallback: number): number {
  const observed = weightedTraits.filter(([trait]) => (traitScores[trait]?.evidence ?? 0) > 0)
  const totalWeight = observed.reduce((sum, [, weight]) => sum + weight, 0)
  if (!totalWeight) return fallback
  return observed.reduce((sum, [trait, weight]) => sum + (traitScores[trait]?.value ?? 0) * weight, 0) / totalWeight
}

function countRelevantAnswers(role: Role, answers: AssessmentAnswers['discovery']): number {
  const relevantTraits = new Set([
    ...Object.keys(role.traits),
    ...Object.keys(role.differentiatingTraits),
    ...Object.keys(role.contraryTraits ?? {}),
  ])
  return Object.entries(answers).filter(([questionId, answerId]) => {
    const question = discoveryQuestionById[questionId]
    const answer = question?.answers.find((candidate) => candidate.id === answerId)
    return question && answer && !answer.noScore && question.traits.some((trait) => relevantTraits.has(trait))
  }).length
}

function unmetEvidenceRequirements(role: Role, answers: AssessmentAnswers['discovery']): RoleEvidenceRequirement[] {
  return (role.evidenceRequirements ?? []).filter((requirement) => !Object.entries(answers).some(([questionId, answerId]) => (
    discoveryQuestionById[questionId]?.answers.find((answer) => answer.id === answerId)?.qualificationEvidence?.includes(requirement)
  )))
}

export function matchRole(role: Role, traitScores: TraitScores, discoveryAnswers: AssessmentAnswers['discovery']): RoleResult {
  const coreTraits = entries(role.traits)
  const differentiators = entries(role.differentiatingTraits)
  const contraries = entries(role.contraryTraits)
  const observedCore = coreTraits.filter(([trait]) => (traitScores[trait]?.evidence ?? 0) > 0)
  const observedDifferentiators = differentiators.filter(([trait]) => (traitScores[trait]?.evidence ?? 0) > 0)
  const totalCoreWeight = coreTraits.reduce((sum, [, weight]) => sum + weight, 0)
  const observedCoreWeight = observedCore.reduce((sum, [, weight]) => sum + weight, 0)
  const coreCoverage = totalCoreWeight ? observedCoreWeight / totalCoreWeight : 0
  const totalDifferentiatorWeight = differentiators.reduce((sum, [, weight]) => sum + weight, 0)
  const observedDifferentiatorWeight = observedDifferentiators.reduce((sum, [, weight]) => sum + weight, 0)
  const differentiatorCoverage = totalDifferentiatorWeight ? observedDifferentiatorWeight / totalDifferentiatorWeight : 0
  const coverage = coreCoverage * .78 + differentiatorCoverage * .22
  const coreScore = weightedMean(coreTraits, traitScores, 0)
  const differentiatorScore = weightedMean(differentiators, traitScores, .5)
  const contradictionScore = weightedMean(contraries, traitScores, 0)
  const relevantAnswers = countRelevantAnswers(role, discoveryAnswers)
  const requirements = unmetEvidenceRequirements(role, discoveryAnswers)
  const ungatedRawScore = observedCore.length ? clamp(coreScore * .78 + differentiatorScore * .22 - contradictionScore * .25) : 0
  const rawScore = requirements.length ? Math.min(.49, ungatedRawScore) : ungatedRawScore
  const evidenceStrength = clamp(coverage * .7 + Math.min(1, relevantAnswers / 6) * .3)
  const rankedScore = relevantAnswers ? clamp(.35 + (rawScore - .35) * evidenceStrength) : 0

  const observed = observedCore.map(([id]) => ({ id, value: traitScores[id]?.value ?? 0 }))
  const supportingTraits = observed.filter((item) => item.value >= .58).sort((a, b) => b.value - a.value).slice(0, 4)
  const limitingTraits = observed.filter((item) => item.value < .42).sort((a, b) => a.value - b.value).slice(0, 3)
  const differentiatingEvidence = observedDifferentiators
    .map(([id]) => ({ id, value: traitScores[id]?.value ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
  const contradictoryEvidence = contraries
    .filter(([id]) => (traitScores[id]?.evidence ?? 0) > 0 && (traitScores[id]?.value ?? 0) >= .5)
    .map(([id]) => ({ id, value: traitScores[id]?.value ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  return {
    role,
    rawScore,
    rankedScore,
    alignment: alignmentFor(rawScore, relevantAnswers),
    confidence: confidenceFor(relevantAnswers, coverage),
    relevantAnswers,
    coverage,
    supportingTraits,
    limitingTraits,
    differentiatingEvidence,
    contradictoryEvidence,
    unmetEvidenceRequirements: requirements.length ? requirements : undefined,
  }
}

export function matchRoles(traitScores: TraitScores, discoveryAnswers: AssessmentAnswers['discovery'], roleDataset: Role[] = roles): RoleResult[] {
  return roleDataset
    .map((role) => matchRole(role, traitScores, discoveryAnswers))
    .sort((a, b) => b.rankedScore - a.rankedScore || b.rawScore - a.rawScore || b.relevantAnswers - a.relevantAnswers || a.role.id.localeCompare(b.role.id))
}
