import { discoveryQuestions } from '../data/questions'
import { roles } from '../data/roles'
import { matchRoles } from './roleMatching'
import type { AssessmentAnswers, DiscoveryQuestion, Role, RoleCategoryId, TraitId, TraitScores } from '../types'

const MAX_DISCOVERY_QUESTIONS = 26

function rejectedDomains(discoveryAnswers: AssessmentAnswers['discovery']): Set<RoleCategoryId> {
  const rejected = new Set<RoleCategoryId>()
  const domainSignals = new Map<RoleCategoryId, number[]>()
  discoveryQuestions.filter((question) => question.phase === 'broad').forEach((question) => {
    const answer = question.answers.find((candidate) => candidate.id === discoveryAnswers[question.id])
    if (!answer || answer.noScore) return
    const values = Object.values(answer.effects ?? {})
    if (!values.length) return
    const signals = domainSignals.get(question.domain) ?? []
    signals.push(Math.max(...values))
    domainSignals.set(question.domain, signals)
  })
  domainSignals.forEach((signals, domain) => {
    if (signals.length && signals.every((value) => value <= .15)) rejected.add(domain)
  })
  return rejected
}

function roleTraitWeight(role: Role, trait: TraitId): number {
  return (role.traits[trait] ?? 0) + (role.differentiatingTraits[trait] ?? 0) * .7 - (role.contraryTraits?.[trait] ?? 0) * .8
}

export function questionDiscrimination(question: DiscoveryQuestion, plausibleRoles: Role[]): number {
  if (!plausibleRoles.length) return 0
  if (plausibleRoles.length === 1) {
    return question.traits.reduce((sum, trait) => sum + Math.abs(roleTraitWeight(plausibleRoles[0], trait)), 0) / question.traits.length
  }
  let difference = 0
  let pairs = 0
  for (let left = 0; left < plausibleRoles.length; left += 1) {
    for (let right = left + 1; right < plausibleRoles.length; right += 1) {
      difference += question.traits.reduce((sum, trait) => sum + Math.abs(roleTraitWeight(plausibleRoles[left], trait) - roleTraitWeight(plausibleRoles[right], trait)), 0) / question.traits.length
      pairs += 1
    }
  }
  return pairs ? difference / pairs : 0
}

export interface QuestionInformationValue {
  plausibleRoleSeparation: number
  unresolvedFamilyDirection: number
  differentiatorCoverage: number
  confidenceGainPotential: number
  evidenceIndependence: number
  total: number
}

export function questionInformationValue(
  question: DiscoveryQuestion,
  plausibleRoles: Role[],
  traitScores: TraitScores,
): QuestionInformationValue {
  const plausibleRoleSeparation = questionDiscrimination(question, plausibleRoles)
  let sharedFamilyDifference = 0
  let sharedFamilyPairs = 0
  for (let left = 0; left < plausibleRoles.length; left += 1) {
    for (let right = left + 1; right < plausibleRoles.length; right += 1) {
      const leftFamilies = new Set([plausibleRoles[left].primaryCategory, ...plausibleRoles[left].facets])
      if (![plausibleRoles[right].primaryCategory, ...plausibleRoles[right].facets].some((family) => leftFamilies.has(family))) continue
      sharedFamilyDifference += question.traits.reduce((sum, trait) => sum + Math.abs(roleTraitWeight(plausibleRoles[left], trait) - roleTraitWeight(plausibleRoles[right], trait)), 0) / question.traits.length
      sharedFamilyPairs += 1
    }
  }
  const unresolvedFamilyDirection = sharedFamilyPairs ? sharedFamilyDifference / sharedFamilyPairs : 0
  const differentiatorCoverage = plausibleRoles.length
    ? plausibleRoles.reduce((sum, role) => {
      const differentiators = Object.keys(role.differentiatingTraits) as TraitId[]
      if (!differentiators.length) return sum
      return sum + question.traits.filter((trait) => differentiators.includes(trait)).length / differentiators.length
    }, 0) / plausibleRoles.length
    : 0
  const confidenceGainPotential = question.traits.reduce((sum, trait) => sum + (1 - Math.min(1, (traitScores[trait]?.evidence ?? 0) / 3)), 0) / question.traits.length
  const evidenceIndependence = question.traits.filter((trait) => (traitScores[trait]?.evidence ?? 0) === 0).length / question.traits.length
  const total = plausibleRoleSeparation * .4
    + unresolvedFamilyDirection * .25
    + differentiatorCoverage * .18
    + confidenceGainPotential * .12
    + evidenceIndependence * .05
  return { plausibleRoleSeparation, unresolvedFamilyDirection, differentiatorCoverage, confidenceGainPotential, evidenceIndependence, total }
}

export function selectNextDiscoveryQuestion(answers: AssessmentAnswers, traitScores: TraitScores): DiscoveryQuestion | undefined {
  const answeredIds = new Set(Object.keys(answers.discovery))
  if (answeredIds.size >= MAX_DISCOVERY_QUESTIONS) return undefined

  const nextBroad = discoveryQuestions.find((question) => question.phase === 'broad' && !answeredIds.has(question.id))
  if (nextBroad) return nextBroad

  const rejected = rejectedDomains(answers.discovery)
  const candidates = discoveryQuestions.filter((question) => question.phase === 'refine' && !answeredIds.has(question.id) && !rejected.has(question.domain))
  const preliminary = matchRoles(traitScores, answers.discovery, roles)
  const plausibleResults = preliminary.filter((result) => result.relevantAnswers > 0 && result.rawScore >= .38).slice(0, 6)
  const plausibleRoles = plausibleResults.map((result) => result.role)
  if (!plausibleRoles.length) return undefined

  return candidates.map((question) => {
    const information = questionInformationValue(question, plausibleRoles, traitScores)
    const relevance = plausibleRoles.length
      ? plausibleRoles.reduce((sum, role) => sum + question.traits.reduce((traitSum, trait) => traitSum + Math.max(0, roleTraitWeight(role, trait)), 0) / question.traits.length, 0) / plausibleRoles.length
      : 0
    return { question, rank: information.total * .8 + relevance * .2 }
  }).sort((a, b) => b.rank - a.rank || a.question.id.localeCompare(b.question.id))[0]?.question
}

export function discoveryProgress(answers: AssessmentAnswers['discovery']): { stage: string; detail: string } {
  const broadCount = discoveryQuestions.filter((question) => question.phase === 'broad' && answers[question.id]).length
  const refineCount = discoveryQuestions.filter((question) => question.phase === 'refine' && answers[question.id]).length
  if (broadCount < 20) return { stage: 'Mapping the landscape', detail: `${broadCount} of 20 broad reflections` }
  return { stage: 'Distinguishing nearby roles', detail: `${refineCount} adaptive follow-ups answered` }
}
