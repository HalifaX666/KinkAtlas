import { traitById } from '../data/traits'
import type { RoleExplanation, RoleExplanationSignal, RoleResult, TraitId } from '../types'

const signal = (traitId: TraitId, value: number, strength: RoleExplanationSignal['strength']): RoleExplanationSignal => ({
  traitId,
  label: traitById[traitId].label,
  description: strength === 'limiting'
    ? `Your answers showed less interest in ${traitById[traitId].label.toLowerCase()}.`
    : strength === 'contrary'
      ? `Your answers also showed interest in ${traitById[traitId].label.toLowerCase()}, which may point toward nearby vocabulary.`
      : `${value >= .75 ? 'Strong' : 'Moderate'} interest in ${traitById[traitId].label.toLowerCase()}.`,
  strength,
})

const naturalList = (items: string[]): string => items.length < 2
  ? items[0] ?? ''
  : `${items.slice(0, -1).join(', ')}${items.length > 2 ? ',' : ''} and ${items.at(-1)}`

function matchSummary(result: RoleResult): string {
  const themes = [...result.supportingTraits, ...result.differentiatingEvidence.filter(({ value }) => value >= .5)]
    .filter(({ id }, index, all) => all.findIndex((candidate) => candidate.id === id) === index)
    .slice(0, 3)
    .map(({ id }) => traitById[id].label.toLocaleLowerCase('en-US'))

  return themes.length
    ? `Your answers supported ${naturalList(themes)}. ${themes.length === 1 ? 'That theme' : 'Those themes'} contributed to this ${result.role.name} result.`
    : `There is not yet enough positive answer evidence to identify a specific theme behind this ${result.role.name} result.`
}

export function explainRoleResult(result: RoleResult): RoleExplanation {
  const supportingSignals = result.supportingTraits
    .slice(0, 3)
    .map(({ id, value }) => signal(id, value, value >= .75 ? 'strong' : 'moderate'))
  const differentiatingSignals = result.differentiatingEvidence
    .filter(({ value }) => value >= .5)
    .slice(0, 3)
    .map(({ id, value }) => signal(id, value, value >= .75 ? 'strong' : 'moderate'))
  const limitingSignals = result.limitingTraits.slice(0, 3).map(({ id, value }) => signal(id, value, 'limiting'))
  const contrarySignals = result.contradictoryEvidence.slice(0, 3).map(({ id, value }) => signal(id, value, 'contrary'))

  const confidenceExplanation = result.confidence === 'high'
    ? `High confidence means several relevant answers covered most of this role’s weighted themes. It describes evidence quantity, not certainty about identity.`
    : result.confidence === 'moderate'
      ? `Medium confidence means you provided useful related evidence, while some themes remain less explored.`
      : `Low confidence means only limited related evidence was available. Strong alignment can still appear when the small amount of observed evidence fits closely.`

  return {
    summary: matchSummary(result),
    supportingSignals,
    differentiatingSignals,
    limitingSignals,
    contrarySignals,
    confidenceExplanation,
    coverageExplanation: `Evidence breadth: based on ${result.relevantAnswers} relevant response${result.relevantAnswers === 1 ? '' : 's'}, usable answer evidence covered ${Math.round(result.coverage * 100)}% of this role’s relevant themes. This is not match strength; unanswered themes were not treated as rejection.`,
    consentConsiderations: result.role.educationTopics.map((topic) => `Consider discussing ${topic}.`),
    reflectionQuestions: result.role.reflectionQuestions,
  }
}

export function strongestContributingSignals(explanation: RoleExplanation, limit = 3): RoleExplanationSignal[] {
  const seenTraits = new Set<TraitId>()
  const seenDescriptions = new Set<string>()
  return [...explanation.supportingSignals, ...explanation.differentiatingSignals].filter((item) => {
    const description = item.description.trim().toLocaleLowerCase('en-US')
    if (seenTraits.has(item.traitId) || seenDescriptions.has(description)) return false
    seenTraits.add(item.traitId)
    seenDescriptions.add(description)
    return true
  }).slice(0, Math.max(0, limit))
}
