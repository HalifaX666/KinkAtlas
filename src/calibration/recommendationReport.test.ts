import { describe, expect, it } from "vitest";
import { buildRecommendationReport, renderRecommendationReport } from "./recommendationReport";
import { buildConfidenceEvidenceDiagnostic, buildOptimizerOrderDiagnostic, renderScoringBoundaryDiagnostics } from "./scoringBoundaryDiagnostics";

describe("recommendation quality report", () => {
  it("passes all adversarial personas and reports actionable failure categories", () => {
    const report = buildRecommendationReport();
    expect(report.status).toBe("PASS");
    expect(report.diagnostics.errors).toEqual([]);
    expect(report.calibration).toMatchObject({ coreAndDecision: 50, total: 100, recommendationPersonas: 50, recommendationPassed: 50, criticalFailures: 0, warningsBefore: 5, warningsAfter: 5 });
    expect(Object.values(report.calibration.failureCounts).every((count) => count === 0)).toBe(true);
    expect(Object.values(report.calibration.focusResults).every((result) => result.passed === result.total)).toBe(true);
  });

  it("preserves coverage, question, and deterministic role-set invariants", () => {
    const report = buildRecommendationReport();
    expect(report.coverage).toEqual({
      roles: 1107,
      decisionPolicies: 1107,
      primaryPolicies: 1107,
      primaryPolicyDistribution: {
        "direct-primary": 27,
        competitive: 22,
        contextual: 181,
        "manual-only": 877,
      },
      definitionStates: 1107,
      usableDefinitions: 1107,
      unavailableDefinitions: 0,
      automaticRecommendation: 229,
      confirmationBased: 137,
      legitimateTopFiveReach: 366,
      manualOnly: 741,
      relationships: 59,
      familyCoverage: 449,
    });
    expect(report.questions).toMatchObject({ broad: 20, refinements: 52, mandatoryMaximum: 26, optionalPool: 325 });
    expect(report.questions.maximumRecommendationClarifications).toBeLessThanOrEqual(6);
    expect(report.roleSets.deterministicRepeat).toBe(true);
    expect(report.primaryOutcomes).toMatchObject({ directlyPreferredPrimaries: 1 });
    expect(report.primaryOutcomes.personasWithPrimary + report.primaryOutcomes.personasWithoutPrimary).toBe(50);
    expect(report.primaryOutcomes.contextualRecommendationsExcludedFromPrimary).toBeGreaterThan(0);
    expect(renderRecommendationReport(report)).toContain("recommendations 50/50");
    expect(renderRecommendationReport(report)).toContain("PRIMARY POLICY: direct-primary 27; competitive 22; contextual 181; manual-only 877");
  });

  it("retains all five reviewed diagnostic warnings with explicit reasons", () => {
    const report = buildRecommendationReport();
    expect(report.calibration.warningReviews).toHaveLength(5);
    expect(report.calibration.warningReviews.every((warning) => warning.disposition === "retained" && warning.reason.length > 40)).toBe(true);
  });

  it("reports deterministic optimizer-order and confidence-evidence diagnostics without changing production behavior", () => {
    const optimizer = buildOptimizerOrderDiagnostic();
    const confidence = buildConfidenceEvidenceDiagnostic();

    expect(optimizer).toEqual(buildOptimizerOrderDiagnostic());
    expect(confidence).toEqual(buildConfidenceEvidenceDiagnostic());
    expect(optimizer.personas).toBe(50);
    expect(confidence.personas).toBe(40);
    expect(confidence.observations).toBe(4_040);
    expect(optimizer).toMatchObject({
      selectionSteps: 88,
      productionReproductionMismatches: 0,
      libraryOrderResolvedTies: 16,
      suggestedRoleSetDifferenceCount: 5,
      suggestedPrimaryDifferenceCount: 0,
    });
    expect(confidence).toMatchObject({
      countsEqual: 3_591,
      questionLevelCountHigher: 430,
      contributionCountHigher: 19,
      maximumAbsoluteDelta: 5,
      hypotheticalThresholdCrossings: 29,
    });
    expect(confidence.countsEqual + confidence.questionLevelCountHigher + confidence.contributionCountHigher).toBe(confidence.observations);
    expect(renderScoringBoundaryDiagnostics(optimizer, confidence)).toContain("Optimizer library-order diagnostic");
    expect(renderScoringBoundaryDiagnostics(optimizer, confidence)).toContain("Confidence evidence diagnostic");

    console.log(`\n${renderScoringBoundaryDiagnostics(optimizer, confidence)}\n`);
  });
});
