import { roleById } from "../data/roles";
import { traitById } from "../data/traits";
import { relationshipsForLibraryRole, roleLibrary, roleLibraryRoleById, type RoleLibraryDecisionPathway, type RoleLibraryRole } from "../taxonomy/roleLibrary";
import type { ConfidenceLevel, RoleResult, AssessmentAnswers } from "../types";
import { evaluateRefinementEvidence, refinementFallbackIsSuperseded, refinementTargetByRoleId } from "./refinementEvidence";
import { calculateTraitScores } from "./discoveryScoring";
import { selectEligibleRefinementQuestions } from "./refinementRouting";

export type ProfileEvidenceType = "inferred" | "direct" | "hybrid" | "explicit" | "exact-label" | "exploration";

export interface RoleProfileCandidate {
  roleId: string;
  label: string;
  definition?: string;
  canonicalRoleId?: string;
  assessmentRoleId?: string;
  evidenceType: ProfileEvidenceType;
  decisionPathway: RoleLibraryDecisionPathway;
  eligible: boolean;
  rawAlignment?: number;
  confidence?: ConfidenceLevel;
  evidenceQuality: number;
  specificity: number;
  distinctiveness: number;
  representationValue: number;
  profileUsefulness: number;
  primarySuitability: number;
  families: string[];
  evidenceThemes?: string[];
  notImplied?: string;
  evidenceExplanation: string;
}

export interface RoleProfileRecommendation {
  candidate: RoleProfileCandidate;
  optimizerScore: number;
  explanation: string;
  redundancyNote?: string;
}

export interface RoleProfileAlternate {
  candidate: RoleProfileCandidate;
  optimizerScore: number;
  reason: "user-excluded" | "confirmation-required" | "manual-only" | "unresolved" | "insufficient-evidence" | "below-threshold" | "redundant" | "slot-limit";
  explanation: string;
  overlappingRoleLabel?: string;
}

export interface RoleProfileOptimization {
  recommendations: RoleProfileRecommendation[];
  primary?: RoleProfileRecommendation;
  primaryExplanation?: string;
  alternates: RoleProfileAlternate[];
}

export interface RoleProfileOptimizationOptions {
  excludedRoleIds?: Iterable<string>;
  preferredPrimaryRoleId?: string;
  preferredPrimaryRoleIds?: Iterable<string>;
}

const confidenceValue: Record<ConfidenceLevel, number> = { high: 1, moderate: 0.72, low: 0.35 };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const roleOrder = new Map(roleLibrary.roles.map((role, index) => [role.id, index]));

function baseScore(candidate: RoleProfileCandidate): number {
  const alignmentSignal = candidate.rawAlignment ?? (candidate.evidenceType === "direct" ? 0.78 : 0.7);
  const confidenceSignal = candidate.confidence ? confidenceValue[candidate.confidence] : 0;
  return clamp(alignmentSignal * 0.28 + confidenceSignal * 0.18 + candidate.evidenceQuality * 0.2 + candidate.specificity * 0.08 + candidate.distinctiveness * 0.1 + candidate.representationValue * 0.08 + candidate.profileUsefulness * 0.08);
}

function redundancy(candidate: RoleProfileCandidate, selected: RoleProfileRecommendation[]): number {
  return selected.reduce((penalty, recommendation) => {
    const existing = recommendation.candidate;
    const canonicalPenalty = candidate.canonicalRoleId && candidate.canonicalRoleId === existing.canonicalRoleId ? 0.4 : 0;
    const relationship = relationshipsForLibraryRole(candidate.roleId).find((edge) => edge.fromRoleId === existing.roleId || edge.toRoleId === existing.roleId);
    const relationshipPenalty = relationship?.type === "alias" || relationship?.type === "near-synonym" ? 0.3 : relationship?.type === "broader-than" || relationship?.type === "narrower-than" ? 0.2 : relationship?.type === "sibling" || relationship?.type === "commonly-overlapping" ? 0.12 : 0;
    const sharedFamilies = candidate.families.filter((family) => existing.families.includes(family)).length;
    const familyPenalty = Math.min(0.18, sharedFamilies * 0.08);
    return penalty + Math.max(canonicalPenalty, relationshipPenalty, familyPenalty);
  }, 0);
}

