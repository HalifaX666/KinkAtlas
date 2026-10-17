import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildResultSnapshot } from '../capsules/capsuleData'
import { RevisitLinkCreator } from '../components/RevisitLinkCreator'
import { useAssessment, AssessmentProvider } from '../context/AssessmentContext'
import { RevisitPage } from '../pages/RevisitPage'
import { createRevisitArtifact } from '../revisit/revisitCodec'
import { assessmentPersonas } from './fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from './helpers/assessmentPersonaRunner'

const persona = assessmentPersonas[0]
const evaluation = evaluateAssessmentPersona(persona)
const snapshot = buildResultSnapshot(persona.answers, evaluation.yourRoleSet)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
})

function SessionProbe() {
  const { hasMeaningfulSession, currentRoleSet, historicalResultSnapshot } = useAssessment()
  return <output aria-label="live assessment state">{`${hasMeaningfulSession}:${String(currentRoleSet)}:${String(historicalResultSnapshot)}`}</output>
}

describe('Revisit Link UI', () => {
  it('creates a clearly labelled bearer link and provides manual copy fallback', async () => {
    const createSnapshot = () => snapshot
    render(<RevisitLinkCreator createSnapshot={createSnapshot} available />)

    expect(screen.getByText(/Anyone with the complete link can view/)).toBeVisible()
    expect(screen.getByText(/not encrypted/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Create revisit link' }))
    const output = await screen.findByLabelText('Revisit link')
    expect((output as HTMLTextAreaElement).value).toMatch(/\/revisit#r=v1\.lzss\./)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Save or bookmark this link' })).toHaveFocus())

    fireEvent.click(screen.getByRole('button', { name: 'Copy revisit link' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/select the complete Revisit link manually/i)
  })

  it('opens a historical revision read-only without hydrating AssessmentContext', async () => {
    const historical = structuredClone(snapshot)
    historical.engineRevision = 'old-engine-revision'
    historical.roleLibraryRevision = 'old-role-library-revision'
    const artifact = await createRevisitArtifact(historical, 'https://example.test')

    render(<MemoryRouter initialEntries={[`/revisit${artifact.fragment}`]}><AssessmentProvider><SessionProbe /><RevisitPage /></AssessmentProvider></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Your saved KinkAtlas result' })).toBeVisible()
    expect(screen.getByText('old-engine-revision')).toBeVisible()
    expect(screen.getByText('old-role-library-revision')).toBeVisible()
    expect(screen.getByLabelText('live assessment state')).toHaveTextContent('false:null:null')
    expect(screen.queryByRole('button', { name: /continue|restore|resume/i })).not.toBeInTheDocument()
  })

  it('shows a safe focused error without parser details for malformed input', async () => {
    render(<MemoryRouter initialEntries={['/revisit#r=v1.lzss.damaged']}><AssessmentProvider><RevisitPage /></AssessmentProvider></MemoryRouter>)
    const heading = await screen.findByRole('heading', { name: 'Revisit link could not be opened' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(screen.getByText(/incomplete or damaged/)).toBeVisible()
    expect(document.body).not.toHaveTextContent(/SyntaxError|DecompressionStream|stack/i)
  })
})
