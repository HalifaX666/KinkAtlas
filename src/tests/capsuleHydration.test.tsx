import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { buildPrivateRestoreState } from '../capsules/capsuleData'
import { AssessmentProvider, useAssessment } from '../context/AssessmentContext'
import { assessmentPersonas } from './fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from './helpers/assessmentPersonaRunner'

const evaluation = evaluateAssessmentPersona(assessmentPersonas[0])
const restored = buildPrivateRestoreState({
  answers: evaluation.persona.answers,
  navigation: {
    phase: 'negotiation',
    discoveryHistory: [Object.keys(evaluation.persona.answers.discovery)[0]],
    discoveryCursor: 0,
    refinementHistory: [],
    refinementCursor: null,
    readinessIndex: 2,
    negotiationIndex: 3,
  },
  currentRoleSet: evaluation.yourRoleSet,
  historicalResultSnapshot: null,
  completionRequested: true,
})

function HydrationProbe() {
  const {
    answers,
    answerDiscovery,
    assessmentNavigation,
    currentRoleSet,
    completionRequested,
    historicalResultSnapshot,
    hydratePrivateRestoreState,
  } = useAssessment()
  return <div>
    <output aria-label="discovery answers">{Object.keys(answers.discovery).join(',')}</output>
    <output aria-label="phase">{assessmentNavigation.phase}</output>
    <output aria-label="roles">{currentRoleSet?.map((role) => role.label).join(',') ?? 'none'}</output>
    <output aria-label="completion">{completionRequested ? 'yes' : 'no'}</output>
    <output aria-label="historical">{historicalResultSnapshot ? 'yes' : 'no'}</output>
    <button type="button" onClick={() => answerDiscovery('seed-question', 'seed-answer')}>Seed</button>
    <button type="button" onClick={() => void hydratePrivateRestoreState(restored)}>Restore compatible</button>
    <button type="button" onClick={() => {
      void hydratePrivateRestoreState({ ...restored, answers: { ...restored.answers, discovery: null } } as never).catch(() => { /* Expected validation failure. */ })
    }}>Restore invalid</button>
    <button type="button" onClick={() => void hydratePrivateRestoreState({ ...restored, engineRevision: 'older-engine' })}>Restore historical</button>
  </div>
}

describe('AssessmentContext Capsule hydration', () => {
  it('atomically replaces compatible in-memory state through the constrained restore API', async () => {
    render(<AssessmentProvider><HydrationProbe /></AssessmentProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Seed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore compatible' }))
    await waitFor(() => expect(screen.getByRole('status', { name: 'discovery answers' })).not.toHaveTextContent('seed-question'))
    expect(screen.getByRole('status', { name: 'phase' })).toHaveTextContent('negotiation')
    expect(screen.getByRole('status', { name: 'roles' })).toHaveTextContent(restored.currentRoleSet![0].label)
    expect(screen.getByRole('status', { name: 'completion' })).toHaveTextContent('yes')
    expect(screen.getByRole('status', { name: 'historical' })).toHaveTextContent('yes')
  })

  it('does not partially mutate state after invalid input', async () => {
    render(<AssessmentProvider><HydrationProbe /></AssessmentProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Seed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore invalid' }))
    await waitFor(() => expect(screen.getByRole('status', { name: 'discovery answers' })).toHaveTextContent('seed-question'))
    expect(screen.getByRole('status', { name: 'phase' })).toHaveTextContent('intro')
    expect(screen.getByRole('status', { name: 'roles' })).toHaveTextContent('none')
  })

  it('preserves current assessment state and exposes only the historical snapshot on revision mismatch', async () => {
    render(<AssessmentProvider><HydrationProbe /></AssessmentProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Seed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore historical' }))
    expect(screen.getByRole('status', { name: 'discovery answers' })).toHaveTextContent('seed-question')
    expect(screen.getByRole('status', { name: 'phase' })).toHaveTextContent('intro')
    await waitFor(() => expect(screen.getByRole('status', { name: 'historical' })).toHaveTextContent('yes'))
  })
})

afterEach(cleanup)
