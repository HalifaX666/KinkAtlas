import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { baseDescription, DocumentMetadata } from '../components/DocumentMetadata'

const originalHead = document.head.innerHTML

afterEach(() => {
  cleanup()
  document.head.innerHTML = originalHead
})

function renderMetadata(path: string) {
  render(<MemoryRouter initialEntries={[path]}><DocumentMetadata /><main aria-label="route content" /></MemoryRouter>)
  expect(screen.getByRole('main', { name: 'route content' })).toBeInTheDocument()
}

describe('route document metadata', () => {
  it.each([
    ['/', 'KinkAtlas — Explore your kink vocabulary', 'index, follow'],
    ['/about', 'About KinkAtlas', 'index, follow'],
    ['/about/', 'About KinkAtlas', 'index, follow'],
    ['/faq', 'KinkAtlas FAQ', 'index, follow'],
    ['/contact', 'Contact — KinkAtlas', 'index, follow'],
    ['/philosophy', 'Consent philosophy — KinkAtlas', 'index, follow'],
    ['/assessment', 'Explore — KinkAtlas', 'index, follow'],
    ['/results', 'Your kink map — KinkAtlas', 'noindex, nofollow'],
  ])('sets safe metadata for %s', (path, title, robots) => {
    renderMetadata(path)
    expect(document.title).toBe(title)
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', robots)
    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute('content', title)
    expect(document.querySelector('meta[name="twitter:title"]')).toHaveAttribute('content', title)
  })

  it('uses a stable base description without assessment state', () => {
    renderMetadata('/')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', baseDescription)
    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute('content', '/social-preview.png')
    expect(document.querySelector('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
    expect(document.querySelector('link[rel="canonical"]')).not.toBeInTheDocument()
  })

  it('uses only the reviewed role name in role metadata and keeps role pages out of the index', () => {
    renderMetadata('/roles/dominant')
    expect(document.title).toBe('Dominant — KinkAtlas')
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).not.toMatch(/alignment|confidence|score|answer/i)
  })

  it('marks unknown routes noindex without echoing the invalid path', () => {
    renderMetadata('/not-a-real-route/private-value')
    expect(document.title).toBe('Page not found — KinkAtlas')
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    expect(document.head.textContent).not.toContain('private-value')
  })
})
