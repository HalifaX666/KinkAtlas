import { discoveryQuestions } from '../data/questions'
import { roles } from '../data/roles'
import { traits } from '../data/traits'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { questionDiscrimination, questionInformationValue } from '../engine/adaptiveQuestioning'
import { matchRoles } from '../engine/roleMatching'
import { roleLibrary } from '../taxonomy/roleLibrary'
import type { DiscoveryQuestion, Role, TraitId } from '../types'
import { analyzeRoleHealth, roleSimilarity } from './roleHealth'
import { phaseJ2JourneySeeds, rejectedBroadDomains, runPhaseJ2Journey, type PhaseJ2JourneyObservation } from './phaseJ2Journeys'

export interface ExistingJourneyObservation {
  id: string
  questionIds: string[]
}

const originallyUnobservedIds = [
  'r-positions',
  'r-discipline-give',
  'r-hum-give',
  'r-hum-receive',
  'r-praise-direction',
  'r-praise-context',
  'r-material-sense',
  'r-objectification-frame',
  'r-objectification-focus',
  'r-objectification-direction',
] as const

const pairSeeds = [
  ['dominant', 'authority-holder'],
  ['submissive', 'bottom'],
  ['top', 'dominant'],
  ['rigger', 'rope-bottom'],
  ['switch', 'dominant'],
  ['sadist', 'sensation-top'],
  ['pet', 'owner'],
  ['owner', 'handler'],
  ['primal-hunter', 'primal-prey'],
  ['service-dominant', 'service-submissive'],
] as const

const familyGapIds = ['degradation-objectification', 'denial-control', 'material-fetish', 'praise-affection', 'persona-fantasy', 'sexual-role-vocabulary'] as const

function countQuestions(journeys: readonly ExistingJourneyObservation[]) {
  const counts = new Map<string, number>()
  journeys.forEach((journey) => journey.questionIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)))
  return counts
}

function roleTraits(role: Role) {
  return new Set<TraitId>([
    ...Object.keys(role.traits),
    ...Object.keys(role.differentiatingTraits),
    ...Object.keys(role.contraryTraits ?? {}),
  ] as TraitId[])
}

function libraryMappingsForScoredRole(roleId: string) {
  return roleLibrary.roles.filter((role) => role.canonicalRoleId === roleId)
}

function answerPathKind(answer: DiscoveryQuestion['answers'][number]) {
  if (answer.noScore) return answer.id === 'prefer-not' ? 'prefer-not' : 'skipped-or-unknown'
  const values = Object.values(answer.effects ?? {})
  if (!values.length) return 'neutral'
  if (values.every((value) => value <= .2)) return 'negative'
  if (values.every((value) => value >= .4 && value <= .6)) return 'neutral'
  return values.some((value) => value <= .2) ? 'mixed-directional' : 'positive'
}

