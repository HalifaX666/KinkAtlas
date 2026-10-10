import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildPrivateRestoreState, buildSharedDisclosurePayload } from '../capsules/capsuleData'
import * as transport from '../capsules/capsuleTransport'
import { AssessmentProvider, useAssessment } from '../context/AssessmentContext'
import { CapsulePage } from '../pages/CapsulePage'
import { RestorePage } from '../pages/RestorePage'
import { assessmentPersonas } from './fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from './helpers/assessmentPersonaRunner'

vi.mock('../capsules/capsuleCodec', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../capsules/capsuleCodec')>()
  return { ...actual, parseCapsuleEnvelope: vi.fn(() => ({ mode: 'secret' })) }
})

vi.mock('../capsules/capsuleTransport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../capsules/capsuleTransport')>()
  return {
    ...actual,
    readCapsuleFile: vi.fn(),
    decryptPrivateRestore: vi.fn(),
    parseSharedCapsuleFragment: vi.fn(),
    decryptSharedDisclosure: vi.fn(),
  }
})

const evaluation = evaluateAssessmentPersona(assessmentPersonas[0])
const restoreState = buildPrivateRestoreState({
  answers: evaluation.persona.answers,
  navigation: {
    phase: 'negotiation', discoveryHistory: [], discoveryCursor: null,
    refinementHistory: [], refinementCursor: null, readinessIndex: 1, negotiationIndex: 2,
  },
  currentRoleSet: evaluation.yourRoleSet,
  historicalResultSnapshot: null,
  completionRequested: true,
})

function ContextProbe() {
  const { answers, assessmentNavigation, answerDiscovery } = useAssessment()
  return <div><output aria-label="context answers">{Object.keys(answers.discovery).join(',')}</output><output aria-label="context phase">{assessmentNavigation.phase}</output><button type="button" onClick={() => answerDiscovery('seed-question', 'seed-answer')}>Seed current work</button></div>
}

function renderRestore() {
  return render(<MemoryRouter><AssessmentProvider><ContextProbe /><RestorePage /></AssessmentProvider></MemoryRouter>)
}

async function unlockRestorePreview() {
  const input = screen.getByLabelText('Private Restore file')
  fireEvent.change(input, { target: { files: [new File(['encrypted'], 'backup.kinkatlas-restore')] } })
  await waitFor(() => expect(transport.readCapsuleFile).toHaveBeenCalled())
  fireEvent.change(screen.getByLabelText('Restore secret'), { target: { value: 'separate-restore-secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Unlock preview' }))
  await screen.findByRole('heading', { name: 'Restore preview' })
}

describe('Private Capsule routes', () => {
  it('previews and cancels a restore without changing current in-memory work', async () => {
    vi.mocked(transport.readCapsuleFile).mockResolvedValue('validated-envelope')
    vi.mocked(transport.decryptPrivateRestore).mockResolvedValue(restoreState)
    renderRestore()
    fireEvent.click(screen.getByRole('button', { name: 'Seed current work' }))
    await unlockRestorePreview()
    expect(screen.getByRole('status', { name: 'context answers' })).toHaveTextContent('seed-question')
    expect(screen.getByRole('heading', { name: 'Restore preview' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('heading', { name: 'Restore preview' })).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'context answers' })).toHaveTextContent('seed-question')
    expect(screen.getByText(/Restore cancelled/)).toBeVisible()
  })

  it('hydrates only after explicit confirmation and leaves state untouched after invalid input', async () => {
    vi.mocked(transport.readCapsuleFile).mockResolvedValue('validated-envelope')
    vi.mocked(transport.decryptPrivateRestore).mockRejectedValueOnce(new Error('invalid')).mockResolvedValueOnce(restoreState)
    renderRestore()
    fireEvent.click(screen.getByRole('button', { name: 'Seed current work' }))

    const input = screen.getByLabelText('Private Restore file')
    fireEvent.change(input, { target: { files: [new File(['bad'], 'bad.kinkatlas-restore')] } })
    await waitFor(() => expect(transport.readCapsuleFile).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('Restore secret'), { target: { value: 'wrong-secret-value' } })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock preview' }))
    await screen.findByText(/could not be opened/)
    expect(screen.getByRole('status', { name: 'context answers' })).toHaveTextContent('seed-question')

    await unlockRestorePreview()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm restore' }))
    await waitFor(() => expect(screen.getByRole('status', { name: 'context answers' })).not.toHaveTextContent('seed-question'))
    expect(screen.getByRole('status', { name: 'context phase' })).toHaveTextContent('negotiation')
    expect(screen.getByText(/Restore complete/)).toBeVisible()
  })

  it('captures a valid fragment before removing it and renders the decrypted disclosure read-only', async () => {
    const payload = buildSharedDisclosurePayload(evaluation.yourRoleSet)
    vi.mocked(transport.parseSharedCapsuleFragment).mockReturnValue('captured-envelope')
    vi.mocked(transport.decryptSharedDisclosure).mockResolvedValue(payload)
    const replaceState = vi.spyOn(window.history, 'replaceState')
    render(<MemoryRouter initialEntries={['/capsule#capsule=encrypted-only']}><CapsulePage /></MemoryRouter>)
    await waitFor(() => expect(replaceState).toHaveBeenCalledWith(null, '', '/capsule'))
    expect(screen.getByLabelText('Encrypted Capsule text')).toHaveValue('captured-envelope')
    fireEvent.change(screen.getByLabelText('Separately shared secret'), { target: { value: 'separate-secret-value' } })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock Capsule' }))
    expect(await screen.findByRole('heading', { name: 'Shared Role Set' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Privacy receipt' })).toBeVisible()
    expect(screen.getByText(evaluation.yourRoleSet[0].label)).toBeVisible()
  })

  it('does not remove an invalid fragment before successful capture', async () => {
    vi.mocked(transport.parseSharedCapsuleFragment).mockImplementation(() => { throw new Error('bad fragment') })
    const replaceState = vi.spyOn(window.history, 'replaceState')
    render(<MemoryRouter initialEntries={['/capsule#capsule=damaged']}><CapsulePage /></MemoryRouter>)
    await screen.findByText(/could not be opened/)
    expect(replaceState).not.toHaveBeenCalled()
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
