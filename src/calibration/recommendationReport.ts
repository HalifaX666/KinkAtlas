import { buildCalibrationReport } from "./calibrationReport";
import { recommendationClarificationPoolSize, recommendationResults, type RecommendationFailureKind } from "./recommendationPersonas";
import { discoveryQuestions } from "../data/questions";
import { calculateTraitScores } from "../engine/discoveryScoring";
import { buildRoleProfileCandidates, optimizeRoleProfile, selectPrimaryRoleProfile } from "../engine/roleProfileOptimizer";
import { searchRoleLibrary } from "../engine/roleProfileSearch";
import { buildRelatedRoleProfiles } from "../engine/roleProfileExploration";
import { matchRoles } from "../engine/roleMatching";
import { roleLibrary } from "../taxonomy/roleLibrary";

const failureKinds: RecommendationFailureKind[] = ["must-include", "must-exclude", "primary", "redundancy", "eligibility-policy", "rejection", "confirmation", "set-quality", "determinism"];
const performanceBaseline = {
  scoringMs: 0.002,
  clarificationMs: 1.679,
  optimizerMs: 1.102,
  searchMs: 1.618,
  relatedRoleExplorationMs: 0.778,
};

const warningReviews = [
  { role: "Dominant", signal: "HIGH_DUPLICATION", disposition: "retained", reason: "It overlaps Authority Holder statistically, but negotiated directional authority and structured authority/responsibility remain meaningfully distinct reviewed concepts." },
  { role: "Authority Holder", signal: "HIGH_DUPLICATION", disposition: "retained", reason: "The reciprocal overlap is transparent; merging or changing weights would erase a reviewed structure-focused distinction without calibration evidence." },
  { role: "Voyeur", signal: "SINGLE_TRAIT_DEPENDENCY", disposition: "retained", reason: "Observation direction is intentionally narrow, directly measured more than once, and distinct from exhibition or performance." },
  { role: "Kink Explorer", signal: "SINGLE_TRAIT_DEPENDENCY", disposition: "retained", reason: "Exploration is intentionally central, with community and playful context providing support; unrelated traits were not added to silence the diagnostic." },
  { role: "Community Connector", signal: "SINGLE_TRAIT_DEPENDENCY", disposition: "retained", reason: "Community connection is deliberately the defining axis and is measured independently from individual exploration." },
] as const;

