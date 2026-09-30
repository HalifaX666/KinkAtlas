import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssessmentProvider, useAssessment } from '../context/AssessmentContext'

function Probe() {
  const { answers, answerDiscovery, assessmentNavigation, updateAssessmentNavigation, currentRoleSet, setCurrentRoleSet, completionRequested, markCompletionRequested, reset } = useAssessment()
  const [acceptedCompletionAttempts, setAcceptedCompletionAttempts] = useState(0)
  return <div>
    <output aria-label="answer count">{Object.keys(answers.discovery).length}</output>
    <output aria-label="role-set state">{currentRoleSet === null ? 'uninitialized' : `${currentRoleSet.length} roles`}</output>
    <output aria-label="completion requested">{completionRequested ? 'yes' : 'no'}</output>
    <output aria-label="assessment phase">{assessmentNavigation.phase}</output>
    <output aria-label="accepted completion attempts">{acceptedCompletionAttempts}</output>
    <button onClick={() => answerDiscovery('d-power-give', 'strong')}>Answer</button>
    <button onClick={() => setCurrentRoleSet([])}>Keep no roles</button>
    <button onClick={() => updateAssessmentNavigation((current) => ({ ...current, phase: 'refinement', refinementHistory: ['seed-question'], refinementCursor: 0 }))}>Seed navigation</button>
    <button onClick={() => { if (markCompletionRequested()) setAcceptedCompletionAttempts((count) => count + 1) }}>Count completion</button>
    <button onClick={reset}>Reset</button>
  </div>
}

describe('privacy defaults', () => {
  it('keeps answers in provider memory and resets on a fresh mount', () => {
    localStorage.clear()
    sessionStorage.clear()
    const storageSetItem = vi.spyOn(Storage.prototype, 'setItem')
    const indexedDbOpen = globalThis.indexedDB ? vi.spyOn(globalThis.indexedDB, 'open') : undefined
    const first = render(<AssessmentProvider><Probe /></AssessmentProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))
    expect(screen.getByRole('status', { name: 'answer count' })).toHaveTextContent('1')
    expect(localStorage).toHaveLength(0)
    expect(sessionStorage).toHaveLength(0)
    expect(storageSetItem).not.toHaveBeenCalled()
    if (indexedDbOpen) expect(indexedDbOpen).not.toHaveBeenCalled()
    first.unmount()
    render(<AssessmentProvider><Probe /></AssessmentProvider>)
    expect(screen.getByRole('status', { name: 'answer count' })).toHaveTextContent('0')
    expect(screen.getByRole('status', { name: 'role-set state' })).toHaveTextContent('uninitialized')
  })

  it('protects meaningful memory-only work from unload and removes protection after reset or unmount', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const view = render(<AssessmentProvider><Probe /></AssessmentProvider>)
    expect(addEventListener.mock.calls.filter(([type]) => type === 'beforeunload')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))
    const firstBeforeUnloadHandler = addEventListener.mock.calls.find(([type]) => type === 'beforeunload')?.[1] as EventListener
    expect(firstBeforeUnloadHandler).toBeTypeOf('function')
    const answeredEvent = new Event('beforeunload', { cancelable: true })
    firstBeforeUnloadHandler(answeredEvent)
    expect(answeredEvent.defaultPrevented).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(removeEventListener).toHaveBeenCalledWith('beforeunload', firstBeforeUnloadHandler)

    fireEvent.click(screen.getByRole('button', { name: 'Keep no roles' }))
    expect(screen.getByRole('status', { name: 'role-set state' })).toHaveTextContent('0 roles')
    expect(addEventListener.mock.calls.filter(([type]) => type === 'beforeunload')).toHaveLength(2)

    view.unmount()
    expect(removeEventListener.mock.calls.filter(([type]) => type === 'beforeunload')).toHaveLength(2)
  })

  it('deduplicates completion attempts until a whole-session reset starts a new assessment', () => {
    render(<AssessmentProvider><Probe /></AssessmentProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Count completion' }))
    fireEvent.click(screen.getByRole('button', { name: 'Count completion' }))
    expect(screen.getByRole('status', { name: 'accepted completion attempts' })).toHaveTextContent('1')
    expect(screen.getByRole('status', { name: 'completion requested' })).toHaveTextContent('yes')

    fireEvent.click(screen.getByRole('button', { name: 'Keep no roles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Seed navigation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('status', { name: 'role-set state' })).toHaveTextContent('uninitialized')
    expect(screen.getByRole('status', { name: 'completion requested' })).toHaveTextContent('no')
    expect(screen.getByRole('status', { name: 'answer count' })).toHaveTextContent('0')
    expect(screen.getByRole('status', { name: 'assessment phase' })).toHaveTextContent('intro')

    fireEvent.click(screen.getByRole('button', { name: 'Count completion' }))
    expect(screen.getByRole('status', { name: 'accepted completion attempts' })).toHaveTextContent('2')
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
