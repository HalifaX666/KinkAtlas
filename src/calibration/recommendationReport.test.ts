import { describe, expect, it } from "vitest";
import { buildRecommendationReport, renderRecommendationReport } from "./recommendationReport";

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
      roles: 812,
      decisionPolicies: 812,
      definitionStates: 812,
      usableDefinitions: 702,
      unavailableDefinitions: 110,
      automaticRecommendation: 215,
      confirmationBased: 139,
      legitimateTopFiveReach: 354,
      manualOnly: 458,
      relationships: 60,
      familyCoverage: 448,
    });

    expect(report.questions).toMatchObject({ broad: 20, refinements: 52, mandatoryMaximum: 26, optionalPool: 313 });
    expect(report.questions.maximumRecommendationClarifications).toBeLessThanOrEqual(6);
    expect(report.roleSets.deterministicRepeat).toBe(true);
    expect(renderRecommendationReport(report)).toContain("recommendations 50/50");
  });

  it("retains all five reviewed diagnostic warnings with explicit reasons", () => {
    const report = buildRecommendationReport();
    expect(report.calibration.warningReviews).toHaveLength(5);
    expect(report.calibration.warningReviews.every((warning) => warning.disposition === "retained" && warning.reason.length > 40)).toBe(true);
  });
});
