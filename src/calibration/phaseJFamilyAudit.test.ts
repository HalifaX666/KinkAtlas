import { describe, expect, it } from 'vitest'
import { discoveryQuestions } from '../data/questions'
import { refinementQuestions } from '../data/refinement'
import { roles } from '../data/roles'
import { traits } from '../data/traits'
import { roleLibrary } from '../taxonomy/roleLibrary'
import { buildPhaseJFamilyAudit } from './phaseJFamilyAudit'

describe('Phase J.1 family integrity audit', () => {
  const journeys = [{ id: 'observed', questionIds: ['d-power-give', 'r-authority-style'] }]
  const sourceBaseline = JSON.stringify({ roleLibrary, roles, traits, discoveryQuestions, refinementQuestions })
  const audit = buildPhaseJFamilyAudit(journeys)

  it('is deterministic and does not mutate canonical taxonomy data', () => {
    expect(buildPhaseJFamilyAudit(journeys)).toEqual(audit)
    expect(JSON.stringify({ roleLibrary, roles, traits, discoveryQuestions, refinementQuestions })).toBe(sourceBaseline)
  })

  it('matches source counts and preserves the nine distinct no-scored-coverage findings', () => {
    expect(audit.counts).toMatchObject({ roles: 1107, scoredRoles: 101, families: 26, familylessRoles: 658, multiFamilyRoles: 174, reviewedRelationships: 59, relationshipParticipants: 53 })
    expect(audit.families).toHaveLength(Object.keys(roleLibrary.families).length)
    expect(audit.familiesWithoutScoredDiscoveryCoverage).toHaveLength(9)
    expect(audit.familylessRoleReview.roles).toHaveLength(roleLibrary.roles.filter((role) => role.familyIds.length === 0).length)
    expect(Object.values(audit.familylessRoleReview.classificationCounts).reduce((total, count) => total + count, 0)).toBe(658)
  })

  it('references only valid roles, families, traits, questions, and relationships', () => {
    expect(audit.integrity).toEqual({
      unknownFamilyIds: [],
      unknownProposedFamilyIds: [],
      unknownRoleIds: [],
      unknownFamilylessRoleIds: [],
      unknownRelatedExampleRoleIds: [],
      unknownTraitIds: [],
      unknownQuestionIds: [],
      unknownRefinementQuestionIds: [],
      invalidExistingRelationships: [],
      invalidProposedRelationships: [],
    })
  })

  it('keeps editorial membership separate from scoring evidence and eligibility', () => {
    expect(audit.safeguards).toMatchObject({
      observationalOnly: true,
      familyMembershipCreatesScoringEvidence: false,
      familyMembershipCreatesRecommendationEligibility: false,
      productionMetadataChanged: false,
    })
    expect(audit.families.every((family) => family.recommendationEligibility.note.includes('Family membership is not an eligibility gate'))).toBe(true)
    expect(audit.families.some((family) => family.editorialCoverage.covered && !family.scoredCoverage.covered)).toBe(true)
    expect(audit.families.some((family) => family.explorationOnlyCoverage.roleCount > 0)).toBe(true)
    expect(audit.families.flatMap((family) => family.effectiveAdaptiveCoverage.observedQuestionIds)).not.toContain('d-power-give')
    expect(audit.families.flatMap((family) => family.effectiveAdaptiveCoverage.observedQuestionIds)).toContain('r-authority-style')
  })

  it('keeps reviewed exceptions and optimizer-sensitive proposals explicit', () => {
    expect(audit.explicitExceptions.map((exception) => exception.id)).toContain('dominant-authority-holder-overlap')
    expect(audit.relationships.proposed.every((relationship) => relationship.possibleOptimizerImpact.includes('Behavior-sensitive'))).toBe(true)
    expect(audit.relationships.proposed.every((relationship) => !relationship.alreadyHasReviewedRelationship)).toBe(true)
  })
})
