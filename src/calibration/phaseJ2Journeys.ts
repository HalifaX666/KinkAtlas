import { discoveryQuestions } from '../data/questions'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { selectNextDiscoveryQuestion } from '../engine/adaptiveQuestioning'
import { matchRoles } from '../engine/roleMatching'
import { buildRoleProfileCandidates, optimizeRoleProfile } from '../engine/roleProfileOptimizer'
import type { AssessmentAnswers, RoleCategoryId } from '../types'

export interface PhaseJ2JourneySeed {
  id: string
  description: string
  broadAnswers: Record<string, string>
  adaptiveAnswers?: Record<string, string>
  adaptiveDefault?: string
}

export interface PhaseJ2JourneyObservation {
  id: string
  description: string
  broadAnswers: Record<string, string>
  adaptiveAnswers: Record<string, string>
  selectedAdaptiveQuestionIds: string[]
  selectedQuestionIds: string[]
  traitScores: ReturnType<typeof calculateTraitScores>
  roleResults: ReturnType<typeof matchRoles>
  eligibleCandidateRoleIds: string[]
  suggestedRoleIds: string[]
  suggestedPrimaryRoleId?: string
  relevantFamilyIds: string[]
}

const broadQuestions = discoveryQuestions.filter((question) => question.phase === 'broad')

function broad(overrides: Record<string, string>, fallback = 'no') {
  return Object.fromEntries(broadQuestions.map((question) => [question.id, overrides[question.id] ?? fallback]))
}

