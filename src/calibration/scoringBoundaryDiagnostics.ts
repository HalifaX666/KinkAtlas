import { calibrationPersonas } from "./personas";
import { recommendationPersonas } from "./recommendationPersonas";
import { discoveryQuestionById } from "../data/questions";
import { confidenceFor } from "../engine/confidence";
import { calculateTraitScores } from "../engine/discoveryScoring";
import { matchRoles } from "../engine/roleMatching";
import { diagnoseRoleProfileLibraryOrder, type RoleProfileLibraryOrderTie } from "../engine/roleProfileOptimizer";
import type { AssessmentAnswers, ConfidenceLevel, Role } from "../types";

export interface OptimizerOrderTieEvent extends RoleProfileLibraryOrderTie {
  personaId: string;
}

export interface OptimizerOrderDiagnostic {
  personas: number;
  selectionSteps: number;
  productionReproductionMismatches: number;
  libraryOrderResolvedTies: number;
  affectedPersonaIds: string[];
  tieEvents: OptimizerOrderTieEvent[];
  suggestedRoleSetDifferenceCount: number;
  suggestedRoleSetDifferencePersonaIds: string[];
  suggestedRoleSetDifferences: Array<{
    personaId: string;
    productionRoles: Array<{ roleId: string; label: string }>;
    stableIdRoles: Array<{ roleId: string; label: string }>;
  }>;
  suggestedPrimaryDifferenceCount: number;
  suggestedPrimaryDifferencePersonaIds: string[];
}

export interface ConfidenceEvidenceExample {
  personaId: string;
  roleId: string;
  roleLabel: string;
  questionLevelCount: number;
  actualContributionCount: number;
  delta: number;
  currentConfidence: ConfidenceLevel;
  hypotheticalConfidence: ConfidenceLevel;
}

export interface ConfidenceEvidenceDiagnostic {
  personas: number;
  observations: number;
  countsEqual: number;
  questionLevelCountHigher: number;
  contributionCountHigher: number;
  maximumAbsoluteDelta: number;
  divergentCurrentBands: Record<ConfidenceLevel, number>;
  hypotheticalThresholdCrossings: number;
  thresholdTransitions: Record<string, number>;
  examples: ConfidenceEvidenceExample[];
}

export function buildOptimizerOrderDiagnostic(): OptimizerOrderDiagnostic {
  const results = recommendationPersonas.map((persona) => ({
    persona,
    diagnostic: diagnoseRoleProfileLibraryOrder(persona.candidates, 5, persona.options),
  }));
  const tieEvents = results.flatMap(({ persona, diagnostic }) => diagnostic.libraryOrderTies.map((tie) => ({ personaId: persona.id, ...tie })));
  const roleSetDifferences = results.filter(({ diagnostic }) => diagnostic.suggestedRoleSetDiffers);
  const primaryDifferences = results.filter(({ diagnostic }) => diagnostic.suggestedPrimaryDiffers);

  return {
    personas: results.length,
    selectionSteps: results.reduce((sum, { diagnostic }) => sum + diagnostic.selectionSteps, 0),
    productionReproductionMismatches: results.filter(({ diagnostic }) => !diagnostic.libraryOrderReproducesProduction).length,
    libraryOrderResolvedTies: tieEvents.length,
    affectedPersonaIds: [...new Set(tieEvents.map((event) => event.personaId))].sort(),
    tieEvents,
    suggestedRoleSetDifferenceCount: roleSetDifferences.length,
    suggestedRoleSetDifferencePersonaIds: roleSetDifferences.map(({ persona }) => persona.id).sort(),
    suggestedRoleSetDifferences: roleSetDifferences.map(({ persona, diagnostic }) => {
      const roleById = new Map(persona.candidates.map((candidate) => [candidate.roleId, candidate.label]));
      const describe = (roleId: string) => ({ roleId, label: roleById.get(roleId) ?? roleId });
      return {
        personaId: persona.id,
        productionRoles: diagnostic.productionRoleIds.map(describe),
        stableIdRoles: diagnostic.stableIdRoleIds.map(describe),
      };
    }),
    suggestedPrimaryDifferenceCount: primaryDifferences.length,
    suggestedPrimaryDifferencePersonaIds: primaryDifferences.map(({ persona }) => persona.id).sort(),
  };
}

function actualContributionCount(role: Role, answers: AssessmentAnswers["discovery"]): number {
  const relevantTraits = new Set([
    ...Object.keys(role.traits),
    ...Object.keys(role.differentiatingTraits),
    ...Object.keys(role.contraryTraits ?? {}),
  ]);

  return Object.entries(answers).filter(([questionId, answerId]) => {
    const answer = discoveryQuestionById[questionId]?.answers.find((candidate) => candidate.id === answerId);
    return Boolean(answer && !answer.noScore && answer.effects && Object.keys(answer.effects).some((trait) => relevantTraits.has(trait)));
  }).length;
}