function marginalRepresentationBonus(candidate: RoleProfileCandidate, selected: RoleProfileRecommendation[]): number {
  if (!selected.length || !candidate.families.length) return 0;
  const represented = new Set(selected.flatMap((item) => item.candidate.families));
  const novelFamilyRatio = candidate.families.filter((family) => !represented.has(family)).length / candidate.families.length;
  return novelFamilyRatio * candidate.representationValue * 0.06;
}

function compareCandidateQuality(left: RoleProfileCandidate, right: RoleProfileCandidate): number {
  return right.evidenceQuality - left.evidenceQuality || (right.confidence ? confidenceValue[right.confidence] : 0) - (left.confidence ? confidenceValue[left.confidence] : 0) || right.representationValue - left.representationValue || right.distinctiveness - left.distinctiveness || right.primarySuitability - left.primarySuitability || (roleOrder.get(left.roleId) ?? Number.MAX_SAFE_INTEGER) - (roleOrder.get(right.roleId) ?? Number.MAX_SAFE_INTEGER);
}

function recommendationEvidenceExplanation(candidate: RoleProfileCandidate): string {
  if (candidate.evidenceType === "exact-label") return `You indicated that the exact label “${candidate.label}” feels applicable to you; KinkAtlas did not infer a percentage or confidence.`;
  if (candidate.evidenceType === "direct") return "You directly confirmed the focused interest represented by this label.";
  if (candidate.evidenceType === "hybrid") return "Your broad assessment evidence and direct interest both support exploring this label.";
  if (candidate.evidenceType === "inferred") return `Your assessment responses consistently supported this vocabulary${candidate.confidence ? ` with ${candidate.confidence} evidence confidence` : ""}.`;
  return candidate.evidenceExplanation;
}

function primaryCentrality(candidate: RoleProfileCandidate, selected: RoleProfileRecommendation[]): number {
  if (selected.length <= 1) return 0;
  const otherIds = new Set(selected.filter((item) => item.candidate.roleId !== candidate.roleId).map((item) => item.candidate.roleId));
  const connectionValue = relationshipsForLibraryRole(candidate.roleId).reduce((sum, edge) => {
    const otherRoleId = edge.fromRoleId === candidate.roleId ? edge.toRoleId : edge.fromRoleId;
    if (!otherIds.has(otherRoleId)) return sum;
    if (edge.type === "broader-than" && edge.fromRoleId === candidate.roleId) return sum + 1;
    if (edge.type === "alias" || edge.type === "near-synonym") return sum + 0.35;
    return sum + 0.55;
  }, 0);
  return clamp(connectionValue / (selected.length - 1));
}

function comparePrimaryQuality(left: RoleProfileRecommendation, right: RoleProfileRecommendation, selected: RoleProfileRecommendation[]): number {
  const leftScore = baseScore(left.candidate) * 0.55 + left.candidate.primarySuitability * 0.3 + primaryCentrality(left.candidate, selected) * 0.1 + left.candidate.representationValue * 0.05;
  const rightScore = baseScore(right.candidate) * 0.55 + right.candidate.primarySuitability * 0.3 + primaryCentrality(right.candidate, selected) * 0.1 + right.candidate.representationValue * 0.05;
  return rightScore - leftScore || compareCandidateQuality(left.candidate, right.candidate);
}

export function selectPrimaryRoleProfile(selected: RoleProfileRecommendation[], preferredPrimaryRoleIds?: Iterable<string> | string): RoleProfileRecommendation | undefined {
  const preferredIds = new Set(typeof preferredPrimaryRoleIds === "string" ? [preferredPrimaryRoleIds] : preferredPrimaryRoleIds ?? []);
  const preferred = selected.filter((item) => preferredIds.has(item.candidate.roleId));
  const candidates = preferred.length ? preferred : selected;

  return [...candidates].sort((left, right) => comparePrimaryQuality(left, right, selected))[0];
}

