import type { ActivityRecommendation, AssessmentAnswers, BoundaryItem } from '../types'

export function activityRecommendations(boundaries: AssessmentAnswers['boundaries'], items: BoundaryItem[]): ActivityRecommendation[] {
  return items.flatMap<ActivityRecommendation>((item) => {
    const value = boundaries[item.id]
    if (!value || value === 'neutral' || value === 'prefer-not') return []
    if (value === 'hard-limit' || value === 'dont-want') return [{ item, status: 'off-table' as const, message: value === 'hard-limit' ? 'You marked this as a hard boundary. It remains off the table unless you independently change it.' : 'You marked this as something you do not want. No exploration is recommended.' }]
    if (value === 'unknown') return [{ item, status: 'learn-first' as const, message: 'Learn more without pressure to try it; uncertainty does not create permission or obligation.' }]
    if (value === 'curious' || value === 'consider') return [{ item, status: 'discuss' as const, message: 'Worth learning about and discussing. Curiosity is not consent to participate.' }]
    return [{ item, status: 'explore' as const, message: 'Previously expressed interest. Any activity still requires specific, informed, ongoing consent.' }]
  })
}
