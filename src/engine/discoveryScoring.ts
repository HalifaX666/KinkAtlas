import { discoveryQuestionById } from '../data/questions'
import type { AssessmentAnswers, TraitId, TraitScore, TraitScores } from '../types'

const emptyScore = (): TraitScore => ({ value: 0, evidence: 0, positive: 0, negative: 0 })

export function calculateTraitScores(discoveryAnswers: AssessmentAnswers['discovery']): TraitScores {
  const totals: Partial<Record<TraitId, { sum: number; count: number }>> = {}

  Object.entries(discoveryAnswers).forEach(([questionId, answerId]) => {
    const question = discoveryQuestionById[questionId]
    const answer = question?.answers.find((candidate) => candidate.id === answerId)
    if (!question || !answer || answer.noScore || !answer.effects) return

    Object.entries(answer.effects).forEach(([trait, effect]) => {
      if (effect === undefined) return
      const id = trait as TraitId
      const total = totals[id] ?? { sum: 0, count: 0 }
      total.sum += Math.max(0, Math.min(1, effect))
      total.count += 1
      totals[id] = total
    })
  })

  return Object.fromEntries(Object.entries(totals).map(([trait, total]) => {
    const value = total.sum / total.count
    return [trait, { ...emptyScore(), value, evidence: total.count, positive: value >= .55 ? total.count : 0, negative: value < .3 ? total.count : 0 }]
  })) as TraitScores
}

export function answeredDiscoveryCount(answers: AssessmentAnswers['discovery']): number {
  return Object.entries(answers).filter(([questionId, answerId]) => {
    const answer = discoveryQuestionById[questionId]?.answers.find((candidate) => candidate.id === answerId)
    return answer && !answer.noScore
  }).length
}
