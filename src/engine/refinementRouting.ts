import { discoveryQuestionById } from "../data/questions";
import { refinementQuestions } from "../data/refinement";
import type { AssessmentAnswers, RefinementFamilyId, RefinementQuestion, RefinementTargetId, TraitId, TraitScores } from "../types";

export const MAX_REFINEMENT_QUESTIONS = 6;

export function validateRefinementQuestionDependencies(questions: readonly RefinementQuestion[]): void {
  const questionById = new Map(questions.map((question) => [question.id, question]));

  questions.forEach((question) => {
    question.dependsOn?.forEach((dependency) => {
      const parent = questionById.get(dependency.questionId);
      if (!parent) throw new Error(`Refinement question ${question.id} depends on unknown question ${dependency.questionId}.`);
      if (dependency.questionId === question.id) throw new Error(`Refinement question ${question.id} cannot depend on itself.`);
      if (!dependency.answerIds.length) throw new Error(`Refinement question ${question.id} has an empty answer dependency for ${dependency.questionId}.`);
      dependency.answerIds.forEach((answerId) => {
        if (!parent.answers.some((answer) => answer.id === answerId)) {
          throw new Error(`Refinement question ${question.id} depends on unknown answer ${answerId} from ${dependency.questionId}.`);
        }
      });
    });
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (questionId: string) => {
    if (visiting.has(questionId)) throw new Error(`Refinement question dependency cycle includes ${questionId}.`);
    if (visited.has(questionId)) return;
    visiting.add(questionId);
    questionById.get(questionId)?.dependsOn?.forEach((dependency) => visit(dependency.questionId));
    visiting.delete(questionId);
    visited.add(questionId);
  };
  questions.forEach((question) => visit(question.id));
}

export function refinementDependenciesSatisfied(
  question: RefinementQuestion,
  refinementAnswers: AssessmentAnswers["refinement"],
): boolean {
  return question.dependsOn?.every((dependency) => dependency.answerIds.includes(refinementAnswers[dependency.questionId])) ?? true;
}

function descendantQuestionIds(questionId: string, questions: readonly RefinementQuestion[]): string[] {
  const descendants: string[] = [];
  const collect = (parentId: string) => {
    questions.forEach((question) => {
      if (!question.dependsOn?.some((dependency) => dependency.questionId === parentId) || descendants.includes(question.id)) return;
      descendants.push(question.id);
      collect(question.id);
    });
  };
  collect(questionId);
  return descendants;
}

validateRefinementQuestionDependencies(refinementQuestions);

export interface RefinementAnswerUpdate {
  refinement: AssessmentAnswers["refinement"];
  invalidatedQuestionIds: string[];
}

export function applyRefinementAnswer(current: AssessmentAnswers["refinement"], questionId: string, answerId: string): RefinementAnswerUpdate {
  const answerChanged = current[questionId] !== answerId;
  const refinement = { ...current, [questionId]: answerId };
  const questionById = new Map(refinementQuestions.map((question) => [question.id, question]));
  const invalidatedQuestionIds = descendantQuestionIds(questionId, refinementQuestions).filter((dependentQuestionId) => {
    const dependentQuestion = questionById.get(dependentQuestionId);
    return answerChanged || (dependentQuestion ? !refinementDependenciesSatisfied(dependentQuestion, refinement) : false);
  });

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

function explicitOwnershipEvidence(discoveryAnswers: AssessmentAnswers["discovery"]): boolean {
  return Object.entries(discoveryAnswers).some(([questionId, answerId]) => {
    const answer = discoveryQuestionById[questionId]?.answers.find((candidate) => candidate.id === answerId);

    return answer?.qualificationEvidence?.includes("explicit-ownership") ?? false;
  });
}

function submissionSupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "submission") && explicitSubmissionEvidence(answers.discovery);
}

function dominanceSupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "dominance") && explicitDominanceEvidence(answers.discovery);
}

function answerIs(answers: AssessmentAnswers, questionId: string, ...answerIds: string[]): boolean {
  return answerIds.includes(answers.discovery[questionId]);
}

function powerSwitchingSupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "switching", 0.55, 2)
    && answerIs(answers, "d-flexibility", "strong", "some")
    && answerIs(answers, "r-both-power", "strong", "some");
}

function activePositionSupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  const explicitPositionEvidence = answerIs(answers, "d-position-give", "strong", "some")
    || answerIs(answers, "r-top", "strong", "some");

  return explicitPositionEvidence
    && traitSupported(traitScores, "leadership", 0.5, 2)
    && traitSupported(traitScores, "pleasureGiving", 0.5, 2);
}

function receivingPositionSupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  const explicitPositionEvidence = answerIs(answers, "d-position-receive", "strong", "some")
    || answerIs(answers, "r-bottom", "strong", "some");

  return explicitPositionEvidence
    && traitSupported(traitScores, "pleasureReceiving", 0.5, 2)
    && traitSupported(traitScores, "sensorySeeking", 0.5, 2);
}

function versatilePositionSupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return answerIs(answers, "r-positions", "strong", "some")
    && traitSupported(traitScores, "switching", 0.55, 1)
    && activePositionSupported(answers, traitScores)
    && receivingPositionSupported(answers, traitScores);
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

function primalVocabularySupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "primality", 0.55, 2)
    && (answerIs(answers, "d-primal", "strong", "some")
      || answerIs(answers, "r-primal-give", "strong", "some")
      || answerIs(answers, "r-primal-receive", "strong", "some"));
}

function riggerVocabularySupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "ropeGiving", 0.55, 2)
    && traitSupported(traitScores, "technicalInterest", 0.5, 2)
    && (answerIs(answers, "r-rope-give", "strong", "some")
      || answerIs(answers, "r-rope-motivation", "strong"));
}

function ropeBottomVocabularySupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "ropeReceiving", 0.55, 2)
    && traitSupported(traitScores, "restraint", 0.5, 2)
    && answerIs(answers, "r-rope-receive", "strong", "some");
}

function bondageSwitchVocabularySupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "ropeGiving", 0.55, 2)
    && traitSupported(traitScores, "ropeReceiving", 0.55, 2)
    && traitSupported(traitScores, "switching", 0.55, 1)
    && answerIs(answers, "r-rope-both", "strong", "some");
}

function bratVocabularySupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "brattiness", 0.55, 2)
    && (answerIs(answers, "d-brat", "strong", "curious") || answerIs(answers, "r-brat", "strong", "some"));
}

function bratTamerVocabularySupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return traitSupported(traitScores, "bratHandling", 0.55, 2)
    && (answerIs(answers, "d-brat", "some", "curious") || answerIs(answers, "r-tamer", "strong", "some"));
}

function ownerVocabularySupported(answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return explicitDominanceEvidence(answers.discovery)
    && explicitOwnershipEvidence(answers.discovery)
    && traitSupported(traitScores, "givingControl", 0.55, 2)
    && traitSupported(traitScores, "responsibility", 0.55, 2)
    && traitSupported(traitScores, "caregiving", 0.55, 1);
}

const targetEligibilityPredicates: Partial<Record<RefinementTargetId, (answers: AssessmentAnswers, traitScores: TraitScores) => boolean>> = {
  primal: primalVocabularySupported,
  rigger: riggerVocabularySupported,
  "rope-bottom": ropeBottomVocabularySupported,
  "bondage-switch": bondageSwitchVocabularySupported,
  brat: bratVocabularySupported,
  "brat-tamer": bratTamerVocabularySupported,
  pet: petPersonaInterest,
  owner: ownerVocabularySupported,
};