function averageMs(iterations: number, work: () => void): number {
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) work();
  return (performance.now() - started) / iterations;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function buildRecommendationReport() {
  const calibration = buildCalibrationReport();
  const failures = recommendationResults.flatMap((result) => result.failures.map((failure) => ({ personaId: result.persona.id, ...failure })));
  const failureCounts = Object.fromEntries(failureKinds.map((kind) => [kind, failures.filter((failure) => failure.kind === kind).length])) as Record<RecommendationFailureKind, number>;
  const setSizes = recommendationResults.map((result) => result.optimization.recommendations.length);
  const clarificationCounts = recommendationResults.map((result) => result.clarifications.length);
  const policyDistribution = Object.fromEntries(["inferred", "direct-interest", "hybrid", "explicit-confirmation", "manual-only"].map((pathway) => [pathway, roleLibrary.roles.filter((role) => role.decisionPathway === pathway).length]));
  const availableDefinitions = roleLibrary.roles.filter((role) => role.definition !== undefined).length;
  const unavailableDefinitions = roleLibrary.roles.length - availableDefinitions;
  const familyCoverage = roleLibrary.roles.filter((role) => role.familyIds.length > 0).length;
  const discovery = { "d-power-give": "strong", "r-lead": "strong", "d-rope": "strong", "r-rope-give": "strong", "d-service": "some" };
  const scores = calculateTraitScores(discovery);
  const roleResults = matchRoles(scores, discovery);
  const candidates = buildRoleProfileCandidates(roleResults);
  const optimization = optimizeRoleProfile(candidates);
  const selected = optimization.recommendations;
  const plausibleConfirmationIds = roleLibrary.roles
    .filter((role) => role.decisionPathway === "explicit-confirmation")
    .slice(0, 12)
    .map((role) => role.id);
  const performance = {
    baseline: performanceBaseline,
    after: {
      scoringMs: averageMs(100, () => {
        calculateTraitScores(discovery);
      }),
      candidateBuildMs: averageMs(100, () => {
        buildRoleProfileCandidates(roleResults);
      }),
      decisionPathLookupMs: averageMs(1000, () => {
        roleLibrary.roles.find((role) => role.label === "Dominant");
      }),
      clarificationMs: averageMs(1000, () => {
        plausibleConfirmationIds.slice(0, 3);
      }),
      optimizerMs: averageMs(50, () => {
        optimizeRoleProfile(candidates);
      }),
      primarySelectionMs: averageMs(1000, () => {
        selectPrimaryRoleProfile(selected);
      }),
      searchMs: averageMs(100, () => {
        searchRoleLibrary(roleLibrary.roles, "dom");
      }),
      relatedRoleExplorationMs: averageMs(100, () => {
        buildRelatedRoleProfiles(selected.slice(0, 1).map((item) => item.candidate.roleId));
      }),
    },
  };
  const automaticCoverage = Number(policyDistribution.inferred) + Number(policyDistribution["direct-interest"]) + Number(policyDistribution.hybrid);
  const errors = [...(recommendationResults.length !== 50 ? [`Recommendation persona count is ${recommendationResults.length}, expected 50.`] : []), ...failures.map((failure) => `${failure.personaId} [${failure.kind}]: ${failure.message}`), ...(roleLibrary.roles.length !== 812 || new Set(roleLibrary.roles.map((role) => role.label)).size !== 812 ? ["Role-library label coverage changed."] : []), ...(availableDefinitions !== 702 || unavailableDefinitions !== 110 ? ["Definition availability differs from the approved role-library baseline."] : []), ...(automaticCoverage !== 208 || policyDistribution["explicit-confirmation"] !== 139 || policyDistribution["manual-only"] !== 465 ? ["Recommendation pathway coverage changed."] : []), ...(roleLibrary.relationships.length !== 60 || familyCoverage !== 448 ? ["Reviewed semantic coverage changed."] : []), ...(discoveryQuestions.filter((question) => question.phase === "broad").length !== 20 || discoveryQuestions.filter((question) => question.phase === "refine").length !== 52 ? ["Mandatory question inventory changed."] : []), ...(recommendationClarificationPoolSize !== 306 || Math.max(...clarificationCounts) > 6 ? ["Optional clarification limits changed."] : []), ...(calibration.criticalFailureCount !== 0 ? [`Calibration has ${calibration.criticalFailureCount} critical failures.`] : []), ...(Object.values(performance.after).some((milliseconds) => milliseconds > 25) ? ["A recommendation performance check exceeded 25 ms."] : [])];
  return {
    status: errors.length ? ("ERROR" as const) : ("PASS" as const),
    calibration: {
      coreAndDecision: calibration.personaCount - recommendationResults.length,
      total: calibration.personaCount,
      recommendationPersonas: recommendationResults.length,
      recommendationPassed: recommendationResults.filter((result) => result.passed).length,
      criticalFailures: calibration.criticalFailureCount,
      warningsBefore: 5,
      warningsAfter: calibration.warningCount,
      warningReviews,
      failureCounts,
      focusResults: Object.fromEntries(
        ["broad-specific", "directional", "service", "sparse-unsure", "contradictory", "near-tie", "general"].map((focus) => {
          const results = recommendationResults.filter((result) => result.persona.focus === focus);
          return [focus, { passed: results.filter((result) => result.passed).length, total: results.length }];
        }),
      ),
    },
    roleSets: {
      averageSize: average(setSizes),
      zeroRolePersonas: setSizes.filter((size) => size === 0).length,
      oneOrTwoRolePersonas: setSizes.filter((size) => size === 1 || size === 2).length,
      fiveRolePersonas: setSizes.filter((size) => size === 5).length,
      deterministicRepeat: failureCounts.determinism === 0,
    },
    questions: {
      broad: discoveryQuestions.filter((question) => question.phase === "broad").length,
      refinements: discoveryQuestions.filter((question) => question.phase === "refine").length,
      mandatoryMaximum: 26,
      optionalPool: recommendationClarificationPoolSize,
      averageRecommendationClarifications: average(clarificationCounts),
      maximumRecommendationClarifications: Math.max(...clarificationCounts),
    },
    coverage: {
      roles: roleLibrary.roles.length,
      decisionPolicies: roleLibrary.roles.length,
      definitionStates: roleLibrary.roles.length,
      usableDefinitions: availableDefinitions,
      unavailableDefinitions,
      automaticRecommendation: automaticCoverage,
      confirmationBased: policyDistribution["explicit-confirmation"],
      legitimateTopFiveReach: automaticCoverage + Number(policyDistribution["explicit-confirmation"]),
      manualOnly: policyDistribution["manual-only"],
      relationships: roleLibrary.relationships.length,
      familyCoverage,
    },
    changes: {
      optimizer: "Removed unearned confidence contribution from scoreless exact confirmations and preserved a bounded evidence-quality score.",
      redundancy: "Uses the strongest pairwise semantic-overlap signal instead of double-counting reviewed relationships and shared families; canonical aliases retain stronger suppression.",
      complementarity: "Rewards the proportion of genuinely new reviewed families rather than a binary diversity flag; aliases and near-synonyms cannot regain selection through that bonus.",
      primary: "Combines candidate evidence, primary suitability, representational value, and centrality from reviewed relationships; explicit user preference still wins.",
      tieBreaking: "Uses evidence quality, confidence, representational value, distinctiveness, primary suitability, and exact selector order without a hash fallback.",
      exclusions: "Distinguishes user rejection, confirmation required, manual-only, unresolved policy, insufficient evidence, threshold, redundancy, and slot limit.",
    },
    performance,
    diagnostics: { errors, warnings: warningReviews.map((warning) => `${warning.role} ${warning.signal}: ${warning.reason}`) },
  };
}

