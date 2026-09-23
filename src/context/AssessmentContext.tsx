import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { applyRefinementAnswer } from "../engine/refinementRouting";
import type { AssessmentAnswers, BoundaryValue } from "../types";

const emptyAnswers = (): AssessmentAnswers => ({
  discovery: {},
  refinement: {},
  readiness: {},
  boundaries: {},
  negotiation: {},
});

interface AssessmentContextValue {
  answers: AssessmentAnswers;
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

  const value = useMemo<AssessmentContextValue>(
    () => ({
      answers,

      /*
       * Refinement evidence depends on Discovery evidence.
       *
       * If an already-answered Discovery question changes, all refinement
       * answers are invalidated. This prevents subtype conclusions from
       * surviving after their parent evidence has changed.
       *
       * Re-selecting the same Discovery answer does not clear refinement.
       */
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

      /*
       * Removing a Discovery answer can invalidate which refinement branch
       * should exist, so refinement is cleared at the same time.
       */
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

      reset: () => setAnswers(emptyAnswers()),
    }),
    [answers],
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
