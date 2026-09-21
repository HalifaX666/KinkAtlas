import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AssessmentAnswers, BoundaryValue } from '../types'

const emptyAnswers = (): AssessmentAnswers => ({ discovery: {}, readiness: {}, boundaries: {}, negotiation: {} })

interface AssessmentContextValue {
  answers: AssessmentAnswers
  answerDiscovery: (questionId: string, answerId: string) => void
  answerReadiness: (questionId: string, answerId: string) => void
  answerBoundary: (itemId: string, value: BoundaryValue) => void
  answerNegotiation: (questionId: string, answerId: string) => void
  removeDiscoveryAnswer: (questionId: string) => void
  reset: () => void
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null)

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<AssessmentAnswers>(emptyAnswers)
  const value = useMemo<AssessmentContextValue>(() => ({
    answers,
    answerDiscovery: (questionId, answerId) => setAnswers((current) => ({ ...current, discovery: { ...current.discovery, [questionId]: answerId } })),
    answerReadiness: (questionId, answerId) => setAnswers((current) => ({ ...current, readiness: { ...current.readiness, [questionId]: answerId } })),
    answerBoundary: (itemId, boundary) => setAnswers((current) => ({ ...current, boundaries: { ...current.boundaries, [itemId]: boundary } })),
    answerNegotiation: (questionId, answerId) => setAnswers((current) => ({ ...current, negotiation: { ...current.negotiation, [questionId]: answerId } })),
    removeDiscoveryAnswer: (questionId) => setAnswers((current) => {
      const discovery = { ...current.discovery }
      delete discovery[questionId]
      return { ...current, discovery }
    }),
    reset: () => setAnswers(emptyAnswers()),
  }), [answers])
  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>
}

export function useAssessment() {
  const context = useContext(AssessmentContext)
  if (!context) throw new Error('useAssessment must be used inside AssessmentProvider')
  return context
}
