import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QrTransport } from '../components/QrTransport'

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL })
})

describe('local QR transport', () => {
  it('keeps QR optional, accessible, locally generated, and downloadable with object URL cleanup', async () => {
    const createObjectURL = vi.fn(() => 'blob:local-qr')
    const revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })

    render(<QrTransport
      transportText="https://example.test/viewer-request#request=public"
      artifactType="viewer-request"
      accessibleLabel="QR code for Viewer Request"
      description="Public request material; compare the Keyprint separately."
      downloadName="kinkatlas-viewer-request-qr.svg"
    />)

    expect(screen.queryByRole('img', { name: 'QR code for Viewer Request' })).not.toBeInTheDocument()
    const show = screen.getByRole('button', { name: 'Show QR' })
    expect(show).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(show)
    const image = await screen.findByRole('img', { name: 'QR code for Viewer Request' })
    expect(image).toHaveAttribute('data-qr-ecc', 'M')
    expect(screen.getByRole('button', { name: 'Hide QR' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/adds no expiry, revocation, identity proof, or consent/i)).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Download QR as SVG' }))
    await waitFor(() => expect(click).toHaveBeenCalledOnce())
    expect(createObjectURL).toHaveBeenCalledOnce()
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:local-qr'))
    fireEvent.click(screen.getByRole('button', { name: 'Download QR as SVG' }))
    await waitFor(() => expect(click).toHaveBeenCalledTimes(2))
    expect(createObjectURL).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledTimes(2))

    fireEvent.click(screen.getByRole('button', { name: 'Hide QR' }))
    expect(screen.queryByRole('img', { name: 'QR code for Viewer Request' })).not.toBeInTheDocument()
  })

  it('shows a safe fallback instead of an encoder control for oversized artifacts', () => {
    render(<QrTransport
      transportText={`https://example.test/capsule#capsule=${'x'.repeat(700)}`}
      artifactType="secret-capsule"
      accessibleLabel="QR code for encrypted Secret Capsule"
      description="Encrypted artifact only."
      downloadName="kinkatlas-encrypted-capsule-qr.svg"
    />)

    expect(screen.getByText(/too large for a reliable single QR code/i)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Show QR' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('keeps the displayed QR and text fallback usable when local download fails', async () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => { throw new Error('unavailable') }) })
    render(<QrTransport
      transportText="https://example.test/viewer-request#request=public"
      artifactType="viewer-request"
      accessibleLabel="QR code for Viewer Request"
      description="Public request material."
      downloadName="kinkatlas-viewer-request-qr.svg"
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Show QR' }))
    await screen.findByRole('img', { name: 'QR code for Viewer Request' })
    fireEvent.click(screen.getByRole('button', { name: 'Download QR as SVG' }))
    expect(await screen.findByText(/QR download is unavailable/i)).toBeVisible()
    expect(screen.getByRole('img', { name: 'QR code for Viewer Request' })).toBeVisible()
  })
})