export function buildConfidenceEvidenceDiagnostic(): ConfidenceEvidenceDiagnostic {
  const observations = calibrationPersonas.flatMap((persona) => {
    const discoveryAnswers = persona.discoveryAnswers ?? {};
    return matchRoles(calculateTraitScores(discoveryAnswers), discoveryAnswers).map((result) => {
      const contributionCount = actualContributionCount(result.role, discoveryAnswers);
      return {
        personaId: persona.id,
        roleId: result.role.id,
        roleLabel: result.role.name,
        questionLevelCount: result.relevantAnswers,
        actualContributionCount: contributionCount,
        delta: result.relevantAnswers - contributionCount,
        currentConfidence: result.confidence,
        hypotheticalConfidence: confidenceFor(contributionCount, result.coverage),
      } satisfies ConfidenceEvidenceExample;
    });
  });
  const divergent = observations.filter((observation) => observation.delta !== 0);
  const crossings = observations.filter((observation) => observation.currentConfidence !== observation.hypotheticalConfidence);
  const divergentCurrentBands: Record<ConfidenceLevel, number> = { high: 0, moderate: 0, low: 0 };
  divergent.forEach((observation) => { divergentCurrentBands[observation.currentConfidence] += 1; });
  const thresholdTransitions = Object.fromEntries(
    [...new Set(crossings.map((observation) => `${observation.currentConfidence}->${observation.hypotheticalConfidence}`))]
      .sort()
      .map((transition) => [transition, crossings.filter((observation) => `${observation.currentConfidence}->${observation.hypotheticalConfidence}` === transition).length]),
  );

  return {
    personas: calibrationPersonas.length,
    observations: observations.length,
    countsEqual: observations.filter((observation) => observation.delta === 0).length,
    questionLevelCountHigher: observations.filter((observation) => observation.delta > 0).length,
    contributionCountHigher: observations.filter((observation) => observation.delta < 0).length,
    maximumAbsoluteDelta: Math.max(0, ...observations.map((observation) => Math.abs(observation.delta))),
    divergentCurrentBands,
    hypotheticalThresholdCrossings: crossings.length,
    thresholdTransitions,
    examples: [...divergent]
      .sort((left, right) => Number(right.currentConfidence !== right.hypotheticalConfidence) - Number(left.currentConfidence !== left.hypotheticalConfidence) || Math.abs(right.delta) - Math.abs(left.delta) || left.personaId.localeCompare(right.personaId) || left.roleId.localeCompare(right.roleId))
      .slice(0, 8),
  };
}

export function renderScoringBoundaryDiagnostics(
  optimizer = buildOptimizerOrderDiagnostic(),
  confidence = buildConfidenceEvidenceDiagnostic(),
): string {
  return [
    "Optimizer library-order diagnostic",
    `Personas: ${optimizer.personas}`,
    `Selection steps: ${optimizer.selectionSteps}`,
    `Production reproduction mismatches: ${optimizer.productionReproductionMismatches}`,
    `Library-order-resolved ties: ${optimizer.libraryOrderResolvedTies}`,
    `User-facing Suggested Role Set differences under stable-ID hypothetical: ${optimizer.suggestedRoleSetDifferenceCount}`,
    `Suggested Primary differences: ${optimizer.suggestedPrimaryDifferenceCount}`,
    `Affected personas: ${optimizer.affectedPersonaIds.length ? optimizer.affectedPersonaIds.join(", ") : "none"}`,
    `Suggested Role Set difference personas: ${optimizer.suggestedRoleSetDifferencePersonaIds.length ? optimizer.suggestedRoleSetDifferencePersonaIds.join(", ") : "none"}`,
    ...optimizer.suggestedRoleSetDifferences.map((difference) => `  ${difference.personaId}: production ${difference.productionRoles.map((role) => `${role.label} [${role.roleId}]`).join(" > ")} | stable-ID ${difference.stableIdRoles.map((role) => `${role.label} [${role.roleId}]`).join(" > ")}`),
    ...optimizer.tieEvents.map((event) => `  ${event.personaId} step ${event.step}: ${event.winnerLabel} [${event.winnerRoleId}] from ${event.competingRoles.map((role) => `${role.label} [${role.roleId}]`).join(" / ")}`),
    "",
    "Confidence evidence diagnostic",
    `Personas: ${confidence.personas}`,
    `Role/persona observations: ${confidence.observations}`,
    `Counts equal: ${confidence.countsEqual}`,
    `Current question-level count higher: ${confidence.questionLevelCountHigher}`,
    `Contribution count higher: ${confidence.contributionCountHigher}`,
    `Maximum absolute delta: ${confidence.maximumAbsoluteDelta}`,
    `Divergent current confidence bands: high ${confidence.divergentCurrentBands.high}; moderate ${confidence.divergentCurrentBands.moderate}; low ${confidence.divergentCurrentBands.low}`,
    `Hypothetical confidence-threshold crossings: ${confidence.hypotheticalThresholdCrossings}`,
    `Threshold transitions: ${Object.entries(confidence.thresholdTransitions).map(([transition, count]) => `${transition} ${count}`).join("; ") || "none"}`,
    ...confidence.examples.map((example) => `  ${example.personaId} / ${example.roleLabel} [${example.roleId}]: ${example.questionLevelCount} question-level vs ${example.actualContributionCount} contributing (${example.currentConfidence}->${example.hypotheticalConfidence})`),
  ].join("\n");
}