export function refinementTargetIsSemanticallyEligible(targetId: RefinementTargetId, answers: AssessmentAnswers, traitScores: TraitScores): boolean {
  return targetEligibilityPredicates[targetId]?.(answers, traitScores) ?? true;
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

function routeCandidates(answers: AssessmentAnswers, traitScores: TraitScores): RefinementRouteCandidate[] {
  const submission = submissionSupported(answers, traitScores);
  const dominance = dominanceSupported(answers, traitScores);
  const powerSwitching = powerSwitchingSupported(answers, traitScores);
  const activePosition = activePositionSupported(answers, traitScores);
  const receivingPosition = receivingPositionSupported(answers, traitScores);
  const versatilePosition = versatilePositionSupported(answers, traitScores);
  const primalVocabulary = primalVocabularySupported(answers, traitScores);
  const riggerVocabulary = riggerVocabularySupported(answers, traitScores);
  const ropeBottomVocabulary = ropeBottomVocabularySupported(answers, traitScores);
  const bondageSwitchVocabulary = bondageSwitchVocabularySupported(answers, traitScores);
  const bratVocabulary = bratVocabularySupported(answers, traitScores);
  const bratTamerVocabulary = bratTamerVocabularySupported(answers, traitScores);
  const ownerVocabulary = ownerVocabularySupported(answers, traitScores);

  return [
    {
      questionId: "ref-power-exchange-vocabulary",
      eligible: dominance || submission || powerSwitching,
      strength: Math.max(
        dominance ? traitStrength(traitScores, "dominance", "givingControl") : 0,
        submission ? traitStrength(traitScores, "submission", "receivingControl", "surrender") : 0,
        powerSwitching ? traitStrength(traitScores, "switching", "dominance", "submission") : 0,
      ),
    },
    {
      questionId: "ref-play-position-vocabulary",
      eligible: activePosition || receivingPosition || versatilePosition,
      strength: Math.max(
        activePosition ? traitStrength(traitScores, "leadership", "pleasureGiving") : 0,
        receivingPosition ? traitStrength(traitScores, "pleasureReceiving", "sensorySeeking") : 0,
        versatilePosition ? traitStrength(traitScores, "switching", "exploration", "spontaneity") : 0,
      ),
    },
    {
      questionId: "ref-primal-vocabulary",
      eligible: primalVocabulary,
      strength: traitStrength(traitScores, "primality", "physicalIntensity", "spontaneity"),
    },
    {
      questionId: "ref-rope-vocabulary",
      eligible: riggerVocabulary || ropeBottomVocabulary || bondageSwitchVocabulary,
      strength: Math.max(
        riggerVocabulary ? traitStrength(traitScores, "ropeGiving", "technicalInterest") : 0,
        ropeBottomVocabulary ? traitStrength(traitScores, "ropeReceiving", "restraint") : 0,
        bondageSwitchVocabulary ? traitStrength(traitScores, "ropeGiving", "ropeReceiving", "switching") : 0,
      ),
    },
    {
      questionId: "ref-brat-vocabulary",
      eligible: bratVocabulary || bratTamerVocabulary,
      strength: Math.max(
        bratVocabulary ? traitStrength(traitScores, "brattiness", "playfulness", "challenge") : 0,
        bratTamerVocabulary ? traitStrength(traitScores, "bratHandling", "leadership", "responsibility") : 0,
      ),
    },
    {
      questionId: "ref-owner-vocabulary",
      eligible: ownerVocabulary,
      strength: traitStrength(traitScores, "givingControl", "caregiving", "structure", "responsibility"),
    },
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
      eligible: true,
      strength: 1,
    },
    {
      questionId: "ref-caregiver-title",
      eligible: true,
      strength: 1,
    },
    {
      questionId: "ref-little-vocabulary",
      eligible: true,
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

  const ageRoleplayPosition = refinementQuestions.find((question) => question.id === "ref-age-roleplay-position");
  if (shouldAskAdultAgeRoleplayGate(answers) || (ageRoleplayPosition && refinementDependenciesSatisfied(ageRoleplayPosition, answers.refinement))) {
    families.push("caregiver-little");
  }

  if (dominanceSupported(answers, traitScores) || submissionSupported(answers, traitScores) || powerSwitchingSupported(answers, traitScores)) {
    families.push("power-exchange-vocabulary");
  }

  if (activePositionSupported(answers, traitScores) || receivingPositionSupported(answers, traitScores) || versatilePositionSupported(answers, traitScores)) {
    families.push("play-position-vocabulary");
  }

  if (primalVocabularySupported(answers, traitScores)) {
    families.push("primal-vocabulary");
  }

  if (riggerVocabularySupported(answers, traitScores) || ropeBottomVocabularySupported(answers, traitScores) || bondageSwitchVocabularySupported(answers, traitScores)) {
    families.push("rope-vocabulary");
  }

  if (bratVocabularySupported(answers, traitScores) || bratTamerVocabularySupported(answers, traitScores)) {
    families.push("brat-vocabulary");
  }

  if (ownerVocabularySupported(answers, traitScores)) {
    families.push("owner-vocabulary");
  }

  return families;
}

export function selectEligibleRefinementQuestions(answers: AssessmentAnswers, traitScores: TraitScores): RefinementQuestion[] {
  const questionById = new Map(refinementQuestions.map((question) => [question.id, question]));
  const strongestCandidateByQuestionId = new Map<string, RefinementRouteCandidate>();

  routeCandidates(answers, traitScores)
    .filter((candidate) => candidate.eligible)
    .filter((candidate) => {
      const question = questionById.get(candidate.questionId);
      return question ? refinementDependenciesSatisfied(question, answers.refinement) : false;
    })
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