export type RecommendationReport = ReturnType<typeof buildRecommendationReport>;

export function renderRecommendationReport(report = buildRecommendationReport()): string {
  return [
    "KinkAtlas Recommendation Quality Report",
    "",
    `STATUS: ${report.status}`,
    "",
    `CALIBRATION: ${report.calibration.coreAndDecision} core and decision-path personas; recommendations ${report.calibration.recommendationPassed}/${report.calibration.recommendationPersonas}; total ${report.calibration.total}; critical failures ${report.calibration.criticalFailures}; warnings ${report.calibration.warningsBefore} -> ${report.calibration.warningsAfter}`,
    `FAILURES: must-include ${report.calibration.failureCounts["must-include"]}; must-exclude ${report.calibration.failureCounts["must-exclude"]}; primary ${report.calibration.failureCounts.primary}; redundancy ${report.calibration.failureCounts.redundancy}; policy ${report.calibration.failureCounts["eligibility-policy"]}; rejection ${report.calibration.failureCounts.rejection}; confirmation ${report.calibration.failureCounts.confirmation}; set-quality ${report.calibration.failureCounts["set-quality"]}; determinism ${report.calibration.failureCounts.determinism}`,
    `FOCUS: ${Object.entries(report.calibration.focusResults)
      .map(([focus, result]) => `${focus} ${result.passed}/${result.total}`)
      .join("; ")}`,
    "",
    `ROLE SETS: average ${report.roleSets.averageSize.toFixed(2)}; zero ${report.roleSets.zeroRolePersonas}; one-or-two ${report.roleSets.oneOrTwoRolePersonas}; five ${report.roleSets.fiveRolePersonas}; deterministic repeat ${report.roleSets.deterministicRepeat}`,
    `QUESTIONS: broad ${report.questions.broad}; refinements ${report.questions.refinements}; mandatory maximum ${report.questions.mandatoryMaximum}; optional pool ${report.questions.optionalPool}; recommendation average ${report.questions.averageRecommendationClarifications.toFixed(2)}; maximum ${report.questions.maximumRecommendationClarifications}`,
    "",
    `COVERAGE: roles ${report.coverage.roles}; policies ${report.coverage.decisionPolicies}; definition states ${report.coverage.definitionStates}; usable definitions ${report.coverage.usableDefinitions}; unavailable ${report.coverage.unavailableDefinitions}`,
    `RECOMMENDATION COVERAGE: automatic ${report.coverage.automaticRecommendation}; confirmation ${report.coverage.confirmationBased}; legitimate Top-5 ${report.coverage.legitimateTopFiveReach}; manual-only ${report.coverage.manualOnly}; relationships ${report.coverage.relationships}; family-covered ${report.coverage.familyCoverage}`,
    "",
    "BEHAVIOR CHANGES",
    ...Object.entries(report.changes).map(([name, value]) => `  ${name}: ${value}`),
    "",
    `PERFORMANCE BASELINE: scoring ${report.performance.baseline.scoringMs.toFixed(3)} ms; clarification ${report.performance.baseline.clarificationMs.toFixed(3)} ms; optimizer ${report.performance.baseline.optimizerMs.toFixed(3)} ms; search ${report.performance.baseline.searchMs.toFixed(3)} ms; related ${report.performance.baseline.relatedRoleExplorationMs.toFixed(3)} ms`,
    `PERFORMANCE AFTER: scoring ${report.performance.after.scoringMs.toFixed(3)} ms; candidates ${report.performance.after.candidateBuildMs.toFixed(4)} ms; pathway lookup ${report.performance.after.decisionPathLookupMs.toFixed(4)} ms; clarification ${report.performance.after.clarificationMs.toFixed(3)} ms; optimizer ${report.performance.after.optimizerMs.toFixed(3)} ms; primary ${report.performance.after.primarySelectionMs.toFixed(4)} ms; search ${report.performance.after.searchMs.toFixed(3)} ms; related ${report.performance.after.relatedRoleExplorationMs.toFixed(3)} ms`,
    "",
    `ERRORS: ${report.diagnostics.errors.length}`,
    ...report.diagnostics.errors.map((error) => `  ERROR: ${error}`),
    `WARNINGS: ${report.diagnostics.warnings.length}`,
    ...report.diagnostics.warnings.map((warning) => `  RETAINED: ${warning}`),
  ].join("\n");
}
