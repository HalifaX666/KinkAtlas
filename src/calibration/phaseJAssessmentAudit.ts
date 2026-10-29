import { discoveryQuestions } from '../data/questions'
import { refinementQuestions } from '../data/refinement'
import { roles } from '../data/roles'
import { traits } from '../data/traits'
import { refinementQuestionIdsForTarget, refinementTargetByRoleId } from '../engine/refinementEvidence'
import { roleLibrary } from '../taxonomy/roleLibrary'
import { buildCalibrationReport } from './calibrationReport'
import { analyzeQuestionCoverage, analyzeTraitCorrelations, analyzeTraitCoverage } from './questionCoverage'
import { buildRecommendationReport } from './recommendationReport'
import { recommendationResults } from './recommendationPersonas'
import { analyzeRoleHealth, highOverlapPairs } from './roleHealth'
import type { TraitId } from '../types'

export interface AdaptiveJourneyObservation {
  id: string
  questionIds: string[]
}

export interface ReflectionFixtureObservation {
  id: string
  scenarioId: string
  description: string
  output: string
}

const countBy = <T>(items: readonly T[], keyFor: (item: T) => string) => Object.fromEntries(
  [...items.reduce((counts, item) => {
    const key = keyFor(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
    return counts
  }, new Map<string, number>())].sort(([left], [right]) => left.localeCompare(right)),
)

const scoredQuestionAnswers = (question: typeof discoveryQuestions[number]) => question.answers.filter((answer) => !answer.noScore && answer.effects)

function familyCoverage() {
  const scoredRoleById = new Map(roles.map((role) => [role.id, role]))

  return Object.entries(roleLibrary.families).sort(([left], [right]) => left.localeCompare(right)).map(([familyId, label]) => {
    const members = roleLibrary.roles.filter((role) => role.familyIds.includes(familyId))
    const scoredMembers = members.flatMap((member) => {
      const role = member.canonicalRoleId ? scoredRoleById.get(member.canonicalRoleId) : undefined
      return role ? [role] : []
    })
    const relevantTraits = new Set<TraitId>(scoredMembers.flatMap((role) => [
      ...Object.keys(role.traits),
      ...Object.keys(role.differentiatingTraits),
      ...Object.keys(role.contraryTraits ?? {}),
    ] as TraitId[]))
    const discoveryQuestionIds = discoveryQuestions.filter((question) => question.answers.some((answer) => (
      Object.keys(answer.effects ?? {}).some((trait) => relevantTraits.has(trait as TraitId))
    ))).map((question) => question.id)
    const refinementQuestionIds = [...new Set(members.flatMap((member) => {
      const target = refinementTargetByRoleId.get(member.id)
      return target ? refinementQuestionIdsForTarget(target.id) : []
    }))].sort()

    return {
      familyId,
      label,
      roleCount: members.length,
      scoredRoleCount: new Set(scoredMembers.map((role) => role.id)).size,
      automaticallyEligibleRoleCount: members.filter((role) => role.recommendationEligibility.startsWith('eligible-')).length,
      explorationOnlyRoleCount: members.filter((role) => role.recommendationEligibility === 'exploration-only').length,
      discoveryQuestionIds,
      refinementQuestionIds,
      hasStaticDiscoveryCoverage: discoveryQuestionIds.length > 0,
      hasDirectRefinementCoverage: refinementQuestionIds.length > 0,
    }
  })
}

function questionToTraitCoverage() {
  return discoveryQuestions.map((question) => {
    const scoredAnswers = scoredQuestionAnswers(question)
    const qualifications = [...new Set(scoredAnswers.flatMap((answer) => answer.qualificationEvidence ?? []))].sort()
    const authorityEvidence = [...new Set(scoredAnswers.flatMap((answer) => answer.authorityEvidence ? [answer.authorityEvidence] : []))].sort()
    return {
      questionId: question.id,
      phase: question.phase,
      domain: question.domain,
      traits: [...question.traits],
      scoredAnswerCount: scoredAnswers.length,
      positiveEffectPaths: scoredAnswers.filter((answer) => Math.max(...Object.values(answer.effects ?? {}), 0) >= .55).length,
      negativeEffectPaths: scoredAnswers.filter((answer) => Math.min(...Object.values(answer.effects ?? {}), 1) <= .2).length,
      qualifications,
      authorityEvidence,
    }
  })
}

function traitToRoleCoverage() {
  const coverage = analyzeTraitCoverage()
  return traits.map((trait) => {
    const diagnostic = coverage.find((item) => item.traitId === trait.id)!
    return {
      traitId: trait.id,
      cluster: trait.cluster,
      questionIds: discoveryQuestions.filter((question) => question.answers.some((answer) => answer.effects?.[trait.id] !== undefined)).map((question) => question.id),
      coreRoleIds: roles.filter((role) => role.traits[trait.id] !== undefined).map((role) => role.id),
      differentiatingRoleIds: roles.filter((role) => role.differentiatingTraits[trait.id] !== undefined).map((role) => role.id),
      contraryRoleIds: roles.filter((role) => role.contraryTraits?.[trait.id] !== undefined).map((role) => role.id),
      increasingAnswerPaths: diagnostic.increasingAnswerPaths,
      decreasingAnswerPaths: diagnostic.decreasingAnswerPaths,
      issues: diagnostic.issues,
    }
  })
}

function duplicateQuestionTraitGroups() {
  const groups = new Map<string, string[]>()
  discoveryQuestions.forEach((question) => {
    const key = `${question.phase}:${[...question.traits].sort().join('|')}`
    groups.set(key, [...(groups.get(key) ?? []), question.id])
  })
  return [...groups.entries()]
    .filter(([, questionIds]) => questionIds.length > 1)
    .map(([fingerprint, questionIds]) => ({ fingerprint, questionIds }))
    .sort((left, right) => right.questionIds.length - left.questionIds.length || left.fingerprint.localeCompare(right.fingerprint))
}

function exactEvidenceFingerprintGroups() {
  const groups = new Map<string, typeof roles>()
  roles.forEach((role) => {
    const fingerprint = JSON.stringify({
      traits: role.traits,
      differentiatingTraits: role.differentiatingTraits,
      contraryTraits: role.contraryTraits ?? {},
      evidenceRequirements: role.evidenceRequirements ?? [],
    })
    groups.set(fingerprint, [...(groups.get(fingerprint) ?? []), role])
  })
  return [...groups.values()].filter((group) => group.length > 1).map((group) => group.map((role) => ({ roleId: role.id, name: role.name })))
}

function effectiveJourneyCoverage(journeys: readonly AdaptiveJourneyObservation[]) {
  const observations = new Map<string, number>()
  journeys.forEach((journey) => journey.questionIds.forEach((questionId) => observations.set(questionId, (observations.get(questionId) ?? 0) + 1)))
  const adaptiveIds = discoveryQuestions.filter((question) => question.phase === 'refine').map((question) => question.id)
  return {
    journeyCount: journeys.length,
    observedQuestionIds: [...observations.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([questionId, journeyCount]) => ({ questionId, journeyCount })),
    observedAdaptiveQuestionCount: adaptiveIds.filter((questionId) => observations.has(questionId)).length,
    unobservedAdaptiveQuestionIds: adaptiveIds.filter((questionId) => !observations.has(questionId)),
    note: 'This is fixture-observed effective coverage from deterministic adaptive journeys, not proof of population-level reachability.',
  }
}

function recommendationBaseline() {
  return recommendationResults.map((result) => ({
    personaId: result.persona.id,
    focus: result.persona.focus,
    candidateCount: result.persona.candidates.length,
    candidates: result.persona.candidates.map((candidate) => ({
      roleId: candidate.roleId,
      label: candidate.label,
      eligible: candidate.eligible,
      evidenceType: candidate.evidenceType,
      decisionPathway: candidate.decisionPathway,
      primaryPolicy: candidate.primaryPolicy,
      rawAlignment: candidate.rawAlignment,
      confidence: candidate.confidence,
      families: candidate.families,
    })),
    suggestedRoleIds: result.optimization.recommendations.map((item) => item.candidate.roleId),
    suggestedRoles: result.labels,
    suggestedPrimaryRoleId: result.optimization.primary?.candidate.roleId,
    suggestedPrimary: result.optimization.primary?.candidate.label,
    selectedFamilies: [...new Set(result.optimization.recommendations.flatMap((item) => item.candidate.families))].sort(),
    alternates: result.optimization.alternates.map((alternate) => ({ roleId: alternate.candidate.roleId, label: alternate.candidate.label, reason: alternate.reason })),
    failures: result.failures,
    deterministic: result.failures.every((failure) => failure.kind !== 'determinism'),
  }))
}

export function analyzeReflectionFixtures(fixtures: readonly ReflectionFixtureObservation[]) {
  const repeatedPhrases = [
    'KinkAtlas is a private self-reflection tool',
    'Evidence breadth is the share of a role’s themes',
    'Generated privately with KinkAtlas.',
    'not identity or consent',
    'Results do not certify safety',
    'This is not a safety score.',
  ].map((phrase) => ({
    phrase,
    fixtureCount: fixtures.filter((fixture) => fixture.output.includes(phrase)).length,
    totalOccurrences: fixtures.reduce((total, fixture) => total + fixture.output.split(phrase).length - 1, 0),
  }))
  const sectionHeaders = ['Your Role Set', 'Reflection', 'Potential blind spots', 'Wants & boundaries', 'Negotiation preferences']
  return {
    fixtureCount: fixtures.length,
    repeatedPhrases,
    sectionCoverage: Object.fromEntries(sectionHeaders.map((header) => [header, fixtures.filter((fixture) => fixture.output.split('\n').includes(header)).length])),
    mechanicalSignals: {
      bulletLines: fixtures.reduce((total, fixture) => total + fixture.output.split('\n').filter((line) => line.startsWith('• ')).length, 0),
      disclaimerLines: fixtures.reduce((total, fixture) => total + fixture.output.split('\n').filter((line) => /not (?:a safety score|identity|consent)|does not certify|never replace/iu.test(line)).length, 0),
      transitionPhrases: fixtures.reduce((total, fixture) => total + fixture.output.split('\n').filter((line) => /^(Reflection|Potential blind spots|Wants & boundaries|Negotiation preferences)$/u.test(line)).length, 0),
    },
    verifiedFindings: [
      'The output is deterministic and section-oriented rather than narratively synthesized.',
      'Role entries use repeated metric templates and bullet construction.',
      'Safety, identity, consent, and independence caveats are explicit but repeated across outputs.',
      'Optional sections are concatenated with headings; there are no transitions connecting role patterns to reflection, boundaries, or communication.',
      'The current implementation does not use random prose, runtime AI, or external language generation.',
    ],
  }
}

export function buildPhaseJAssessmentAudit(journeys: readonly AdaptiveJourneyObservation[] = []) {
  const calibration = buildCalibrationReport()
  const recommendation = buildRecommendationReport()
  const roleHealth = analyzeRoleHealth()
  const overlapPairs = highOverlapPairs(roleHealth)
  const roleIds = new Set(roleLibrary.roles.map((role) => role.id))
  const rolesWithoutFamilies = roleLibrary.roles.filter((role) => role.familyIds.length === 0)
  const rolesWithMultipleFamilies = roleLibrary.roles.filter((role) => role.familyIds.length > 1)
  const relationshipParticipants = new Set(roleLibrary.relationships.flatMap((relationship) => [relationship.fromRoleId, relationship.toRoleId]))
  const invalidRelationships = roleLibrary.relationships.filter((relationship) => !roleIds.has(relationship.fromRoleId) || !roleIds.has(relationship.toRoleId))
  const questionDiagnostics = analyzeQuestionCoverage()
  const retainedWarnings = recommendation.calibration.warningReviews
  const retainedWarningKeys = new Set(retainedWarnings.map((warning) => `${warning.role}:${warning.signal}`))

  return {
    schemaVersion: 1,
    taxonomy: {
      totalLibraryRoles: roleLibrary.roles.length,
      totalScoredRoles: roles.length,
      totalDefinitions: roleLibrary.roles.filter((role) => Boolean(role.definition?.trim())).length,
      totalFamilies: Object.keys(roleLibrary.families).length,
      familyMembershipDistribution: countBy(roleLibrary.roles.flatMap((role) => role.familyIds.map((familyId) => ({ familyId }))), (item) => item.familyId),
      rolesWithoutExplicitFamilyMembership: rolesWithoutFamilies.map((role) => ({ roleId: role.id, label: role.label, assessmentMode: role.assessmentMode, decisionPathway: role.decisionPathway })),
      rolesWithMultipleFamilies: rolesWithMultipleFamilies.map((role) => ({ roleId: role.id, label: role.label, familyIds: role.familyIds })),
      byAssessmentMode: countBy(roleLibrary.roles, (role) => role.assessmentMode),
      byRecommendationEligibility: countBy(roleLibrary.roles, (role) => role.recommendationEligibility),
      byPrimaryPolicy: countBy(roleLibrary.roles, (role) => role.primaryPolicy),
      byDecisionPathway: countBy(roleLibrary.roles, (role) => role.decisionPathway),
      relationshipCoverage: {
        relationshipCount: roleLibrary.relationships.length,
        byType: countBy(roleLibrary.relationships, (relationship) => relationship.type),
        participatingRoleCount: relationshipParticipants.size,
        rolesWithoutRelationshipMetadata: roleLibrary.roles.filter((role) => !relationshipParticipants.has(role.id)).map((role) => ({ roleId: role.id, label: role.label })),
        invalidRelationships,
      },
      familyCoverage: familyCoverage(),
      interpretation: {
        familylessExplorationOrManualRoles: rolesWithoutFamilies.filter((role) => role.assessmentMode === 'exploration' || role.decisionPathway === 'manual-only').length,
        note: 'Family membership is organizational metadata. It does not create scoring evidence or recommendation eligibility.',
      },
    },
    questions: {
      broadDiscoveryQuestions: discoveryQuestions.filter((question) => question.phase === 'broad').length,
      adaptiveDiscoveryQuestions: discoveryQuestions.filter((question) => question.phase === 'refine').length,
      refineQuestions: refinementQuestions.length,
      maximumDiscoveryQuestions: 26,
      maximumRefineQuestions: 6,
      traitCount: traits.length,
      questionToTraitCoverage: questionToTraitCoverage(),
      traitToRoleCoverage: traitToRoleCoverage(),
      directQualificationQuestionIds: discoveryQuestions.filter((question) => question.answers.some((answer) => answer.qualificationEvidence?.length || answer.authorityEvidence)).map((question) => question.id),
      nearlyIdenticalTraitGroupQuestions: questionDiagnostics.filter((question) => question.nearlyIdenticalTraitGroups),
      duplicateTraitGroups: duplicateQuestionTraitGroups(),
      overloadedQuestions: discoveryQuestions.filter((question) => question.traits.length >= 5).map((question) => ({ questionId: question.id, phase: question.phase, traitCount: question.traits.length, traits: question.traits })),
      independentEvidencePaths: analyzeTraitCoverage().map((coverage) => ({
        traitId: coverage.traitId,
        increasingAnswerPaths: coverage.increasingAnswerPaths,
        decreasingAnswerPaths: coverage.decreasingAnswerPaths,
        hasPositiveAndNegativePaths: coverage.increasingAnswerPaths > 0 && coverage.decreasingAnswerPaths > 0,
      })),
      staticVersusEffective: {
        staticAdaptiveQuestionCount: discoveryQuestions.filter((question) => question.phase === 'refine').length,
        effectiveFixtureCoverage: effectiveJourneyCoverage(journeys),
      },
    },
    discrimination: {
      roleHealth,
      highOverlapPairs: overlapPairs.map((pair) => ({
        ...pair,
        classification: retainedWarningKeys.has(`${roles.find((role) => role.id === pair.left)?.name}:HIGH_DUPLICATION`)
          || retainedWarningKeys.has(`${roles.find((role) => role.id === pair.right)?.name}:HIGH_DUPLICATION`) ? 'intentionally-accepted' : 'potential',
      })),
      exactEvidenceFingerprintGroups: exactEvidenceFingerprintGroups(),
      retainedReviewedWarnings: retainedWarnings,
      mechanicallyCorrelatedTraits: analyzeTraitCorrelations(),
      classificationNote: 'Diagnostics identify similarity and evidence risk. They do not establish that roles should be merged or weights changed.',
    },
    recommendations: {
      scenarioCount: recommendationResults.length,
      passedScenarioCount: recommendationResults.filter((result) => result.passed).length,
      baseline: recommendationBaseline(),
      deterministicRepeat: recommendation.roleSets.deterministicRepeat,
      thresholds: { minimumBaseScore: 0.58, minimumAdjustedScore: 0.52, maximumSuggestedRoles: 5 },
      libraryOrderDiagnostic: {
        note: 'Production uses reviewed library order only after optimizer score, base score, evidence quality, confidence, representation, and distinctiveness ties.',
      },
    },
    calibration: {
      personaCount: calibration.personaCount,
      passedPersonaCount: calibration.passedPersonaCount,
      criticalFailureCount: calibration.criticalFailureCount,
      warningCount: calibration.warningCount,
      adaptivePassed: calibration.adaptivePassed,
      adaptiveTotal: calibration.adaptiveTotal,
      readinessCriticalPersistence: calibration.readinessCriticalPersistence,
      boundaryIndependence: calibration.boundaryIndependence,
      decisionPathPassed: calibration.decisionPathPassed,
      decisionPathPersonaCount: calibration.decisionPathPersonaCount,
      recommendationPassed: calibration.recommendationPassed,
      recommendationPersonaCount: calibration.recommendationPersonaCount,
    },
  }
}

export type PhaseJAssessmentAudit = ReturnType<typeof buildPhaseJAssessmentAudit>