export const phaseJ2JourneySeeds: PhaseJ2JourneySeed[] = [
  {
    id: 'activity-flexibility-without-authority',
    description: 'Flexible activity positions with exploration, while rejecting broader authority.',
    broadAnswers: broad({ 'd-flexibility': 'curious', 'd-position-give': 'strong', 'd-position-receive': 'strong', 'd-exploration': 'strong', 'd-power-give': 'no', 'd-power-receive': 'no' }),
    adaptiveAnswers: { 'r-positions': 'strong', 'r-top': 'strong', 'r-bottom': 'strong', 'r-both-power': 'no' },
  },
  {
    id: 'structured-discipline-giver',
    description: 'Agreed structure and consequence-giving with explicit authority and responsibility.',
    broadAnswers: broad({ 'd-power-give': 'strong', 'd-position-give': 'strong', 'd-structure': 'strong', 'd-lifestyle': 'some' }),
    adaptiveAnswers: { 'r-discipline-give': 'strong', 'r-authority-style': 'strong', 'r-lead': 'strong', 'r-protocol': 'some', 'r-structure-style': 'strong' },
  },
  {
    id: 'bounded-humiliation-giver',
    description: 'Carefully bounded psychological intensity from the giving side without receptive interest.',
    broadAnswers: broad({ 'd-psych': 'strong', 'd-position-give': 'strong', 'd-power-give': 'some', 'd-roleplay': 'some' }),
    adaptiveAnswers: { 'r-hum-give': 'strong', 'r-hum-receive': 'no', 'r-story-lead': 'some' },
  },
  {
    id: 'bounded-humiliation-receiver',
    description: 'Carefully bounded psychological intensity from the receiving side without giving interest.',
    broadAnswers: broad({ 'd-psych': 'strong', 'd-position-receive': 'strong', 'd-power-receive': 'some', 'd-roleplay': 'some' }),
    adaptiveAnswers: { 'r-hum-receive': 'strong', 'r-hum-give': 'no', 'r-story-enter': 'some' },
  },
  {
    id: 'warm-praise-giver',
    description: 'Giving warm recognition and care without broader authority.',
    broadAnswers: broad({ 'd-psych': 'some', 'd-care': 'strong', 'd-service': 'strong', 'd-position-give': 'strong' }),
    adaptiveAnswers: { 'r-praise-direction': 'strong', 'r-praise-context': 'strong', 'r-care-give': 'strong', 'r-service-position': 'curious' },
  },
  {
    id: 'structured-praise-receiver',
    description: 'Receiving recognition tied to agreed goals and structure.',
    broadAnswers: broad({ 'd-psych': 'some', 'd-care': 'some', 'd-position-receive': 'strong', 'd-structure': 'strong' }),
    adaptiveAnswers: { 'r-praise-direction': 'some', 'r-praise-context': 'some', 'r-care-receive': 'some' },
  },
  {
    id: 'material-sensory-focus',
    description: 'Material sensation is central while technical collecting and unrelated intensity are not.',
    broadAnswers: broad({ 'd-material': 'strong', 'd-intensity': 'some', 'd-position-receive': 'some' }),
    adaptiveAnswers: { 'r-material-sense': 'strong', 'r-material-craft': 'no', 'r-sensation': 'strong' },
  },
  {
    id: 'objectification-giving-frame',
    description: 'A bounded objectification frame from the giving side, distinct from humiliation.',
    broadAnswers: broad({ 'd-material': 'some', 'd-psych': 'strong', 'd-roleplay': 'strong', 'd-visibility': 'curious', 'd-power-give': 'some' }),
    adaptiveAnswers: { 'r-objectification-frame': 'strong', 'r-objectification-focus': 'strong', 'r-objectification-direction': 'strong', 'r-hum-give': 'no' },
  },
  {
    id: 'objectification-receiving-frame',
    description: 'A bounded objectified role from the receiving side with symbolic display interest.',
    broadAnswers: broad({ 'd-material': 'strong', 'd-psych': 'strong', 'd-roleplay': 'strong', 'd-visibility': 'strong', 'd-power-receive': 'some' }),
    adaptiveAnswers: { 'r-objectification-frame': 'strong', 'r-objectification-focus': 'strong', 'r-objectification-direction': 'some', 'r-hum-receive': 'no' },
  },
  {
    id: 'rope-giver-craft',
    description: 'Technical rope tying without receiving-rope interest.',
    broadAnswers: broad({ 'd-rope': 'strong', 'd-position-give': 'strong' }),
    adaptiveAnswers: { 'r-rope-give': 'strong', 'r-rope-receive': 'no', 'r-rope-both': 'no', 'r-rope-motivation': 'strong' },
  },
  {
    id: 'rope-receiver-sensation',
    description: 'Receiving rope for bodily sensation without tying interest or submission.',
    broadAnswers: broad({ 'd-rope': 'strong', 'd-position-receive': 'strong', 'd-intensity': 'some' }),
    adaptiveAnswers: { 'r-rope-give': 'no', 'r-rope-receive': 'strong', 'r-rope-both': 'no', 'r-bottom': 'strong' },
  },
  {
    id: 'pet-expression-receiver',
    description: 'Adult pet expression and receiving care without ownership interest.',
    broadAnswers: broad({ 'd-pet': 'some', 'd-care': 'some', 'd-roleplay': 'strong' }),
    adaptiveAnswers: { 'r-pet': 'strong', 'r-owner': 'no', 'r-story-enter': 'some' },
  },
  {
    id: 'pet-owner-guidance',
    description: 'Guidance and care in adult pet play with explicit bounded ownership interest.',
    broadAnswers: broad({ 'd-pet': 'strong', 'd-care': 'strong', 'd-power-give': 'strong', 'd-structure': 'some' }),
    adaptiveAnswers: { 'r-owner': 'strong', 'r-pet': 'no', 'r-protector': 'strong' },
  },
  {
    id: 'primal-pursuit-only',
    description: 'Pursuit and containment without evasion interest.',
    broadAnswers: broad({ 'd-primal': 'strong', 'd-position-give': 'strong' }),
    adaptiveAnswers: { 'r-primal-give': 'strong', 'r-primal-receive': 'no' },
  },
  {
    id: 'primal-evasion-only',
    description: 'Evasion and being pursued without pursuit interest.',
    broadAnswers: broad({ 'd-primal': 'strong', 'd-position-receive': 'strong' }),
    adaptiveAnswers: { 'r-primal-give': 'no', 'r-primal-receive': 'strong' },
  },
  {
    id: 'sensation-without-sadism',
    description: 'Sensory contrast without interest in giving or receiving pain.',
    broadAnswers: broad({ 'd-intensity': 'curious', 'd-exploration': 'some' }),
    adaptiveAnswers: { 'r-sensation': 'strong', 'r-pain-give': 'no', 'r-pain-receive': 'no' },
  },
  {
    id: 'observer-not-performer',
    description: 'Consensual observation without exhibition or performance interest.',
    broadAnswers: broad({ 'd-visibility': 'some', 'd-exploration': 'some' }),
    adaptiveAnswers: { 'r-voyeur': 'strong', 'r-exhibit': 'no' },
  },
  {
    id: 'high-uncertainty-low-evidence',
    description: 'Uncertain and prefer-not responses exercise non-scoring paths.',
    broadAnswers: broad({ 'd-power-give': 'unknown', 'd-power-receive': 'prefer-not', 'd-exploration': 'curious' }, 'unknown'),
    adaptiveDefault: 'prefer-not',
  },
  {
    id: 'broad-mixed-interests',
    description: 'Several plausible themes compete for the six adaptive slots.',
    broadAnswers: broad({ 'd-power-give': 'some', 'd-power-receive': 'some', 'd-position-give': 'some', 'd-service': 'some', 'd-rope': 'some', 'd-intensity': 'some', 'd-care': 'some', 'd-brat': 'some', 'd-primal': 'some', 'd-pet': 'some', 'd-psych': 'some', 'd-material': 'some', 'd-exploration': 'strong' }),
    adaptiveDefault: 'some',
  },
]

