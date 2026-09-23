import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RoleProfileBuilder } from '../components/RoleProfileBuilder'
import { ShareResultsDialog } from '../components/ShareResultsDialog'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { evaluateReadiness } from '../engine/readinessScoring'
import { matchRoles } from '../engine/roleMatching'
import { buildRelatedRoleProfiles } from '../engine/roleProfileExploration'
import { buildEditableRoleProfileEntries, buildRoleProfileCandidates, optimizeRoleProfile, type EditableRoleProfileEntry } from '../engine/roleProfileOptimizer'
import { getShareableRoleSet, roleCardFileName, type ShareResultsData } from '../engine/shareResults'
import { roleLibrary } from '../taxonomy/roleLibrary'

const answers = { 'd-power-give': 'strong', 'd-position-give': 'strong', 'r-lead': 'strong', 'r-responsibility': 'strong' }
const roleResults = matchRoles(calculateTraitScores(answers), answers)
const initialRoleSet: EditableRoleProfileEntry[] = roleResults.filter((result) => result.alignment !== 'insufficient').slice(0, 5).map((result) => ({
  roleId: result.role.id,
  label: result.role.name,
  source: 'recommended',
  definition: result.role.description,
  assessmentRoleId: result.role.id,
}))
const data: ShareResultsData = {
  roleResults,
  roleSet: initialRoleSet,
  readiness: evaluateReadiness({ 'c-ongoing-1': 'c' }),
  boundaries: { power: 'love' },
  negotiation: { 'n-planning': 'p1' },
}
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

function mockImageExport(downloads?: string[]) {
  const gradient = { addColorStop: vi.fn() }
  const context = {
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '',
    fillRect: vi.fn(), createRadialGradient: vi.fn(() => gradient), beginPath: vi.fn(), arc: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['local image'], { type: 'image/png' })))
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:local-card') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads?.push(this.download)
  })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL })
  vi.unstubAllGlobals()
})

function RoleSetSharingHarness({ suggestedRoleSet }: { suggestedRoleSet: EditableRoleProfileEntry[] }) {
  const [roleSet, setRoleSet] = useState(suggestedRoleSet)
  return <>
    <RoleProfileBuilder roleResults={roleResults} onRoleSetChange={setRoleSet} />
    <ShareResultsDialog data={{ ...data, roleSet }} onClose={vi.fn()} />
  </>
}

function shareRoleLabels() {
  return within(screen.getByRole('group', { name: 'Roles to export' })).getAllByRole('checkbox').map((choice) => (
    choice.closest('label')?.querySelectorAll('strong').item(1).textContent
  ))
}

function roleListLabels(name: string) {
  return within(screen.getByRole('list', { name })).getAllByRole('listitem').map((item) => item.querySelector('strong')?.textContent)
}

