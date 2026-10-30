import { roles } from '../data/roles'
import { buildRoleProfileCandidates, diagnoseRoleProfileLibraryOrder, optimizeRoleProfile, type RoleProfileCandidate, type RoleProfileOptimizationOptions } from '../engine/roleProfileOptimizer'
import { roleLibrary, type RoleLibraryRelationship } from '../taxonomy/roleLibrary'
import { buildPhaseJFamilyAudit } from './phaseJFamilyAudit'
import { phaseJ3JourneySeeds, phaseJ3SensitivityPairs, runPhaseJ3Journey, sensitivityVariantSeed } from './phaseJ3Journeys'
import { recommendationResults } from './recommendationPersonas'
import { auditBaseScore, auditOptimizeRoleProfile, type AuditTieRule } from './roleProfileOptimizerAudit'

interface ScenarioInput {
  id: string
  kind: 'existing-recommendation-persona' | 'production-selector-journey'
  description: string
  candidates: RoleProfileCandidate[]
  options: RoleProfileOptimizationOptions
  intendedDistinctions: string[]
  expectedQualityConcerns: string[]
  measuredEvidenceByRoleId?: Record<string, { evidenceBreadth: number; relevantAnswers: number; unmetEvidenceRequirements: string[] }>
}

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right)

function actualJourneyScenarios(): ScenarioInput[] {
  return phaseJ3JourneySeeds.map((seed) => {
    const journey = runPhaseJ3Journey(seed)
    const discovery = { ...journey.broadAnswers, ...journey.adaptiveAnswers }
    return {
      id: seed.id,
      kind: 'production-selector-journey' as const,
      description: seed.description,
      candidates: buildRoleProfileCandidates(journey.roleResults, {}, discovery),
      options: {},
      intendedDistinctions: seed.intendedDistinctions,
      expectedQualityConcerns: seed.expectedQualityConcerns ?? [],
      measuredEvidenceByRoleId: Object.fromEntries(journey.roleResults.map((result) => [result.role.id, {
        evidenceBreadth: result.coverage,
        relevantAnswers: result.relevantAnswers,
        unmetEvidenceRequirements: result.unmetEvidenceRequirements ?? [],
      }])),
    }
  })
}

function existingRecommendationScenarios(): ScenarioInput[] {
  return recommendationResults.map((result) => ({
    id: result.persona.id,
    kind: 'existing-recommendation-persona' as const,
    description: result.persona.description,
    candidates: result.persona.candidates,
    options: result.persona.options ?? {},
    intendedDistinctions: [result.persona.focus],
    expectedQualityConcerns: [],
  }))
}

function recommendationIds(optimization: ReturnType<typeof optimizeRoleProfile>) {
  return optimization.recommendations.map((item) => item.candidate.roleId)
}

function candidateSupport(candidate: RoleProfileCandidate) {
  if (!candidate.eligible) return 'ineligible'
  if (candidate.evidenceType === 'exact-label' || candidate.evidenceType === 'hybrid') return 'strong-direct-or-combined-support'
  if (candidate.evidenceType === 'direct') return 'direct-support-policy-dependent'
  if ((candidate.rawAlignment ?? 0) >= .72 && candidate.confidence === 'high' && candidate.evidenceQuality >= .7) return 'strong-independent-support'
  if ((candidate.rawAlignment ?? 0) >= .5 && candidate.confidence !== 'low') return 'moderate-support'
  return 'indirect-or-limited-support'
}

