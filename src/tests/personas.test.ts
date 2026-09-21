import { describe, expect, it } from 'vitest'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { matchRoles } from '../engine/roleMatching'

const topIds = (answers: Record<string, string>, limit = 8) => matchRoles(calculateTraitScores(answers), answers).slice(0, limit).map((result) => result.role.id)

describe('deliberately constructed discovery personas', () => {
  it('surfaces service-oriented authority vocabulary', () => {
    const answers = { 'd-power-give': 'strong', 'd-service': 'strong', 'r-service-direct': 'strong', 'r-service-give': 'strong', 'r-lead': 'strong', 'd-position-give': 'strong' }
    expect(topIds(answers)).toEqual(expect.arrayContaining(['service-dominant']))
  })

  it('surfaces role flexibility when both power directions and switching are supported', () => {
    const answers = { 'd-power-give': 'strong', 'd-power-receive': 'strong', 'd-flexibility': 'strong', 'r-both-power': 'strong', 'r-positions': 'strong', 'd-lifestyle': 'some' }
    expect(topIds(answers)).toEqual(expect.arrayContaining(['switch']))
  })

  it('distinguishes a rope giver from a rope receiver', () => {
    const answers = { 'd-rope': 'strong', 'r-rope-give': 'strong', 'r-rope-receive': 'no', 'r-rope-both': 'no', 'd-position-give': 'strong', 'r-lead': 'some' }
    const ranked = matchRoles(calculateTraitScores(answers), answers).map((result) => result.role.id)
    expect(ranked.slice(0, 8)).toContain('rigger')
    expect(ranked.indexOf('rigger')).toBeLessThan(ranked.indexOf('rope-bottom'))
  })

  it('surfaces sensation vocabulary when pain-giving and pain-receiving are low', () => {
    const answers = { 'd-intensity': 'curious', 'r-sensation': 'strong', 'r-pain-give': 'no', 'r-pain-receive': 'no', 'd-exploration': 'strong' }
    expect(topIds(answers)).toEqual(expect.arrayContaining(['sensation-player']))
  })

  it('distinguishes brat handling from brat-style provocation', () => {
    const answers = { 'd-brat': 'some', 'r-tamer': 'strong', 'r-brat': 'no', 'd-power-give': 'strong', 'r-lead': 'some', 'r-discipline-give': 'some' }
    expect(topIds(answers)).toEqual(expect.arrayContaining(['brat-tamer']))
  })

  it('surfaces caregiving vocabulary without requiring dominance', () => {
    const answers = { 'd-care': 'strong', 'r-care-give': 'strong', 'r-protector': 'strong', 'd-power-give': 'no', 'd-power-receive': 'no', 'd-service': 'some' }
    const top = topIds(answers)
    expect(top.some((id) => ['caregiver','protector','aftercare-enthusiast'].includes(id))).toBe(true)
  })
})
describe('adversarial and edge-case personas', () => {
  it('returns only insufficient, zero-evidence roles for all withheld answers', () => {
    const answers = { 'd-power-give': 'prefer-not', 'd-rope': 'unknown', 'd-care': 'prefer-not' }
    const results = matchRoles(calculateTraitScores(answers), answers)
    expect(results.every((result) => result.alignment === 'insufficient' && result.relevantAnswers === 0 && result.rankedScore === 0)).toBe(true)
  })

  it('does not mistake broad rejection for strong alignment', () => {
    const answers = { 'd-power-give': 'no', 'd-power-receive': 'no', 'd-rope': 'no', 'd-intensity': 'no', 'd-care': 'no', 'd-brat': 'no', 'd-roleplay': 'no' }
    expect(matchRoles(calculateTraitScores(answers), answers).slice(0, 10).every((result) => result.alignment !== 'strong')).toBe(true)
  })

  it('does not force a Switch result when role flexibility is explicitly low', () => {
    const flexible = { 'd-power-give': 'strong', 'd-power-receive': 'strong', 'd-flexibility': 'strong', 'r-both-power': 'strong' }
    const fixed = { ...flexible, 'd-flexibility': 'no', 'r-both-power': 'no' }
    const flexibleSwitch = matchRoles(calculateTraitScores(flexible), flexible).find((result) => result.role.id === 'switch')!
    const fixedSwitch = matchRoles(calculateTraitScores(fixed), fixed).find((result) => result.role.id === 'switch')!
    expect(fixedSwitch.rawScore).toBeLessThan(flexibleSwitch.rawScore)
  })
})
