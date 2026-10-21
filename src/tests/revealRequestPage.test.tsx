import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RevealRequest, ViewerRequest } from '../capsules/capsuleTypes'
import { RevealRequestPage } from '../pages/RevealRequestPage'

const viewerRequest = {
  magic: 'kinkatlas-viewer-request', viewerRequestVersion: 1,
  requestId: 'AAAAAAAAAAAAAAAAAAAAAA', suite: 'ECDH-P256+HKDF-SHA-256+A256GCM', recipientPublicKey: 'public-key',
  keyprint: { version: 1, short: 'ABCD-EF01-234', checksum: '42', fingerprint: 'A'.repeat(64) },
} as ViewerRequest

const revealRequest = {
  magic: 'kinkatlas-reveal-request', revealRequestVersion: 1, requestId: 'BBBBBBBBBBBBBBBBBBBBBB',
  requestedSections: ['currentRoleSet', 'roleDefinitions'], recipientViewerRequest: viewerRequest,
} as RevealRequest

const mocks = vi.hoisted(() => ({
  listStoredViewerRequests: vi.fn(),
  createRevealRequest: vi.fn(),
  createRevealRequestArtifact: vi.fn(),
  parseRevealRequestInput: vi.fn(),
}))

vi.mock('../capsules/viewerKeyStore', () => ({ listStoredViewerRequests: mocks.listStoredViewerRequests }))
vi.mock('../capsules/revealRequest', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../capsules/revealRequest')>()),
  createRevealRequest: mocks.createRevealRequest,
}))
vi.mock('../capsules/revealRequestTransport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../capsules/revealRequestTransport')>()),
  createRevealRequestArtifact: mocks.createRevealRequestArtifact,
  parseRevealRequestInput: mocks.parseRevealRequestInput,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function arrangeValidRequest() {
  mocks.listStoredViewerRequests.mockResolvedValue([{
    requestId: viewerRequest.requestId,
    createdAt: '2026-10-20T12:00:00.000Z',
    label: 'Private local label',
    request: viewerRequest,
    privateKey: {} as CryptoKey,
  }])
  mocks.createRevealRequest.mockResolvedValue(revealRequest)
  mocks.createRevealRequestArtifact.mockResolvedValue({
    serializedRequest: JSON.stringify(revealRequest),
    link: 'https://example.test/reveal-request#request=public-request-data',
    file: new File(['request'], 'kinkatlas-reveal-request.kinkatlas-reveal-request'),
  })
  mocks.parseRevealRequestInput.mockResolvedValue(revealRequest)
}

describe('Reveal Request page', () => {
  it('requires explicit section choices and creates only public request material locally', async () => {
    arrangeValidRequest()
    render(<MemoryRouter initialEntries={['/reveal-request']}><RevealRequestPage /></MemoryRouter>)

    await screen.findByText('Private local label')
    const create = screen.getByRole('button', { name: 'Review and create request' })
    expect(create).toBeDisabled()
    const sectionChoices = within(screen.getByRole('group', { name: 'Sections to request' })).getAllByRole('checkbox')
    fireEvent.click(sectionChoices[0])
    fireEvent.click(sectionChoices[1])
    fireEvent.click(create)

    expect(await screen.findByRole('heading', { name: 'Send this Reveal Request' })).toHaveFocus()
    expect(mocks.createRevealRequest).toHaveBeenCalledWith(viewerRequest, ['currentRoleSet', 'roleDefinitions'])
    expect(screen.getByLabelText('Reveal Request link')).toHaveValue('https://example.test/reveal-request#request=public-request-data')
    expect(screen.getByLabelText('Reveal Request text')).not.toHaveValue(expect.stringContaining('Private local label'))
    expect(screen.getByRole('status')).toHaveTextContent(/does not cause anything to be shared/i)
  })

  it('captures a valid fragment, clears it only after validation, and creates no response automatically', async () => {
    arrangeValidRequest()
    const replaceState = vi.spyOn(window.history, 'replaceState')
    render(<MemoryRouter initialEntries={['/reveal-request#request=public']}><RevealRequestPage /></MemoryRouter>)

    const heading = await screen.findByRole('heading', { name: 'Review this Reveal Request' })
    expect(heading).toHaveFocus()
    const received = within(heading.closest('section')!)
    expect(screen.getByText(/you are willing to share selected results\. You can share all, some, or none/i)).toBeVisible()
    expect(received.getByText('Current Role Set')).toBeVisible()
    expect(received.getByText('Role definitions')).toBeVisible()
    expect(replaceState).toHaveBeenCalled()
    expect(mocks.createRevealRequestArtifact).not.toHaveBeenCalled()
  })

  it('keeps an invalid fragment available for correction and shows a safe error', async () => {
    arrangeValidRequest()
    mocks.parseRevealRequestInput.mockRejectedValueOnce(new Error('sensitive internal detail'))
    const replaceState = vi.spyOn(window.history, 'replaceState')
    render(<MemoryRouter initialEntries={['/reveal-request#request=broken']}><RevealRequestPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/could not be opened/i))
    expect(screen.getByRole('status')).not.toHaveTextContent('sensitive internal detail')
    expect(replaceState).not.toHaveBeenCalled()
  })
})