export function runPhaseJ2Journey(seed: PhaseJ2JourneySeed): PhaseJ2JourneyObservation {
  const answers: AssessmentAnswers = { discovery: {}, refinement: {}, readiness: {}, boundaries: {}, negotiation: {} }
  const selectedQuestionIds: string[] = []
  const selectedAdaptiveQuestionIds: string[] = []
  const adaptiveAnswers: Record<string, string> = {}

  while (selectedQuestionIds.length < 26) {
    const next = selectNextDiscoveryQuestion(answers, calculateTraitScores(answers.discovery))
    if (!next) break
    const answerId = next.phase === 'broad'
      ? seed.broadAnswers[next.id]
      : seed.adaptiveAnswers?.[next.id] ?? seed.adaptiveDefault ?? 'some'
    if (!answerId || !next.answers.some((answer) => answer.id === answerId)) throw new Error(`${seed.id}: invalid or missing answer ${String(answerId)} for ${next.id}`)
    answers.discovery[next.id] = answerId
    selectedQuestionIds.push(next.id)
    if (next.phase === 'refine') {
      selectedAdaptiveQuestionIds.push(next.id)
      adaptiveAnswers[next.id] = answerId
    }
  }

  const traitScores = calculateTraitScores(answers.discovery)
  const roleResults = matchRoles(traitScores, answers.discovery)
  const candidates = buildRoleProfileCandidates(roleResults, {}, answers.discovery)
  const profile = optimizeRoleProfile(candidates)
  const relevantFamilyIds = [...new Set(candidates.filter((candidate) => candidate.eligible).flatMap((candidate) => candidate.families))].sort()
  return {
    id: seed.id,
    description: seed.description,
    broadAnswers: { ...seed.broadAnswers },
    adaptiveAnswers,
    selectedAdaptiveQuestionIds,
    selectedQuestionIds,
    traitScores,
    roleResults,
    eligibleCandidateRoleIds: candidates.filter((candidate) => candidate.eligible).map((candidate) => candidate.roleId).sort(),
    suggestedRoleIds: profile.recommendations.map((item) => item.candidate.roleId),
    suggestedPrimaryRoleId: profile.primary?.candidate.roleId,
    relevantFamilyIds,
  }
}

export function rejectedBroadDomains(discoveryAnswers: Record<string, string>): RoleCategoryId[] {
  const domains = new Map<RoleCategoryId, number[]>()
  broadQuestions.forEach((question) => {
    const answer = question.answers.find((candidate) => candidate.id === discoveryAnswers[question.id])
    if (!answer || answer.noScore || !answer.effects) return
    const values = Object.values(answer.effects)
    if (!values.length) return
    domains.set(question.domain, [...(domains.get(question.domain) ?? []), Math.max(...values)])
  })
  return [...domains.entries()].filter(([, values]) => values.length > 0 && values.every((value) => value <= .15)).map(([domain]) => domain).sort()
}
