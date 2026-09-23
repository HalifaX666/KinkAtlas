import type { RefinementAnswerOption, RefinementFamilyId, RefinementQuestion } from "../types";

export interface RefinementFamilyDefinition {
  id: RefinementFamilyId;
  label: string;
  description: string;
}

export const refinementFamilies: RefinementFamilyDefinition[] = [
  {
    id: "submission",
    label: "Submission style",
    description: "Explores how already-supported submission may express itself.",
  },
  {
    id: "dominance",
    label: "Dominance style",
    description: "Explores how already-supported dominance may express itself.",
  },
  {
    id: "primal",
    label: "Primal style",
    description: "Explores more specific patterns inside already-supported primal interests.",
  },
  {
    id: "service",
    label: "Service style",
    description: "Explores intersections between service and other independently supported patterns.",
  },
  {
    id: "pet",
    label: "Pet-play style",
    description: "Explores adult animal-inspired roleplay preferences without inferring a persona from unrelated traits.",
  },
  {
    id: "caregiver-little",
    label: "Caregiver / age-roleplay style",
    description: "Explores adult caregiver and age-roleplay vocabulary without inferring age, regression, dependency, or minor status.",
  },
];

const intersectionContext = "This asks whether two already-supported patterns feel meaningfully connected for you. It does not change your Discovery alignment, assign an identity, or imply consent.";

function connectionAnswers(targetId: NonNullable<RefinementAnswerOption["supports"]>[number]): RefinementAnswerOption[] {
  return [
    {
      id: "yes",
      label: "Yes — those patterns feel meaningfully connected for me",
      supports: [targetId],
    },
    {
      id: "maybe",
      label: "Maybe — I can see the overlap, but I am not sure I would combine them",
      weakSupports: [targetId],
    },
    {
      id: "no",
      label: "No — I prefer to keep those patterns separate",
      rejects: [targetId],
    },
    {
      id: "unknown",
      label: "I do not know yet",
      noScore: true,
    },
    {
      id: "prefer-not",
      label: "Prefer not to answer",
      noScore: true,
    },
  ];
}

export const refinementQuestions: RefinementQuestion[] = [
  {
    id: "ref-sub-top",
    kind: "refinement",
    family: "submission",
    prompt: "When you are in a submissive frame, can taking the active or giving position still feel like part of that submission?",
    context: intersectionContext,
    answers: connectionAnswers("submissive-top"),
  },
  {
    id: "ref-sub-sadist",
    kind: "refinement",
    family: "submission",
    prompt: "When you are in a submissive frame, can giving consensual pain or strong intensity feel meaningfully connected to that submission?",
    context: intersectionContext,
    answers: connectionAnswers("submissive-sadist"),
  },
  {
    id: "ref-sub-masochist",
    kind: "refinement",
    family: "submission",
    prompt: "When you are in a submissive frame, can receiving consensual pain or strong intensity feel meaningfully connected to that submission?",
    context: intersectionContext,
    answers: connectionAnswers("submissive-masochist"),
  },
  {
    id: "ref-sub-brat",
    kind: "refinement",
    family: "submission",
    prompt: "Can negotiated teasing or playful defiance feel like one way your submission expresses itself?",
    context: intersectionContext,
    answers: connectionAnswers("bratty-sub"),
  },
  {
    id: "ref-sub-pleasure",
    kind: "refinement",
    family: "submission",
    prompt: "Can supporting or creating a partner’s pleasure feel like a meaningful expression of your submission?",
    context: intersectionContext,
    answers: connectionAnswers("pleasure-submissive"),
  },
  {
    id: "ref-sub-sensual",
    kind: "refinement",
    family: "submission",
    prompt: "Can closeness, touch, atmosphere, or sensory pleasure feel central to how your submission expresses itself?",
    context: intersectionContext,
    answers: connectionAnswers("sensual-submissive"),
  },

  {
    id: "ref-dom-bottom",
    kind: "refinement",
    family: "dominance",
    prompt: "When you hold negotiated authority, can receiving an activity still feel compatible with being the person directing the dynamic?",
    context: intersectionContext,
    answers: connectionAnswers("dominant-bottom"),
  },
  {
    id: "ref-dom-sadist",
    kind: "refinement",
    family: "dominance",
    prompt: "Can giving consensual pain or strong intensity feel meaningfully connected to how you express negotiated authority?",
    context: intersectionContext,
    answers: connectionAnswers("dominant-sadist"),
  },
  {
    id: "ref-dom-masochist",
    kind: "refinement",
    family: "dominance",
    prompt: "Can receiving consensual pain or strong intensity feel compatible with how you express negotiated authority?",
    context: intersectionContext,
    answers: connectionAnswers("dominant-masochist"),
  },
  {
    id: "ref-dom-sensual",
    kind: "refinement",
    family: "dominance",
    prompt: "Can touch, intimacy, atmosphere, or sensory pleasure feel central to how you express negotiated authority?",
    context: intersectionContext,
    answers: connectionAnswers("sensual-dominant"),
  },
  {
    id: "ref-primal-sadist",
    kind: "refinement",
    family: "primal",
    prompt: "Can giving consensual pain or strong intensity feel like a meaningful part of your primal play?",
    context: intersectionContext,
    answers: connectionAnswers("primal-sadist"),
  },
  {
    id: "ref-primal-masochist",
    kind: "refinement",
    family: "primal",
    prompt: "Can receiving consensual pain or strong intensity feel like a meaningful part of your primal play?",
    context: intersectionContext,
    answers: connectionAnswers("primal-masochist"),
  },
  {
    id: "ref-primal-top",
    kind: "refinement",
    family: "primal",
    prompt: "Can taking the active or giving position feel like a meaningful part of your primal play?",
    context: intersectionContext,
    answers: connectionAnswers("primal-top"),
  },
  {
    id: "ref-primal-bottom",
    kind: "refinement",
    family: "primal",
    prompt: "Can taking the receiving position feel like a meaningful part of your primal play?",
    context: intersectionContext,
    answers: connectionAnswers("primal-bottom"),
  },
  {
    id: "ref-primal-sensual",
    kind: "refinement",
    family: "primal",
    prompt: "Can sensory pleasure, touch, texture, or bodily awareness feel central to your primal play?",
    context: intersectionContext,
    answers: connectionAnswers("primal-sensualist"),
  },

  {
    id: "ref-service-rigger",
    kind: "refinement",
    family: "service",
    prompt: "Can tying another adult feel meaningful partly because you are creating the rope experience they want?",
    context: intersectionContext,
    answers: connectionAnswers("service-rigger"),
  },
  {
    id: "ref-service-brat",
    kind: "refinement",
    family: "service",
    prompt: "Can negotiated teasing or playful defiance coexist with service being meaningful to you?",
    context: intersectionContext,
    answers: connectionAnswers("service-brat"),
  },
];

export const refinementQuestionById = Object.fromEntries(refinementQuestions.map((question) => [question.id, question])) as Record<string, RefinementQuestion>;
