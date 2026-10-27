import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AboutPage } from '../pages/AboutPage'

const expectedSections = [
  ['What it does', '#what-it-does'],
  ['How it works', '#how-it-works'],
  ['How to read your results', '#how-to-read-results'],
  ['Save & Share', '#save-and-share'],
  ['Different questions, separate answers', '#different-questions'],
  ['Why it was built', '#why-it-exists'],
  ['What it does not do', '#what-it-does-not-do'],
  ['Does KinkAtlas use AI?', '#ai'],
  ['Privacy & transparency', '#privacy'],
  ['Role-definition methodology', '#definitions'],
  ['Limitations', '#limitations'],
]

function renderAbout(entry = '/about') {
  return render(<MemoryRouter initialEntries={[entry]}><AboutPage /></MemoryRouter>)
}

afterEach(cleanup)

describe('About contents navigation', () => {
  it('starts as one horizontal contents navigation with the expected anchors', () => {
    renderAbout()

    const navigation = screen.getByRole('navigation', { name: 'About sections' })
    expect(navigation).not.toHaveClass('is-docked')
    expect(navigation.parentElement).not.toHaveClass('is-contents-docked')
    expect(screen.getAllByRole('navigation', { name: 'About sections' })).toHaveLength(1)
    for (const [label, href] of expectedSections) expect(within(navigation).getByRole('link', { name: label })).toHaveAttribute('href', href)
  })

  it('docks the same navigation and marks the clicked section active', () => {
    renderAbout()

    const navigation = screen.getByRole('navigation', { name: 'About sections' })
    fireEvent.click(within(navigation).getByRole('link', { name: 'Privacy & transparency' }))

    expect(navigation).toHaveClass('is-docked')
    expect(navigation.parentElement).toHaveClass('is-contents-docked')
    expect(within(navigation).getByRole('link', { name: 'Privacy & transparency' })).toHaveAttribute('aria-current', 'location')
    expect(screen.getAllByRole('navigation', { name: 'About sections' })).toHaveLength(1)
  })

  it('initializes a valid direct hash in its docked, active state', () => {
    renderAbout('/about#definitions')

    const navigation = screen.getByRole('navigation', { name: 'About sections' })
    expect(navigation).toHaveClass('is-docked')
    expect(within(navigation).getByRole('link', { name: 'Role-definition methodology' })).toHaveAttribute('aria-current', 'location')
  })

  it('keeps the same real anchor navigation available after docking', () => {
    renderAbout()

    const navigation = screen.getByRole('navigation', { name: 'About sections' })
    fireEvent.click(within(navigation).getByRole('link', { name: 'How it works' }))
    for (const [label, href] of expectedSections) expect(within(navigation).getByRole('link', { name: label })).toHaveAttribute('href', href)
    expect(screen.getByRole('region', { name: 'How it works' })).toHaveTextContent('deterministic, rules-based assessment')
  })

  it('documents the Results guide and unambiguous no-AI product behavior', () => {
    renderAbout()

    const resultsGuide = screen.getByRole('region', { name: 'How to read your results' })
    for (const heading of ['Strongest dimensions', 'Suggested Role Set', 'Your Role Set', 'Role Discovery', 'Reflection', 'Patterns worth a second look', 'Wants & boundaries', 'Conversation starters', 'Useful next steps', 'Export & Share']) expect(within(resultsGuide).getByRole('heading', { name: heading })).toBeInTheDocument()
    expect(resultsGuide).toHaveTextContent('Role ≠ consent')
    expect(resultsGuide).toHaveTextContent('manually post exports to FetLife')
    expect(resultsGuide).toHaveTextContent('never connects to or posts to a FetLife profile')

    const aiSection = screen.getByRole('region', { name: 'Does KinkAtlas use AI?' })
    expect(aiSection).toHaveTextContent('KinkAtlas does not use AI')
    expect(aiSection).toHaveTextContent('No generative AI or language model receives assessment answers for scoring')
  })

  it('explains the normal save and Link & QR model in plain language', () => {
    renderAbout()

    const section = screen.getByRole('region', { name: 'Saving and sharing your KinkAtlas' })
    for (const heading of ['Temporary by default', 'Save my assessment', 'My KinkAtlas', 'Link & QR']) {
      expect(within(section).getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(section).toHaveTextContent('does not automatically save your assessment')
    expect(section).toHaveTextContent('this browser')
    expect(section).toHaveTextContent('link and QR open the same hosted share')
    expect(section).toHaveTextContent('Raw individual answers are not included')
  })
})
