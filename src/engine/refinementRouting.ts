import { discoveryQuestionById } from "../data/questions";
import { refinementQuestions } from "../data/refinement";
import type { AssessmentAnswers, RefinementFamilyId, RefinementQuestion, TraitId, TraitScores } from "../types";

export const MAX_REFINEMENT_QUESTIONS = 6;

const dependentQuestionIds: Record<string, readonly string[]> = {
  "ref-age-roleplay-interest": ["ref-age-roleplay-position", "ref-caregiver-title", "ref-little-vocabulary"],
  "ref-age-roleplay-position": ["ref-caregiver-title", "ref-little-vocabulary"],
};

export interface RefinementAnswerUpdate {
  refinement: AssessmentAnswers["refinement"];
  invalidatedQuestionIds: string[];
}

export function applyRefinementAnswer(current: AssessmentAnswers["refinement"], questionId: string, answerId: string): RefinementAnswerUpdate {
  const answerChanged = current[questionId] !== answerId;
  const invalidateAgeRoleplayBranch = questionId === "ref-age-roleplay-interest" && answerId !== "yes";
  const invalidatePositionChildren = questionId === "ref-age-roleplay-position" && answerChanged;
  const invalidatedQuestionIds = invalidateAgeRoleplayBranch || invalidatePositionChildren ? [...(dependentQuestionIds[questionId] ?? [])] : [];
  const refinement = { ...current, [questionId]: answerId };

  invalidatedQuestionIds.forEach((dependentQuestionId) => {
    delete refinement[dependentQuestionId];
  });

  return { refinement, invalidatedQuestionIds };
}

function traitSupported(traitScores: TraitScores, trait: TraitId, minimumValue = 0.55, minimumEvidence = 2): boolean {
  const score = traitScores[trait];

  return Boolean(score && score.evidence >= minimumEvidence && score.value >= minimumValue);
}

function explicitSubmissionEvidence(discoveryAnswers: AssessmentAnswers["discovery"]): boolean {
  return Object.entries(discoveryAnswers).some(([questionId, answerId]) => {
    const answer = discoveryQuestionById[questionId]?.answers.find((candidate) => candidate.id === answerId);

    return answer?.qualificationEvidence?.includes("explicit-submission") ?? false;
  });
}

function explicitDominanceEvidence(discoveryAnswers: AssessmentAnswers["discovery"]): boolean {
  return Object.entries(discoveryAnswers).some(([questionId, answerId]) => {
    const answer = discoveryQuestionById[questionId]?.answers.find((candidate) => candidate.id === answerId);

    return answer?.authorityEvidence === "explicit-authority";
  });
}

function submissionSupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "submission") && explicitSubmissionEvidence(answers.discovery);
}

function dominanceSupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "dominance") && explicitDominanceEvidence(answers.discovery);
}

function serviceSupported(traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "serviceGiving") || traitSupported(traitScores, "serviceReceiving");
}

function sensualPatternSupported(traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "sensorySeeking", 0.5, 2) && traitSupported(traitScores, "emotionalConnection", 0.5, 2);
}

function pleasureGivingSupported(traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "pleasureGiving", 0.55, 2);
}

interface RefinementRouteCandidate {
  questionId: string;
  eligible: boolean;
  strength: number;
}

function traitStrength(traitScores: TraitScores, ...traits: TraitId[]): number {
  if (!traits.length) return 0;

  return traits.reduce((sum, trait) => sum + (traitScores[trait]?.value ?? 0), 0) / traits.length;
}
function petPersonaInterest(answers: AssessmentAnswers): boolean {
  const broadAnswer = answers.discovery["d-pet"];
  const petAnswer = answers.discovery["r-pet"];

  return broadAnswer === "some" || broadAnswer === "curious" || petAnswer === "strong" || petAnswer === "some" || petAnswer === "curious";
}

function shouldAskAdultAgeRoleplayGate(answers: AssessmentAnswers): boolean {
  const answerId = answers.discovery["d-care"];

  return answerId === "strong" || answerId === "some" || answerId === "curious";
}

