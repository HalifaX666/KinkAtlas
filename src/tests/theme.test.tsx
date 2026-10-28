import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeControl } from '../components/ThemeControl'
import { AssessmentProvider, useAssessment } from '../context/AssessmentContext'
import { THEME_STORAGE_KEY, ThemeProvider } from '../theme/ThemeContext'

let systemPrefersLight = false
const systemListeners = new Set<() => void>()

function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: systemPrefersLight,
      media: '(prefers-color-scheme: light)',
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => systemListeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => systemListeners.delete(listener),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function AssessmentProbe() {
  const { answers, answerDiscovery } = useAssessment()
  return <><output aria-label="saved answer">{answers.discovery['d-power-give'] ?? 'none'}</output><button type="button" onClick={() => answerDiscovery('d-power-give', 'strong')}>Add answer</button></>
}

describe('application theme preference', () => {
  beforeEach(() => {
    systemPrefersLight = false
    systemListeners.clear()
    localStorage.clear()
    delete document.documentElement.dataset.theme
    delete document.documentElement.dataset.themePreference
    installMatchMedia()
  })

  it('defaults to System without persisting a value and follows live OS changes', () => {
    render(<ThemeProvider><ThemeControl /></ThemeProvider>)

    expect(screen.getByLabelText('Theme preference')).toHaveValue('system')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()

    systemPrefersLight = true
    act(() => systemListeners.forEach((listener) => listener()))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('persists explicit Light and Dark choices and ignores later OS changes', () => {
    render(<ThemeProvider><ThemeControl /></ThemeProvider>)
    const control = screen.getByLabelText('Theme preference')

    fireEvent.change(control, { target: { value: 'light' } })
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    systemPrefersLight = false
    act(() => systemListeners.forEach((listener) => listener()))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')

    fireEvent.change(control, { target: { value: 'dark' } })
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('restores a valid persisted preference and rejects an unknown value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    const first = render(<ThemeProvider><ThemeControl /></ThemeProvider>)
    expect(screen.getByLabelText('Theme preference')).toHaveValue('light')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    first.unmount()

    localStorage.setItem(THEME_STORAGE_KEY, 'neon')
    delete document.documentElement.dataset.themePreference
    render(<ThemeProvider><ThemeControl /></ThemeProvider>)
    expect(screen.getByLabelText('Theme preference')).toHaveValue('system')
  })

  it('changes presentation without changing assessment state or triggering network storage', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const indexedDbOpen = globalThis.indexedDB ? vi.spyOn(globalThis.indexedDB, 'open') : undefined
    render(<ThemeProvider><AssessmentProvider><ThemeControl /><AssessmentProbe /></AssessmentProvider></ThemeProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Add answer' }))
    expect(screen.getByRole('status', { name: 'saved answer' })).toHaveTextContent('strong')
    fireEvent.change(screen.getByLabelText('Theme preference'), { target: { value: 'light' } })
    expect(screen.getByRole('status', { name: 'saved answer' })).toHaveTextContent('strong')
    expect(fetchSpy).not.toHaveBeenCalled()
    if (indexedDbOpen) expect(indexedDbOpen).not.toHaveBeenCalled()
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
