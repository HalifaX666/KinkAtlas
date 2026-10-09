import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RoleProfileBuilder } from '../components/RoleProfileBuilder'
import { RoleSetIdentityGallery } from '../components/RoleSetIdentityGallery'
import { ShareResultsDialog } from '../components/ShareResultsDialog'
import { buildRoleSetCardPresentations } from '../data/roleIdentity'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { evaluateReadiness } from '../engine/readinessScoring'
import { matchRoles } from '../engine/roleMatching'
import { buildRelatedRoleProfiles } from '../engine/roleProfileExploration'
import { buildEditableRoleProfileEntries, buildRoleProfileCandidates, optimizeRoleProfile, type EditableRoleProfileEntry } from '../engine/roleProfileOptimizer'
import { createRoleCardImage, getShareableRoleSet, roleCardFileName, type ShareResultsData } from '../engine/shareResults'
import { roleLibrary } from '../taxonomy/roleLibrary'
import * as capsuleTransport from '../capsules/capsuleTransport'

const answers = { 'd-power-give': 'strong', 'd-position-give': 'strong', 'r-lead': 'strong', 'r-responsibility': 'strong' }
const roleResults = matchRoles(calculateTraitScores(answers), answers)
const initialRoleSet: EditableRoleProfileEntry[] = buildEditableRoleProfileEntries(
  optimizeRoleProfile(buildRoleProfileCandidates(roleResults)),
)
const data: ShareResultsData = {
  roleResults,
  roleSet: initialRoleSet,
  readiness: evaluateReadiness({ 'c-ongoing-1': 'c' }),
  boundaries: { power: 'love' },
  negotiation: { 'n-planning': 'p1' },
}
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

function mockImageExport(downloads?: string[], drawnText?: string[]) {
  const gradient = { addColorStop: vi.fn() }
  const context = {
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '',
    lineCap: '', lineJoin: '',
    fillRect: vi.fn(), createRadialGradient: vi.fn(() => gradient), beginPath: vi.fn(), closePath: vi.fn(), arc: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), bezierCurveTo: vi.fn(), stroke: vi.fn(), fillText: vi.fn((text: string) => drawnText?.push(text)),
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
    <RoleSetIdentityGallery roleSet={roleSet} roleResults={roleResults} />
    <RoleProfileBuilder roleResults={roleResults} onRoleSetChange={setRoleSet} />
    <ShareResultsDialog data={{ ...data, roleSet }} onClose={vi.fn()} />
  </>
}

function shareRoleLabels() {
  return within(screen.getByRole('group', { name: 'Roles to export' })).getAllByRole('checkbox').map((choice) => (
    choice.closest('label')?.querySelector(':scope > span:last-child > strong')?.textContent
  ))
}

function roleListLabels(name: string) {
  return within(screen.getByRole('list', { name })).getAllByRole('listitem').map((item) => item.querySelector('strong')?.textContent)
}

function visualRoleLabels() {
  return within(screen.getByRole('list', { name: 'Current role cards' })).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
}

async function searchResultFor(label: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search roles' }), { target: { value: label } })
  const action = await screen.findByRole('button', { name: `Add ${label}` })
  return action.closest('li')!
}