function selectedPairDiagnostics(candidates: RoleProfileCandidate[], selectedIds: string[]) {
  const selected = selectedIds.map((id) => candidates.find((candidate) => candidate.roleId === id)!).filter(Boolean)
  const pairs = []
  for (let leftIndex = 0; leftIndex < selected.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < selected.length; rightIndex += 1) {
      const left = selected[leftIndex]
      const right = selected[rightIndex]
      const relationship = roleLibrary.relationships.find((edge) => (
        edge.fromRoleId === left.roleId && edge.toRoleId === right.roleId
      ) || (
        edge.fromRoleId === right.roleId && edge.toRoleId === left.roleId
      ))
      const sharedFamilies = left.families.filter((family) => right.families.includes(family))
      const sameCanonical = Boolean(left.canonicalRoleId && left.canonicalRoleId === right.canonicalRoleId)
      if (!sameCanonical && !relationship && !sharedFamilies.length) continue
      const classification = sameCanonical || relationship?.type === 'alias' || relationship?.type === 'near-synonym'
        ? 'potential-near-duplicate'
        : relationship?.type === 'directional-counterpart' || relationship?.type === 'switch-counterpart'
          ? 'intentional-directional-combination'
          : 'related-but-potentially-complementary'
      pairs.push({ leftRoleId: left.roleId, rightRoleId: right.roleId, sameCanonical, relationshipType: relationship?.type, sharedFamilies, classification })
    }
  }
  return pairs
}

function isAliasOfSelected(candidate: RoleProfileCandidate, selected: readonly RoleProfileCandidate[]) {
  return selected.some((existing) => {
    if (candidate.canonicalRoleId && candidate.canonicalRoleId === existing.canonicalRoleId) return true
    const relationship = roleLibrary.relationships.find((edge) => (
      edge.fromRoleId === candidate.roleId && edge.toRoleId === existing.roleId
    ) || (
      edge.fromRoleId === existing.roleId && edge.toRoleId === candidate.roleId
    ))
    return relationship?.type === 'alias' || relationship?.type === 'near-synonym'
  })
}

function scenarioBaseline(scenario: ScenarioInput) {
  const production = optimizeRoleProfile(scenario.candidates, 5, scenario.options)
  const audit = auditOptimizeRoleProfile(scenario.candidates, scenario.options)
  const selectedIds = recommendationIds(production)
  const selectedCandidates = production.recommendations.map((item) => item.candidate)
  const selectedFamilies = new Set(production.recommendations.flatMap((item) => item.candidate.families))
  const eligible = scenario.candidates.filter((candidate) => candidate.eligible)
  const omittedIndependent = eligible.filter((candidate) => !selectedIds.includes(candidate.roleId)
    && candidate.confidence !== 'low'
    && (candidate.rawAlignment ?? 0) >= .72
    && !isAliasOfSelected(candidate, selectedCandidates)
    && candidate.families.some((family) => !selectedFamilies.has(family)))
  const ties = diagnoseRoleProfileLibraryOrder(scenario.candidates, 5, scenario.options)
  const fifthStep = audit.steps[4]
  const alternateByRoleId = new Map(production.alternates.map((alternate) => [alternate.candidate.roleId, alternate]))
  const exclusionReasonCounts = production.alternates.reduce<Record<string, number>>((counts, alternate) => {
    counts[alternate.reason] = (counts[alternate.reason] ?? 0) + 1
    return counts
  }, {})
  const recordedCandidates = scenario.kind === 'existing-recommendation-persona'
    ? scenario.candidates
    : scenario.candidates.filter((candidate) => {
      const reason = alternateByRoleId.get(candidate.roleId)?.reason
      return candidate.eligible || selectedIds.includes(candidate.roleId) || reason === 'below-threshold' || reason === 'redundant' || reason === 'slot-limit'
    })
  return {
    scenarioId: scenario.id,
    kind: scenario.kind,
    description: scenario.description,
    intendedDistinctions: scenario.intendedDistinctions,
    expectedQualityConcerns: scenario.expectedQualityConcerns,
    candidateCount: scenario.candidates.length,
    eligibleCandidateCount: eligible.length,
    excludedCandidateCount: scenario.candidates.length - eligible.length,
    exclusionReasonCounts,
    recordedCandidateCount: recordedCandidates.length,
    candidateDetailScope: scenario.kind === 'existing-recommendation-persona'
      ? 'all calibration fixture candidates'
      : 'eligible candidates and threshold/redundancy/slot-limit alternates; all exclusions remain counted by reason',
    candidates: recordedCandidates.map((candidate) => ({
      roleId: candidate.roleId,
      label: candidate.label,
      eligible: candidate.eligible,
      evidenceType: candidate.evidenceType,
      decisionPathway: candidate.decisionPathway,
      primaryPolicy: candidate.primaryPolicy,
      rawAlignment: candidate.rawAlignment,
      confidence: candidate.confidence,
      evidenceQuality: candidate.evidenceQuality,
      specificity: candidate.specificity,
      distinctiveness: candidate.distinctiveness,
      representationValue: candidate.representationValue,
      profileUsefulness: candidate.profileUsefulness,
      families: candidate.families,
      evidenceBreadth: candidate.assessmentRoleId ? scenario.measuredEvidenceByRoleId?.[candidate.assessmentRoleId]?.evidenceBreadth : undefined,
      relevantAnswers: candidate.assessmentRoleId ? scenario.measuredEvidenceByRoleId?.[candidate.assessmentRoleId]?.relevantAnswers : undefined,
      unmetEvidenceRequirements: candidate.assessmentRoleId ? scenario.measuredEvidenceByRoleId?.[candidate.assessmentRoleId]?.unmetEvidenceRequirements : undefined,
      supportClassification: candidateSupport(candidate),
      baseScore: auditBaseScore(candidate),
      exclusionReason: alternateByRoleId.get(candidate.roleId)?.reason,
    })),
    selectionSteps: audit.steps,
    suggestedRoleIds: selectedIds,
    suggestedPrimaryRoleId: production.primary?.candidate.roleId,
    selectedPairDiagnostics: selectedPairDiagnostics(scenario.candidates, selectedIds),
    omittedIndependentRoleIds: omittedIndependent.map((candidate) => candidate.roleId),
    fifthSlot: fifthStep ? { roleId: fifthStep.selectedRoleId, adjustedScore: fifthStep.rankings[0]?.adjusted, redundancyPenalty: fifthStep.rankings[0]?.redundancy.total, familyBonus: fifthStep.rankings[0]?.familyBonus.bonus, runnerUpRoleIds: fifthStep.runnerUpRoleIds } : null,
    tieDiagnostic: ties,
    auditAdapterMatchesProduction: same(audit.roleIds, selectedIds) && audit.primaryRoleId === production.primary?.candidate.roleId,
  }
}

