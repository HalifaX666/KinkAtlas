import { useEffect, useRef } from 'react'
import type { Question } from '../types'

export function QuestionCard({ question, selected, onAnswer, focusPrompt = false }: { question: Question; selected?: string; onAnswer: (answerId: string) => void; focusPrompt?: boolean }) {
  const legendRef = useRef<HTMLLegendElement>(null)

  useEffect(() => {
    if (focusPrompt) legendRef.current?.focus({ preventScroll: true })
  }, [focusPrompt, question.id])

  return <fieldset className="question-card">
    <legend ref={legendRef} tabIndex={focusPrompt ? -1 : undefined}>{question.prompt}</legend>
    {question.context && <p className="question-context">{question.context}</p>}
    <div className="answer-list">
      {question.answers.map((answer, index) => <label key={answer.id} className={`answer-option ${selected === answer.id ? 'selected' : ''}`}>
        <input
          type="radio"
          name={question.id}
          value={answer.id}
          checked={selected === answer.id}
          onChange={() => {
            if (selected !== answer.id) onAnswer(answer.id)
          }}
          onClick={() => {
            if (selected === answer.id) onAnswer(answer.id)
          }}
        />
        <span className="answer-key" aria-hidden="true">{index + 1}</span><span>{answer.label}</span>
      </label>)}
    </div>
  </fieldset>
}
