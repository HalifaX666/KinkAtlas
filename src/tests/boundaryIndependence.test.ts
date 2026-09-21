import { describe, expect, it } from 'vitest'
import { boundaryItems } from '../data/boundaries'
import { activityRecommendations } from '../engine/activityRecommendations'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { matchRoles } from '../engine/roleMatching'
import type { BoundaryValue } from '../types'

const discovery = { 'd-rope': 'some', 'r-rope-receive': 'strong', 'r-rope-give': 'no' }

const roleSnapshot = () => matchRoles(calculateTraitScores(discovery), discovery).map((result) => ({
  id: result.role.id,
  rawScore: result.rawScore,
  rankedScore: result.rankedScore,
  confidence: result.confidence,
}))

describe('boundary independence', () => {
  it.each<BoundaryValue>(['hard-limit', 'dont-want', 'unknown', 'prefer-not', 'love'])('never changes role alignment, ranking, or confidence for %s', (value) => {
    const before = roleSnapshot()
    activityRecommendations({ rope: value }, boundaryItems)
    expect(roleSnapshot()).toEqual(before)
  })

  it('maps hard limit and do-not-want to off-table activity guidance', () => {
    expect(activityRecommendations({ rope: 'hard-limit' }, boundaryItems).find((item) => item.item.id === 'rope')?.status).toBe('off-table')
    expect(activityRecommendations({ rope: 'dont-want' }, boundaryItems).find((item) => item.item.id === 'rope')?.status).toBe('off-table')
  })

  it('keeps uncertainty distinct from a hard limit', () => {
    expect(activityRecommendations({ rope: 'unknown' }, boundaryItems).find((item) => item.item.id === 'rope')?.status).toBe('learn-first')
  })

  it('treats prefer-not as withheld rather than rejection', () => {
    expect(activityRecommendations({ rope: 'prefer-not' }, boundaryItems).find((item) => item.item.id === 'rope')).toBeUndefined()
  })

  it('recalculates only activity guidance when a boundary changes', () => {
    const rolesBefore = roleSnapshot()
    const hardLimit = activityRecommendations({ rope: 'hard-limit' }, boundaryItems)
    const changed = activityRecommendations({ rope: 'curious' }, boundaryItems)
    expect(hardLimit.find((item) => item.item.id === 'rope')?.status).toBe('off-table')
    expect(changed.find((item) => item.item.id === 'rope')?.status).toBe('discuss')
    expect(roleSnapshot()).toEqual(rolesBefore)
  })
})
