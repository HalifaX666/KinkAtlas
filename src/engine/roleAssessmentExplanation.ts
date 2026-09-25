import { roleLibrary } from "../taxonomy/roleLibrary";
import type { EditableRoleProfileEntry, RoleProfileAlternate, RoleProfileOptimization, RoleProfileRecommendation } from "./roleProfileOptimizer";

export type RoleAssessmentExplanationKind =
  | "suggested-primary"
  | "suggested"
  | "supported-alternative"
  | "overlap"
  | "needs-more-evidence"
  | "needs-direct-confirmation"
  | "manual-exploration"
  | "not-included"
  | "unrepresented";

export interface RoleAssessmentExplanation {
  kind: RoleAssessmentExplanationKind;
  heading: string;
  message: string;
  manualSelection?: {
    heading: "Added by you";
    message: string;
  };
  vocabulary?: {
    heading: string;
    message: string;
  };
}

export interface RoleAssessmentExplanationInput {
  recommendation?: RoleProfileRecommendation;
  alternate?: RoleProfileAlternate;
  isSuggestedPrimary?: boolean;
  selectedRole?: EditableRoleProfileEntry;
}

function assessmentOutcome({ recommendation, alternate, isSuggestedPrimary }: RoleAssessmentExplanationInput): Omit<RoleAssessmentExplanation, "manualSelection"> {
  if (recommendation) {
    return isSuggestedPrimary
      ? {
          kind: "suggested-primary",
          heading: "Suggested primary",
          message: "This is KinkAtlas's suggested primary for the assessment-generated set.",
        }
      : {
          kind: "suggested",
          heading: "Suggested from your assessment",
          message: "This role was suggested from your assessment evidence.",
        };
  }

  switch (alternate?.reason) {
    case "slot-limit":
      return {
        kind: "supported-alternative",
        heading: "Supported alternative",
        message: "This role remained supported after the five-role presentation limit was applied. That limit is not evidence that the role is less valid for you.",
      };
    case "redundant":
      return {
        kind: "overlap",
        heading: "Overlapping evidence",
        message: `There was relevant evidence for this role, but it overlaps strongly with ${alternate.overlappingRoleLabel ?? "another suggested role"}, which represented that part of your results in the suggested set. This does not make either role objectively better.`,
      };
    case "confirmation-required":
      return {
        kind: "needs-direct-confirmation",
        heading: "Direct confirmation needed",
        message: "KinkAtlas does not infer this exact label from broad answers alone. It would require direct confirmation before being suggested.",
      };
    case "manual-only":
      return {
        kind: "manual-exploration",
        heading: "Available for self-exploration",
        message: "KinkAtlas keeps this term available for self-exploration but does not automatically recommend it from the assessment.",
      };
    case "user-excluded":
      return {
        kind: "not-included",
        heading: "Not included automatically",
        message: "This role was excluded from the assessment-generated suggestion. KinkAtlas does not override that choice.",
      };
    case "insufficient-evidence":
    case "below-threshold":
    case "unresolved":
      return {
        kind: "needs-more-evidence",
        heading: "Not suggested automatically",
        message: "KinkAtlas did not have enough distinct assessment evidence to suggest this role automatically from your current answers.",
      };
    default:
      return {
        kind: "unrepresented",
        heading: "Not suggested automatically",
        message: "This role was not part of the assessment-generated suggestion. You can still explore or choose it if it is meaningful to you.",
      };
  }
}

export function explainRoleAssessment(input: RoleAssessmentExplanationInput): RoleAssessmentExplanation {
  const explanation: RoleAssessmentExplanation = assessmentOutcome(input);
  const vocabularyConfirmation = input.recommendation?.candidate.vocabularyConfirmation ?? input.alternate?.candidate.vocabularyConfirmation;

  if (vocabularyConfirmation === "confirmed") {
    explanation.vocabulary = {
      heading: "Exact vocabulary confirmed",
      message: "You directly selected this label in Refine. Its alignment and confidence still come only from your Discovery evidence.",
    };
  } else if (vocabularyConfirmation === "declined") {
    explanation.vocabulary = {
      heading: "Label not selected",
      message: "Your Discovery answers can still show the underlying pattern, but you indicated that this exact label does not fit.",
    };
  } else if (vocabularyConfirmation === "unconfirmed") {
    explanation.vocabulary = {
      heading: "Underlying pattern only",
      message: "Your Discovery evidence supports this pattern, but you did not directly confirm this exact label.",
    };
  }

  if (input.selectedRole?.source === "user-selected") {
    explanation.manualSelection = {
      heading: "Added by you",
      message: "You added this role yourself. Adding it does not create an assessment score or confidence.",
    };
  }

  return explanation;
}

export function buildRoleAssessmentExplanationMap(optimization: RoleProfileOptimization, selectedRoles: EditableRoleProfileEntry[]): Map<string, RoleAssessmentExplanation> {
  const recommendationByRoleId = new Map(optimization.recommendations.map((recommendation) => [recommendation.candidate.roleId, recommendation]));
  const alternateByRoleId = new Map(optimization.alternates.map((alternate) => [alternate.candidate.roleId, alternate]));
  const selectedRoleById = new Map(selectedRoles.map((role) => [role.roleId, role]));
  const suggestedPrimaryRoleId = optimization.primary?.candidate.roleId;

  return new Map(
    roleLibrary.roles.map((role) => [
      role.id,
      explainRoleAssessment({
        recommendation: recommendationByRoleId.get(role.id),
        alternate: alternateByRoleId.get(role.id),
        isSuggestedPrimary: role.id === suggestedPrimaryRoleId,
        selectedRole: selectedRoleById.get(role.id),
      }),
    ]),
  );
}
