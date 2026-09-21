import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { FaqPage } from '../pages/FaqPage'

afterEach(() => cleanup())

describe('public FAQ and footer', () => {
  const questions = ['What is KinkAtlas?', 'How does KinkAtlas work?', 'Does KinkAtlas use AI to generate my results?', 'Are my answers stored?', 'Why might I get fewer than five suggested roles?', 'What do Alignment and Confidence mean?', 'What does Evidence breadth mean?', 'Do boundaries affect my role results?', 'Does a suggested role mean I should identify with it?', 'Does a role imply consent?', 'Can I add roles manually?', 'Can I leave my role set empty?', 'What is Reflection?', 'What are Potential blind spots?', 'Are these results a safety assessment?', 'Why can two people use the same role label differently?']

  it('renders FAQ questions as collapsed accessible accordion buttons', () => {
    const { container } = render(<MemoryRouter><FaqPage /></MemoryRouter>)
    expect(screen.getAllByRole('button')).toHaveLength(questions.length)
    for (const question of questions) {
      const button = screen.getByRole('button', { name: question })
      expect(button).toHaveAttribute('aria-expanded', 'false')
      const answerId = button.getAttribute('aria-controls')
      expect(answerId).toBeTruthy()
      expect(container.querySelector(`#${answerId}`)).toHaveAttribute('aria-hidden', 'true')
      expect(screen.getByText(question)).toBeInTheDocument()
    }
    expect(screen.getByText('Generative AI does not analyze your answers or generate your results.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read How it works' })).toHaveAttribute('href', '/about#how-it-works')
  })

  it('opens and closes answers while keeping only one FAQ item open', () => {
    render(<MemoryRouter><FaqPage /></MemoryRouter>)
    const aiButton = screen.getByRole('button', { name: 'Does KinkAtlas use AI to generate my results?' })
    const storedButton = screen.getByRole('button', { name: 'Are my answers stored?' })
    const aiAnswer = () => document.getElementById(aiButton.getAttribute('aria-controls') as string)
    const storedAnswer = () => document.getElementById(storedButton.getAttribute('aria-controls') as string)

    fireEvent.click(aiButton)
    expect(aiButton).toHaveAttribute('aria-expanded', 'true')
    expect(aiAnswer()).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByText('Generative AI does not analyze your answers or generate your results.')).toBeInTheDocument()

    fireEvent.click(storedButton)
    expect(storedButton).toHaveAttribute('aria-expanded', 'true')
    expect(aiButton).toHaveAttribute('aria-expanded', 'false')
    expect(aiAnswer()).toHaveAttribute('aria-hidden', 'true')
    expect(storedAnswer()).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByText(/Assessment answers and results are not persisted by KinkAtlas/)).toBeInTheDocument()

    fireEvent.click(storedButton)
    expect(storedButton).toHaveAttribute('aria-expanded', 'false')
    expect(storedAnswer()).toHaveAttribute('aria-hidden', 'true')
  })

  it('exposes the FAQ footer link and requested three-row footer content', () => {
    window.history.replaceState(null, '', '/faq')
    render(<App />)
    const footer = screen.getByRole('contentinfo')
    const navigation = within(footer).getByRole('navigation', { name: 'Further information' })
    for (const label of ['How it works', 'Privacy', 'FAQ', 'Contact', 'Consent philosophy']) expect(within(navigation).getByRole('link', { name: label })).toBeInTheDocument()
    expect(within(footer).getByText('Built by D.')).toBeInTheDocument()
    expect(within(footer).getByText(`© ${new Date().getFullYear()} KinkAtlas. All Rights Reserved.`)).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq')
    expect(within(navigation).getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact')
    expect(within(navigation).getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/about#how-it-works')
    expect(within(navigation).getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/about#privacy')
    expect(within(navigation).getByRole('link', { name: 'Consent philosophy' })).toHaveAttribute('href', '/philosophy')
  })
})
