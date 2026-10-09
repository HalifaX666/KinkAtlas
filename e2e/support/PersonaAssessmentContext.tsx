import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { assessmentPersonas } from "../../src/tests/fixtures/assessmentPersonas";
import { getAssessmentCompletion, type AssessmentCompletion } from "../../src/engine/assessmentCompletion";
import { calculateTraitScores } from "../../src/engine/discoveryScoring";
import { applyRefinementAnswer, unansweredRefinementQuestions } from "../../src/engine/refinementRouting";
import type { EditableRoleProfileEntry } from "../../src/engine/roleProfileOptimizer";
import type { AssessmentNavigationState } from "../../src/context/AssessmentContext";
import type { AssessmentAnswers, BoundaryValue } from "../../src/types";
import { restoreRevisionStatus, validatePrivateRestoreState, type PrivateRestoreState, type ResultSnapshot } from "../../src/capsules/capsuleData";

export const PERSONA_HARNESS_MARKER = "KINKATLAS_E2E_PERSONA_HARNESS_V1";

const emptyAnswers = (): AssessmentAnswers => ({
  discovery: {},
  refinement: {},
  readiness: {},
  boundaries: {},
  negotiation: {},
});

const emptyNavigation = (): AssessmentNavigationState => ({
  phase: "intro",
  discoveryHistory: [],
  discoveryCursor: null,
  refinementHistory: [],
  refinementCursor: null,
  readinessIndex: 0,
  negotiationIndex: 0,
});

function hasAnswers(answers: AssessmentAnswers) {
  return Object.values(answers).some((section) => Object.keys(section).length > 0);
}

function initialAnswers(): AssessmentAnswers {
  const personaId = new URLSearchParams(window.location.search).get("__kinkatlas_e2e_persona");

  if (!personaId) return emptyAnswers();

  const persona = assessmentPersonas.find((candidate) => candidate.id === personaId);

  if (!persona) {
    throw new Error(`Unknown E2E persona: ${personaId}`);
  }

  const answers: AssessmentAnswers = {
    discovery: { ...persona.answers.discovery },
    refinement: { ...persona.answers.refinement },
    readiness: { ...persona.answers.readiness },
    boundaries: { ...persona.answers.boundaries },
    negotiation: { ...persona.answers.negotiation },
  };

  for (const question of unansweredRefinementQuestions(answers, calculateTraitScores(answers.discovery))) {
    answers.refinement[question.id] = "prefer-not";
  }

  return answers;
}

interface AssessmentContextValue {
  answers: AssessmentAnswers;
  assessmentNavigation: AssessmentNavigationState;
  updateAssessmentNavigation: Dispatch<SetStateAction<AssessmentNavigationState>>;
  assessmentCompletion: AssessmentCompletion;
  currentRoleSet: EditableRoleProfileEntry[] | null;
  setCurrentRoleSet: Dispatch<SetStateAction<EditableRoleProfileEntry[] | null>>;
  initializeCurrentRoleSet: (roles: EditableRoleProfileEntry[]) => void;
  completionRequested: boolean;
  markCompletionRequested: () => boolean;
  historicalResultSnapshot: ResultSnapshot | null;
  hydratePrivateRestoreState: (restore: PrivateRestoreState) => Promise<"full" | "historical-only">;
  hasMeaningfulSession: boolean;
  answerDiscovery: (questionId: string, answerId: string) => void;
  answerRefinement: (questionId: string, answerId: string) => void;
  answerReadiness: (questionId: string, answerId: string) => void;
  answerBoundary: (itemId: string, value: BoundaryValue) => void;
  answerNegotiation: (questionId: string, answerId: string) => void;
  removeDiscoveryAnswer: (questionId: string) => void;
  clearRefinementAnswers: () => void;
  reset: () => void;
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

document.documentElement.dataset.personaHarness = PERSONA_HARNESS_MARKER;

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<AssessmentAnswers>(initialAnswers);
  const [assessmentNavigation, updateAssessmentNavigation] = useState<AssessmentNavigationState>(emptyNavigation);
  const [currentRoleSet, setCurrentRoleSet] = useState<EditableRoleProfileEntry[] | null>(null);
  const [completionRequested, setCompletionRequested] = useState(false);
  const [historicalResultSnapshot, setHistoricalResultSnapshot] = useState<ResultSnapshot | null>(null);
  const completionRequestedRef = useRef(false);

