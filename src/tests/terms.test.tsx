import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { AboutPage } from '../pages/AboutPage'
import { TermsPage } from '../pages/TermsPage'

afterEach(() => cleanup())

describe('Terms of Use and privacy transparency', () => {
  it('renders the complete Terms page without a fixed monetary liability cap', () => {
    render(<MemoryRouter><TermsPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Terms of Use', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Effective date: September 21, 2026')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '1. Adults only' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '4. Consent is separate from interests and results' })).toBeInTheDocument()
    expect(screen.getByText(/do not establish consent/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '6. Assessment privacy' })).toBeInTheDocument()
    expect(screen.getByText(/empty same-origin request used to increment an aggregate completion counter/i)).toBeInTheDocument()
    expect(screen.getByText(/KinkAtlas does not use generative artificial intelligence to analyze your assessment responses or generate your assessment results/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '18. Limitation of liability' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '19. Governing law and disputes' })).toBeInTheDocument()
    expect(screen.getByText(/laws of the Province of Ontario and the federal laws of Canada/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '20. Severability and waiver' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '21. Entire agreement' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'KinkAtlas Privacy Policy' })).toHaveLength(3)
    for (const link of screen.getAllByRole('link', { name: 'KinkAtlas Privacy Policy' })) expect(link).toHaveAttribute('href', '/about#privacy')
    expect(screen.getByRole('link', { name: 'KinkAtlas Contact page' })).toHaveAttribute('href', '/contact')
    expect(document.body.textContent).not.toMatch(/CAD\s*\$100|\$100\s+liability|\$100/i)
  })

  it('renders the supplied privacy and transparency statements', () => {
    render(<MemoryRouter><AboutPage /></MemoryRouter>)
    const privacy = document.getElementById('privacy')
    expect(privacy).toBeInTheDocument()
    const section = privacy as HTMLElement
    for (const value of ['localStorage', 'sessionStorage', 'cookies', 'IndexedDB']) expect(section).toHaveTextContent(value)
    expect(section).toHaveTextContent('browser memory for the current assessment session')
    expect(section).toHaveTextContent('aggregate number of assessment completions')
    expect(section).toHaveTextContent('does not include assessment answers, results, roles, readiness information, boundaries, negotiation preferences, or other assessment content')
    expect(section).toHaveTextContent('approximate and should not be interpreted as a count of unique people')
    expect(section).toHaveTextContent('limited technical information associated with normal website requests')
    expect(section).toHaveTextContent('Contact-form submissions are separate from assessment state.')
    expect(section).toHaveTextContent('The contact form is processed using Netlify Forms.')
    expect(section).toHaveTextContent('does not use generative artificial intelligence to analyze assessment responses or generate assessment results')
    expect(section).toHaveTextContent('not sent to a generative AI service as part of assessment scoring')
    expect(section).toHaveTextContent('These actions are initiated by you.')
    expect(section).toHaveTextContent('does not automatically post assessment information to FetLife')
    expect(section).toHaveTextContent('does not automatically read from or modify a FetLife profile')
  })

  it('exposes the Terms route, metadata, and footer link', () => {
    window.history.replaceState({}, '', '/terms')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Terms of Use', level: 1 })).toBeInTheDocument()
    expect(document.title).toBe('Terms of Use | KinkAtlas')
    const footer = screen.getByRole('contentinfo')
    const navigation = within(footer).getByRole('navigation', { name: 'Further information' })
    expect(within(navigation).getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  })
})
