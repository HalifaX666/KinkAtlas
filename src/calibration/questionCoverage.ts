import { discoveryQuestions } from '../data/questions'
import { roles } from '../data/roles'
import { traits } from '../data/traits'
import type { TraitId } from '../types'
import type { QuestionCoverageDiagnostic, TraitCorrelationDiagnostic, TraitCoverageDiagnostic } from './calibrationTypes'

const scoredAnswers = (questionId: string) => discoveryQuestions.find((question) => question.id === questionId)?.answers.filter((answer) => !answer.noScore && answer.effects) ?? []

export function analyzeQuestionCoverage(): QuestionCoverageDiagnostic[] {
  return discoveryQuestions.map((question) => {
    const answers = scoredAnswers(question.id)
    const groups = new Set(answers.map((answer) => Object.keys(answer.effects ?? {}).sort().join('|')))
    const directionalAnswers = answers.filter((answer) => Math.max(...Object.values(answer.effects ?? {}), 0) >= .3)
    const profiles = new Set(directionalAnswers.map((answer) => {
      const effects = answer.effects ?? {}
      const maximum = Math.max(...Object.values(effects), 0)
      return question.traits.map((trait) => maximum ? Math.round(((effects[trait] ?? 0) / maximum) * 10) : 0).join('|')
    }))
    return {
      questionId: question.id,
      traitCount: question.traits.length,
      scoredAnswerCount: answers.length,
      distinctTraitGroups: groups.size,
      distinctTraitProfiles: profiles.size,
      nearlyIdenticalTraitGroups: question.traits.length > 1 && groups.size <= 1 && profiles.size <= 1,
    }
  })
}

export function analyzeTraitCoverage(): TraitCoverageDiagnostic[] {
  return traits.map(({ id: traitId }) => {
    const touchingQuestions = discoveryQuestions.filter((question) => question.answers.some((answer) => answer.effects?.[traitId] !== undefined))
    const answerEffects = touchingQuestions.flatMap((question) => question.answers.flatMap((answer) => answer.effects?.[traitId] === undefined ? [] : [answer.effects[traitId]!]))
    const roleCount = roles.filter((role) => role.traits[traitId] !== undefined || role.differentiatingTraits[traitId] !== undefined || role.contraryTraits?.[traitId] !== undefined).length
    const diagnostics = touchingQuestions.map((question) => analyzeQuestionCoverage().find((item) => item.questionId === question.id)!)
    const genericIntensityOnly = touchingQuestions.length === 1 && diagnostics.every((diagnostic) => diagnostic.nearlyIdenticalTraitGroups)
    const issues: TraitCoverageDiagnostic['issues'] = []
    if (!touchingQuestions.length) issues.push('UNUSED_TRAIT')
    if (touchingQuestions.length === 1) issues.push('TOUCHED_ONCE')
    if (touchingQuestions.length && !answerEffects.some((value) => value <= .2)) issues.push('NO_NEGATIVE_PATH')
    if (genericIntensityOnly) issues.push('GENERIC_INTENSITY_ONLY')
    return {
      traitId,
      questionCount: touchingQuestions.length,
      broadQuestionCount: touchingQuestions.filter((question) => question.phase === 'broad').length,
      refinementQuestionCount: touchingQuestions.filter((question) => question.phase === 'refine').length,
      increasingAnswerPaths: answerEffects.filter((value) => value >= .55).length,
      decreasingAnswerPaths: answerEffects.filter((value) => value <= .2).length,
      roleCount,
      genericIntensityOnly,
      issues,
    }
  })
}

function sharedQuestionStats(left: TraitId, right: TraitId) {
  const leftQuestions = discoveryQuestions.filter((question) => question.answers.some((answer) => answer.effects?.[left] !== undefined))
  const rightQuestions = discoveryQuestions.filter((question) => question.answers.some((answer) => answer.effects?.[right] !== undefined))
  const shared = leftQuestions.filter((question) => rightQuestions.includes(question))
  const differences = shared.flatMap((question) => question.answers.flatMap((answer) => {
    const leftEffect = answer.effects?.[left]
    const rightEffect = answer.effects?.[right]
    return leftEffect === undefined || rightEffect === undefined ? [] : [Math.abs(leftEffect - rightEffect)]
  }))
  return {
    sharedQuestionCount: shared.length,
    coOccurrenceRatio: Math.min(leftQuestions.length, rightQuestions.length) ? shared.length / Math.min(leftQuestions.length, rightQuestions.length) : 0,
    meanEffectDifference: differences.length ? differences.reduce((sum, difference) => sum + difference, 0) / differences.length : 1,
    maxEffectDifference: differences.length ? Math.max(...differences) : 1,
  }
}

export function analyzeTraitCorrelations(): TraitCorrelationDiagnostic[] {
  const traitIds = traits.map((trait) => trait.id)
  const results: TraitCorrelationDiagnostic[] = []
  traitIds.forEach((left, leftIndex) => traitIds.slice(leftIndex + 1).forEach((right) => {
    const stats = sharedQuestionStats(left, right)
    if (stats.sharedQuestionCount >= 2 && stats.coOccurrenceRatio >= .7 && stats.meanEffectDifference <= .18 && stats.maxEffectDifference <= .25) {
      results.push({ left, right, ...stats })
    }
  }))
  return results.sort((left, right) => right.coOccurrenceRatio - left.coOccurrenceRatio || left.meanEffectDifference - right.meanEffectDifference)
}
