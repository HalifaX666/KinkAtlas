import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ResultsSummary } from '../components/ResultsSummary'
import { RoleCard } from '../components/RoleCard'
import { RoleSetIdentityGallery } from '../components/RoleSetIdentityGallery'
import { ShareResultsDialog } from '../components/ShareResultsDialog'
import { buildSuggestedRoleProfileEntries, type RoleProfileOptimization } from '../engine/roleProfileOptimizer'
import { assessmentPersonas } from './fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from './helpers/assessmentPersonaRunner'

function evaluation() {
  return evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === 'balanced-authority-pattern')!)
}

function topTraits() {
  return Object.entries(evaluation().traitScores)
    .sort(([, left], [, right]) => (right?.value ?? 0) - (left?.value ?? 0))
    .slice(0, 10)
}

function renderSummary(optimization: RoleProfileOptimization, roleSet = evaluation().suggestedRoleSet) {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ResultsSummary
      suggestedRoleSet={roleSet}
      optimization={optimization}
      roleResults={evaluation().roleResults}
      topTraits={topTraits()}
      onOpenFullReflection={vi.fn()}
    />
  </MemoryRouter>)
}

describe('Results information architecture', () => {
  it('uses the same production suggestion builder outputs for every deterministic persona', () => {
    for (const persona of assessmentPersonas) {
      const result = evaluateAssessmentPersona(persona)
      expect(buildSuggestedRoleProfileEntries(result.roleResults, persona.answers.refinement, persona.answers.discovery), persona.id).toEqual(result.suggestedRoleSet)
    }
  })

  it('leads with a grounded overview and preserves the exact suggested order and primary', () => {
    const result = evaluation()
    renderSummary(result.roleProfile)

    expect(screen.getByRole('heading', { name: 'What your answers suggest' })).toBeInTheDocument()
    expect(screen.getByText(/not certainty about your identity/i)).toBeInTheDocument()
    const suggestions = within(screen.getByRole('list', { name: 'Suggested Role Set' })).getAllByRole('listitem')
    expect(suggestions.map((item) => within(item).getByRole('heading').textContent)).toEqual(result.suggestedRoleSet.map((entry) => entry.label))
    expect(within(suggestions[0]).getByText('Suggested primary')).toBeInTheDocument()
    expect(screen.getByText(/you decide whether any label is useful/i)).toBeInTheDocument()
  })

  it('uses respectful presentation-only states for zero, one, and no-primary suggestions', () => {
    renderSummary({ recommendations: [], alternates: [] }, [])
    expect(screen.getByRole('heading', { name: 'No specific role suggestion yet' })).toBeInTheDocument()
    expect(screen.getByText(/valid result—not a failed assessment/i)).toBeInTheDocument()
    cleanup()

    const result = evaluation()
    const recommendation = result.roleProfile.recommendations[0]
    const oneRole = [result.suggestedRoleSet[0]]
    renderSummary({ recommendations: [recommendation], primary: recommendation, primaryExplanation: result.roleProfile.primaryExplanation, alternates: [] }, oneRole)
    expect(screen.getByText(/one role suggestion to explore/i)).toBeInTheDocument()
    expect(screen.getByText('Suggested primary')).toBeInTheDocument()
    cleanup()

    renderSummary({ recommendations: [recommendation], alternates: [] }, oneRole)
    expect(screen.queryByText('Suggested primary')).not.toBeInTheDocument()
    expect(screen.getByText(/did not identify a defensible suggested primary/i)).toBeInTheDocument()
  })

  it('keeps edited and empty personal sets distinct from the assessment suggestion', () => {
    const result = evaluation()
    const manual = [{ ...result.suggestedRoleSet[0], source: 'user-selected' as const }]
    const { rerender } = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><RoleSetIdentityGallery roleSet={manual} roleResults={result.roleResults} isEdited /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Your Role Set' })).toBeInTheDocument()
    expect(screen.getByText(/differs from the assessment suggestion/i)).toBeInTheDocument()
    expect(screen.getByText('No assessment score or confidence')).toBeInTheDocument()

    rerender(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><RoleSetIdentityGallery roleSet={[]} roleResults={result.roleResults} isEdited /></MemoryRouter>)
    expect(screen.getByText(/empty.*valid personal choice/i)).toBeInTheDocument()
    expect(screen.getByText(/original Suggested Role Set remains visible/i)).toBeInTheDocument()
  })

  it('explains confidence as evidence quantity inside Role Discovery details', () => {
    const result = evaluation()
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><RoleCard result={result.roleResults[0]} /></MemoryRouter>)
    expect(screen.getByText(/What .* confidence means/i)).toBeInTheDocument()
    expect(screen.getByText(/evidence|answers|information/i, { selector: '.role-confidence-explanation p' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Explore role meaning and distinctions/i })).toBeInTheDocument()
  })

  it('can open the existing share dialog directly at Full Reflection without changing its content contract', () => {
    const result = evaluation()
    render(<ShareResultsDialog data={result.shareData} initialMode="full" onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Full Reflection' })).toBeInTheDocument()
    expect(screen.getByText('This can include sensitive information. Review it before sending.')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Share and export options')).getByRole('button', { name: /Full Reflection/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Raw assessment answers are not/i)).toBeInTheDocument()
  })
})

afterEach(() => cleanup())
