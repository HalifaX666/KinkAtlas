import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { getAssessmentCompletion, type AssessmentCompletion } from "../engine/assessmentCompletion";
import { applyRefinementAnswer } from "../engine/refinementRouting";
import type { EditableRoleProfileEntry } from "../engine/roleProfileOptimizer";
import type { AssessmentAnswers, BoundaryValue } from "../types";

export type AssessmentPhase = "intro" | "discovery" | "refinement" | "readiness" | "boundaries" | "negotiation";

export interface AssessmentNavigationState {
  phase: AssessmentPhase;
  discoveryHistory: string[];
  discoveryCursor: number | null;
  refinementHistory: string[];
  refinementCursor: number | null;
  readinessIndex: number;
  negotiationIndex: number;
}

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

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<AssessmentAnswers>(emptyAnswers);
  const [assessmentNavigation, updateAssessmentNavigation] = useState<AssessmentNavigationState>(emptyNavigation);
  const [currentRoleSet, setCurrentRoleSet] = useState<EditableRoleProfileEntry[] | null>(null);
  const [completionRequested, setCompletionRequested] = useState(false);
  const completionRequestedRef = useRef(false);

  const assessmentCompletion = useMemo(() => getAssessmentCompletion(answers), [answers]);
  const hasMeaningfulSession = useMemo(() => hasAnswers(answers) || currentRoleSet !== null, [answers, currentRoleSet]);

  useEffect(() => {
    if (!hasMeaningfulSession) return;

    const protectMemoryOnlySession = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };

    window.addEventListener("beforeunload", protectMemoryOnlySession);
    return () => window.removeEventListener("beforeunload", protectMemoryOnlySession);
  }, [hasMeaningfulSession]);

  const answerDiscovery = useCallback((questionId: string, answerId: string) => {
    setAnswers((current) => {
      const previousAnswer = current.discovery[questionId];
      const discoveryChanged = previousAnswer !== undefined && previousAnswer !== answerId;

      return {
        ...current,
        discovery: { ...current.discovery, [questionId]: answerId },
        refinement: discoveryChanged ? {} : current.refinement,
      };
    });
  }, []);

  const answerRefinement = useCallback((questionId: string, answerId: string) => {
    setAnswers((current) => ({
      ...current,
      refinement: applyRefinementAnswer(current.refinement, questionId, answerId).refinement,
    }));
  }, []);

  const answerReadiness = useCallback((questionId: string, answerId: string) => {
    setAnswers((current) => ({ ...current, readiness: { ...current.readiness, [questionId]: answerId } }));
  }, []);

  const answerBoundary = useCallback((itemId: string, boundary: BoundaryValue) => {
    setAnswers((current) => ({ ...current, boundaries: { ...current.boundaries, [itemId]: boundary } }));
  }, []);

  const answerNegotiation = useCallback((questionId: string, answerId: string) => {
    setAnswers((current) => ({ ...current, negotiation: { ...current.negotiation, [questionId]: answerId } }));
  }, []);

  const removeDiscoveryAnswer = useCallback((questionId: string) => {
    setAnswers((current) => {
      const discovery = { ...current.discovery };
      delete discovery[questionId];
      return { ...current, discovery, refinement: {} };
    });
  }, []);

  const clearRefinementAnswers = useCallback(() => {
    setAnswers((current) => ({ ...current, refinement: {} }));
  }, []);

  const initializeCurrentRoleSet = useCallback((roles: EditableRoleProfileEntry[]) => {
    setCurrentRoleSet((current) => current ?? roles.map((role) => ({ ...role })));
  }, []);

  const markCompletionRequested = useCallback(() => {
    if (completionRequestedRef.current) return false;
    completionRequestedRef.current = true;
    setCompletionRequested(true);
    return true;
  }, []);

  const reset = useCallback(() => {
    completionRequestedRef.current = false;
    setAnswers(emptyAnswers());
    updateAssessmentNavigation(emptyNavigation());
    setCurrentRoleSet(null);
    setCompletionRequested(false);
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
      hasMeaningfulSession,
      answerDiscovery,
      answerRefinement,
      answerReadiness,
      answerBoundary,
      answerNegotiation,
      removeDiscoveryAnswer,
      clearRefinementAnswers,
      reset,
    }),
    [answers, assessmentNavigation, assessmentCompletion, currentRoleSet, completionRequested, hasMeaningfulSession, answerDiscovery, answerRefinement, answerReadiness, answerBoundary, answerNegotiation, removeDiscoveryAnswer, clearRefinementAnswers, initializeCurrentRoleSet, markCompletionRequested, reset],
  );

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

export function useAssessment() {
  const context = useContext(AssessmentContext);
  if (!context) throw new Error("useAssessment must be used inside AssessmentProvider");
  return context;
}
