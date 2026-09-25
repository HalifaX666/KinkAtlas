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
    description: "Looks at how your supported submission interests may connect with other patterns.",
  },
  {
    id: "dominance",
    label: "Dominance style",
    description: "Looks at how your supported dominance interests may connect with other patterns.",
  },
  {
    id: "primal",
    label: "Primal style",
    description: "Looks more closely at your supported primal interests.",
  },
  {
    id: "service",
    label: "Service style",
    description: "Looks at how service may connect with other supported patterns.",
  },
  {
    id: "pet",
    label: "Pet-play style",
    description: "Looks at adult animal-inspired roleplay without guessing a persona from unrelated answers.",
  },
  {
    id: "caregiver-little",
    label: "Caregiver / age-roleplay style",
    description: "Looks at non-sexual adult caregiving and age-inspired roleplay language.",
  },
  {
    id: "power-exchange-vocabulary",
    label: "Power-exchange vocabulary",
    description: "Checks whether a core power-exchange label feels useful without changing the underlying pattern.",
  },
  {
    id: "play-position-vocabulary",
    label: "Play-position vocabulary",
    description: "Checks whether a core activity-position label feels useful without changing the underlying pattern.",
  },
];

const intersectionContext = "This asks whether two patterns already supported by your answers feel connected. It does not change your Discovery alignment, assign an identity, or imply consent.";
const adultAgeRoleplayContext = "KinkAtlas uses this language only for non-sexual roleplay or caregiving between consenting adults. It never describes someone’s real age, development, dependency, or agency.";
const petPersonaContext = "This asks about an adult animal-inspired roleplay persona. It does not assume submission, ownership, dependency, identity outside the roleplay, or consent to any activity.";
const vocabularyContext = "Choosing a label is optional. It adds context to the patterns in your Discovery answers without changing their alignment or confidence.";
function connectionAnswers(targetId: NonNullable<RefinementAnswerOption["supports"]>[number]): RefinementAnswerOption[] {
  return [
    {
      id: "yes",
      label: "Yes — they feel connected for me",
      supports: [targetId],
    },
    {
      id: "maybe",
      label: "Maybe — I see the overlap, but I’m not sure",
      weakSupports: [targetId],
    },
    {
      id: "no",
      label: "No — I prefer to keep them separate",
      rejects: [targetId],
    },
    {
      id: "unknown",
      label: "I’m not sure yet",
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
    id: "ref-power-exchange-vocabulary",
    kind: "refinement",
    family: "power-exchange-vocabulary",
    prompt: "If you use role vocabulary for power exchange, which label feels closest?",
    context: vocabularyContext,
    answers: [
      {
        id: "dominant",
        label: "Dominant",
        supports: ["dominant"],
        primaryPreference: { kind: "direct", targetId: "dominant" },
      },
      {
        id: "submissive",
        label: "submissive",
        supports: ["submissive"],
        primaryPreference: { kind: "direct", targetId: "submissive" },
      },
      {
        id: "switch",
        label: "Switch",
        supports: ["switch"],
        primaryPreference: { kind: "direct", targetId: "switch" },
      },
      {
        id: "none",
        label: "None of these — a broader description fits better",
        rejects: ["dominant", "submissive", "switch"],
      },
      {
        id: "unknown",
        label: "I’m not sure yet",
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
    id: "ref-play-position-vocabulary",
    kind: "refinement",
    family: "play-position-vocabulary",
    prompt: "If you use role vocabulary for activity positions, which label feels closest?",
    context: vocabularyContext,
    answers: [
      {
        id: "top",
        label: "Top",
        supports: ["top"],
        primaryPreference: { kind: "direct", targetId: "top" },
      },
      {
        id: "bottom",
        label: "Bottom",
        supports: ["bottom"],
        primaryPreference: { kind: "direct", targetId: "bottom" },
      },
      {
        id: "vers",
        label: "Vers",
        supports: ["vers"],
        primaryPreference: { kind: "direct", targetId: "vers" },
      },
      {
        id: "none",
        label: "None of these — activity-by-activity language fits better",
        rejects: ["top", "bottom", "vers"],
      },
      {
        id: "unknown",
        label: "I’m not sure yet",
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
    id: "ref-sub-top",
    kind: "refinement",
    family: "submission",
    prompt: "When you’re feeling submissive, can taking the active or giving role still feel like part of your submission?",
    context: intersectionContext,
    answers: connectionAnswers("submissive-top"),
  },
  {
    id: "ref-sub-sadist",
    kind: "refinement",
    family: "submission",
    prompt: "When you’re feeling submissive, can giving pain or strong intensity feel connected to your submission?",
    context: intersectionContext,
    answers: connectionAnswers("submissive-sadist"),
  },
  {
    id: "ref-sub-masochist",
    kind: "refinement",
    family: "submission",
    prompt: "When you’re feeling submissive, can receiving pain or strong intensity feel connected to your submission?",
    context: intersectionContext,
    answers: connectionAnswers("submissive-masochist"),
  },
  {
    id: "ref-sub-brat",
    kind: "refinement",
    family: "submission",
    prompt: "Can agreed teasing or playful defiance be part of how you express submission?",
    context: intersectionContext,
    answers: connectionAnswers("bratty-sub"),
  },
  {
    id: "ref-sub-pleasure",
    kind: "refinement",
    family: "submission",
    prompt: "Can supporting or creating a partner’s pleasure be part of how you express submission?",
    context: intersectionContext,
    answers: connectionAnswers("pleasure-submissive"),
  },
  {
    id: "ref-sub-sensual",
    kind: "refinement",
    family: "submission",
    prompt: "Can closeness, touch, atmosphere, or sensory pleasure be central to your submission?",
    context: intersectionContext,
    answers: connectionAnswers("sensual-submissive"),
  },

  {
    id: "ref-dom-bottom",
    kind: "refinement",
    family: "dominance",
    prompt: "When you hold agreed authority, can you still receive an activity while directing the dynamic?",
    context: intersectionContext,
    answers: connectionAnswers("dominant-bottom"),
  },
  {
    id: "ref-dom-sadist",
    kind: "refinement",
    family: "dominance",
    prompt: "Can giving pain or strong intensity be part of how you express agreed authority?",
    context: intersectionContext,
    answers: connectionAnswers("dominant-sadist"),
  },
  {
    id: "ref-dom-masochist",
    kind: "refinement",
    family: "dominance",
    prompt: "Can receiving pain or strong intensity fit with how you express agreed authority?",
    context: intersectionContext,
    answers: connectionAnswers("dominant-masochist"),
  },
  {
    id: "ref-dom-sensual",
    kind: "refinement",
    family: "dominance",
    prompt: "Can touch, intimacy, atmosphere, or sensory pleasure be central to how you express agreed authority?",
    context: intersectionContext,
    answers: connectionAnswers("sensual-dominant"),
  },
  {
    id: "ref-primal-sadist",
    kind: "refinement",
    family: "primal",
    prompt: "Can giving pain or strong intensity be a meaningful part of your primal play?",
    context: intersectionContext,
    answers: connectionAnswers("primal-sadist"),
  },
  {
    id: "ref-primal-masochist",
    kind: "refinement",
    family: "primal",
    prompt: "Can receiving pain or strong intensity be a meaningful part of your primal play?",
    context: intersectionContext,
    answers: connectionAnswers("primal-masochist"),
  },
  {
    id: "ref-primal-top",
    kind: "refinement",
    family: "primal",
    prompt: "Can taking the active or giving role be a meaningful part of your primal play?",
    context: intersectionContext,
    answers: connectionAnswers("primal-top"),
  },
  {
    id: "ref-primal-bottom",
    kind: "refinement",
    family: "primal",
    prompt: "Can taking the receiving role be a meaningful part of your primal play?",
    context: intersectionContext,
    answers: connectionAnswers("primal-bottom"),
  },
  {
    id: "ref-primal-sensual",
    kind: "refinement",
    family: "primal",
    prompt: "Can touch, texture, sensory pleasure, or body awareness be central to your primal play?",
    context: intersectionContext,
    answers: connectionAnswers("primal-sensualist"),
  },

  {
    id: "ref-service-rigger",
    kind: "refinement",
    family: "service",
    prompt: "Can tying another adult feel meaningful because you’re creating the rope experience they want?",
    context: intersectionContext,
    answers: connectionAnswers("service-rigger"),
  },
  {
    id: "ref-service-brat",
    kind: "refinement",
    family: "service",
    prompt: "Can agreed teasing or playful defiance be part of service for you?",
    context: intersectionContext,
    answers: connectionAnswers("service-brat"),
  },
  {
    id: "ref-pet-persona",
    kind: "refinement",
    family: "pet",
    prompt: "If you picture yourself in an adult animal-inspired role, which persona feels closest?",
    context: petPersonaContext,
    answers: [
      {
        id: "canine",
        label: "A canine-inspired persona, such as puppy or pup",
        supports: ["puppy"],
        primaryPreference: { kind: "direct", targetId: "puppy" },
      },
      {
        id: "feline",
        label: "A feline-inspired persona, such as kitten or cat",
        supports: ["kitten"],
        primaryPreference: { kind: "direct", targetId: "kitten" },
      },
      {
        id: "both",
        label: "Both canine and feline themes feel relevant",
        weakSupports: ["puppy", "kitten"],
      },
      {
        id: "other",
        label: "Another animal-inspired persona or a broader pet role fits better",
        noScore: true,
      },
      {
        id: "unknown",
        label: "I’m not sure yet",
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
    prompt: "Does non-sexual adult age-inspired roleplay or caregiving feel relevant to you?",
    context: adultAgeRoleplayContext,
    answers: [
      {
        id: "yes",
        label: "Yes — that kind of adult dynamic feels relevant to me",
        noScore: true,
      },
      {
        id: "maybe",
        label: "Maybe — I’m curious, but not sure yet",
        noScore: true,
      },
      {
        id: "no",
        label: "No — this kind of adult dynamic doesn’t feel relevant to me",
        noScore: true,
      },
      {
        id: "unknown",
        label: "I’m not sure yet",
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
    prompt: "In non-sexual adult caregiving or age-inspired roleplay, which position feels closest to you?",
    context: adultAgeRoleplayContext,
    answers: [
      {
        id: "caregiver",
        label: "Caregiver — I’m drawn to providing care, reassurance, guidance, or structure",
        noScore: true,
      },
      {
        id: "little",
        label: "Little — a younger-feeling adult role centered on comfort, playfulness, care, or self-expression",
        supports: ["little"],
        primaryPreference: { kind: "fallback", targetId: "little", fallbackGroup: "little-vocabulary" },
      },
      {
        id: "middle",
        label: "Middle — an age-inspired adult role with more independence while still enjoying care, comfort, or playful expression",
        supports: ["middle"],
        primaryPreference: { kind: "direct", targetId: "middle" },
      },
      {
        id: "big",
        label: "Big — a more mature, grounded, or independent adult age-roleplay position",
        supports: ["big"],
        primaryPreference: { kind: "direct", targetId: "big" },
      },
      {
        id: "multiple",
        label: "More than one can fit, depending on the context",
        noScore: true,
      },
      {
        id: "unknown",
        label: "I’m interested, but I’m not sure which position fits",
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
    prompt: "On the caregiving side of this non-sexual adult dynamic, does either title fit?",
    context: adultAgeRoleplayContext,
    answers: [
      {
        id: "daddy",
        label: "Daddy",
        supports: ["daddy"],
        primaryPreference: { kind: "direct", targetId: "daddy" },
      },
      {
        id: "mommy",
        label: "Mommy",
        supports: ["mommy"],
        primaryPreference: { kind: "direct", targetId: "mommy" },
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
        label: "I’m not sure yet",
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
    prompt: "If Little feels relevant, which non-sexual adult role label feels closest to you?",
    context: adultAgeRoleplayContext,
    answers: [
      {
        id: "little",
        label: "Little",
        supports: ["little"],
        primaryPreference: { kind: "direct", targetId: "little", fallbackGroup: "little-vocabulary" },
      },
      {
        id: "little-one",
        label: "Little one",
        supports: ["little-one"],
        primaryPreference: { kind: "direct", targetId: "little-one", fallbackGroup: "little-vocabulary" },
      },
      {
        id: "little-girl",
        label: "Little girl",
        supports: ["little-girl"],
        primaryPreference: { kind: "direct", targetId: "little-girl", fallbackGroup: "little-vocabulary" },
      },
      {
        id: "little-boy",
        label: "Little boy",
        supports: ["little-boy"],
        primaryPreference: { kind: "direct", targetId: "little-boy", fallbackGroup: "little-vocabulary" },
      },
      {
        id: "little-princess",
        label: "Little princess",
        supports: ["little-princess"],
        primaryPreference: { kind: "direct", targetId: "little-princess", fallbackGroup: "little-vocabulary" },
      },
      {
        id: "little-prince",
        label: "Little prince",
        supports: ["little-prince"],
        primaryPreference: { kind: "direct", targetId: "little-prince", fallbackGroup: "little-vocabulary" },
      },
      {
        id: "bratty-little",
        label: "Bratty Little",
        supports: ["bratty-little"],
        primaryPreference: { kind: "direct", targetId: "bratty-little", fallbackGroup: "little-vocabulary" },
      },
      {
        id: "babygirl",
        label: "Babygirl / baby girl",
        supports: ["babygirl"],
        primaryPreference: { kind: "direct", targetId: "babygirl", fallbackGroup: "little-vocabulary" },
      },
      {
        id: "other",
        label: "Another Little-related label fits me better",
        noScore: true,
        primaryPreference: { kind: "suppress-fallback", fallbackGroup: "little-vocabulary" },
      },
      {
        id: "unknown",
        label: "I’m not sure yet",
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
