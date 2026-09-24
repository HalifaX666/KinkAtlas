import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoleDefinitionDetails } from "../components/RoleDefinitionDetails";
import { calculateTraitScores } from "../engine/discoveryScoring";
import { explainRoleAssessment } from "../engine/roleAssessmentExplanation";
import { matchRoles } from "../engine/roleMatching";
import type { RoleProfileAlternate, RoleProfileCandidate, RoleProfileRecommendation } from "../engine/roleProfileOptimizer";
import { getShareableRoleSet } from "../engine/shareResults";
import { roleLibrary } from "../taxonomy/roleLibrary";

const candidate = (roleId = "role:test", label = "Test role"): RoleProfileCandidate => ({
  roleId,
  label,
  evidenceType: "inferred",
  decisionPathway: "inferred",
  eligible: true,
  rawAlignment: 0.8,
  confidence: "high",
  evidenceQuality: 0.8,
  specificity: 0.7,
  distinctiveness: 0.7,
  representationValue: 0.7,
  profileUsefulness: 0.7,
  primarySuitability: 0.7,
  families: [],
  evidenceExplanation: "",
});

const recommendation = (): RoleProfileRecommendation => ({ candidate: candidate(), optimizerScore: 0.8, explanation: "" });
const alternate = (reason: RoleProfileAlternate["reason"], overlappingRoleLabel?: string): RoleProfileAlternate => ({
  candidate: candidate(),
  optimizerScore: 0.7,
  reason,
  explanation: "Internal explanation",
  overlappingRoleLabel,
});

afterEach(cleanup);

describe("role assessment explanation language", () => {
  it("distinguishes a suggested role from the immutable suggested primary", () => {
    expect(explainRoleAssessment({ recommendation: recommendation() })).toMatchObject({
      kind: "suggested",
      heading: "Suggested from your assessment",
    });
    expect(explainRoleAssessment({ recommendation: recommendation(), isSuggestedPrimary: true })).toMatchObject({
      kind: "suggested-primary",
      heading: "Suggested primary",
    });
  });

  it.each([
    ["slot-limit", "supported-alternative", "five-role presentation limit"],
    ["insufficient-evidence", "needs-more-evidence", "not have enough distinct assessment evidence"],
    ["below-threshold", "needs-more-evidence", "not have enough distinct assessment evidence"],
    ["confirmation-required", "needs-direct-confirmation", "require direct confirmation"],
    ["manual-only", "manual-exploration", "available for self-exploration"],
  ] as const)("maps %s to safe user-facing language", (reason, kind, message) => {
    const explanation = explainRoleAssessment({ alternate: alternate(reason) });
    expect(explanation.kind).toBe(kind);
    expect(explanation.message).toMatch(new RegExp(message, "i"));
  });

  it("names overlap without describing either role as objectively better", () => {
    const explanation = explainRoleAssessment({ alternate: alternate("redundant", "Top") });
    expect(explanation).toMatchObject({ kind: "overlap", heading: "Overlapping evidence" });
    expect(explanation.message).toContain("Top");
    expect(explanation.message).toMatch(/does not make either role objectively better/i);
  });

  it("keeps manual selection separate from assessment support", () => {
    const selectedRole = { roleId: "role:test", label: "Test role", source: "user-selected" as const };
    const selectedOnly = explainRoleAssessment({ selectedRole });
    const selectedAlternate = explainRoleAssessment({ selectedRole, alternate: alternate("slot-limit") });

    expect(selectedOnly).toMatchObject({ kind: "unrepresented", manualSelection: { heading: "Added by you" } });
    expect(selectedAlternate).toMatchObject({ kind: "supported-alternative", manualSelection: { heading: "Added by you" } });
    expect(selectedAlternate.message).toMatch(/remained supported/i);
  });

  it("uses safe fallback language for a role absent from recommendation output", () => {
    const explanation = explainRoleAssessment({});
    expect(explanation).toMatchObject({ kind: "unrepresented", heading: "Not suggested automatically" });
    expect(explanation.message).toMatch(/still explore or choose it/i);
  });

  it("never exposes raw optimizer reason codes or identity verdicts", () => {
    const explanations = (["slot-limit", "redundant", "insufficient-evidence", "below-threshold", "confirmation-required", "manual-only"] as const)
      .map((reason) => explainRoleAssessment({ alternate: alternate(reason, "Top") }))
      .map((explanation) => `${explanation.heading} ${explanation.message}`)
      .join(" ");

    expect(explanations).not.toMatch(/slot-limit|insufficient-evidence|below-threshold|confirmation-required|manual-only/i);
    expect(explanations).not.toMatch(/doesn't fit you|not you|wrong for you|failed to qualify/i);
  });

  it("manual selection does not fabricate alignment or confidence even when a matching assessed role exists", () => {
    const answers = { "d-power-give": "strong", "d-position-give": "strong", "r-lead": "strong", "r-responsibility": "strong" };
    const roleResults = matchRoles(calculateTraitScores(answers), answers);
    const assessed = roleResults[0];
    const [shared] = getShareableRoleSet([{ roleId: assessed.role.id, label: assessed.role.name, source: "user-selected" }], roleResults);

    expect(shared.source).toBe("user-selected");
    expect(shared.alignment).toBeUndefined();
    expect(shared.confidence).toBeUndefined();
    expect(shared.evidenceBreadth).toBeUndefined();
  });

  it("renders a safe assessment fallback and handling guidance when a reviewed definition is unavailable", () => {
    const role = roleLibrary.roles.find((item) => !item.definition?.trim())!;
    render(<RoleDefinitionDetails roleId={role.id} assessmentExplanation={explainRoleAssessment({})} />);
    fireEvent.click(screen.getByText("About this role"));

    expect(screen.getByText(/doesn.t currently have a description/i)).toBeInTheDocument();
    expect(screen.getByText("How this relates to your results")).toBeInTheDocument();
    expect(screen.getByText("How KinkAtlas handles this role")).toBeInTheDocument();
  });
});
