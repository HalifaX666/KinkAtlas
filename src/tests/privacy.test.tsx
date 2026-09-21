import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AssessmentProvider, useAssessment } from '../context/AssessmentContext'

function Probe() {
  const { answers, answerDiscovery } = useAssessment()
  return <button onClick={() => answerDiscovery('d-power-give', 'strong')}>{Object.keys(answers.discovery).length}</button>
}

describe('privacy defaults', () => {
  it('keeps answers in provider memory and resets on a fresh mount', () => {
    localStorage.clear()
    sessionStorage.clear()
    const first = render(<AssessmentProvider><Probe /></AssessmentProvider>)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('1')
    expect(localStorage).toHaveLength(0)
    expect(sessionStorage).toHaveLength(0)
    first.unmount()
    render(<AssessmentProvider><Probe /></AssessmentProvider>)
    expect(screen.getByRole('button')).toHaveTextContent('0')
  })
})