function compareScenario(scenario: ScenarioInput, relationships: readonly RoleLibraryRelationship[]) {
  const baseline = auditOptimizeRoleProfile(scenario.candidates, scenario.options)
  const counterfactual = auditOptimizeRoleProfile(scenario.candidates, scenario.options, relationships)
  return {
    scenarioId: scenario.id,
    baselineRoleIds: baseline.roleIds,
    counterfactualRoleIds: counterfactual.roleIds,
    addedRoleIds: counterfactual.roleIds.filter((id) => !baseline.roleIds.includes(id)),
    removedRoleIds: baseline.roleIds.filter((id) => !counterfactual.roleIds.includes(id)),
    orderChanged: !same(baseline.roleIds, counterfactual.roleIds),
    membershipChanged: !same([...baseline.roleIds].sort(), [...counterfactual.roleIds].sort()),
    baselinePrimaryRoleId: baseline.primaryRoleId,
    counterfactualPrimaryRoleId: counterfactual.primaryRoleId,
    primaryChanged: baseline.primaryRoleId !== counterfactual.primaryRoleId,
    changedStepScores: counterfactual.steps.flatMap((step, index) => {
      const baselineStep = baseline.steps[index]
      if (!baselineStep) return []
      return step.rankings.flatMap((counterfactualCandidate) => {
        const baselineCandidate = baselineStep.rankings.find((item) => item.roleId === counterfactualCandidate.roleId)
        return baselineCandidate && baselineCandidate.adjusted !== counterfactualCandidate.adjusted
          ? [{ step: step.step, roleId: counterfactualCandidate.roleId, before: baselineCandidate.adjusted, after: counterfactualCandidate.adjusted }]
          : []
      })
    }),
  }
}

