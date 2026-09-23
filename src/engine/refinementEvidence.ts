import { refinementQuestionById } from "../data/refinement";
import type { AssessmentAnswers, RefinementEvidence, RefinementTargetId } from "../types";

export interface RefinementTargetDefinition {
  id: RefinementTargetId;
  roleId: string;
  label: string;
}

export const refinementTargets: RefinementTargetDefinition[] = [
  {
    id: "submissive-top",
    roleId: "role:submissive-top-8b73cd98",
    label: "Submissive Top",
  },
  {
    id: "submissive-sadist",
    roleId: "role:submissive-sadist-f13effbd",
    label: "Submissive Sadist",
  },
  {
    id: "submissive-masochist",
    roleId: "role:submissive-masochist-72e9bc89",
    label: "Submissive Masochist",
  },
  {
    id: "bratty-sub",
    roleId: "role:bratty-sub-c4aa0433",
    label: "Bratty sub",
  },
  {
    id: "pleasure-submissive",
    roleId: "role:pleasure-submissive-567e2f6d",
    label: "Pleasure submissive",
  },
  {
    id: "sensual-submissive",
    roleId: "role:sensual-submissive-cb7e0fc3",
    label: "sensual submissive",
  },
  {
    id: "dominant-bottom",
    roleId: "role:dominant-bottom-f2fab22e",
    label: "Dominant Bottom",
  },
  {
    id: "dominant-sadist",
    roleId: "role:dominant-sadist-d56ce645",
    label: "Dominant Sadist",
  },
  {
    id: "dominant-masochist",
    roleId: "role:dominant-masochist-9db323cd",
    label: "Dominant Masochist",
  },
  {
    id: "sensual-dominant",
    roleId: "role:sensual-dominant-d22d9b07",
    label: "Sensual Dominant",
  },
];

export const refinementTargetById = new Map(refinementTargets.map((target) => [target.id, target]));

export const refinementTargetByRoleId = new Map(refinementTargets.map((target) => [target.roleId, target]));

export function evaluateRefinementEvidence(refinementAnswers: AssessmentAnswers["refinement"]): RefinementEvidence[] {
  const evidence = new Map<
    RefinementTargetId,
    {
      supportingQuestionIds: string[];
      possibleQuestionIds: string[];
      rejectingQuestionIds: string[];
    }
  >();

  const entryFor = (targetId: RefinementTargetId) => {
    const existing = evidence.get(targetId);

    if (existing) return existing;

    const created = {
      supportingQuestionIds: [],
      possibleQuestionIds: [],
      rejectingQuestionIds: [],
    };

    evidence.set(targetId, created);

    return created;
  };

  Object.entries(refinementAnswers).forEach(([questionId, answerId]) => {
    const question = refinementQuestionById[questionId];
    const answer = question?.answers.find((candidate) => candidate.id === answerId);

    if (!question || !answer) return;

    answer.supports?.forEach((targetId) => {
      entryFor(targetId).supportingQuestionIds.push(questionId);
    });

    answer.weakSupports?.forEach((targetId) => {
      entryFor(targetId).possibleQuestionIds.push(questionId);
    });

    answer.rejects?.forEach((targetId) => {
      entryFor(targetId).rejectingQuestionIds.push(questionId);
    });
  });

  return refinementTargets.map((target) => {
    const targetEvidence = evidence.get(target.id);

    if (!targetEvidence) {
      return {
        targetId: target.id,
        status: "unanswered" as const,
        supportingQuestionIds: [],
        possibleQuestionIds: [],
        rejectingQuestionIds: [],
      };
    }

    const status = targetEvidence.rejectingQuestionIds.length > 0 ? "rejected" : targetEvidence.supportingQuestionIds.length > 0 ? "supported" : targetEvidence.possibleQuestionIds.length > 0 ? "possible" : "unanswered";

    return {
      targetId: target.id,
      status,
      ...targetEvidence,
    };
  });
}

export function supportedRefinementTargets(refinementAnswers: AssessmentAnswers["refinement"]) {
  return evaluateRefinementEvidence(refinementAnswers)
    .filter((evidence) => evidence.status === "supported")
    .flatMap((evidence) => {
      const target = refinementTargetById.get(evidence.targetId);

      return target ? [{ target, evidence }] : [];
    });
}