describe('Export & Share dialog', () => {
  it('explains the suggested-to-editable role-set journey', () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)

    expect(screen.getByRole('heading', { name: 'Your role set is ready' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Suggested role set' })).toBeInTheDocument()
    expect(screen.getByText(/make it yours: reorder, replace, remove, or add roles/i)).toBeInTheDocument()
    expect(screen.getByText(/shareable cards always use this current set/i)).toBeInTheDocument()
    const explanation = screen.getByText(/KinkAtlas favors meaningful evidence/i)
    expect(explanation).toHaveTextContent(/avoiding a set of near-duplicates/i)
    expect(explanation).toHaveTextContent(/five is a maximum, not a target/i)
  })

  it('makes a role primary, preserves the Suggested Role Set, and restores exact initial state', () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)
    const suggested = roleListLabels('Suggested roles')
    const chosen = suggested[2]!

    expect(screen.queryByRole('button', { name: 'Restore suggested set' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `Make ${chosen} primary` }))

    expect(roleListLabels('Current role set')).toEqual([chosen, ...suggested.slice(0, 2), ...suggested.slice(3)])
    expect(roleListLabels('Suggested roles')).toEqual(suggested)
    expect(screen.getByRole('status')).toHaveTextContent(`${chosen} is now primary in your role set.`)
    expect(screen.queryByRole('button', { name: `Make ${chosen} primary` })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: `Replace ${suggested[0]}` }))
    expect(screen.getByRole('group', { name: 'Replacement mode' })).toHaveTextContent(`Choose a role to replace ${suggested[0]}.`)
    fireEvent.click(screen.getByRole('button', { name: 'Restore suggested set' }))

    expect(roleListLabels('Current role set')).toEqual(suggested)
    expect(screen.queryByRole('group', { name: 'Replacement mode' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Suggested role set restored.')
    expect(screen.queryByRole('button', { name: 'Restore suggested set' })).not.toBeInTheDocument()
  })

  it('allows replacement cancellation without changing the current role set', () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)
    const before = roleListLabels('Current role set')

    fireEvent.click(screen.getByRole('button', { name: `Replace ${before[0]}` }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel replacement' }))

    expect(roleListLabels('Current role set')).toEqual(before)
    expect(screen.queryByRole('group', { name: 'Replacement mode' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Replacement cancelled.')
  })

  it('cancels replacement mode when its target role is removed', () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)
    const target = roleListLabels('Current role set')[0]!

    fireEvent.click(screen.getByRole('button', { name: `Replace ${target}` }))
    fireEvent.click(screen.getByRole('button', { name: `Remove ${target}` }))

    expect(screen.queryByRole('group', { name: 'Replacement mode' })).not.toBeInTheDocument()
    expect(roleListLabels('Current role set')).not.toContain(target)
  })

  it('restores the Suggested Role Set after the editable set reaches zero roles', () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)
    const suggested = roleListLabels('Suggested roles')

    suggested.forEach((label) => fireEvent.click(screen.getByRole('button', { name: `Remove ${label}` })))

    expect(screen.queryByRole('list', { name: 'Current role set' })).not.toBeInTheDocument()
    expect(screen.getByText(/no roles selected/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restore suggested set' }))
    expect(roleListLabels('Current role set')).toEqual(suggested)
  })

  it('derives related-role exploration from the current edited set', async () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)
    const suggested = roleListLabels('Current role set')
    suggested.forEach((label) => fireEvent.click(screen.getByRole('button', { name: `Remove ${label}` })))

    const relatedRegion = screen.getByRole('region', { name: 'Explore related roles' })
    expect(relatedRegion).toHaveTextContent('No relationship-reviewed nearby roles are available for the current role set.')

    const seed = roleLibrary.roles.find((role) => buildRelatedRoleProfiles([role.id]).length > 0)!
    const expectedRelated = buildRelatedRoleProfiles([seed.id]).map((role) => role.label)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search roles' }), { target: { value: seed.label } })
    fireEvent.click(await screen.findByRole('button', { name: `Add ${seed.label}` }))

    const displayedRelated = within(relatedRegion).getAllByRole('listitem').map((item) => item.querySelector('strong')?.textContent)
    expect(displayedRelated).toEqual(expectedRelated)
    expect(displayedRelated).not.toContain(seed.label)
    expect(screen.getByText(`${seed.label} added by you.`)).toBeInTheDocument()
  })

  it('starts with every role in the current role set selected and labelled', () => {
    render(<ShareResultsDialog data={data} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: /role cards/i })).toHaveAttribute('aria-pressed', 'true')
    const roleChoices = within(screen.getByRole('group', { name: 'Roles to export' })).getAllByRole('checkbox')
    expect(roleChoices).toHaveLength(5)
    roleChoices.forEach((choice) => expect(choice).toBeChecked())
    expect(screen.getByText('5 of 5 roles selected')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /include confidence on overview card/i })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Export 5 cards' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Share 5 cards' })).toBeEnabled()
  })

  it('offers FetLife only as an optional manual sharing destination', () => {
    render(<ShareResultsDialog data={data} onClose={vi.fn()} />)

    expect(screen.getByText(/manually post to FetLife/i)).toBeInTheDocument()
    expect(screen.getByText(/never connects to or posts to a FetLife profile/i)).toBeInTheDocument()
    expect(screen.queryByText(/reads.*FetLife profile/i)).not.toBeInTheDocument()
  })

  it('starts from Suggested Role Set rather than independently taking the first five discovery results', () => {
    const optimization = optimizeRoleProfile(buildRoleProfileCandidates(roleResults))
    const suggestedRoleSet = buildEditableRoleProfileEntries(optimization)
    const suggestedLabels = suggestedRoleSet.map((role) => role.label)
    const discoveryLabels = roleResults.filter((result) => result.alignment !== 'insufficient').slice(0, 5).map((result) => result.role.name)

    expect(suggestedLabels.length).toBeGreaterThan(0)
    expect(suggestedLabels).not.toEqual(discoveryLabels)
    render(<ShareResultsDialog data={{ ...data, roleSet: suggestedRoleSet }} onClose={vi.fn()} />)

    expect(shareRoleLabels()).toEqual(suggestedLabels)
    expect(getShareableRoleSet(suggestedRoleSet, roleResults).map((role) => role.name)).toEqual(suggestedLabels)
    expect(roleResults.map((result) => result.role.name)).toEqual(matchRoles(calculateTraitScores(answers), answers).map((result) => result.role.name))
  })

  it('keeps replacement, order, removal, and manual additions synchronized with exported role cards', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const downloads: string[] = []
    mockImageExport(downloads)
    const suggestedRoleSet = buildEditableRoleProfileEntries(optimizeRoleProfile(buildRoleProfileCandidates(roleResults)))
    const initialLabels = suggestedRoleSet.map((role) => role.label)
    const replacement = roleLibrary.roles.find((role) => role.label === 'Fetishist')!
    const added = roleLibrary.roles.find((role) => role.label === 'Kinkster')!
    render(<RoleSetSharingHarness suggestedRoleSet={suggestedRoleSet} />)

    expect(shareRoleLabels()).toEqual(initialLabels)

    fireEvent.click(screen.getByRole('button', { name: `Replace ${initialLabels[0]}` }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search roles' }), { target: { value: replacement.label } })
    fireEvent.click(await screen.findByRole('button', { name: `Replace with ${replacement.label}` }))
    let expectedLabels = [replacement.label, ...initialLabels.slice(1)]
    await waitFor(() => expect(shareRoleLabels()).toEqual(expectedLabels))

    fireEvent.click(screen.getByRole('button', { name: `Move ${replacement.label} down` }))
    expectedLabels = [expectedLabels[1], expectedLabels[0], ...expectedLabels.slice(2)]
    await waitFor(() => expect(shareRoleLabels()).toEqual(expectedLabels))

    const removedLabel = expectedLabels[expectedLabels.length - 1]
    fireEvent.click(screen.getByRole('button', { name: `Remove ${removedLabel}` }))
    expectedLabels = expectedLabels.slice(0, -1)
    await waitFor(() => expect(shareRoleLabels()).toEqual(expectedLabels))

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search roles' }), { target: { value: added.label } })
    fireEvent.click(await screen.findByRole('button', { name: `Add ${added.label}` }))
    expectedLabels = [...expectedLabels, added.label]
    await waitFor(() => expect(shareRoleLabels()).toEqual(expectedLabels))

    const manualChoice = within(screen.getByRole('group', { name: 'Roles to export' })).getByRole('checkbox', { name: new RegExp(added.label, 'i') })
    expect(manualChoice.closest('label')).toHaveTextContent('Added by you')
    expect(manualChoice.closest('label')).toHaveTextContent('No assessment score or confidence')

    fireEvent.click(screen.getByRole('button', { name: `Export ${expectedLabels.length} cards` }))
    await waitFor(() => expect(downloads).toHaveLength(expectedLabels.length))
    expect(downloads).toEqual(expectedLabels.map((name) => roleCardFileName({ name })))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('supports clear all, individual selection, and select all', () => {
    render(<ShareResultsDialog data={data} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(screen.getByText('0 of 5 roles selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export 0 cards' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Share 0 cards' })).toBeDisabled()

    fireEvent.click(within(screen.getByRole('group', { name: 'Roles to export' })).getAllByRole('checkbox')[0])
    expect(screen.getByText('1 of 5 roles selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export card' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Share card' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Select all' }))
    expect(screen.getByText('5 of 5 roles selected')).toBeInTheDocument()
  })

  it('keeps Quick Summary role-only and copies it with explicit feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const { container } = render(<ShareResultsDialog data={data} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /quick summary/i }))
    const preview = container.querySelector('.share-preview pre')!
    expect(preview).not.toHaveTextContent('Readiness reflection')
    expect(preview).not.toHaveTextContent('Wants & boundaries')
    expect(preview).not.toHaveTextContent('Negotiation preferences')
    fireEvent.click(screen.getByRole('button', { name: 'Copy Quick Summary' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    expect(screen.getByRole('status')).toHaveTextContent('Summary copied.')
  })

  it('keeps sensitive Full Reflection options off until selected', () => {
    const { container } = render(<ShareResultsDialog data={data} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /full reflection/i }))

    expect(screen.getByRole('checkbox', { name: /your role set/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /alignment labels/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /^confidence/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /^reflection/i })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /potential blind spots/i })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /wants & boundaries/i })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /negotiation preferences/i })).not.toBeChecked()

    fireEvent.click(screen.getByRole('checkbox', { name: /wants & boundaries/i }))
    const preview = container.querySelector('.share-preview pre')!
    expect(preview).toHaveTextContent('Wants & boundaries')
    expect(screen.getAllByText(/boundaries shown here reflect the selections made/i).length).toBeGreaterThan(0)
  })

  it('announces single-card export and native-share fallback outcomes', async () => {
    const click = mockImageExport()
    render(<ShareResultsDialog data={data} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Roles to export' })).getAllByRole('checkbox')[0])

    fireEvent.click(screen.getByRole('button', { name: 'Export card' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Card exported.'))
    fireEvent.click(screen.getByRole('button', { name: 'Share card' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/cards were exported instead/i))
    expect(click).toHaveBeenCalledTimes(2)
  })

  it('closes with Escape and initially moves focus into the dialog', () => {
    const onClose = vi.fn()
    render(<ShareResultsDialog data={data} onClose={onClose} />)

    expect(screen.getByRole('button', { name: /close export and sharing dialog/i })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
