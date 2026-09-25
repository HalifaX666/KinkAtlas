import { boundaryItems } from "../../data/boundaries";
import { discoveryQuestions } from "../../data/questions";
import { negotiationQuestions } from "../../data/negotiation";
import { readinessQuestions } from "../../data/readiness";
import { selectNextDiscoveryQuestion } from "../../engine/adaptiveQuestioning";
import { calculateTraitScores } from "../../engine/discoveryScoring";
import type { AssessmentAnswers, BoundaryValue } from "../../types";

export interface AssessmentPersona {
  id: string;
  name: string;
  description: string;
  answers: AssessmentAnswers;
}

interface PersonaSeed {
  id: string;
  name: string;
  description: string;
  discoveryDefault?: string;
  discovery?: Record<string, string>;
  refinement?: Record<string, string>;
  refinementDefault?: string;
  readinessDefault?: string;
  boundariesDefault?: BoundaryValue;
  boundaries?: Record<string, BoundaryValue>;
  negotiationDefault?: string;
}

const broadQuestions = discoveryQuestions.filter((question) => question.phase === "broad");

export function createAnswerRecord(section: string, entries: [string, string][]): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const [questionId, answerId] of entries) {
    if (questionId in answers) throw new Error(`${section}: duplicate question ID ${questionId}`);
    answers[questionId] = answerId;
  }
  return answers;
}

function completeDiscovery(seed: PersonaSeed): AssessmentAnswers["discovery"] {
  const discovery = createAnswerRecord(
    "discovery",
    broadQuestions.map((question) => [question.id, seed.discovery?.[question.id] ?? seed.discoveryDefault ?? "no"]),
  );
  while (Object.keys(discovery).length < 26) {
    const next = selectNextDiscoveryQuestion(
      {
        discovery,
        refinement: {},
        readiness: {},
        boundaries: {},
        negotiation: {},
      },
      calculateTraitScores(discovery),
    );
    if (!next) break;
    discovery[next.id] = seed.discovery?.[next.id] ?? seed.refinementDefault ?? "some";
  }
  return discovery;
}

function createPersona(seed: PersonaSeed): AssessmentPersona {
  return {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    answers: {
      discovery: completeDiscovery(seed),
      refinement: seed.refinement ?? {},
      readiness: createAnswerRecord(
        "readiness",
        readinessQuestions.map((question) => [question.id, seed.readinessDefault ?? "a"]),
      ),
      boundaries: Object.fromEntries(boundaryItems.map((item) => [item.id, seed.boundaries?.[item.id] ?? seed.boundariesDefault ?? "neutral"])) as AssessmentAnswers["boundaries"],
      negotiation: createAnswerRecord(
        "negotiation",
        negotiationQuestions.map((question) => [question.id, seed.negotiationDefault ?? "p4"]),
      ),
    },
  };
}