function strongestOverlap(candidate: RoleProfileCandidate, selected: RoleProfileRecommendation[]): RoleProfileRecommendation | undefined {
  return [...selected].sort((left, right) => redundancy(candidate, [right]) - redundancy(candidate, [left]))[0];
}

export function optimizeRoleProfile(candidates: RoleProfileCandidate[], maximum = 5, options: RoleProfileOptimizationOptions = {}): RoleProfileOptimization {
  const cap = Math.max(0, Math.min(5, maximum));
  const excludedRoleIds = new Set(options.excludedRoleIds ?? []);
  const uniqueCandidates = [...new Map(candidates.map((candidate) => [candidate.roleId, candidate])).values()];
  const eligible = uniqueCandidates.filter((candidate) => candidate.eligible && !excludedRoleIds.has(candidate.roleId));
  const selected: RoleProfileRecommendation[] = [];
  const remaining = new Map(eligible.map((candidate) => [candidate.roleId, candidate]));
  const minimumBaseScore = 0.58;
  const minimumAdjustedScore = 0.52;

  while (selected.length < cap && remaining.size) {
    const ranked = [...remaining.values()]
      .map((candidate) => {
        const base = baseScore(candidate);
        const redundancyPenalty = redundancy(candidate, selected);
        const breadthBonus = redundancyPenalty >= 0.3 ? 0 : marginalRepresentationBonus(candidate, selected);
        return { candidate, base, redundancyPenalty, adjusted: base - redundancyPenalty + breadthBonus };
      })
      .sort((left, right) => right.adjusted - left.adjusted || right.base - left.base || compareCandidateQuality(left.candidate, right.candidate));
    const next = ranked[0];
    if (!next || next.base < minimumBaseScore || next.adjusted < minimumAdjustedScore) break;
    remaining.delete(next.candidate.roleId);
    selected.push({
      candidate: next.candidate,
      optimizerScore: next.adjusted,
      explanation: `${next.candidate.label} may be useful to explore. ${recommendationEvidenceExplanation(next.candidate)}${next.candidate.evidenceThemes?.length ? ` Relevant themes include ${next.candidate.evidenceThemes.join(", ")}.` : ""}${next.candidate.families.length ? ` It adds ${next.candidate.families.map((family) => roleLibrary.families[family] ?? family).join(", ")} representation.` : ""}${next.candidate.notImplied ? ` This does not imply ${next.candidate.notImplied.charAt(0).toLocaleLowerCase("en-US")}${next.candidate.notImplied.slice(1)}` : ""}`,
      redundancyNote: next.redundancyPenalty > 0 ? `A ${(next.redundancyPenalty * 100).toFixed(0)}-point soft redundancy penalty was applied.` : undefined,
    });
  }

  const selectedIds = new Set(selected.map((item) => item.candidate.roleId));
  const alternates: RoleProfileAlternate[] = uniqueCandidates
    .filter((candidate) => !selectedIds.has(candidate.roleId))
    .map((candidate) => {
      const score = baseScore(candidate);
      const redundancyPenalty = redundancy(candidate, selected);
      const overlappingRecommendation = redundancyPenalty > 0.12 ? strongestOverlap(candidate, selected) : undefined;
      const reason: RoleProfileAlternate["reason"] = excludedRoleIds.has(candidate.roleId) ? "user-excluded" : candidate.decisionPathway === "explicit-confirmation" ? "confirmation-required" : candidate.decisionPathway === "manual-only" ? "manual-only" : !candidate.eligible ? "insufficient-evidence" : score < minimumBaseScore ? "below-threshold" : redundancyPenalty > 0.12 ? "redundant" : "slot-limit";
      return {
        candidate,
        optimizerScore: score - redundancyPenalty,
        reason,
        overlappingRoleLabel: reason === "redundant" ? overlappingRecommendation?.candidate.label : undefined,
        explanation: reason === "user-excluded" ? "The user excluded this recommendation; KinkAtlas does not override that choice." : reason === "confirmation-required" ? "This exact label can be recommended only after the user confirms that it fits; unanswered and unsure states are not positive evidence." : reason === "manual-only" ? "This label remains available for user selection, but its reviewed policy does not support a KinkAtlas recommendation." : reason === "redundant" ? `Strong evidence was present, but ${candidate.label} overlaps strongly with ${overlappingRecommendation?.candidate.label ?? "a selected role"}, which represents the same pattern more clearly in this set.` : reason === "slot-limit" ? "The role remained a strong alternative after the five-slot constraint was applied." : "Current evidence does not justify an automatic profile recommendation.",
      };
    })
    .sort((left, right) => right.optimizerScore - left.optimizerScore || left.candidate.roleId.localeCompare(right.candidate.roleId));

  const preferredPrimaryRoleIds = new Set(options.preferredPrimaryRoleIds ?? []);
  if (options.preferredPrimaryRoleId) preferredPrimaryRoleIds.add(options.preferredPrimaryRoleId);
  const primary = selectPrimaryRoleProfile(selected, preferredPrimaryRoleIds);
  const primaryWasDirectlyPreferred = Boolean(primary && preferredPrimaryRoleIds.has(primary.candidate.roleId));
  const primaryExplanation = primary ? (primaryWasDirectlyPreferred ? `${primary.candidate.label} is the suggested primary because it is directly selected role vocabulary and is the strongest fit among your eligible directly selected role labels.` : `${primary.candidate.label} is the suggested primary because it has the strongest combined evidence and overall-profile suitability among the recommended roles—not merely the highest raw percentage.`) : undefined;
  const recommendations = primary ? [primary, ...selected.filter((item) => item.candidate.roleId !== primary.candidate.roleId)] : selected;
  return { recommendations, primary, primaryExplanation, alternates };
}

