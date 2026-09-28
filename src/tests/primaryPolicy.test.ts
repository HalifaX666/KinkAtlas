import { describe, expect, it } from "vitest";
import {
  addRoleProfileEntry,
  buildEditableRoleProfileEntries,
  makeRoleProfileEntryPrimary,
  optimizeRoleProfile,
  selectPrimaryRoleProfile,
  type RoleProfileCandidate,
  type RoleProfileRecommendation,
} from "../engine/roleProfileOptimizer";
import type { RoleLibraryPrimaryPolicy } from "../taxonomy/roleLibrary";

function candidate(roleId: string, label: string, primaryPolicy: RoleLibraryPrimaryPolicy, overrides: Partial<RoleProfileCandidate> = {}): RoleProfileCandidate {
  return {
    roleId,
    label,
    evidenceType: "inferred",
    decisionPathway: "inferred",
    primaryPolicy,
    eligible: true,
    rawAlignment: 0.86,
    confidence: "high",
    evidenceQuality: 0.86,
    specificity: 0.72,
    distinctiveness: 0.74,
    representationValue: 0.8,
    profileUsefulness: 0.8,
    families: [roleId],
    evidenceExplanation: "Supported test evidence.",
    ...overrides,
  };
}

function recommendation(value: RoleProfileCandidate): RoleProfileRecommendation {
  return { candidate: value, optimizerScore: value.rawAlignment ?? 0.8, explanation: "Test recommendation." };
}

describe("role-level suggested-primary policy", () => {
  it("lets an eligible direct-primary role receive metadata-driven preference", () => {
    const direct = candidate("role:direct", "Direct", "direct-primary", { rawAlignment: 0.72, evidenceQuality: 0.72 });
    const competitive = candidate("role:competitive", "Competitive", "competitive", { rawAlignment: 0.96, evidenceQuality: 0.96 });
    const result = optimizeRoleProfile([direct, competitive], 5, { preferredPrimaryRoleIds: [direct.roleId] });

    expect(result.recommendations.map((item) => item.candidate.roleId)).toEqual(expect.arrayContaining([direct.roleId, competitive.roleId]));
    expect(result.primary?.candidate.roleId).toBe(direct.roleId);
    expect(result.primaryExplanation).toMatch(/directly selected this vocabulary.*supported strongly enough/i);
  });

  it("does not let direct-primary policy bypass recommendation eligibility", () => {
    const unsupported = candidate("role:unsupported", "Unsupported", "direct-primary", { eligible: false, rawAlignment: 1, evidenceQuality: 1 });
    const competitive = candidate("role:competitive", "Competitive", "competitive");
    const result = optimizeRoleProfile([unsupported, competitive], 5, { preferredPrimaryRoleIds: [unsupported.roleId] });

    expect(result.recommendations.map((item) => item.candidate.roleId)).not.toContain(unsupported.roleId);
    expect(result.primary?.candidate.roleId).toBe(competitive.roleId);
  });

  it("lets competitive roles become primary without direct vocabulary preference", () => {
    const competitive = candidate("role:competitive", "Competitive", "competitive");
    expect(optimizeRoleProfile([competitive]).primary?.candidate.roleId).toBe(competitive.roleId);
  });

  it("keeps stronger contextual intersections and aliases recommendable but out of the primary pool", () => {
    const competitive = candidate("role:headline", "Headline", "competitive", { rawAlignment: 0.7, evidenceQuality: 0.7 });
    const intersection = candidate("role:intersection", "Compound intersection", "contextual", { rawAlignment: 0.99, evidenceQuality: 0.99 });
    const alias = candidate("role:alias", "Alias presentation", "contextual", { rawAlignment: 0.98, evidenceQuality: 0.98 });
    const result = optimizeRoleProfile([competitive, intersection, alias], 5, { preferredPrimaryRoleIds: [intersection.roleId, alias.roleId] });

    expect(result.recommendations.map((item) => item.candidate.roleId)).toEqual(expect.arrayContaining([competitive.roleId, intersection.roleId, alias.roleId]));
    expect(result.primary?.candidate.roleId).toBe(competitive.roleId);
  });

  it("never selects contextual or manual-only recommendations as the suggested primary", () => {
    const contextual = recommendation(candidate("role:contextual", "Contextual", "contextual"));
    const manual = recommendation(candidate("role:manual", "Manual", "manual-only"));
    expect(selectPrimaryRoleProfile([contextual, manual], [contextual.candidate.roleId, manual.candidate.roleId])).toBeUndefined();
  });

  it("chooses multiple preferred direct-primary roles by quality, independent of input order", () => {
    const weaker = recommendation(candidate("role:weaker", "Weaker", "direct-primary", { rawAlignment: 0.72, evidenceQuality: 0.72 }));
    const stronger = recommendation(candidate("role:stronger", "Stronger", "direct-primary", { rawAlignment: 0.94, evidenceQuality: 0.94 }));
    const preferred = [weaker.candidate.roleId, stronger.candidate.roleId];

    expect(selectPrimaryRoleProfile([weaker, stronger], preferred)?.candidate.roleId).toBe(stronger.candidate.roleId);
    expect(selectPrimaryRoleProfile([stronger, weaker], [...preferred].reverse())?.candidate.roleId).toBe(stronger.candidate.roleId);
  });

  it("uses role ID rather than selected or library order as the final primary tie-break", () => {
    const laterId = recommendation(candidate("role:z-headline", "Z headline", "competitive"));
    const earlierId = recommendation(candidate("role:a-headline", "A headline", "competitive"));

    expect(selectPrimaryRoleProfile([laterId, earlierId])?.candidate.roleId).toBe(earlierId.candidate.roleId);
    expect(selectPrimaryRoleProfile([earlierId, laterId])?.candidate.roleId).toBe(earlierId.candidate.roleId);
  });

  it("keeps a contextual-only suggested set without inventing a primary", () => {
    const first = candidate("role:context-one", "Context one", "contextual");
    const second = candidate("role:context-two", "Context two", "contextual", { rawAlignment: 0.9 });
    const result = optimizeRoleProfile([first, second]);

    expect(result.recommendations).toHaveLength(2);
    expect(result.primary).toBeUndefined();
    expect(result.primaryExplanation).toBeUndefined();
  });

  it("keeps the user's editable primary independent from immutable suggested-primary policy", () => {
    const headline = candidate("role:headline", "Headline", "competitive");
    const contextual = candidate("role:contextual", "Contextual", "contextual", { rawAlignment: 0.9 });
    const optimization = optimizeRoleProfile([headline, contextual]);
    const suggestedPrimaryId = optimization.primary?.candidate.roleId;
    const withManualRole = addRoleProfileEntry(buildEditableRoleProfileEntries(optimization), {
      roleId: "role:manual-choice",
      label: "Manual choice",
      source: "user-selected",
    });
    const edited = makeRoleProfileEntryPrimary(withManualRole, "role:manual-choice");

    expect(edited[0]).toMatchObject({ roleId: "role:manual-choice", source: "user-selected" });
    expect(optimization.primary?.candidate.roleId).toBe(suggestedPrimaryId);
    expect(optimization.primary?.candidate.roleId).not.toBe(edited[0].roleId);
  });
});