function proposedRelationships() {
  const proposals = buildPhaseJFamilyAudit().relationships.proposed
  return proposals.map((proposal) => ({
    ...proposal,
    relationship: {
      fromRoleId: proposal.leftRoleId,
      toRoleId: proposal.rightRoleId,
      type: proposal.proposedType,
      rationale: `J.1 counterfactual only: ${proposal.semanticJustification}`,
    } satisfies RoleLibraryRelationship,
  }))
}

function relationshipCounterfactuals(scenarios: ScenarioInput[]) {
  const proposals = proposedRelationships()
  const individual = proposals.map((proposal) => {
    const relationships = [...roleLibrary.relationships, proposal.relationship]
    const comparisons = scenarios.map((scenario) => compareScenario(scenario, relationships))
    const endpointEligibleTogether = scenarios.filter((scenario) => {
      const eligible = new Set(scenario.candidates.filter((candidate) => candidate.eligible).map((candidate) => candidate.roleId))
      return eligible.has(proposal.leftRoleId) && eligible.has(proposal.rightRoleId)
    }).map((scenario) => scenario.id)
    return {
      leftRoleId: proposal.leftRoleId,
      leftLabel: proposal.leftLabel,
      rightRoleId: proposal.rightRoleId,
      rightLabel: proposal.rightLabel,
      type: proposal.proposedType,
      alreadyExists: proposal.alreadyHasReviewedRelationship,
      endpointEligibleTogether,
      affectedScenarios: comparisons.filter((comparison) => comparison.orderChanged || comparison.primaryChanged || comparison.changedStepScores.length),
      membershipChangeCount: comparisons.filter((comparison) => comparison.membershipChanged).length,
      primaryChangeCount: comparisons.filter((comparison) => comparison.primaryChanged).length,
      interpretation: proposal.proposedType === 'commonly-overlapping'
        ? 'This type can add a 0.12 pairwise redundancy penalty and can affect primary centrality.'
        : 'Production selection assigns no redundancy penalty to this relationship type; it can affect primary centrality only when both endpoints are selected.',
    }
  })
  const combinedRelationships = [...roleLibrary.relationships, ...proposals.map((proposal) => proposal.relationship)]
  const combinedComparisons = scenarios.map((scenario) => compareScenario(scenario, combinedRelationships))
  return {
    adapterLimitation: 'Production optimizer helpers close over canonical relationship metadata. J.3 uses a bounded audit-only mirror and requires exact baseline equivalence before interpreting counterfactuals.',
    individual,
    combined: {
      affectedScenarios: combinedComparisons.filter((comparison) => comparison.orderChanged || comparison.primaryChanged || comparison.changedStepScores.length),
      membershipChangeCount: combinedComparisons.filter((comparison) => comparison.membershipChanged).length,
      primaryChangeCount: combinedComparisons.filter((comparison) => comparison.primaryChanged).length,
    },
  }
}

function familyCounterfactuals(scenarios: ScenarioInput[]) {
  const review = buildPhaseJFamilyAudit().familylessRoleReview.roles.filter((role) => role.confidence === 'high')
  return review.map((proposal) => {
    const eligibleScenarioIds = scenarios.filter((scenario) => scenario.candidates.some((candidate) => candidate.roleId === proposal.roleId && candidate.eligible)).map((scenario) => scenario.id)
    const affected = scenarios.flatMap((scenario) => {
      const baseline = optimizeRoleProfile(scenario.candidates, 5, scenario.options)
      const cloned = scenario.candidates.map((candidate) => candidate.roleId === proposal.roleId ? { ...candidate, families: [...new Set([...candidate.families, ...proposal.proposedFamilyIds])] } : { ...candidate, families: [...candidate.families] })
      const counterfactual = optimizeRoleProfile(cloned, 5, scenario.options)
      const before = recommendationIds(baseline)
      const after = recommendationIds(counterfactual)
      return same(before, after) && baseline.primary?.candidate.roleId === counterfactual.primary?.candidate.roleId ? [] : [{ scenarioId: scenario.id, before, after, beforePrimary: baseline.primary?.candidate.roleId, afterPrimary: counterfactual.primary?.candidate.roleId }]
    })
    return { roleId: proposal.roleId, label: proposal.label, proposedFamilyIds: proposal.proposedFamilyIds, decisionPathway: proposal.decisionPathway, recommendationEligibility: proposal.recommendationEligibility, eligibleScenarioIds, affectedScenarios: affected, currentProductionEffect: eligibleScenarioIds.length ? 'potentially-behavior-sensitive' : 'zero-because-role-is-never-eligible-in-tested-scenarios' }
  })
}

