import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export const THEME_STORAGE_KEY = 'kinkatlas-theme'
export const themePreferences = ['system', 'light', 'dark'] as const

export type ThemePreference = typeof themePreferences[number]
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function isThemePreference(value: string | null): value is ThemePreference {
  return themePreferences.some((preference) => preference === value)
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function initialPreference(): ThemePreference {
  const bootPreference = document.documentElement.dataset.themePreference
  if (bootPreference && isThemePreference(bootPreference)) return bootPreference

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function applyTheme(preference: ThemePreference, resolvedTheme: ResolvedTheme) {
  const root = document.documentElement
  root.dataset.themePreference = preference
  root.dataset.theme = resolvedTheme
  root.style.colorScheme = resolvedTheme
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'light' ? '#f6efe4' : '#121011')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, updatePreference] = useState<ThemePreference>(initialPreference)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => preference === 'system' ? systemTheme() : preference)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: light)')
    const resolve = () => setResolvedTheme(preference === 'system' ? systemTheme() : preference)
    resolve()
    if (preference !== 'system' || !media) return
    media.addEventListener?.('change', resolve)
    return () => media.removeEventListener?.('change', resolve)
  }, [preference])

  useEffect(() => applyTheme(preference, resolvedTheme), [preference, resolvedTheme])

  const setPreference = (nextPreference: ThemePreference) => {
    updatePreference(nextPreference)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference)
    } catch {
      // Theme selection remains usable for this tab when preference storage is unavailable.
    }
  }

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within ThemeProvider')
  return value
}
