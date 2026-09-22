import type { RefinementFamilyId, RefinementQuestion } from "../types";

export interface RefinementFamilyDefinition {
  id: RefinementFamilyId;
  label: string;
  description: string;
}

/**
 * Refine is intentionally separate from Discovery.
 *
 * Discovery establishes broad independent role evidence.
 * Refine may distinguish styles/subtypes only after the relevant
 * broader pattern has already been supported.
 *
 * Refinement answers must never:
 * - create a parent role from nothing;
 * - change Discovery trait scores;
 * - change readiness;
 * - change boundaries;
 * - imply consent.
 */
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

/**
 * Questions are added family-by-family.
 *
 * Keeping this empty for the foundation checkpoint is intentional:
 * it lets us validate lifecycle, navigation and answer invalidation
 * before subtype evidence can affect anything.
 */
export const refinementQuestions: RefinementQuestion[] = [];

export const refinementQuestionById = Object.fromEntries(refinementQuestions.map((question) => [question.id, question])) as Record<string, RefinementQuestion>;
