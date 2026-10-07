import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AssessmentProvider } from '../context/AssessmentContext'
import { RoleProfileBuilder } from '../components/RoleProfileBuilder'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { matchRoles } from '../engine/roleMatching'
import { buildRelatedRoleProfiles } from '../engine/roleProfileExploration'
import { buildRoleProfileCandidates, optimizeRoleProfile } from '../engine/roleProfileOptimizer'
import { RoleLibraryPage } from '../pages/RoleLibraryPage'
import { RolePage } from '../pages/RolePage'

afterEach(cleanup)

function renderRole(path: string) {
  return render(<AssessmentProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="/roles/:roleId" element={<RolePage />} /></Routes></MemoryRouter></AssessmentProvider>)
}

describe('public Role Library', () => {
  it('browses, searches, filters, sorts, and progressively reveals the static library', () => {
    const { container } = render(<MemoryRouter><RoleLibraryPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Explore the language of kink.' })).toBeInTheDocument()
    expect(screen.getByText('Browse role vocabulary', { selector: '.role-library-principles span' })).toBeInTheDocument()
    expect(screen.queryByText(/812 (?:roles|terms)/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/role identity/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /^Explore / })).toHaveLength(48)
    expect(container.querySelectorAll('.role-identity-card-browse')).toHaveLength(48)
    expect(container.querySelectorAll('.role-identity-card-browse [data-emblem-key]')).toHaveLength(48)
    expect(screen.queryByText(/pilot identity/i)).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search roles' }), { target: { value: 'Primal Predator' } })
    expect(screen.getByRole('heading', { name: 'Primal Predator' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore Primal Predator' })).toHaveAttribute('href', '/roles/primal-predator')

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Family' }), { target: { value: 'rope-bondage' } })
    expect(container.querySelector('.role-library-results-heading strong')).toHaveTextContent('24 matching roles')
    fireEvent.change(screen.getByRole('combobox', { name: 'Order' }), { target: { value: 'descending' } })
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(1)
  })
})

describe('standalone role pages', () => {
  it('renders a curated pilot role with no completed assessment', () => {
    const { container } = renderRole('/roles/dominant')
    expect(screen.getByRole('heading', { level: 1, name: 'Dominant' })).toBeInTheDocument()
    expect(container.querySelector('.role-emblem')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What does this mean?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'At a glance' })).toBeInTheDocument()
    expect(container.querySelector('.role-page-attributes')).toHaveTextContent('Authority direction')
    expect(screen.queryByRole('heading', { name: 'How this relates to your answers' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Role Library' })).toHaveAttribute('href', '/roles')
  })

  it('renders a non-pilot role with its own emblem and without manufactured attributes', () => {
    const { container } = renderRole('/roles/kinkster')
    expect(screen.getByRole('heading', { level: 1, name: 'Kinkster' })).toBeInTheDocument()
    expect(container.querySelector('[data-emblem-key="kinkatlas-emblem:role:kinkster-fbb59ce7"]')).toBeInTheDocument()
    expect(screen.queryByText(/visual identity not curated/i)).not.toBeInTheDocument()
    expect(container.querySelector('.role-page-attributes')).not.toBeInTheDocument()
    expect(container.querySelector('.role-attribute-list-empty')).toBeInTheDocument()
  })

  it('shows the reviewed definition for a formerly unavailable role', () => {
    renderRole('/roles/gag-bottom')
    expect(screen.getByRole('heading', { level: 1, name: 'Gag Bottom' })).toBeInTheDocument()
    expect(screen.getAllByText(/Gag Bottom takes the receiving position in gag play/i)).toHaveLength(3)
    expect(screen.queryByText(/doesn't have a reviewed explanation for this term yet/i)).not.toBeInTheDocument()
  })

  it.each([
    ['/roles/praise-receiver', 'Praise Receiver'],
    ['/roles/objectification-roleplayer', 'Objectification Roleplayer'],
  ])('restores a read-only standalone page for scored vocabulary at %s', (path, label) => {
    renderRole(path)
    expect(screen.getByRole('heading', { level: 1, name: label })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What this vocabulary describes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Evidence from your answers' })).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('uses the reviewed relationship rationale for related vocabulary', () => {
    const expected = buildRelatedRoleProfiles(['role:dominant-4cfaa6ab'], 6)[0]
    renderRole('/roles/dominant')
    const related = screen.getByRole('heading', { name: 'Useful distinctions' }).closest('section')!
    expect(within(related).getByText((content) => content.includes(expected.reason))).toBeInTheDocument()
  })

  it('offers a safe recovery path for an invalid slug', () => {
    renderRole('/roles/not-a-real-role')
    expect(screen.getByRole('heading', { name: 'Role not found.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse Role Library' })).toHaveAttribute('href', '/roles')
  })
})

describe('Results role identity parity', () => {
  it('renders the optimizer output in the same suggested and current order', () => {
    const answers = { 'd-power-give': 'strong', 'd-position-give': 'strong', 'r-lead': 'strong', 'r-responsibility': 'strong' }
    const results = matchRoles(calculateTraitScores(answers), answers)
    const expected = optimizeRoleProfile(buildRoleProfileCandidates(results)).recommendations.map((item) => item.candidate.label)
    render(<MemoryRouter><RoleProfileBuilder roleResults={results} /></MemoryRouter>)

    const suggested = within(screen.getByRole('list', { name: 'Suggested roles' })).getAllByRole('listitem').map((item) => item.querySelector('strong')?.textContent)
    const current = within(screen.getByRole('list', { name: 'Current role set' })).getAllByRole('listitem').map((item) => item.querySelector('strong')?.textContent)
    expect(suggested).toEqual(expected)
    expect(current).toEqual(expected)
  })
})
