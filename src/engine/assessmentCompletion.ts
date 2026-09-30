import { boundaryItems, boundaryOptions } from "../data/boundaries";
import { negotiationQuestions } from "../data/negotiation";
import { discoveryQuestions } from "../data/questions";
import { requiredReadinessQuestions } from "../data/readiness";
import { refinementQuestionById } from "../data/refinement";
import type { AssessmentAnswers } from "../types";
import { selectNextDiscoveryQuestion } from "./adaptiveQuestioning";
import { calculateTraitScores } from "./discoveryScoring";
import { unansweredRefinementQuestions } from "./refinementRouting";

export interface AssessmentCompletion {
  discoveryComplete: boolean;
  refinementComplete: boolean;
  readinessComplete: boolean;
  boundariesComplete: boolean;
  negotiationComplete: boolean;
  complete: boolean;
}

export function getAssessmentCompletion(answers: AssessmentAnswers): AssessmentCompletion {
  const discovery = Object.fromEntries(
    Object.entries(answers.discovery).filter(([questionId, answerId]) => discoveryQuestions.find((question) => question.id === questionId)?.answers.some((answer) => answer.id === answerId)),
  );
  const refinement = Object.fromEntries(
    Object.entries(answers.refinement).filter(([questionId, answerId]) => refinementQuestionById[questionId]?.answers.some((answer) => answer.id === answerId)),
  );
  const validatedAnswers = { ...answers, discovery, refinement };
  const traitScores = calculateTraitScores(discovery);
  const discoveryComplete = selectNextDiscoveryQuestion(validatedAnswers, traitScores) === undefined;
  const refinementComplete = discoveryComplete && unansweredRefinementQuestions(validatedAnswers, traitScores).length === 0;
  const readinessComplete = requiredReadinessQuestions.every((question) => question.answers.some((answer) => answer.id === answers.readiness[question.id]));
  const boundariesComplete = boundaryItems.every((item) => boundaryOptions.some((option) => option.value === answers.boundaries[item.id]));
  const negotiationComplete = negotiationQuestions.every((question) => question.answers.some((answer) => answer.id === answers.negotiation[question.id]));

  return {
    discoveryComplete,
    refinementComplete,
    readinessComplete,
    boundariesComplete,
    negotiationComplete,
    complete: discoveryComplete && refinementComplete && readinessComplete && boundariesComplete && negotiationComplete,
  };
}