function tieCounterfactuals(scenarios: ScenarioInput[]) {
  const rules: AuditTieRule[] = ['stable-role-id', 'stronger-independent-evidence', 'greater-distinctiveness', 'conservative-specificity']
  const baseline = scenarios.map((scenario) => ({ scenario, result: auditOptimizeRoleProfile(scenario.candidates, scenario.options) }))
  return {
    production: {
      scenarios: scenarios.length,
      exactTieSteps: baseline.reduce((total, item) => total + item.result.steps.filter((step) => step.rankings[0]?.tiedBeforeFinalRule).length, 0),
      scenariosWithTie: baseline.filter((item) => item.result.steps.some((step) => step.rankings[0]?.tiedBeforeFinalRule)).map((item) => item.scenario.id),
    },
    alternatives: rules.map((rule) => {
      const changes = baseline.flatMap(({ scenario, result }) => {
        const alternative = auditOptimizeRoleProfile(scenario.candidates, scenario.options, roleLibrary.relationships, rule)
        return same(result.roleIds, alternative.roleIds) && result.primaryRoleId === alternative.primaryRoleId ? [] : [{ scenarioId: scenario.id, productionRoleIds: result.roleIds, alternativeRoleIds: alternative.roleIds, productionPrimaryRoleId: result.primaryRoleId, alternativePrimaryRoleId: alternative.primaryRoleId, membershipChanged: !same([...result.roleIds].sort(), [...alternative.roleIds].sort()) }]
      })
      return { rule, changedScenarioCount: changes.length, membershipChangeCount: changes.filter((change) => change.membershipChanged).length, primaryChangeCount: changes.filter((change) => change.productionPrimaryRoleId !== change.alternativePrimaryRoleId).length, changes }
    }),
  }
}

function sensitivity() {
  return phaseJ3SensitivityPairs.map((pair) => {
    const baselineSeed = phaseJ3JourneySeeds.find((seed) => seed.id === pair.baselineId)!
    const baselineJourney = runPhaseJ3Journey(baselineSeed)
    const variantJourney = runPhaseJ3Journey(sensitivityVariantSeed(pair))
    const baselineSet = baselineJourney.suggestedRoleIds
    const variantSet = variantJourney.suggestedRoleIds
    const intersection = baselineSet.filter((id) => variantSet.includes(id))
    const membershipChanged = !same([...baselineSet].sort(), [...variantSet].sort())
    const primaryChanged = baselineJourney.suggestedPrimaryRoleId !== variantJourney.suggestedPrimaryRoleId
    const classification = pair.id.includes('contrary') || pair.id.includes('add-authority')
      ? 'expected-sensitivity'
      : membershipChanged && intersection.length < Math.min(baselineSet.length, variantSet.length) - 1
        ? 'potential-instability'
        : membershipChanged || primaryChanged
          ? 'acceptable-uncertainty'
          : 'stable'
    return { id: pair.id, dimension: pair.dimension, baselineId: pair.baselineId, baselineRoleIds: baselineSet, variantRoleIds: variantSet, intersectionRoleIds: intersection, addedRoleIds: variantSet.filter((id) => !baselineSet.includes(id)), removedRoleIds: baselineSet.filter((id) => !variantSet.includes(id)), baselinePrimaryRoleId: baselineJourney.suggestedPrimaryRoleId, variantPrimaryRoleId: variantJourney.suggestedPrimaryRoleId, primaryChanged, membershipChanged, classification }
  })
}