export const assessmentPersonas: AssessmentPersona[] = [
  createPersona({
    id: "balanced-authority-pattern",
    name: "Balanced authority pattern",
    description: "Strong interest in both negotiated authority directions and moving between them.",
    discovery: { "d-power-give": "strong", "d-power-receive": "strong", "d-flexibility": "strong", "d-lifestyle": "some", "r-both-power": "strong", "r-authority-style": "curious", "r-surrender": "strong" },
  }),
  createPersona({
    id: "directive-leaning-pattern",
    name: "Directive-leaning pattern",
    description: "Strong negotiated authority and activity-leading interest without receptive authority interest.",
    discovery: { "d-power-give": "strong", "d-power-receive": "no", "d-flexibility": "no", "d-position-give": "strong", "d-lifestyle": "some", "r-lead": "strong", "r-authority-style": "strong", "r-top": "strong" },
  }),
  createPersona({
    id: "receptive-leaning-pattern",
    name: "Receptive-leaning pattern",
    description: "Strong receptive authority, surrender, and activity-receiving interest.",
    discovery: { "d-power-give": "no", "d-power-receive": "strong", "d-flexibility": "no", "d-position-receive": "strong", "r-surrender": "strong", "r-yielding-motivation": "strong", "r-bottom": "strong" },
  }),
  createPersona({
    id: "service-giving-emphasis",
    name: "Service-giving emphasis",
    description: "Practical service, attentive action, and giving-focused evidence are emphasized.",
    discovery: { "d-service": "strong", "d-position-give": "strong", "d-care": "strong", "r-service-give": "strong", "r-service-position": "strong", "r-service-direct": "some" },
  }),
  createPersona({
    id: "service-receiving-care-emphasis",
    name: "Service-receiving and care emphasis",
    description: "Receiving attentive service, reassurance, and care are emphasized.",
    discovery: { "d-service": "some", "d-position-receive": "strong", "d-care": "some", "r-service-receive": "strong", "r-service-receive-style": "strong", "r-service-receive-position": "strong", "r-care-receive": "strong" },
  }),
  createPersona({
    id: "rope-bondage-emphasis",
    name: "Rope and bondage emphasis",
    description: "Rope craft, restraint, and tying evidence are stronger than unrelated themes.",
    discovery: { "d-rope": "strong", "d-position-give": "strong", "r-rope-give": "strong", "r-rope-receive": "no", "r-rope-both": "no", "r-rope-motivation": "strong" },
    boundaries: { rope: "want" },
  }),
  createPersona({
    id: "impact-sensation-emphasis",
    name: "Impact and sensation emphasis",
    description: "Strong physical intensity and sensation-giving evidence with explicit limits elsewhere.",
    discovery: { "d-intensity": "strong", "d-position-give": "strong", "r-pain-give": "strong", "r-pain-receive": "no", "r-sensation": "some" },
    boundaries: { impact: "want", sensation: "curious" },
  }),
  createPersona({
    id: "care-nurturing-emphasis",
    name: "Care and nurturing emphasis",
    description: "Offering care, steadiness, reassurance, and protection are emphasized without authority.",
    discovery: { "d-care": "strong", "d-service": "some", "d-power-give": "no", "d-power-receive": "no", "r-care-give": "strong", "r-protector": "strong" },
  }),
  createPersona({
    id: "playful-resistance-emphasis",
    name: "Playful resistance emphasis",
    description: "Playful provocation, challenge, and negotiated resistance are emphasized.",
    discovery: { "d-brat": "strong", "d-exploration": "some", "r-brat": "strong", "r-tamer": "no" },
    boundaries: { brat: "want" },
  }),
  createPersona({
    id: "primal-emphasis",
    name: "Primal emphasis",
    description: "Embodied pursuit, rough energy, spontaneity, and primal themes are emphasized.",
    discovery: { "d-primal": "strong", "d-intensity": "curious", "d-exploration": "some", "r-primal-give": "strong", "r-primal-receive": "curious" },
    boundaries: { primal: "want" },
  }),
  createPersona({
    id: "observing-exhibition-emphasis",
    name: "Observing and exhibition emphasis",
    description: "Consensual observation, exhibition, and performance themes are emphasized.",
    discovery: { "d-visibility": "curious", "d-exploration": "some", "r-exhibit": "strong", "r-voyeur": "strong" },
    boundaries: { visibility: "consider" },
  }),
  createPersona({
    id: "broad-exploratory-pattern",
    name: "Broad exploratory pattern",
    description: "Curiosity is distributed across many themes without a narrow role commitment.",
    discoveryDefault: "curious",
    refinementDefault: "curious",
    boundariesDefault: "curious",
  }),
  createPersona({
    id: "high-uncertainty-pattern",
    name: "High uncertainty pattern",
    description: "Discovery and boundary responses consistently indicate that there is not enough information yet.",
    discoveryDefault: "unknown",
    readinessDefault: "prefer-not",
    boundariesDefault: "unknown",
    negotiationDefault: "p4",
  }),
  createPersona({
    id: "high-withholding-pattern",
    name: "High prefer-not-to-answer pattern",
    description: "Every assessment section uses the available prefer-not-to-answer path.",
    discoveryDefault: "prefer-not",
    readinessDefault: "prefer-not",
    boundariesDefault: "prefer-not",
    negotiationDefault: "prefer-not",
  }),
  createPersona({
    id: "multiple-hard-limits-pattern",
    name: "Multiple hard-limits pattern",
    description: "Mixed discovery interests coexist with several explicit activity hard limits and deliberately weak scenario responses.",
    discoveryDefault: "some",
    refinementDefault: "some",
    readinessDefault: "c",
    boundariesDefault: "neutral",
    boundaries: { rope: "hard-limit", impact: "hard-limit", primal: "hard-limit", psychological: "hard-limit", roleplay: "hard-limit" },
    negotiationDefault: "p2",
  }),
  createPersona({
    id: "refined-primal-submission-pattern",
    name: "Refined primal submission pattern",
    description: "Strong submission, primal, and pain-receiving evidence with direct confirmation that those patterns overlap.",
    discovery: {
      "d-power-receive": "strong",
      "r-surrender": "strong",
      "r-yielding-motivation": "strong",

      "d-primal": "strong",
      "r-primal-receive": "strong",

      "d-intensity": "strong",
      "r-pain-receive": "strong",
    },
    refinement: {
      "ref-sub-masochist": "yes",
      "ref-primal-masochist": "yes",
    },
    boundaries: {
      primal: "want",
      impact: "curious",
    },
  }),
  createPersona({
    id: "refined-puppy-pattern",
    name: "Refined puppy pattern",
    description: "Adult pet-role interest with direct canine persona confirmation.",
    discovery: {
      "d-pet": "some",
    },
    refinement: {
      "ref-pet-persona": "canine",
    },
    boundaries: {
      roleplay: "want",
    },
  }),
  createPersona({
    id: "refined-little-vocabulary-pattern",
    name: "Refined Little vocabulary pattern",
    description: "Adult care interest with direct non-sexual Little position and vocabulary confirmation.",
    discovery: {
      "d-care": "some",
      "r-care-receive": "some",
    },
    refinementDefault: "prefer-not",
    refinement: {
      "ref-age-roleplay-interest": "yes",
      "ref-age-roleplay-position": "little",
      "ref-little-vocabulary": "little",
    },
    boundaries: {
      roleplay: "want",
    },
  }),
  createPersona({
    id: "refined-babygirl-vocabulary-pattern",
    name: "Refined babygirl vocabulary pattern",
    description: "Adult care interest with direct non-sexual Little position and babygirl vocabulary confirmation.",
    discovery: {
      "d-care": "some",
      "r-care-receive": "some",
    },
    refinementDefault: "prefer-not",
    refinement: {
      "ref-age-roleplay-interest": "yes",
      "ref-age-roleplay-position": "little",
      "ref-little-vocabulary": "babygirl",
    },
    boundaries: {
      roleplay: "want",
    },
  }),
  createPersona({
    id: "confirmed-dominant-vocabulary",
    name: "Confirmed Dominant vocabulary",
    description: "Explicit negotiated-authority evidence with direct confirmation that Dominant is useful vocabulary.",
    discovery: { "d-power-give": "strong", "r-authority-style": "strong", "r-lead": "strong" },
    refinement: { "ref-power-exchange-vocabulary": "dominant" },
  }),
  createPersona({
    id: "confirmed-submissive-vocabulary",
    name: "Confirmed submissive vocabulary",
    description: "Explicit submission evidence with direct confirmation that submissive is useful vocabulary.",
    discovery: { "d-power-receive": "strong", "r-surrender": "strong", "r-yielding-motivation": "strong" },
    refinement: { "ref-power-exchange-vocabulary": "submissive" },
  }),
  createPersona({
    id: "confirmed-switch-vocabulary",
    name: "Confirmed Switch vocabulary",
    description: "Meaningful power-position flexibility with direct confirmation that Switch is useful vocabulary.",
    discovery: { "d-power-give": "strong", "d-power-receive": "strong", "d-flexibility": "strong", "r-both-power": "strong" },
    refinement: { "ref-power-exchange-vocabulary": "switch" },
  }),
  createPersona({
    id: "confirmed-top-vocabulary",
    name: "Confirmed Top vocabulary",
    description: "Active activity-position evidence without broader authority and direct Top vocabulary confirmation.",
    discovery: { "d-position-give": "strong", "r-top": "strong", "r-lead": "strong", "d-flexibility": "no", "r-authority-style": "some", "r-praise-direction": "strong", "r-praise-context": "some" },
    refinement: { "ref-play-position-vocabulary": "top" },
  }),
  createPersona({
    id: "confirmed-bottom-vocabulary",
    name: "Confirmed Bottom vocabulary",
    description: "Receiving activity-position evidence without submission and direct Bottom vocabulary confirmation.",
    discovery: { "d-position-receive": "strong", "r-bottom": "strong", "r-receiving-focus": "some", "d-intensity": "some", "r-pain-receive": "strong" },
    refinement: { "ref-play-position-vocabulary": "bottom" },
  }),
  createPersona({
    id: "confirmed-vers-vocabulary",
    name: "Confirmed Vers vocabulary",
    description: "Genuine active-and-receiving position flexibility with direct Vers vocabulary confirmation.",
    discovery: { "d-position-give": "strong", "r-top": "strong", "d-position-receive": "strong", "r-bottom": "strong", "r-receiving-focus": "some", "r-positions": "strong" },
    refinement: { "ref-play-position-vocabulary": "vers" },
  }),
  createPersona({
    id: "confirmed-dominant-top-vocabulary",
    name: "Confirmed Dominant and Top vocabulary",
    description: "Distinct authority and active-position evidence with one confirmed label in each vocabulary family.",
    discovery: { "d-power-give": "strong", "r-authority-style": "strong", "r-lead": "strong", "d-position-give": "strong", "r-top": "strong", "r-praise-direction": "strong" },
    refinement: { "ref-power-exchange-vocabulary": "dominant", "ref-play-position-vocabulary": "top" },
  }),
  createPersona({
    id: "confirmed-submissive-bottom-vocabulary",
    name: "Confirmed submissive and Bottom vocabulary",
    description: "Distinct submission and receiving-position evidence with one confirmed label in each vocabulary family.",
    discovery: { "d-power-receive": "strong", "r-surrender": "strong", "r-yielding-motivation": "strong", "d-position-receive": "strong", "r-bottom": "strong", "r-receiving-focus": "some" },
    refinement: { "ref-power-exchange-vocabulary": "submissive", "ref-play-position-vocabulary": "bottom" },
  }),
  createPersona({
    id: "confirmed-switch-vers-vocabulary",
    name: "Confirmed Switch and Vers vocabulary",
    description: "Distinct flexibility evidence for both power exchange and activity positions with both labels confirmed.",
    discovery: { "d-power-give": "strong", "d-power-receive": "strong", "d-flexibility": "strong", "r-both-power": "strong", "d-position-give": "strong", "r-top": "strong", "d-position-receive": "strong", "r-bottom": "strong", "r-receiving-focus": "some", "r-positions": "strong" },
    refinement: { "ref-power-exchange-vocabulary": "switch", "ref-play-position-vocabulary": "vers" },
  }),
  createPersona({
    id: "declined-dominant-vocabulary",
    name: "Declined Dominant vocabulary",
    description: "Strong authority-taking evidence while explicitly declining the offered core power-exchange labels.",
    discovery: { "d-power-give": "strong", "r-authority-style": "strong", "r-lead": "strong" },
    refinement: { "ref-power-exchange-vocabulary": "none" },
  }),
];