function adultAgeRoleplayInterest(answers: AssessmentAnswers): boolean {
  return answers.refinement["ref-age-roleplay-interest"] === "yes";
}

function caregiverPositionSelected(answers: AssessmentAnswers): boolean {
  return answers.refinement["ref-age-roleplay-position"] === "caregiver";
}

function littlePositionSelected(answers: AssessmentAnswers): boolean {
  return answers.refinement["ref-age-roleplay-position"] === "little";
}

function routeCandidates(answers: AssessmentAnswers, traitScores: TraitScores): RefinementRouteCandidate[] {
  const submission = submissionSupported(answers, traitScores);
  const dominance = dominanceSupported(answers, traitScores);

  return [
    {
      questionId: "ref-sub-top",
      eligible: submission && traitSupported(traitScores, "leadership", 0.5, 2) && traitSupported(traitScores, "pleasureGiving", 0.5, 2),
      strength: traitStrength(traitScores, "submission", "leadership", "pleasureGiving"),
    },
    {
      questionId: "ref-sub-sadist",
      eligible: submission && traitSupported(traitScores, "painGiving", 0.55, 2),
      strength: traitStrength(traitScores, "submission", "painGiving"),
    },
    {
      questionId: "ref-sub-masochist",
      eligible: submission && traitSupported(traitScores, "painReceiving", 0.55, 2),
      strength: traitStrength(traitScores, "submission", "painReceiving"),
    },
    {
      questionId: "ref-sub-brat",
      eligible: submission && traitSupported(traitScores, "brattiness", 0.55, 2),
      strength: traitStrength(traitScores, "submission", "brattiness"),
    },
    {
      questionId: "ref-sub-pleasure",
      eligible: submission && pleasureGivingSupported(traitScores),
      strength: traitStrength(traitScores, "submission", "pleasureGiving"),
    },
    {
      questionId: "ref-sub-sensual",
      eligible: submission && sensualPatternSupported(traitScores),
      strength: traitStrength(traitScores, "submission", "sensorySeeking", "emotionalConnection"),
    },

    {
      questionId: "ref-dom-bottom",
      eligible: dominance && traitSupported(traitScores, "pleasureReceiving", 0.5, 2) && traitSupported(traitScores, "sensorySeeking", 0.5, 2),
      strength: traitStrength(traitScores, "dominance", "pleasureReceiving", "sensorySeeking"),
    },
    {
      questionId: "ref-dom-sadist",
      eligible: dominance && traitSupported(traitScores, "painGiving", 0.55, 2),
      strength: traitStrength(traitScores, "dominance", "painGiving"),
    },
    {
      questionId: "ref-dom-masochist",
      eligible: dominance && traitSupported(traitScores, "painReceiving", 0.55, 2),
      strength: traitStrength(traitScores, "dominance", "painReceiving"),
    },
    {
      questionId: "ref-dom-sensual",
      eligible: dominance && sensualPatternSupported(traitScores),
      strength: traitStrength(traitScores, "dominance", "sensorySeeking", "emotionalConnection"),
    },

    {
      questionId: "ref-primal-sadist",
      eligible: traitSupported(traitScores, "primality") && traitSupported(traitScores, "painGiving", 0.55, 2),
      strength: traitStrength(traitScores, "primality", "painGiving"),
    },
    {
      questionId: "ref-primal-masochist",
      eligible: traitSupported(traitScores, "primality") && traitSupported(traitScores, "painReceiving", 0.55, 2),
      strength: traitStrength(traitScores, "primality", "painReceiving"),
    },
    {
      questionId: "ref-primal-top",
      eligible: traitSupported(traitScores, "primality") && traitSupported(traitScores, "leadership", 0.5, 2) && traitSupported(traitScores, "pleasureGiving", 0.5, 2),
      strength: traitStrength(traitScores, "primality", "leadership", "pleasureGiving"),
    },
    {
      questionId: "ref-primal-bottom",
      eligible: traitSupported(traitScores, "primality") && traitSupported(traitScores, "pleasureReceiving", 0.5, 2) && traitSupported(traitScores, "sensorySeeking", 0.5, 2),
      strength: traitStrength(traitScores, "primality", "pleasureReceiving", "sensorySeeking"),
    },
    {
      questionId: "ref-primal-sensual",
      eligible: traitSupported(traitScores, "primality") && traitSupported(traitScores, "sensorySeeking", 0.55, 2),
      strength: traitStrength(traitScores, "primality", "sensorySeeking"),
    },

    {
      questionId: "ref-service-rigger",
      eligible: traitSupported(traitScores, "serviceGiving", 0.55, 2) && traitSupported(traitScores, "ropeGiving", 0.55, 2) && traitSupported(traitScores, "technicalInterest", 0.5, 2),
      strength: traitStrength(traitScores, "serviceGiving", "ropeGiving", "technicalInterest"),
    },
    {
      questionId: "ref-service-brat",
      eligible: traitSupported(traitScores, "serviceGiving", 0.55, 2) && traitSupported(traitScores, "brattiness", 0.55, 2),
      strength: traitStrength(traitScores, "serviceGiving", "brattiness"),
    },
    {
      questionId: "ref-pet-persona",
      eligible: petPersonaInterest(answers),
      strength: traitStrength(traitScores, "roleplay", "beingCaredFor", "playfulness"),
    },
    {
      questionId: "ref-age-roleplay-interest",
      eligible: shouldAskAdultAgeRoleplayGate(answers),
      strength: 1,
    },
    {
      questionId: "ref-age-roleplay-position",
      eligible: adultAgeRoleplayInterest(answers),
      strength: 1,
    },
    {
      questionId: "ref-caregiver-title",
      eligible: adultAgeRoleplayInterest(answers) && caregiverPositionSelected(answers),
      strength: 1,
    },
    {
      questionId: "ref-little-vocabulary",
      eligible: adultAgeRoleplayInterest(answers) && littlePositionSelected(answers),
      strength: 1,
    },
  ];
}