export function buildRecommendationQualityAudit() {
  const scenarios = [...existingRecommendationScenarios(), ...actualJourneyScenarios()]
  const baseline = scenarios.map(scenarioBaseline)
  const relationshipCounterfactual = relationshipCounterfactuals(scenarios)
  const familyCounterfactual = familyCounterfactuals(scenarios)
  const authorityReferences = roleLibrary.roles.filter((role) => role.nearestRoleIds.includes('authority-holder')).map((role) => ({ roleId: role.id, label: role.label, canonicalRoleId: role.canonicalRoleId, primaryPolicy: role.primaryPolicy }))
  const directInterest = roleLibrary.roles.filter((role) => role.decisionPathway === 'direct-interest')
  const strongSelected = baseline.flatMap((scenario) => scenario.candidates.filter((candidate) => scenario.suggestedRoleIds.includes(candidate.roleId) && candidate.supportClassification.startsWith('strong')).map((candidate) => ({ scenarioId: scenario.scenarioId, roleId: candidate.roleId })))
  const unsupportedSpecificity = baseline.flatMap((scenario) => scenario.candidates.filter((candidate) => scenario.suggestedRoleIds.includes(candidate.roleId) && candidate.supportClassification === 'indirect-or-limited-support' && candidate.specificity >= .8).map((candidate) => ({ scenarioId: scenario.scenarioId, roleId: candidate.roleId, specificity: candidate.specificity })))
  const redundantSelected = baseline.flatMap((scenario) => scenario.selectedPairDiagnostics.filter((pair) => pair.classification === 'potential-near-duplicate').map((pair) => ({ scenarioId: scenario.scenarioId, ...pair })))
  const primaryConcerns = baseline.filter((scenario) => {
    const primary = scenario.candidates.find((candidate) => candidate.roleId === scenario.suggestedPrimaryRoleId)
    return primary && (!['direct-primary', 'competitive'].includes(primary.primaryPolicy) || ['indirect-or-limited-support', 'ineligible'].includes(primary.supportClassification))
  }).map((scenario) => scenario.scenarioId)

  return {
    schemaVersion: 1,
    safeguards: { observationalOnly: true, productionOptimizerChanged: false, scoringChanged: false, eligibilityChanged: false, roleMetadataChanged: false, readinessOrBoundariesChanged: false, networkCallsIntroduced: false },
    counts: { existingRecommendationScenarios: recommendationResults.length, productionSelectorJourneys: phaseJ3JourneySeeds.length, totalScenarios: scenarios.length, libraryRoles: roleLibrary.roles.length, scoredRoles: roles.length, relationships: roleLibrary.relationships.length, families: Object.keys(roleLibrary.families).length },
    adapterEquivalence: { matchedScenarios: baseline.filter((scenario) => scenario.auditAdapterMatchesProduction).length, totalScenarios: baseline.length, exact: baseline.every((scenario) => scenario.auditAdapterMatchesProduction) },
    rubric: {
      objectiveInvariants: ['Every selected role is eligible.', 'No manual-only role is inferred.', 'At most five roles are selected.', 'Primary policy is direct-primary or competitive.', 'Unmet explicit requirements prevent inferred eligibility.'],
      heuristicSignals: ['Strong support requires high alignment, non-low confidence, and substantial evidence quality unless directly confirmed.', 'Independent supported families omitted at the slot limit are coverage candidates, not automatic defects.', 'Canonical/alias duplication is more concerning than intentional directional or family overlap.', 'A fifth role is low-value when it adds material redundancy without a distinct supported theme.'],
      editorialJudgments: ['Which related labels add useful nuance.', 'Whether a broad or specific label communicates the evidence better.', 'Whether a user should receive a headline primary role at all.'],
      limitations: 'These deterministic heuristics audit internal consistency. They are not validated measures of identity accuracy, user satisfaction, or population frequency.',
    },
    baseline,
    qualitySummary: { strongSelectedCount: strongSelected.length, unsupportedSpecificity, redundantSelected, scenariosWithOmittedIndependentInterests: baseline.filter((scenario) => scenario.omittedIndependentRoleIds.length).map((scenario) => ({ scenarioId: scenario.scenarioId, roleIds: scenario.omittedIndependentRoleIds })), primaryConcerns, scenarioReviewFlags: baseline.filter((scenario) => scenario.expectedQualityConcerns.length).map((scenario) => ({ scenarioId: scenario.scenarioId, prompts: scenario.expectedQualityConcerns, suggestedRoleIds: scenario.suggestedRoleIds, suggestedPrimaryRoleId: scenario.suggestedPrimaryRoleId })) },
    tieBreaks: tieCounterfactuals(scenarios),
    relationshipCounterfactual,
    familyCounterfactual,
    directInterest: {
      roleCount: directInterest.length,
      metadataEligibility: Object.fromEntries([...new Set(directInterest.map((role) => role.recommendationEligibility))].map((eligibility) => [eligibility, directInterest.filter((role) => role.recommendationEligibility === eligibility).length])),
      productionSelectorEligibleOccurrences: scenarios.filter((scenario) => scenario.kind === 'production-selector-journey').reduce((count, scenario) => count + scenario.candidates.filter((candidate) => candidate.decisionPathway === 'direct-interest' && candidate.eligible).length, 0),
      syntheticCalibrationEligibleOccurrences: scenarios.filter((scenario) => scenario.kind === 'existing-recommendation-persona').reduce((count, scenario) => count + scenario.candidates.filter((candidate) => candidate.decisionPathway === 'direct-interest' && candidate.eligible).length, 0),
      explicitEvidenceStoredByCurrentDiscovery: false,
      policyA: 'Existing runtime: direct-interest roles remain excluded from automatic recommendations and available through manual exploration.',
      policyB: 'Not simulated quantitatively. The repository has no reviewed contract mapping explicit responses to one exact direct-interest role, so enabling candidates would invent eligibility rules.',
      requiredDecision: 'Define the exact user action, evidence storage, per-role mapping, confidence semantics, safeguards, and whether confirmed labels may become primary.',
    },
    authorityHolder: {
      scoredRoleExists: roles.some((role) => role.id === 'authority-holder'),
      exactPublicNodeCount: roleLibrary.roles.filter((role) => role.id === 'authority-holder' || role.canonicalRoleId === 'authority-holder').length,
      nearestReferences: authorityReferences,
      effects: { recommendationLabel: 'Authority Holder cannot appear as its own public Suggested Role Set label.', explanation: 'Evidence can influence nearest-mapped public candidates, which obscures the scored distinction.', navigation: 'No exact public role page exists for the scored construct.', primary: 'It cannot independently become the public primary role without a public node.', relatedRoles: 'Normal reviewed relationship edges cannot target a missing public node.' },
      editorialOptions: [
        { option: 'dedicated-public-node', consistency: 'Highest semantic transparency.', optimizerRisk: 'High: adds a new eligible vocabulary candidate and may alter sets/primary.' },
        { option: 'explicit-alias-or-canonical-mapping', consistency: 'Makes translation explicit but may collapse a reviewed distinction.', optimizerRisk: 'Medium to high depending on eligibility and relationship metadata.' },
        { option: 'internal-construct-with-user-facing-translation', consistency: 'Preserves scoring separation while documenting which public label receives it.', optimizerRisk: 'Lowest if translation is explicit and existing eligibility is retained.' },
      ],
    },
    sensitivity: sensitivity(),
  }
}

export type RecommendationQualityAudit = ReturnType<typeof buildRecommendationQualityAudit>