  const assessmentCompletion = useMemo(() => getAssessmentCompletion(answers), [answers]);
  const hasMeaningfulSession = useMemo(() => hasAnswers(answers) || currentRoleSet !== null || historicalResultSnapshot !== null, [answers, currentRoleSet, historicalResultSnapshot]);

  useEffect(() => {
    if (!hasMeaningfulSession) return;

    const protectMemoryOnlySession = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };

    window.addEventListener("beforeunload", protectMemoryOnlySession);
    return () => window.removeEventListener("beforeunload", protectMemoryOnlySession);
  }, [hasMeaningfulSession]);

  const initializeCurrentRoleSet = useCallback((roles: EditableRoleProfileEntry[]) => {
    setCurrentRoleSet((current) => current ?? roles.map((role) => ({ ...role })));
  }, []);

  const markCompletionRequested = useCallback(() => {
    if (completionRequestedRef.current) return false;
    completionRequestedRef.current = true;
    setCompletionRequested(true);
    return true;
  }, []);

  const hydratePrivateRestoreState = useCallback(async (restore: PrivateRestoreState) => {
    validatePrivateRestoreState(restore);
    const mode = restoreRevisionStatus(restore);
    const snapshot = restore.resultSnapshot ? structuredClone(restore.resultSnapshot) : null;
    if (mode === "historical-only") {
      setHistoricalResultSnapshot(snapshot);
      return mode;
    }
    completionRequestedRef.current = restore.completionRequested;
    setAnswers(structuredClone(restore.answers));
    updateAssessmentNavigation(structuredClone(restore.navigation));
    setCurrentRoleSet(restore.currentRoleSet ? structuredClone(restore.currentRoleSet) : null);
    setCompletionRequested(restore.completionRequested);
    setHistoricalResultSnapshot(snapshot);
    return mode;
  }, []);

  const reset = useCallback(() => {
    completionRequestedRef.current = false;
    setAnswers(emptyAnswers());
    updateAssessmentNavigation(emptyNavigation());
    setCurrentRoleSet(null);
    setCompletionRequested(false);
    setHistoricalResultSnapshot(null);
  }, []);

  const value = useMemo<AssessmentContextValue>(
    () => ({
      answers,
      assessmentNavigation,
      updateAssessmentNavigation,
      assessmentCompletion,
      currentRoleSet,
      setCurrentRoleSet,
      initializeCurrentRoleSet,
      completionRequested,
      markCompletionRequested,
      historicalResultSnapshot,
      hydratePrivateRestoreState,
      hasMeaningfulSession,

      answerDiscovery: (questionId, answerId) =>
        setAnswers((current) => {
          const previousAnswer = current.discovery[questionId];
          const discoveryChanged = previousAnswer !== undefined && previousAnswer !== answerId;

          return {
            ...current,
            discovery: {
              ...current.discovery,
              [questionId]: answerId,
            },
            refinement: discoveryChanged ? {} : current.refinement,
          };
        }),

      answerRefinement: (questionId, answerId) =>
        setAnswers((current) => ({
          ...current,
          refinement: applyRefinementAnswer(current.refinement, questionId, answerId).refinement,
        })),

      answerReadiness: (questionId, answerId) =>
        setAnswers((current) => ({
          ...current,
          readiness: {
            ...current.readiness,
            [questionId]: answerId,
          },
        })),

      answerBoundary: (itemId, boundary) =>
        setAnswers((current) => ({
          ...current,
          boundaries: {
            ...current.boundaries,
            [itemId]: boundary,
          },
        })),

      answerNegotiation: (questionId, answerId) =>
        setAnswers((current) => ({
          ...current,
          negotiation: {
            ...current.negotiation,
            [questionId]: answerId,
          },
        })),

      removeDiscoveryAnswer: (questionId) =>
        setAnswers((current) => {
          const discovery = { ...current.discovery };

          delete discovery[questionId];

          return {
            ...current,
            discovery,
            refinement: {},
          };
        }),

      clearRefinementAnswers: () =>
        setAnswers((current) => ({
          ...current,
          refinement: {},
        })),

      reset,
    }),
    [answers, assessmentNavigation, assessmentCompletion, currentRoleSet, completionRequested, historicalResultSnapshot, hasMeaningfulSession, initializeCurrentRoleSet, markCompletionRequested, hydratePrivateRestoreState, reset],
  );

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

export function useAssessment() {
  const context = useContext(AssessmentContext);

  if (!context) {
    throw new Error("useAssessment must be used inside AssessmentProvider");
  }

  return context;
}
