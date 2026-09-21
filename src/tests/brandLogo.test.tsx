import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Shell } from '../components/Shell'

describe('shared brand logo', () => {
  it('uses the same BrandLogo component for header and footer variants', () => {
    render(<MemoryRouter><Routes><Route element={<Shell />}><Route index element={<p>Page content</p>} /></Route></Routes></MemoryRouter>)

    const headerLogo = screen.getByTestId('brand-logo-header')
    const footerLogo = screen.getByTestId('brand-logo-footer')
    expect(headerLogo).toHaveTextContent('Kink Atlas')
    expect(footerLogo).toHaveTextContent('Kink Atlas')
    expect(headerLogo.querySelector('svg')).toBeInTheDocument()
    expect(footerLogo.querySelector('svg')).toBeInTheDocument()
  })
})
