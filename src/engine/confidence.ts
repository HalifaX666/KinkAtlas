import type { ConfidenceLevel } from '../types'

export function confidenceFor(evidence: number, coverage: number): ConfidenceLevel {
  if (evidence >= 6 && coverage >= .7) return 'high'
  if (evidence >= 3 && coverage >= .4) return 'moderate'
  return 'low'
}