function buildEvidenceMap() {
  const traitNodes = traits.map((trait) => ({
    traitId: trait.id,
    cluster: trait.cluster,
    coreRoleIds: roles.filter((role) => role.traits[trait.id] !== undefined).map((role) => role.id),
    differentiatingRoleIds: roles.filter((role) => role.differentiatingTraits[trait.id] !== undefined).map((role) => role.id),
    contraryRoleIds: roles.filter((role) => role.contraryTraits?.[trait.id] !== undefined).map((role) => role.id),
    familyIds: [...new Set(roles.filter((role) => roleTraits(role).has(trait.id)).flatMap((role) => libraryMappingsForScoredRole(role.id).flatMap((mapped) => mapped.familyIds)))].sort(),
  }))
  const questionNodes = discoveryQuestions.map((question) => {
    const touchedRoles = roles.filter((role) => question.traits.some((trait) => roleTraits(role).has(trait)))
    const relatedFamilies = [...new Set(touchedRoles.flatMap((role) => libraryMappingsForScoredRole(role.id).flatMap((mapped) => mapped.familyIds)))].sort()
    return {
      questionId: question.id,
      phase: question.phase,
      domain: question.domain,
      prompt: question.prompt,
      declaredTraits: [...question.traits],
      relatedScoredRoleIds: touchedRoles.map((role) => role.id),
      relatedFamilies,
      answers: question.answers.map((answer) => {
        const emittedTraits = Object.entries(answer.effects ?? {}).map(([traitId, value]) => ({ traitId, value }))
        const qualifications = answer.qualificationEvidence ?? []
        return {
          answerId: answer.id,
          label: answer.label,
          pathKind: answerPathKind(answer),
          usableEvidence: !answer.noScore && emittedTraits.length > 0,
          emittedTraits,
          authorityEvidence: answer.authorityEvidence,
          qualificationEvidence: qualifications,
          satisfiesExplicitRequirementsForRoleIds: roles.filter((role) => (role.evidenceRequirements ?? []).some((requirement) => qualifications.includes(requirement))).map((role) => role.id),
          recommendationEligibility: {
            sufficientByItself: false,
            reason: 'A single answer may emit evidence or satisfy an explicit gate, but recommendation eligibility also depends on alignment, confidence, pathway, and any Refine requirements.',
          },
        }
      }),
    }
  })

  return {
    schemaVersion: 1,
    interpretation: {
      availability: 'The question exists in the static bank.',
      adaptiveEligibility: 'The adaptive question is unanswered and its broad domain has not been rejected.',
      selected: 'The production selector ranked the question first within the six-follow-up budget.',
      usableEvidence: 'The selected answer is scored and emits at least one trait effect.',
      roleAlignment: 'The emitted trait is weighted by a scored role; this alone does not establish a match.',
      explicitRequirement: 'Only a matching qualificationEvidence marker satisfies a role evidence requirement.',
      recommendationEligibility: 'Eligibility is evaluated after role matching and pathway-specific gates; family membership never creates evidence.',
    },
    counts: { questions: questionNodes.length, broadQuestions: questionNodes.filter((item) => item.phase === 'broad').length, adaptiveQuestions: questionNodes.filter((item) => item.phase === 'refine').length, traits: traits.length, scoredRoles: roles.length, families: Object.keys(roleLibrary.families).length },
    traits: traitNodes,
    questions: questionNodes,
  }
}

function rankQuestionAtState(question: DiscoveryQuestion, discovery: Record<string, string>) {
  const traitScores = calculateTraitScores(discovery)
  const plausibleRoles = matchRoles(traitScores, discovery, roles)
    .filter((result) => result.relevantAnswers > 0 && result.rawScore >= .38)
    .slice(0, 6)
    .map((result) => result.role)
  if (!plausibleRoles.length) return undefined
  const information = questionInformationValue(question, plausibleRoles, traitScores)
  const relevance = plausibleRoles.reduce((sum, role) => sum + question.traits.reduce((traitSum, trait) => {
    const weight = (role.traits[trait] ?? 0) + (role.differentiatingTraits[trait] ?? 0) * .7 - (role.contraryTraits?.[trait] ?? 0) * .8
    return traitSum + Math.max(0, weight)
  }, 0) / question.traits.length, 0) / plausibleRoles.length
  return { information, finalRankScore: information.total * .8 + relevance * .2, plausibleRoleIds: plausibleRoles.map((role) => role.id) }
}

