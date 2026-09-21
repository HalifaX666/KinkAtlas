import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from '../components/AppErrorBoundary'

function BrokenChild(): never {
  throw new Error('test render failure')
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('application error boundary', () => {
  it('renders a private recovery state without transmitting the error', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<AppErrorBoundary><BrokenChild /></AppErrorBoundary>)

    expect(screen.getByRole('heading', { name: 'Something went wrong.' })).toBeInTheDocument()
    expect(screen.getByText(/doesn’t send your assessment data anywhere/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Reload and restart' })).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.queryByText(/test render failure/i)).not.toBeInTheDocument()
  })
})
