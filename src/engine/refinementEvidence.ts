import { refinementQuestionById, refinementQuestions } from "../data/refinement";
import type { AssessmentAnswers, RefinementEvidence, RefinementPrimaryPreference, RefinementTargetId } from "../types";
import { calculateTraitScores } from "./discoveryScoring";
import { selectRefinementQuestions } from "./refinementRouting";

export interface RefinementTargetDefinition {
  id: RefinementTargetId;
  roleId: string;
  label: string;
}

export const refinementTargets: RefinementTargetDefinition[] = [
  {
    id: "daddy",
    roleId: "role:daddy-e585737a",
    label: "Daddy",
  },
  {
    id: "mommy",
    roleId: "role:mommy-f0ecd978",
    label: "Mommy",
  },
  {
    id: "little",
    roleId: "role:little-180ca01b",
    label: "little",
  },
  {
    id: "little-one",
    roleId: "role:little-one-55087e4f",
    label: "little one",
  },
  {
    id: "little-girl",
    roleId: "role:little-girl-54f0c917",
    label: "little girl",
  },
  {
    id: "little-boy",
    roleId: "role:little-boy-1a98eee3",
    label: "little boy",
  },
  {
    id: "little-princess",
    roleId: "role:little-princess-eb248642",
    label: "little princess",
  },
  {
    id: "little-prince",
    roleId: "role:little-prince-9c50bbd0",
    label: "little prince",
  },
  {
    id: "bratty-little",
    roleId: "role:bratty-little-171240b6",
    label: "Bratty Little",
  },
  {
    id: "babygirl",
    roleId: "role:babygirl-f95fc9d2",
    label: "babygirl",
  },
  {
    id: "middle",
    roleId: "role:middle-a4888af4",
    label: "middle",
  },
  {
    id: "big",
    roleId: "role:big-f69fd263",
    label: "Big",
  },
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
  {
    id: "primal-sadist",
    roleId: "role:primal-sadist-fa0161a7",
    label: "Primal Sadist",
  },
  {
    id: "primal-masochist",
    roleId: "role:primal-masochist-49aa4ec8",
    label: "Primal Masochist",
  },
  {
    id: "primal-top",
    roleId: "role:primal-top-fcb7c944",
    label: "Primal Top",
  },
  {
    id: "primal-bottom",
    roleId: "role:primal-bottom-c8f93544",
    label: "Primal Bottom",
  },
  {
    id: "primal-sensualist",
    roleId: "role:primal-sensualist-388946ad",
    label: "Primal Sensualist",
  },
  {
    id: "service-rigger",
    roleId: "role:service-rigger-01721e49",
    label: "Service Rigger",
  },
  {
    id: "service-brat",
    roleId: "role:service-brat-8beb9ac8",
    label: "Service Brat",
  },
  {
    id: "puppy",
    roleId: "role:puppy-75822bc4",
    label: "Puppy",
  },
  {
    id: "kitten",
    roleId: "role:kitten-12d6736f",
    label: "Kitten",
  },
];

export const refinementTargetById = new Map(refinementTargets.map((target) => [target.id, target]));

export const refinementTargetByRoleId = new Map(refinementTargets.map((target) => [target.roleId, target]));

interface SelectedPrimaryPreference {
  preference: RefinementPrimaryPreference;
}

function selectedPrimaryPreferences(refinementAnswers: AssessmentAnswers["refinement"], routedQuestionIds: ReadonlySet<string>): SelectedPrimaryPreference[] {
  return refinementQuestions.flatMap((question) => {
    if (!routedQuestionIds.has(question.id)) return [];

    const answerId = refinementAnswers[question.id];
    const preference = question.answers.find((answer) => answer.id === answerId)?.primaryPreference;

    return preference ? [{ preference }] : [];
  });
}

function roleIdForTarget(targetId: RefinementTargetId): string | undefined {
  return refinementTargetById.get(targetId)?.roleId;
}

export function preferredPrimaryRoleIdsFromRefinement(refinementAnswers: AssessmentAnswers["refinement"], discoveryAnswers: AssessmentAnswers["discovery"] = {}): string[] {
  const assessment: AssessmentAnswers = {
    discovery: discoveryAnswers,
    refinement: refinementAnswers,
    readiness: {},
    boundaries: {},
    negotiation: {},
  };
  const routedQuestionIds = new Set(selectRefinementQuestions(assessment, calculateTraitScores(discoveryAnswers)).map((question) => question.id));
  const selected = selectedPrimaryPreferences(refinementAnswers, routedQuestionIds);
  const blockedFallbackGroups = new Set(
    selected.flatMap(({ preference }) => (preference.kind === "direct" && preference.fallbackGroup ? [preference.fallbackGroup] : preference.kind === "suppress-fallback" ? [preference.fallbackGroup] : [])),
  );
  const roleIds = selected.flatMap(({ preference }) => {
    if (preference.kind === "suppress-fallback") return [];
    if (preference.kind === "fallback" && blockedFallbackGroups.has(preference.fallbackGroup)) return [];

    const roleId = roleIdForTarget(preference.targetId);
    return roleId ? [roleId] : [];
  });

  return [...new Set(roleIds)].sort((left, right) => left.localeCompare(right));
}

export function refinementFallbackIsSuperseded(targetId: RefinementTargetId, refinementAnswers: AssessmentAnswers["refinement"], routedQuestionIds: ReadonlySet<string>): boolean {
  const fallbackGroups = new Set(
    refinementQuestions.flatMap((question) =>
      question.answers.flatMap((answer) => {
        const preference = answer.primaryPreference;
        return preference?.kind === "fallback" && preference.targetId === targetId ? [preference.fallbackGroup] : [];
      }),
    ),
  );
  const selected = selectedPrimaryPreferences(refinementAnswers, routedQuestionIds);

  return selected.some(({ preference }) => {
    if (preference.kind === "suppress-fallback") return fallbackGroups.has(preference.fallbackGroup);
    return preference.kind === "direct" && preference.targetId !== targetId && Boolean(preference.fallbackGroup && fallbackGroups.has(preference.fallbackGroup));
  });
}

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