function adaptiveReachability(original: readonly ExistingJourneyObservation[], expanded: readonly PhaseJ2JourneyObservation[]) {
  const originalCounts = countQuestions(original)
  const expandedCounts = countQuestions(expanded.map((journey) => ({ id: journey.id, questionIds: journey.selectedAdaptiveQuestionIds })))
  const allAdaptive = discoveryQuestions.filter((question) => question.phase === 'refine')

  const questions = allAdaptive.map((question) => {
    const selectionWitnesses = expanded.filter((journey) => journey.selectedAdaptiveQuestionIds.includes(question.id)).map((journey) => journey.id)
    const candidateObservations = expanded.map((journey) => {
      const rejected = rejectedBroadDomains(journey.broadAnswers)
      if (rejected.includes(question.domain)) return { journeyId: journey.id, domainRejected: true as const }
      const ranked = rankQuestionAtState(question, journey.broadAnswers)
      return ranked ? { journeyId: journey.id, domainRejected: false as const, ...ranked } : { journeyId: journey.id, domainRejected: false as const }
    })
    const available = candidateObservations.flatMap((item) => 'finalRankScore' in item ? [item] : [])
    const best = available.sort((left, right) => (right.finalRankScore ?? 0) - (left.finalRankScore ?? 0) || left.journeyId.localeCompare(right.journeyId))[0]
    const originalCount = originalCounts.get(question.id) ?? 0
    const expandedCount = expandedCounts.get(question.id) ?? 0
    const classification = expandedCount > 0
      ? (originalCount > 0 ? 'reachable-and-retained' : 'reachable-and-observed-by-new-valid-journey')
      : available.length > 0
        ? 'potentially-starved-by-ranking-or-budget'
        : candidateObservations.every((item) => item.domainRejected)
          ? 'suppressed-by-legitimate-eligibility-conditions'
          : 'inconclusive'
    return {
      questionId: question.id,
      domain: question.domain,
      prompt: question.prompt,
      traits: [...question.traits],
      relatedScoredRoleIds: roles.filter((role) => question.traits.some((trait) => roleTraits(role).has(trait))).map((role) => role.id),
      relatedFamilyIds: [...new Set(roles.filter((role) => question.traits.some((trait) => roleTraits(role).has(trait))).flatMap((role) => libraryMappingsForScoredRole(role.id).flatMap((mapped) => mapped.familyIds)))].sort(),
      qualificationEvidence: [...new Set(question.answers.flatMap((answer) => answer.qualificationEvidence ?? []))].sort(),
      originalJourneyCount: originalCount,
      expandedJourneyCount: expandedCount,
      classification,
      selectionWitnesses,
      broadDomainRejectionCanSuppress: true,
      rejectedJourneyCount: candidateObservations.filter((item) => item.domainRejected).length,
      productionBudget: 6,
      bestBroadState: best && 'finalRankScore' in best ? best : undefined,
      searchEvidence: 'Tested through the production selector in the checked-in deterministic J.2 journeys; non-selection is not treated as mathematical proof of unreachability.',
    }
  })
  return {
    schemaVersion: 1,
    original: coverageSummary(original, allAdaptive.map((question) => question.id)),
    expanded: coverageSummary([...original, ...expanded.map((journey) => ({ id: journey.id, questionIds: journey.selectedAdaptiveQuestionIds }))], allAdaptive.map((question) => question.id)),
    newJourneys: expanded.map((journey) => ({
      id: journey.id,
      description: journey.description,
      broadAnswers: journey.broadAnswers,
      selectedAdaptiveQuestions: journey.selectedAdaptiveQuestionIds.map((questionId) => ({ questionId, answerId: journey.adaptiveAnswers[questionId] })),
      suppressedAdaptiveQuestionIds: allAdaptive.map((question) => question.id).filter((questionId) => !journey.selectedAdaptiveQuestionIds.includes(questionId)),
      rejectedDomains: rejectedBroadDomains(journey.broadAnswers),
      traitScores: journey.traitScores,
      measuredRoleResults: journey.roleResults.filter((result) => result.relevantAnswers > 0).map((result) => ({ roleId: result.role.id, rawAlignment: result.rawScore, rankedScore: result.rankedScore, alignment: result.alignment, confidence: result.confidence, evidenceBreadth: result.coverage, relevantAnswers: result.relevantAnswers, unmetEvidenceRequirements: result.unmetEvidenceRequirements ?? [] })),
      eligibleCandidateRoleIds: journey.eligibleCandidateRoleIds,
      suggestedRoleIds: journey.suggestedRoleIds,
      suggestedPrimaryRoleId: journey.suggestedPrimaryRoleId,
      relevantFamilyIds: journey.relevantFamilyIds,
    })),
    originallyUnobserved: questions.filter((question) => originallyUnobservedIds.includes(question.questionId as typeof originallyUnobservedIds[number])),
    questions,
  }
}

function coverageSummary(journeys: readonly ExistingJourneyObservation[], adaptiveIds: string[]) {
  const counts = countQuestions(journeys)
  const observed = adaptiveIds.filter((id) => counts.has(id))
  return {
    journeyCount: journeys.length,
    observedAdaptiveQuestionCount: observed.length,
    totalAdaptiveQuestionCount: adaptiveIds.length,
    coveragePercent: Number((observed.length / adaptiveIds.length * 100).toFixed(1)),
    frequencies: observed.map((questionId) => ({ questionId, journeyCount: counts.get(questionId) ?? 0 })),
    unobservedQuestionIds: adaptiveIds.filter((id) => !counts.has(id)),
    caveat: 'Fixture coverage is deterministic test coverage, not a population estimate.',
  }
}