const positiveAlignment = new Set(["strong", "explore"]);

function candidateEvidence(role: RoleLibraryRole, roleResults: RoleResult[], refinementAnswers: AssessmentAnswers["refinement"] = {}, eligibleRefinementQuestionIds: ReadonlySet<string> = new Set()) {
  const mappedResult = (role.canonicalRoleId ? roleResults.find((result) => result.role.id === role.canonicalRoleId) : undefined) ?? roleResults.find((result) => role.nearestRoleIds.includes(result.role.id));

  const broadEvidenceQualifies = Boolean(mappedResult && positiveAlignment.has(mappedResult.alignment) && mappedResult.confidence !== "low" && !mappedResult.unmetEvidenceRequirements?.length);

  const refinementTarget = refinementTargetByRoleId.get(role.id);

  const refinementEvidence = refinementTarget ? evaluateRefinementEvidence(refinementAnswers).find((evidence) => evidence.targetId === refinementTarget.id) : undefined;

  const refinementSupported = refinementEvidence?.status === "supported";

  if (role.id === "role:little-180ca01b" && refinementFallbackIsSuperseded("little", refinementAnswers, eligibleRefinementQuestionIds)) {
    return {
      evidenceType: "hybrid" as const,
      eligible: false,
      confidence: undefined,
      explanation: refinementAnswers["ref-little-vocabulary"] === "other" ? "The user indicated that another Little-related label fits better, so KinkAtlas does not force the generic Little label." : "A more specific directly confirmed Little vocabulary label supersedes generic Little in the suggested role set.",
    };
  }

  if (role.decisionPathway === "inferred") {
    return {
      evidenceType: "inferred" as const,
      eligible: broadEvidenceQualifies,
      confidence: mappedResult?.confidence,
      explanation: broadEvidenceQualifies ? "Existing scored-role evidence meets the alignment and confidence threshold." : "The mapped scored role does not yet have enough aligned evidence for automatic recommendation.",
    };
  }

  if (role.decisionPathway === "direct-interest") {
    return {
      evidenceType: "direct" as const,
      eligible: false,
      confidence: undefined,
      explanation: "This role requires a direct interested response; unsure, prefer-not, no, and unanswered add no positive evidence.",
    };
  }

  if (role.decisionPathway === "hybrid") {
    const eligibleRefinementSupport = refinementEvidence?.supportingQuestionIds.some((questionId) => eligibleRefinementQuestionIds.has(questionId)) ?? false;
    if (refinementTarget) {
      return {
        evidenceType: "hybrid" as const,
        eligible: refinementSupported && eligibleRefinementSupport,
        confidence: undefined,
        explanation: refinementSupported && eligibleRefinementSupport ? "Independent Discovery evidence established the relevant broader patterns, and Refine confirmed that the intersection feels meaningfully connected." : refinementSupported && !eligibleRefinementSupport ? "Refine contains a positive response, but the current Discovery evidence does not qualify this intersection for recommendation." : refinementEvidence?.status === "rejected" ? "The broader patterns may be present, but the user indicated that they prefer to keep this intersection separate." : refinementEvidence?.status === "possible" ? "The broader patterns may be present, but the user has not directly confirmed that this intersection fits." : "This intersection requires both qualifying broader evidence and a direct Refine confirmation.",
      };
    }

    return {
      evidenceType: "hybrid" as const,
      eligible: false,
      confidence: undefined,
      explanation: "Hybrid recommendation requires both direct confirmation and qualifying broad-role evidence.",
    };
  }

  if (role.decisionPathway === "explicit-confirmation") {
    return {
      evidenceType: "exact-label" as const,
      eligible: false,
      confidence: undefined,
      explanation: "This exact self-identification requires a confirmed response; unsure and unanswered states provide no positive evidence.",
    };
  }

  return {
    evidenceType: "exploration" as const,
    eligible: false,
    confidence: undefined,
    explanation: "This reference or unclear label remains available for manual selection, but no recommendation rule is justified.",
  };
}
export function buildRoleProfileCandidates(roleResults: RoleResult[], refinementAnswers: AssessmentAnswers["refinement"] = {}, discoveryAnswers: AssessmentAnswers["discovery"] = {}): RoleProfileCandidate[] {
  const traitScores = calculateTraitScores(discoveryAnswers);

  const eligibleRefinementQuestionIds = new Set(
    selectEligibleRefinementQuestions(
      {
        discovery: discoveryAnswers,
        refinement: refinementAnswers,
        readiness: {},
        boundaries: {},
        negotiation: {},
      },
      traitScores,
    ).map((question) => question.id),
  );
  return roleLibrary.roles.map((role) => {
    const evidence = candidateEvidence(role, roleResults, refinementAnswers, eligibleRefinementQuestionIds);
    const mappedResult = (role.canonicalRoleId ? roleResults.find((result) => result.role.id === role.canonicalRoleId) : undefined) ?? roleResults.find((result) => role.nearestRoleIds.includes(result.role.id));
    const mappedRole = role.canonicalRoleId ? roleById[role.canonicalRoleId] : undefined;
    const familyCandidates = [mappedRole?.primaryCategory, ...(mappedRole?.facets ?? []), role.evidenceCluster, ...role.familyIds];
    const families = [...new Set(familyCandidates.filter((family): family is string => Boolean(family)))];
    return {
      roleId: role.id,
      label: role.label,
      definition: role.definition,
      canonicalRoleId: role.canonicalRoleId,
      assessmentRoleId: mappedResult?.role.id,
      evidenceType: evidence.evidenceType,
      decisionPathway: role.decisionPathway,
      eligible: evidence.eligible,
      rawAlignment: evidence.evidenceType === "exact-label" || (evidence.evidenceType === "hybrid" && refinementTargetByRoleId.has(role.id)) ? undefined : mappedResult?.rawScore,
      confidence: evidence.confidence,
      evidenceQuality: evidence.evidenceType === "hybrid" ? 0.94 : evidence.evidenceType === "inferred" ? (mappedResult?.coverage ?? 0.6) : evidence.evidenceType === "exact-label" ? 0.9 : evidence.evidenceType === "direct" ? 0.8 : 0,
      specificity: evidence.evidenceType === "direct" ? 0.9 : evidence.evidenceType === "hybrid" ? 0.84 : evidence.evidenceType === "exact-label" ? 0.8 : 0.62,
      distinctiveness: role.nearestRoleIds.length ? 0.68 : 0.76,
      representationValue: evidence.evidenceType === "inferred" ? 0.82 : 0.72,
      profileUsefulness: role.canonicalRoleId ? 0.86 : 0.7,
      primarySuitability: evidence.evidenceType === "inferred" ? 0.86 : evidence.evidenceType === "hybrid" ? 0.65 : evidence.evidenceType === "exact-label" ? 0.58 : 0.42,
      families,
      evidenceThemes: mappedResult?.supportingTraits.slice(0, 3).map((signal) => traitById[signal.id].label),
      notImplied: mappedRole?.notImplied ?? (role.decisionPathway === "explicit-confirmation" ? "that adjacent identities, activities, dynamics, or consent choices also fit." : undefined),
      evidenceExplanation: evidence.explanation,
    };
  });
}

