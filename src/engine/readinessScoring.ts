import { blindSpotLibrary, readinessQuestionById } from '../data/readiness'
import type { AssessmentAnswers, BlindSpot, BlindSpotSeverity, CompetencyId, CriticalFlag, ReadinessAssessment, ReadinessBand, ReadinessResult } from '../types'

const severityRank: Record<BlindSpotSeverity, number> = { notice: 1, concern: 2, critical: 3 }

const bandFor = (value: number): ReadinessBand => {
  if (value >= .82) return 'strong'
  if (value >= .62) return 'developing'
  if (value >= .4) return 'explore'
  return 'important'
}

export function scoreReadiness(answers: AssessmentAnswers['readiness']): ReadinessResult[] {
  const totals = new Map<CompetencyId, { sum: number; count: number }>()
  Object.entries(answers).forEach(([questionId, answerId]) => {
    const question = readinessQuestionById[questionId]
    const answer = question?.answers.find((candidate) => candidate.id === answerId)
    if (!question || !answer || answer.noScore) return
    Object.entries(answer.competencyEffects ?? {}).forEach(([competency, value]) => {
      if (value === undefined) return
      const id = competency as CompetencyId
      const total = totals.get(id) ?? { sum: 0, count: 0 }
      total.sum += value
      total.count += 1
      totals.set(id, total)
    })
  })
  return [...totals.entries()].map(([competency, total]) => {
    const value = total.sum / total.count
    return { competency, value, evidence: total.count, band: bandFor(value) }
  }).sort((a, b) => a.value - b.value)
}

export function generateBlindSpots(answers: AssessmentAnswers['readiness']): BlindSpot[] {
  const totals = new Map<string, { weight: number; severity: BlindSpotSeverity; critical: boolean }>()
  Object.entries(answers).forEach(([questionId, answerId]) => {
    const answer = readinessQuestionById[questionId]?.answers.find((candidate) => candidate.id === answerId)
    if (!answer || answer.noScore) return
    answer.blindSpotSignals?.forEach((signal) => {
      const current = totals.get(signal.id)
      totals.set(signal.id, {
        weight: (current?.weight ?? 0) + signal.weight,
        severity: !current || severityRank[signal.severity] > severityRank[current.severity] ? signal.severity : current.severity,
        critical: Boolean(current?.critical || signal.critical),
      })
    })
  })
  return [...totals.entries()]
    .filter(([id]) => Boolean(blindSpotLibrary[id]))
    .map(([id, aggregate]) => ({ ...blindSpotLibrary[id], evidence: aggregate.weight, severity: aggregate.severity, critical: aggregate.critical }))
    .sort((a, b) => Number(b.critical) - Number(a.critical) || severityRank[b.severity] - severityRank[a.severity] || b.evidence - a.evidence)
}

export function generateCriticalFlags(answers: AssessmentAnswers['readiness']): CriticalFlag[] {
  const sources = new Map<string, string[]>()
  Object.entries(answers).forEach(([questionId, answerId]) => {
    const answer = readinessQuestionById[questionId]?.answers.find((candidate) => candidate.id === answerId)
    answer?.blindSpotSignals?.filter((signal) => signal.critical).forEach((signal) => {
      sources.set(signal.id, [...(sources.get(signal.id) ?? []), questionId])
    })
  })
  return [...sources.entries()].filter(([id]) => blindSpotLibrary[id]).map(([id, sourceQuestionIds]) => ({
    id,
    competency: blindSpotLibrary[id].competency,
    title: `Important concept to revisit: ${blindSpotLibrary[id].title}`,
    description: `${blindSpotLibrary[id].description} This flag comes from a specific response and is not removed by stronger answers elsewhere.`,
    sourceQuestionIds,
  }))
}

export function evaluateReadiness(answers: AssessmentAnswers['readiness']): ReadinessAssessment {
  return {
    competencies: scoreReadiness(answers),
    blindSpots: generateBlindSpots(answers),
    criticalFlags: generateCriticalFlags(answers),
  }
}