function pairDiagnostics(journeys: readonly PhaseJ2JourneyObservation[]) {
  const roleById = new Map(roles.map((role) => [role.id, role]))
  return pairSeeds.map(([leftId, rightId]) => {
    const left = roleById.get(leftId)
    const right = roleById.get(rightId)
    if (!left || !right) throw new Error(`Missing scored role pair ${leftId}/${rightId}`)
    const leftTraits = roleTraits(left)
    const rightTraits = roleTraits(right)
    const sharedTraits = [...leftTraits].filter((trait) => rightTraits.has(trait)).sort()
    const distinguishingTraits = [...new Set([...leftTraits, ...rightTraits])].filter((trait) => !sharedTraits.includes(trait)).sort()
    const differentiatingQuestions = discoveryQuestions.map((question) => ({ questionId: question.id, score: questionDiscrimination(question, [left, right]) })).filter((item) => item.score >= .05).sort((a, b) => b.score - a.score || a.questionId.localeCompare(b.questionId))
    const strongestQuestionIds = differentiatingQuestions.slice(0, 8).map((question) => question.questionId)
    const selectedDifferentiators = [...new Set(journeys.flatMap((journey) => journey.selectedAdaptiveQuestionIds.filter((id) => strongestQuestionIds.includes(id))))].sort()
    const observed = journeys.map((journey) => {
      const leftResult = journey.roleResults.find((result) => result.role.id === leftId)!
      const rightResult = journey.roleResults.find((result) => result.role.id === rightId)!
      return { journeyId: journey.id, leftRaw: leftResult.rawScore, rightRaw: rightResult.rawScore, difference: Number(Math.abs(leftResult.rawScore - rightResult.rawScore).toFixed(4)), leftConfidence: leftResult.confidence, rightConfidence: rightResult.confidence }
    }).sort((a, b) => b.difference - a.difference || a.journeyId.localeCompare(b.journeyId))
    const similarity = roleSimilarity(left, right)
    const classification = similarity >= .9 ? 'weak-statistical-discrimination' : selectedDifferentiators.length >= 2 && (observed[0]?.difference ?? 0) >= .15 ? 'strong-observed-discrimination' : 'limited-or-insufficient-observed-discrimination'
    return { leftRoleId: leftId, leftLabel: left.name, rightRoleId: rightId, rightLabel: right.name, similarity, sharedTraits, distinguishingTraits, contraryEvidence: { left: Object.keys(left.contraryTraits ?? {}), right: Object.keys(right.contraryTraits ?? {}) }, strongestDifferentiatingQuestions: differentiatingQuestions.slice(0, 8), selectedDifferentiatingQuestionIds: selectedDifferentiators, strongestContrastingJourney: observed[0], classification }
  })
}

