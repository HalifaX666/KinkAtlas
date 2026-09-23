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
    description: "Explores non-sexual adult caregiving and age-inspired roleplay vocabulary between consenting adults.",
  },
];

const intersectionContext = "This asks whether two already-supported patterns feel meaningfully connected for you. It does not change your Discovery alignment, assign an identity, or imply consent.";
const adultAgeRoleplayContext = "In KinkAtlas, this vocabulary refers only to non-sexual roleplay or caregiving between consenting adults. It does not describe a person's real age, developmental state, dependency, or reduced agency.";
const petPersonaContext = "This asks about an adult animal-inspired roleplay persona. It does not infer submission, ownership, dependency, identity outside the roleplay, or consent to any activity.";
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
  {
    id: "ref-pet-persona",
    kind: "refinement",
    family: "pet",
    prompt: "If you picture yourself in an adult animal-inspired role, which persona feels most relevant?",
    context: petPersonaContext,
    answers: [
      {
        id: "canine",
        label: "A canine-inspired persona, such as a puppy or pup",
        supports: ["puppy"],
      },
      {
        id: "feline",
        label: "A feline-inspired persona, such as a kitten or cat",
        supports: ["kitten"],
      },
      {
        id: "both",
        label: "Both canine and feline themes feel relevant",
        weakSupports: ["puppy", "kitten"],
      },
      {
        id: "other",
        label: "Another animal-inspired persona or a broad pet role fits better",
        noScore: true,
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
    ],
  },
  {
    id: "ref-age-roleplay-interest",
    kind: "refinement",
    family: "caregiver-little",
    prompt: "Does a non-sexual adult dynamic involving age-inspired roleplay, caregiving, comfort, or guidance feel relevant to you?",
    context: adultAgeRoleplayContext,
    answers: [
      {
        id: "yes",
        label: "Yes — that kind of non-sexual adult dynamic feels relevant to me",
        noScore: true,
      },
      {
        id: "maybe",
        label: "Maybe — I am curious, but I am not sure whether it fits me",
        noScore: true,
      },
      {
        id: "no",
        label: "No — this kind of dynamic does not feel relevant to me",
        noScore: true,
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
    ],
  },

  {
    id: "ref-age-roleplay-position",
    kind: "refinement",
    family: "caregiver-little",
    prompt: "Within a non-sexual adult caregiving or age-inspired roleplay dynamic, which position feels closest to you?",
    context: adultAgeRoleplayContext,
    answers: [
      {
        id: "caregiver",
        label: "Caregiver — I am most drawn to providing care, reassurance, guidance, or structure",
        noScore: true,
      },
      {
        id: "little",
        label: "Little — a younger-feeling adult role centered on comfort, playfulness, care, or self-expression",
        supports: ["little"],
      },
      {
        id: "middle",
        label: "Middle — an age-inspired adult role with more independence while still enjoying care, comfort, or playful expression",
        supports: ["middle"],
      },
      {
        id: "big",
        label: "Big — a more mature, grounded, or independent adult age-roleplay position",
        supports: ["big"],
      },
      {
        id: "multiple",
        label: "More than one of these can feel relevant depending on the context",
        noScore: true,
      },
      {
        id: "unknown",
        label: "I am interested, but I do not know which position fits",
        noScore: true,
      },
      {
        id: "prefer-not",
        label: "Prefer not to answer",
        noScore: true,
      },
    ],
  },

  {
    id: "ref-caregiver-title",
    kind: "refinement",
    family: "caregiver-little",
    prompt: "If you take the caregiving side of this non-sexual adult dynamic, does either of these titles feel like a good fit?",
    context: adultAgeRoleplayContext,
    answers: [
      {
        id: "daddy",
        label: "Daddy",
        supports: ["daddy"],
      },
      {
        id: "mommy",
        label: "Mommy",
        supports: ["mommy"],
      },
      {
        id: "caregiver",
        label: "Caregiver fits better than either title",
        noScore: true,
      },
      {
        id: "other",
        label: "Another caregiver title fits me better",
        noScore: true,
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
    ],
  },

  {
    id: "ref-little-vocabulary",
    kind: "refinement",
    family: "caregiver-little",
    prompt: "If Little feels relevant, which non-sexual adult role vocabulary feels closest to how you would describe yourself?",
    context: adultAgeRoleplayContext,
    answers: [
      {
        id: "little",
        label: "Little",
        supports: ["little"],
      },
      {
        id: "little-one",
        label: "Little one",
        supports: ["little-one"],
      },
      {
        id: "little-girl",
        label: "Little girl",
        supports: ["little-girl"],
      },
      {
        id: "little-boy",
        label: "Little boy",
        supports: ["little-boy"],
      },
      {
        id: "little-princess",
        label: "Little princess",
        supports: ["little-princess"],
      },
      {
        id: "little-prince",
        label: "Little prince",
        supports: ["little-prince"],
      },
      {
        id: "bratty-little",
        label: "Bratty Little",
        supports: ["bratty-little"],
      },
      {
        id: "babygirl",
        label: "Babygirl / baby girl",
        supports: ["babygirl"],
      },
      {
        id: "other",
        label: "Another Little-related label fits me better",
        noScore: true,
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
    ],
  },
];

export const refinementQuestionById = Object.fromEntries(refinementQuestions.map((question) => [question.id, question])) as Record<string, RefinementQuestion>;
