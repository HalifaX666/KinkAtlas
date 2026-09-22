import { boundaryItems, boundaryOptions } from "../../data/boundaries";
import { getConversationStarter } from "../../data/conversationStarters";
import { discoveryQuestions } from "../../data/questions";
import { negotiationQuestions } from "../../data/negotiation";
import { readinessQuestions } from "../../data/readiness";
import { refinementQuestions } from "../../data/refinement";
import { activityRecommendations } from "../../engine/activityRecommendations";
import { selectNextDiscoveryQuestion } from "../../engine/adaptiveQuestioning";
import { calculateTraitScores } from "../../engine/discoveryScoring";
import { generateRecommendations } from "../../engine/recommendations";
import { evaluateReadiness } from "../../engine/readinessScoring";
import { matchRoles } from "../../engine/roleMatching";
import { buildEditableRoleProfileEntries, buildRoleProfileCandidates, optimizeRoleProfile } from "../../engine/roleProfileOptimizer";
import { getShareableRoleSet, type ShareResultsData } from "../../engine/shareResults";
import type { AssessmentAnswers } from "../../types";
import type { AssessmentPersona } from "../fixtures/assessmentPersonas";

const allowedPersonaKeys = new Set(["id", "name", "description", "answers"]);
const discoveryById = new Map(discoveryQuestions.map((question) => [question.id, question]));
const refinementById = new Map(refinementQuestions.map((question) => [question.id, question]));
const readinessById = new Map(readinessQuestions.map((question) => [question.id, question]));
const negotiationById = new Map(negotiationQuestions.map((question) => [question.id, question]));
const boundaryIds = new Set(boundaryItems.map((item) => item.id));
const boundaryValues = new Set(boundaryOptions.map((option) => option.value));

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validateQuestionSection(section: string, answers: unknown, questions: Map<string, { answers: { id: string }[] }>) {
  if (!isPlainRecord(answers)) throw new Error(`${section}: expected an answer record`);
  for (const [questionId, answerId] of Object.entries(answers)) {
    const question = questions.get(questionId);
    if (!question) throw new Error(`${section}: unknown question ID ${questionId}`);
    if (typeof answerId !== "string" || !question.answers.some((answer) => answer.id === answerId)) throw new Error(`${section}: invalid option ${String(answerId)} for ${questionId}`);
  }
}

export function validateAssessmentPersona(persona: AssessmentPersona): void {
  if (!persona.id.trim() || !persona.name.trim() || !persona.description.trim()) throw new Error("persona: id, name, and description are required");
  const unknownKeys = Object.keys(persona).filter((key) => !allowedPersonaKeys.has(key));
  if (unknownKeys.length) throw new Error(`persona ${persona.id}: unknown fields ${unknownKeys.join(", ")}`);
  if (!isPlainRecord(persona.answers)) throw new Error(`persona ${persona.id}: answers must be an object`);
  for (const section of ["discovery", "refinement", "readiness", "boundaries", "negotiation"] as const) {
    if (!isPlainRecord(persona.answers[section])) throw new Error(`persona ${persona.id}: malformed ${section} section`);
  }

  validateQuestionSection("discovery", persona.answers.discovery, discoveryById);
  validateQuestionSection("refinement", persona.answers.refinement, refinementById);
  validateQuestionSection("readiness", persona.answers.readiness, readinessById);
  validateQuestionSection("negotiation", persona.answers.negotiation, negotiationById);
  for (const question of discoveryQuestions.filter((candidate) => candidate.phase === "broad")) {
    if (!(question.id in persona.answers.discovery)) throw new Error(`discovery: missing required broad question ${question.id}`);
  }
  if (Object.keys(persona.answers.discovery).length > 26) throw new Error("discovery: exceeds the 26-question adaptive maximum");
  for (const question of readinessQuestions) if (!(question.id in persona.answers.readiness)) throw new Error(`readiness: missing question ${question.id}`);
  for (const question of negotiationQuestions) if (!(question.id in persona.answers.negotiation)) throw new Error(`negotiation: missing question ${question.id}`);

  for (const [itemId, value] of Object.entries(persona.answers.boundaries)) {
    if (!boundaryIds.has(itemId)) throw new Error(`boundaries: unknown item ID ${itemId}`);
    if (!boundaryValues.has(value)) throw new Error(`boundaries: invalid option ${value} for ${itemId}`);
  }
  for (const item of boundaryItems) if (!(item.id in persona.answers.boundaries)) throw new Error(`boundaries: missing item ${item.id}`);
}

export function validateAssessmentPersonas(personas: AssessmentPersona[]): void {
  const ids = new Set<string>();
  for (const persona of personas) {
    if (ids.has(persona.id)) throw new Error(`personas: duplicate persona ID ${persona.id}`);
    ids.add(persona.id);
    validateAssessmentPersona(persona);
  }
}

function adaptiveQuestionIds(discovery: AssessmentAnswers["discovery"]): string[] {
  const partial: AssessmentAnswers = {
    discovery: {},
    refinement: {},
    readiness: {},
    boundaries: {},
    negotiation: {},
  };
  const selected: string[] = [];
  while (selected.length < 26) {
    const next = selectNextDiscoveryQuestion(partial, calculateTraitScores(partial.discovery));
    if (!next) break;
    const answerId = discovery[next.id];
    if (!answerId) break;
    selected.push(next.id);
    partial.discovery[next.id] = answerId;
  }
  return selected;
}

export function evaluateAssessmentPersona(persona: AssessmentPersona) {
  validateAssessmentPersona(persona);
  const traitScores = calculateTraitScores(persona.answers.discovery);
  const roleResults = matchRoles(traitScores, persona.answers.discovery);
  const roleProfile = optimizeRoleProfile(buildRoleProfileCandidates(roleResults));
  const suggestedRoleSet = buildEditableRoleProfileEntries(roleProfile);
  const yourRoleSet = [...suggestedRoleSet];
  const readiness = evaluateReadiness(persona.answers.readiness);
  const activityGuidance = activityRecommendations(persona.answers.boundaries, boundaryItems);
  const learningRecommendations = generateRecommendations(roleResults, readiness.competencies);
  const conversationStarters = negotiationQuestions.flatMap((question) => {
    const answerId = persona.answers.negotiation[question.id];
    const statement = getConversationStarter(question.id, answerId);
    return statement ? [{ questionId: question.id, domain: question.domain, statement }] : [];
  });
  const shareData: ShareResultsData = {
    roleResults,
    roleSet: yourRoleSet,
    readiness,
    boundaries: persona.answers.boundaries,
    negotiation: persona.answers.negotiation,
  };

  return {
    persona,
    traitScores,
    roleResults,
    roleProfile,
    suggestedRoleSet,
    yourRoleSet,
    readiness,
    activityGuidance,
    learningRecommendations,
    conversationStarters,
    shareData,
    exportRoles: getShareableRoleSet(yourRoleSet, roleResults),
    adaptiveQuestionIds: adaptiveQuestionIds(persona.answers.discovery),
  };
}

export type AssessmentPersonaEvaluation = ReturnType<typeof evaluateAssessmentPersona>;
