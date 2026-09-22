import { refinementQuestions } from "../data/refinement";
import type { AssessmentAnswers, RefinementFamilyId, RefinementQuestion, TraitId, TraitScores } from "../types";

const supported = (traitScores: TraitScores, trait: TraitId, minimumValue = 0.5, minimumEvidence = 2) => {
  const score = traitScores[trait];
  return Boolean(score && score.evidence >= minimumEvidence && score.value >= minimumValue);
};

function serviceSupported(traitScores: TraitScores) {
  return supported(traitScores, "serviceGiving") || supported(traitScores, "serviceReceiving");
}

/**
 * These gates establish whether a refinement family is worth asking about.
 *
 * IMPORTANT:
 * A gate does not recommend a subtype.
 * A gate only permits relevant follow-up questions to appear.
 */
export function eligibleRefinementFamilies(answers: AssessmentAnswers, traitScores: TraitScores): RefinementFamilyId[] {
  const families: RefinementFamilyId[] = [];

  if (supported(traitScores, "submission")) {
    families.push("submission");
  }

  if (supported(traitScores, "dominance")) {
    families.push("dominance");
  }

  if (supported(traitScores, "primality")) {
    families.push("primal");
  }

  if (serviceSupported(traitScores)) {
    families.push("service");
  }

  /*
   * Pet and caregiver/little are intentionally NOT opened from generic
   * roleplay, playfulness, care or submission scores alone.
   *
   * Those signals are too broad:
   *
   * care != Little
   * playfulness != Little
   * roleplay != Pet
   * submission != Little
   *
   * Their first refinement questions will serve as direct-interest gates
   * in the next implementation checkpoint.
   */
  const petBroadAnswer = answers.discovery["d-pet"];
  if (petBroadAnswer && petBroadAnswer !== "no" && petBroadAnswer !== "prefer-not") {
    families.push("pet");
  }

  return families;
}

/**
 * Returns only questions whose parent family was independently made
 * relevant by Discovery or by an approved direct-interest gate.
 */
export function selectRefinementQuestions(answers: AssessmentAnswers, traitScores: TraitScores): RefinementQuestion[] {
  const eligibleFamilies = new Set(eligibleRefinementFamilies(answers, traitScores));

  return refinementQuestions.filter((question) => eligibleFamilies.has(question.family));
}

export function unansweredRefinementQuestions(answers: AssessmentAnswers, traitScores: TraitScores): RefinementQuestion[] {
  return selectRefinementQuestions(answers, traitScores).filter((question) => answers.refinement[question.id] === undefined);
}