export function buildPhaseJ2Audit(originalJourneys: readonly ExistingJourneyObservation[]) {
  const expandedJourneys = phaseJ2JourneySeeds.map(runPhaseJ2Journey)
  const evidenceMap = buildEvidenceMap()
  const reachability = adaptiveReachability(originalJourneys, expandedJourneys)
  const discrimination = pairDiagnostics(expandedJourneys)
  const roleHealth = analyzeRoleHealth()
  const acceptedDiagnostics = [
    ['dominant', 'HIGH_DUPLICATION'],
    ['authority-holder', 'HIGH_DUPLICATION'],
    ['voyeur', 'SINGLE_TRAIT_DEPENDENCY'],
    ['kink-explorer', 'SINGLE_TRAIT_DEPENDENCY'],
    ['community-connector', 'SINGLE_TRAIT_DEPENDENCY'],
  ].map(([roleId, signal]) => {
    const diagnostic = roleHealth.find((item) => item.roleId === roleId)
    const observations = expandedJourneys.map((journey) => {
      const result = journey.roleResults.find((item) => item.role.id === roleId)!
      return { journeyId: journey.id, rawAlignment: result.rawScore, alignment: result.alignment, confidence: result.confidence, evidenceBreadth: result.coverage }
    })
    const positive = [...observations].sort((a, b) => b.rawAlignment - a.rawAlignment || a.journeyId.localeCompare(b.journeyId))[0]
    const negative = [...observations].filter((item) => item.evidenceBreadth > 0).sort((a, b) => a.rawAlignment - b.rawAlignment || a.journeyId.localeCompare(b.journeyId))[0]
    const ambiguous = [...observations].filter((item) => item.evidenceBreadth > 0).sort((a, b) => Math.abs(a.rawAlignment - .5) - Math.abs(b.rawAlignment - .5) || a.journeyId.localeCompare(b.journeyId))[0]
    return { roleId, signal, remainsVisible: diagnostic?.issues.includes(signal as never) ?? false, questionCount: diagnostic?.questionCount, estimatedEvidenceCoverage: diagnostic?.estimatedEvidenceCoverage, nearestNeighbor: diagnostic?.nearestNeighbors[0], representativeJourneys: { positive, negative, ambiguous } }
  })
  const familyGaps = familyGapIds.map((familyId) => {
    const members = roleLibrary.roles.filter((role) => role.familyIds.includes(familyId))
    const scoredIds = [...new Set(members.flatMap((member) => member.canonicalRoleId ? [member.canonicalRoleId] : []))]
    const scoredRoles = roles.filter((role) => scoredIds.includes(role.id))
    const questionIds = discoveryQuestions.filter((question) => scoredRoles.some((role) => question.traits.some((trait) => roleTraits(role).has(trait)))).map((question) => question.id)
    return { familyId, label: roleLibrary.families[familyId], memberCount: members.length, scoredRoleIds: scoredRoles.map((role) => role.id), staticDiscoveryQuestionIds: questionIds, directInterestRoleCount: members.filter((role) => role.decisionPathway === 'direct-interest').length, explorationOnlyRoleCount: members.filter((role) => role.recommendationEligibility === 'exploration-only').length, assessmentInferenceSupported: scoredRoles.length > 0, productInferenceIntent: scoredRoles.length ? 'partially-defined-by-scored-role-mappings' : 'unresolved-editorial-policy', directConfirmationAssessment: 'more-appropriate-than-inference-for-narrow-unscored-vocabulary', newQuestionDiscriminationBenefit: 'not-established-without-a-qualifying-scored-role-and-intended-pair', requiredFutureChanges: scoredRoles.length ? ['regression fixtures', 'possibly independent evidence'] : ['editorial intent', 'scored role or direct-confirmation gate', 'eligibility contract'], falsePositiveRisk: scoredRoles.length ? 'medium' : 'high', note: scoredRoles.length ? 'Scored Discovery support exists, but family membership itself is not evidence.' : 'Current support is Refine, direct-interest metadata, or manual exploration; no family-level identity inference is justified.' }
  })
  const authorityPublicNodes = roleLibrary.roles.filter((role) => role.id === 'authority-holder' || role.canonicalRoleId === 'authority-holder')
  const authorityNearestReferences = roleLibrary.roles.filter((role) => role.nearestRoleIds.includes('authority-holder')).map((role) => ({ roleId: role.id, label: role.label }))
  const directInterestRoles = roleLibrary.roles.filter((role) => role.decisionPathway === 'direct-interest')

  return {
    schemaVersion: 1,
    safeguards: { observationalOnly: true, productionQuestionDataChanged: false, scoringChanged: false, routingChanged: false, eligibilityChanged: false, recommendationBehaviorChanged: false, privacyOrSnapshotBehaviorChanged: false },
    counts: { libraryRoles: roleLibrary.roles.length, scoredRoles: roles.length, traits: traits.length, families: Object.keys(roleLibrary.families).length, broadQuestions: discoveryQuestions.filter((question) => question.phase === 'broad').length, adaptiveQuestions: discoveryQuestions.filter((question) => question.phase === 'refine').length, expandedJourneys: expandedJourneys.length },
    evidenceMap,
    reachability,
    discrimination,
    acceptedDiagnostics,
    familyGaps,
    authorityHolder: { scoredRoleExists: roles.some((role) => role.id === 'authority-holder'), exactPublicNodeCount: authorityPublicNodes.length, exactPublicNodes: authorityPublicNodes.map((role) => role.id), nearestReferences: authorityNearestReferences, conclusion: authorityPublicNodes.length ? 'public-mapping-present' : 'missing-public-role-node-not-a-reporting-artifact' },
    directInterest: { roleCount: directInterestRoles.length, recommendationEligibility: Object.fromEntries([...new Set(directInterestRoles.map((role) => role.recommendationEligibility))].sort().map((value) => [value, directInterestRoles.filter((role) => role.recommendationEligibility === value).length])), candidateConstructionEligible: false, conclusion: 'Metadata describes direct-interest pathways, but candidateEvidence currently returns eligible: false for every direct-interest role. The intended policy requires a separate product decision.' },
  }
}

export type PhaseJ2Audit = ReturnType<typeof buildPhaseJ2Audit>
