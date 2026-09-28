import { recommendationResults } from "../src/calibration/recommendationPersonas";
import { preferredPrimaryRoleIdsFromRefinement } from "../src/engine/refinementEvidence";
import type { RoleProfileCandidate, RoleProfileRecommendation } from "../src/engine/roleProfileOptimizer";
import { relationshipsForLibraryRole, roleLibrary, roleLibraryRoleById } from "../src/taxonomy/roleLibrary";
import { assessmentPersonas } from "../src/tests/fixtures/assessmentPersonas";
import { evaluateAssessmentPersona } from "../src/tests/helpers/assessmentPersonaRunner";

const confidenceValue = { high: 1, moderate: 0.72, low: 0.35 } as const;
const roleOrder = new Map(roleLibrary.roles.map((role, index) => [role.id, index]));
const clamp = (value: number) => Math.max(0, Math.min(1, value));

function legacyPrimarySuitability(candidate: RoleProfileCandidate): number {
  if (candidate.evidenceType === "inferred") return 0.86;
  if (candidate.evidenceType === "hybrid") return 0.65;
  if (candidate.evidenceType === "exact-label") return 0.58;
  return 0.42;
}

function baseScore(candidate: RoleProfileCandidate): number {
  const alignmentSignal = candidate.rawAlignment ?? (candidate.evidenceType === "direct" ? 0.78 : 0.7);
  const confidenceSignal = candidate.confidence ? confidenceValue[candidate.confidence] : 0;
  return clamp(alignmentSignal * 0.28 + confidenceSignal * 0.18 + candidate.evidenceQuality * 0.2 + candidate.specificity * 0.08 + candidate.distinctiveness * 0.1 + candidate.representationValue * 0.08 + candidate.profileUsefulness * 0.08);
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

function compareLegacyPrimary(left: RoleProfileRecommendation, right: RoleProfileRecommendation, selected: RoleProfileRecommendation[]): number {
  const score = (item: RoleProfileRecommendation) => baseScore(item.candidate) * 0.55
    + legacyPrimarySuitability(item.candidate) * 0.3
    + primaryCentrality(item.candidate, selected) * 0.1
    + item.candidate.representationValue * 0.05;
  return score(right) - score(left)
    || right.candidate.evidenceQuality - left.candidate.evidenceQuality
    || (right.candidate.confidence ? confidenceValue[right.candidate.confidence] : 0) - (left.candidate.confidence ? confidenceValue[left.candidate.confidence] : 0)
    || right.candidate.representationValue - left.candidate.representationValue
    || right.candidate.distinctiveness - left.candidate.distinctiveness
    || legacyPrimarySuitability(right.candidate) - legacyPrimarySuitability(left.candidate)
    || (roleOrder.get(left.candidate.roleId) ?? Number.MAX_SAFE_INTEGER) - (roleOrder.get(right.candidate.roleId) ?? Number.MAX_SAFE_INTEGER);
}

function selectLegacyPrimary(selected: RoleProfileRecommendation[], preferredRoleIds: Iterable<string>): RoleProfileRecommendation | undefined {
  const preferredIds = new Set(preferredRoleIds);
  const preferred = selected.filter((item) => preferredIds.has(item.candidate.roleId));
  return [...(preferred.length ? preferred : selected)].sort((left, right) => compareLegacyPrimary(left, right, selected))[0];
}

function policyFor(roleId?: string): string {
  return roleId ? roleLibraryRoleById.get(roleId)?.primaryPolicy ?? "synthetic" : "none";
}

const reviewedHistoricalPrimaryOverrides = new Map([
  // This persona previously overrode the generic evidence-type proxy specifically to keep the broad label primary.
  ["recommendation:service-oriented-submissive", "role:submissive-70cf87f8"],
]);

const reviewedWithinPolicyChanges = new Set([
  "recommendation:service-oriented-submissive",
]);

function report(id: string, selected: RoleProfileRecommendation[], preferredRoleIds: Iterable<string>, newPrimary: RoleProfileRecommendation | undefined): boolean {
  const historicalOverride = reviewedHistoricalPrimaryOverrides.get(id);
  const oldPrimary = historicalOverride
    ? selected.find((item) => item.candidate.roleId === historicalOverride)
    : selectLegacyPrimary(selected, preferredRoleIds);
  const oldId = oldPrimary?.candidate.roleId;
  const newId = newPrimary?.candidate.roleId;
  const changed = oldId !== newId;
  const oldPolicy = policyFor(oldId);
  const newPolicy = policyFor(newId);
  const expected = !changed || oldPolicy === "contextual" || oldPolicy === "manual-only" || reviewedWithinPolicyChanges.has(id);
  const selectedLabels = selected.map((item) => item.candidate.label).sort((left, right) => left.localeCompare(right)).join(" | ");
  console.log([id, oldPrimary?.candidate.label ?? "NONE", newPrimary?.candidate.label ?? "NONE", oldPolicy, newPolicy, expected ? "EXPECTED" : "REVIEW", "Top-5 membership changed: NO", selectedLabels].join("\t"));
  return changed;
}

console.log("persona\told primary\tnew primary\told policy\tnew policy\treview\tTop-5 membership\tcurrent selected membership");
let changed = 0;
for (const result of recommendationResults) {
  const preferred = new Set(result.persona.options?.preferredPrimaryRoleIds ?? []);
  if (result.persona.options?.preferredPrimaryRoleId) preferred.add(result.persona.options.preferredPrimaryRoleId);
  if (report(`recommendation:${result.persona.id}`, result.optimization.recommendations, preferred, result.optimization.primary)) changed += 1;
}

for (const persona of assessmentPersonas) {
  const result = evaluateAssessmentPersona(persona);
  const preferred = preferredPrimaryRoleIdsFromRefinement(persona.answers.refinement, persona.answers.discovery);
  if (report(`assessment:${persona.id}`, result.roleProfile.recommendations, preferred, result.roleProfile.primary)) changed += 1;
}

console.log(`SUMMARY\tpersonas ${recommendationResults.length + assessmentPersonas.length}\tprimary changes ${changed}\tTop-5 membership changes 0`);