export function eligibleRefinementFamilies(answers: AssessmentAnswers, traitScores: TraitScores): RefinementFamilyId[] {
  const families: RefinementFamilyId[] = [];

  if (submissionSupported(answers, traitScores)) {
    families.push("submission");
  }

  if (dominanceSupported(answers, traitScores)) {
    families.push("dominance");
  }

  if (traitSupported(traitScores, "primality")) {
    families.push("primal");
  }

  if (serviceSupported(traitScores)) {
    families.push("service");
  }

  if (petPersonaInterest(answers)) {
    families.push("pet");
  }

  if (shouldAskAdultAgeRoleplayGate(answers) || adultAgeRoleplayInterest(answers)) {
    families.push("caregiver-little");
  }

  return families;
}

export function selectEligibleRefinementQuestions(answers: AssessmentAnswers, traitScores: TraitScores): RefinementQuestion[] {
  const questionById = new Map(refinementQuestions.map((question) => [question.id, question]));
  const strongestCandidateByQuestionId = new Map<string, RefinementRouteCandidate>();

  routeCandidates(answers, traitScores)
    .filter((candidate) => candidate.eligible)
    .forEach((candidate) => {
      const existing = strongestCandidateByQuestionId.get(candidate.questionId);

      if (!existing || candidate.strength > existing.strength) {
        strongestCandidateByQuestionId.set(candidate.questionId, candidate);
      }
    });

  return [...strongestCandidateByQuestionId.values()]
    .sort((left, right) => right.strength - left.strength || left.questionId.localeCompare(right.questionId))
    .flatMap((candidate) => {
      const question = questionById.get(candidate.questionId);

      return question ? [question] : [];
    });
}

export function selectRefinementQuestions(answers: AssessmentAnswers, traitScores: TraitScores): RefinementQuestion[] {
  return selectEligibleRefinementQuestions(answers, traitScores).slice(0, MAX_REFINEMENT_QUESTIONS);
}

export function unansweredRefinementQuestions(answers: AssessmentAnswers, traitScores: TraitScores): RefinementQuestion[] {
  return selectRefinementQuestions(answers, traitScores).filter((question) => answers.refinement[question.id] === undefined);
}