describe('Export & Share dialog', () => {
  it('keeps encrypted disclosure separate and derives its privacy receipt from supported selections', () => {
    render(<ShareResultsDialog data={data} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Encrypted Disclosure/i }))

    const choices = screen.getByRole('group', { name: 'Include in the encrypted disclosure' })
    const roleSet = within(choices).getByRole('checkbox', { name: /Current Role Set/i })
    const definitions = within(choices).getByRole('checkbox', { name: /Role definitions/i })
    expect(roleSet).toBeChecked()
    expect(definitions).toBeChecked()
    expect(within(choices).queryByRole('checkbox', { name: /raw|answer|boundary|readiness/i })).not.toBeInTheDocument()

    const receipt = screen.getByRole('heading', { name: 'Privacy receipt' }).closest('.privacy-receipt')!
    expect(receipt).toHaveTextContent('Current Role Set')
    expect(receipt).toHaveTextContent('Role definitions')
    expect(receipt).toHaveTextContent('Raw assessment answers')

    fireEvent.click(definitions)
    expect(definitions).not.toBeChecked()
    expect(receipt).toHaveTextContent('Not included')
  })

  it('creates encrypted link, text, file, and separate secret from the selected disclosure manifest', async () => {
    const createDisclosure = vi.spyOn(capsuleTransport, 'createSharedDisclosureArtifact').mockResolvedValue({
      link: 'https://example.test/capsule#capsule=encrypted-ciphertext',
      fragment: '#capsule=encrypted-ciphertext',
      serializedEnvelope: '{"ciphertext":"encrypted-ciphertext"}',
      secret: 'KA1-separate.secret',
      file: new File(['encrypted-ciphertext'], 'disclosure.kinkatlas-capsule'),
    })
    render(<ShareResultsDialog data={data} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Encrypted Disclosure/i }))
    expect(screen.queryByLabelText('Encrypted Capsule text')).not.toBeInTheDocument()

    const choices = screen.getByRole('group', { name: 'Include in the encrypted disclosure' })
    fireEvent.click(within(choices).getByRole('checkbox', { name: /Role definitions/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Create encrypted disclosure' }))

    const encryptedText = await screen.findByLabelText('Encrypted Capsule text') as HTMLTextAreaElement
    const link = screen.getByLabelText('Encrypted Capsule link') as HTMLTextAreaElement
    const secret = screen.getByLabelText(/Secret — never embedded in the link/i) as HTMLInputElement
    expect(link.value).toMatch(/\/capsule#capsule=/)
    expect(encryptedText.value).toBe('{"ciphertext":"encrypted-ciphertext"}')
    expect(link.value).not.toContain(secret.value)
    expect(screen.getByRole('button', { name: 'Download encrypted file' })).toBeVisible()

    const payload = createDisclosure.mock.calls[0][0]
    expect(payload.disclosureManifest.currentRoleSet).toBe(true)
    expect(payload.disclosureManifest.roleDefinitions).toBe(false)
    expect(payload.sections).toHaveProperty('currentRoleSet')
    expect(payload.sections).not.toHaveProperty('roleDefinitions')
  }, 30_000)

  it('uses canonical primary wording and a static role reference on an exported card without metrics', async () => {
    const drawnText: string[] = []
    mockImageExport(undefined, drawnText)

    const role = getShareableRoleSet([{ roleId: 'role:kinkster-fbb59ce7', label: 'Kinkster', source: 'recommended' }], roleResults)[0]
    await createRoleCardImage(role)

    expect(drawnText).toContain('YOUR PRIMARY')
    expect(drawnText).toContain('kinkatlas.ca/roles/kinkster')
    expect(role.emblem.identityKey).toBe('kinkatlas-emblem:role:kinkster-fbb59ce7')
    expect(role.family).not.toBe('')
    expect(drawnText.join(' ')).not.toMatch(/psychometric/i)
    expect(drawnText).not.toContain('ROLE IDENTITY')
    expect(drawnText).not.toContain('Explore role')
  })

  it('uses one ordered role-card presentation model for Results, selector previews, and PNG export', () => {
    const labels = ['Brat', 'Rigger', 'Primal Switch', 'Kinkster', 'Caregiver']
    const roleSet: EditableRoleProfileEntry[] = labels.map((label, index) => {
      const role = roleLibrary.roles.find((candidate) => candidate.label === label)!
      const result = roleResults.find((candidate) => candidate.role.name === label)
      return {
        roleId: role.id,
        label,
        source: index < 3 ? 'recommended' : 'user-selected',
        definition: role.definition,
        assessmentRoleId: index < 3 ? result?.role.id : undefined,
      }
    })
    const presentations = buildRoleSetCardPresentations(roleSet, roleResults)
    const exported = getShareableRoleSet(roleSet, roleResults)
    const sharedFields = (role: typeof presentations[number]) => ({
      roleId: role.roleId,
      label: role.label,
      familyLabel: role.familyLabel,
      summary: role.summary,
      attributes: role.attributes,
      emblem: role.emblem,
      source: role.source,
      sourceLabel: role.sourceLabel,
      assessmentDetails: role.assessmentDetails,
      alignment: role.alignment,
      confidence: role.confidence,
      evidenceBreadth: role.evidenceBreadth,
      publicPath: role.publicPath,
    })

    expect(presentations.map((role) => role.label)).toEqual(labels)
    expect(exported.map(sharedFields)).toEqual(presentations.map(sharedFields))
    expect(presentations.map((role) => role.sourceLabel)).toEqual([
      'Your primary',
      'Suggested by assessment',
      'Suggested by assessment',
      'Added by you',
      'Added by you',
    ])
    expect(presentations.slice(0, 3).every((role) => role.alignment && role.confidence && role.evidenceBreadth !== undefined)).toBe(true)
    expect(presentations.slice(3).every((role) => role.alignment === undefined && role.confidence === undefined && role.evidenceBreadth === undefined)).toBe(true)

    const { container } = render(<RoleSetIdentityGallery roleSet={roleSet} roleResults={roleResults} />)
    expect(visualRoleLabels()).toEqual(labels)
    presentations.forEach((presentation) => {
      const card = container.querySelector(`[data-role-id="${presentation.roleId}"]`)!
      expect(card).toHaveTextContent(presentation.familyLabel)
      expect(card).toHaveTextContent(presentation.label)
      if (presentation.summary) expect(card).toHaveTextContent(presentation.summary)
      presentation.attributes.slice(0, 4).forEach((attribute) => {
        expect(card).toHaveTextContent(attribute.label)
        expect(card).toHaveTextContent(attribute.value)
      })
      expect(card).toHaveTextContent(presentation.sourceLabel)
      presentation.assessmentDetails.forEach((detail) => expect(card).toHaveTextContent(detail))
      expect(card.querySelector('[data-emblem-key]')).toHaveAttribute('data-emblem-key', presentation.emblem.identityKey)
    })
  })

  it('renders export choices with the canonical RoleIdentityCard instead of a legacy mini-card', () => {
    const labels = ['Voyeur', 'Primal Prey', 'Kinkster', 'Tease', 'Vers']
    const roleSet: EditableRoleProfileEntry[] = labels.map((label, index) => {
      const role = roleLibrary.roles.find((candidate) => candidate.label === label)!
      const result = roleResults.find((candidate) => candidate.role.name === label)
      return {
        roleId: role.id,
        label,
        source: index < 2 ? 'recommended' : 'user-selected',
        definition: role.definition,
        assessmentRoleId: index < 2 ? result?.role.id : undefined,
      }
    })
    const presentations = buildRoleSetCardPresentations(roleSet, roleResults)
    const { container } = render(<ShareResultsDialog data={{ ...data, roleSet }} onClose={vi.fn()} />)
    const previews = [...container.querySelectorAll('.role-identity-card-export > .role-identity-card-preview')]

    expect(previews).toHaveLength(labels.length)
    expect(container.querySelector('.role-card-mini')).not.toBeInTheDocument()
    expect(shareRoleLabels()).toEqual(labels)
    previews.forEach((preview, index) => {
      const presentation = presentations[index]
      expect(preview).toHaveClass('role-identity-card')
      expect(preview).toHaveTextContent(presentation.label)
      expect(preview).toHaveTextContent(presentation.familyLabel)
      if (presentation.summary) expect(preview).toHaveTextContent(presentation.summary)
      presentation.attributes.slice(0, 4).forEach((attribute) => {
        expect(preview).toHaveTextContent(attribute.label)
        expect(preview).toHaveTextContent(attribute.value)
      })
      expect(preview).toHaveTextContent(presentation.sourceLabel)
      presentation.assessmentDetails.forEach((detail) => expect(preview).toHaveTextContent(detail))
      expect(preview).toHaveTextContent(`kinkatlas.ca${presentation.publicPath}`)
      expect(preview.querySelector('[data-emblem-key]')).toHaveAttribute('data-emblem-key', presentation.emblem.identityKey)
    })
  })

  it('renders safely when the assessment produced no suggested role set', () => {
    render(<RoleProfileBuilder roleResults={[]} />)

    expect(screen.getByText(/do not currently support an automatic role suggestion/i)).toBeInTheDocument()
    expect(screen.getByText(/0 of 5 roles in your set/i)).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search roles' })).toBeInTheDocument()
  })

  it('explains the suggested-to-editable role-set journey', () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)

    expect(screen.getByRole('heading', { name: 'Suggested role set' })).toBeInTheDocument()
    expect(screen.getByText(/changes below affect only what you keep and share, not this assessment output/i)).toBeInTheDocument()
    expect(screen.getByText(/reorder, replace, remove, or add roles here/i)).toBeInTheDocument()
    expect(screen.getByText(/shareable cards always use this current set/i)).toBeInTheDocument()
    const explanation = screen.getByText(/KinkAtlas favors meaningful evidence/i)
    expect(explanation).toHaveTextContent(/avoiding a set of near-duplicates/i)
    expect(explanation).toHaveTextContent(/five is a maximum, not a target/i)
  })

  it('shows assessment-aware search explanations without changing immutable suggested-primary status', async () => {
    const optimization = optimizeRoleProfile(buildRoleProfileCandidates(roleResults))
    const suggestedPrimary = optimization.primary!.candidate.label
    render(<RoleProfileBuilder roleResults={roleResults} />)

    let result = await searchResultFor(suggestedPrimary)
    fireEvent.click(await within(result).findByText('About this role'))
    expect(within(result).getByText('How this relates to your results')).toBeInTheDocument()
    expect(within(result).getByText(/Suggested primary\./)).toBeInTheDocument()

    const manuallyPromoted = roleListLabels('Current role set')[1]!
    fireEvent.click(screen.getByRole('button', { name: `Make ${manuallyPromoted} primary` }))
    result = await searchResultFor(manuallyPromoted)
    fireEvent.click(await within(result).findByText('About this role'))
    expect(within(result).getByText(/Suggested from your assessment\./)).toBeInTheDocument()
    expect(within(result).queryByText(/Suggested primary\./)).not.toBeInTheDocument()

    result = await searchResultFor(suggestedPrimary)
    fireEvent.click(await within(result).findByText('About this role'))
    expect(within(result).getByText(/Suggested primary\./)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restore suggested set' }))
    expect(within(result).getByText(/Suggested primary\./)).toBeInTheDocument()
  })

  it('shows manual selection alongside its independent assessment outcome without fabricated metrics', async () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)
    const removed = roleListLabels('Current role set').at(-1)!
    fireEvent.click(screen.getByRole('button', { name: `Remove ${removed}` }))

    const result = await searchResultFor('Soft Dom')
    fireEvent.click(await within(result).findByText('About this role'))
    expect(within(result).getByText(/Available for self-exploration\./)).toBeInTheDocument()
    expect(within(result).getAllByText('How this relates to your results')).toHaveLength(1)
    fireEvent.click(within(result).getByRole('button', { name: 'Add Soft Dom' }))

    await waitFor(() => expect(within(result).getByText(/Added by you\./)).toBeInTheDocument())
    expect(within(result).getByText(/Adding it does not create an assessment score or confidence/i)).toBeInTheDocument()
    expect(result).not.toHaveTextContent(/Strong alignment|High confidence|Medium confidence|evidence breadth/i)
  })

  it('uses user-facing explanation language for omitted alternates', () => {
    const { container } = render(<RoleProfileBuilder roleResults={roleResults} />)
    fireEvent.click(screen.getByText('Why other suggestions were not included'))
    const alternateDetails = container.querySelector('.profile-alternates')!

    expect(alternateDetails).not.toHaveTextContent(/slot-limit:|insufficient-evidence:|confirmation-required:|manual-only:/i)
    expect(alternateDetails).toHaveTextContent(/Not suggested automatically|Supported alternative|Overlapping evidence|Direct confirmation needed|Available for self-exploration/i)
  })

  it('makes a role primary, preserves the Suggested Role Set, and restores exact initial state', () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)
    const suggested = roleListLabels('Suggested roles')
    const chosen = suggested[2]!

    expect(screen.queryByRole('button', { name: 'Restore suggested set' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `Make ${chosen} primary` }))

    expect(roleListLabels('Current role set')).toEqual([chosen, ...suggested.slice(0, 2), ...suggested.slice(3)])
    expect(roleListLabels('Suggested roles')).toEqual(suggested)
    expect(screen.getByRole('status')).toHaveTextContent(`${chosen} is now your primary. KinkAtlas’s suggested primary is unchanged.`)
    expect(screen.queryByRole('button', { name: `Make ${chosen} primary` })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: `Replace ${suggested[0]}` }))
    expect(screen.getByRole('group', { name: 'Replacement mode' })).toHaveTextContent(`Choose a role to replace ${suggested[0]}.`)
    fireEvent.click(screen.getByRole('button', { name: 'Restore suggested set' }))

    expect(roleListLabels('Current role set')).toEqual(suggested)
    expect(screen.queryByRole('group', { name: 'Replacement mode' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Your role set was restored to the assessment suggestion.')
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
    expect(screen.getByText(`${seed.label} was added by you. The assessment suggestion is unchanged.`)).toBeInTheDocument()
  })

  it('uses the same centralized role details in suggestions, the current set, related roles, and search', async () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)

    const suggestedItem = within(screen.getByRole('list', { name: 'Suggested roles' })).getAllByRole('listitem')[0]
    fireEvent.click(await within(suggestedItem).findByText('About this role'))
    expect(within(suggestedItem).getByText('How this relates to your results')).toBeInTheDocument()

    const currentItem = within(screen.getByRole('list', { name: 'Current role set' })).getAllByRole('listitem')[0]
    fireEvent.click(await within(currentItem).findByText('About this role'))
    expect(within(currentItem).getByText('How this relates to your results')).toBeInTheDocument()

    const relatedItem = within(screen.getByRole('region', { name: 'Explore related roles' })).getAllByRole('listitem')[0]
    fireEvent.click(await within(relatedItem).findByText('About this role'))
    expect(within(relatedItem).getByText('How this relates to your results')).toBeInTheDocument()

    const searchItem = await searchResultFor('Kinkster')
    fireEvent.click(await within(searchItem).findByText('About this role'))
    expect(within(searchItem).getByText('How this relates to your results')).toBeInTheDocument()
  })

  it('preserves assessment history when a suggestion is removed and then added by the user', async () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)
    const originalSuggestion = roleListLabels('Suggested roles')[0]!

    fireEvent.click(screen.getByRole('button', { name: `Remove ${originalSuggestion}` }))
    const result = await searchResultFor(originalSuggestion)
    fireEvent.click(await within(result).findByText('About this role'))
    expect(within(result).getByText(/Suggested primary\.|Suggested from your assessment\./)).toBeInTheDocument()

    fireEvent.click(within(result).getByRole('button', { name: `Add ${originalSuggestion}` }))
    await waitFor(() => expect(within(result).getByText(/Added by you\./)).toBeInTheDocument())
    expect(within(result).getByText(/Suggested primary\.|Suggested from your assessment\./)).toBeInTheDocument()
    expect(roleListLabels('Suggested roles')).toContain(originalSuggestion)
  })

  it('blocks a sixth role cleanly and renders a useful empty-search state', async () => {
    render(<RoleProfileBuilder roleResults={roleResults} />)
    const current = roleListLabels('Current role set')
    expect(current).toHaveLength(5)
    const extraRole = roleLibrary.roles.find((role) => !current.includes(role.label))!

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search roles' }), { target: { value: extraRole.label } })
    fireEvent.click(await screen.findByRole('button', { name: `Add ${extraRole.label}` }))
    expect(screen.getByRole('status')).toHaveTextContent('Remove a role before adding another; the role set allows at most five.')
    expect(roleListLabels('Current role set')).toEqual(current)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search roles' }), { target: { value: 'no-such-role-zzzz' } })
    expect(screen.getByText('No roles match that search.')).toBeInTheDocument()
  })

  it('starts with every role in the current role set selected and labelled', () => {
    const { container } = render(<ShareResultsDialog data={data} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: /role cards/i })).toHaveAttribute('aria-pressed', 'true')
    const roleChoices = within(screen.getByRole('group', { name: 'Roles to export' })).getAllByRole('checkbox')
    expect(roleChoices).toHaveLength(5)
    roleChoices.forEach((choice) => expect(choice).toBeChecked())
    expect(screen.getByText('5 of 5 roles selected')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /include confidence on overview card/i })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Export 5 cards' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Share 5 cards' })).toBeEnabled()
    expect(container.querySelectorAll('.role-identity-card-export')).toHaveLength(5)
    expect(container.querySelectorAll('.role-identity-card-export [data-emblem-key]')).toHaveLength(5)
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
    expect(visualRoleLabels()).toEqual(initialLabels)
    const immutableSuggested = roleListLabels('Suggested roles')

    fireEvent.click(screen.getByRole('button', { name: `Replace ${initialLabels[0]}` }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search roles' }), { target: { value: replacement.label } })
    fireEvent.click(await screen.findByRole('button', { name: `Replace with ${replacement.label}` }))
    let expectedLabels = [replacement.label, ...initialLabels.slice(1)]
    await waitFor(() => expect(shareRoleLabels()).toEqual(expectedLabels))
    expect(visualRoleLabels()).toEqual(expectedLabels)
    expect(roleListLabels('Suggested roles')).toEqual(immutableSuggested)

    fireEvent.click(screen.getByRole('button', { name: `Move ${replacement.label} down` }))
    expectedLabels = [expectedLabels[1], expectedLabels[0], ...expectedLabels.slice(2)]
    await waitFor(() => expect(shareRoleLabels()).toEqual(expectedLabels))
    expect(visualRoleLabels()).toEqual(expectedLabels)

    const promoted = expectedLabels[2]
    fireEvent.click(screen.getByRole('button', { name: `Make ${promoted} primary` }))
    expectedLabels = [promoted, ...expectedLabels.slice(0, 2), ...expectedLabels.slice(3)]
    await waitFor(() => expect(shareRoleLabels()).toEqual(expectedLabels))
    expect(visualRoleLabels()).toEqual(expectedLabels)
    expect(roleListLabels('Suggested roles')).toEqual(immutableSuggested)

    const removedLabel = expectedLabels[expectedLabels.length - 1]
    fireEvent.click(screen.getByRole('button', { name: `Remove ${removedLabel}` }))
    expectedLabels = expectedLabels.slice(0, -1)
    await waitFor(() => expect(shareRoleLabels()).toEqual(expectedLabels))
    expect(visualRoleLabels()).toEqual(expectedLabels)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search roles' }), { target: { value: added.label } })
    fireEvent.click(await screen.findByRole('button', { name: `Add ${added.label}` }))
    expectedLabels = [...expectedLabels, added.label]
    await waitFor(() => expect(shareRoleLabels()).toEqual(expectedLabels))
    expect(visualRoleLabels()).toEqual(expectedLabels)

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
