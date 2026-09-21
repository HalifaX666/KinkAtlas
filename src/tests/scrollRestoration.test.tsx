import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScrollRestoration } from '../components/ScrollRestoration'

const originalScrollTo = window.scrollTo
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView

afterEach(() => {
  Object.defineProperty(window, 'scrollTo', { configurable: true, value: originalScrollTo })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: originalScrollIntoView })
})

function ScrollHarness() {
  return <><ScrollRestoration /><Link to="/next">Next route</Link><Routes><Route path="*" element={<div id="privacy">Route content</div>} /></Routes></>
}

describe('route scroll restoration', () => {
  it('returns ordinary route navigation to the top', async () => {
    const scrollTo = vi.fn()
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo })
    render(<MemoryRouter initialEntries={['/start']}><ScrollHarness /></MemoryRouter>)

    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' }))
    fireEvent.click(screen.getByRole('link', { name: 'Next route' }))
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(2))
  })

  it('uses a valid hash target instead of resetting scroll position', async () => {
    const scrollTo = vi.fn()
    const scrollIntoView = vi.fn()
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    render(<MemoryRouter initialEntries={['/about#privacy']}><ScrollHarness /></MemoryRouter>)

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' }))
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