export interface EditableRoleProfileEntry {
  roleId: string;
  label: string;
  source: "recommended" | "user-selected";
  definition?: string;
  assessmentRoleId?: string;
}

export function buildEditableRoleProfileEntries(optimization: RoleProfileOptimization): EditableRoleProfileEntry[] {
  return optimization.recommendations.map((item) => ({
    roleId: item.candidate.roleId,
    label: item.candidate.label,
    source: "recommended",
    definition: item.candidate.definition,
    assessmentRoleId: item.candidate.assessmentRoleId,
  }));
}

export function addRoleProfileEntry(roles: EditableRoleProfileEntry[], role: EditableRoleProfileEntry): EditableRoleProfileEntry[] {
  if (roles.length >= 5 || roles.some((item) => item.roleId === role.roleId)) return roles;
  return [...roles, role];
}

export function removeRoleProfileEntry(roles: EditableRoleProfileEntry[], roleId: string): EditableRoleProfileEntry[] {
  return roles.filter((role) => role.roleId !== roleId);
}

export function replaceRoleProfileEntry(roles: EditableRoleProfileEntry[], roleId: string, replacement: EditableRoleProfileEntry): EditableRoleProfileEntry[] {
  if (roles.some((role) => role.roleId === replacement.roleId && role.roleId !== roleId)) return roles;
  return roles.map((role) => (role.roleId === roleId ? replacement : role));
}

export function reorderRoleProfileEntry(roles: EditableRoleProfileEntry[], from: number, to: number): EditableRoleProfileEntry[] {
  if (from < 0 || to < 0 || from >= roles.length || to >= roles.length || from === to) return roles;
  const reordered = [...roles];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered;
}

export function makeRoleProfileEntryPrimary(roles: EditableRoleProfileEntry[], roleId: string): EditableRoleProfileEntry[] {
  const index = roles.findIndex((role) => role.roleId === roleId);
  return index > 0 ? reorderRoleProfileEntry(roles, index, 0) : roles;
}

export function roleProfileEntriesEqual(left: EditableRoleProfileEntry[], right: EditableRoleProfileEntry[]): boolean {
  return left.length === right.length && left.every((role, index) => {
    const other = right[index];
    return role.roleId === other?.roleId
      && role.label === other.label
      && role.source === other.source
      && role.definition === other.definition
      && role.assessmentRoleId === other.assessmentRoleId;
  });
}

export function selectDisplayableRoleProfileAlternates(alternates: RoleProfileAlternate[], maximum = 8): RoleProfileAlternate[] {
  if (maximum <= 0) return [];
  return alternates
    .filter((alternate) => Boolean(alternate.candidate.label.trim() && (alternate.reason.trim() || alternate.explanation.trim())))
    .slice(0, maximum);
}

export function getRoleProfileEntry(roleId: string) {
  return roleLibraryRoleById.get(roleId);
}
