import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'public/theme-init.js'), 'utf8')

function initializeTheme(stored, systemPrefersLight) {
  const root = { dataset: {}, style: {} }
  runInNewContext(source, {
    window: {
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: systemPrefersLight }),
    },
    document: { documentElement: root },
    Set,
  })
  return root
}

describe('pre-paint theme initialization', () => {
  it('resolves System from the OS preference before React starts', () => {
    expect(initializeTheme(null, false).dataset).toEqual({ themePreference: 'system', theme: 'dark' })
    expect(initializeTheme(null, true).dataset).toEqual({ themePreference: 'system', theme: 'light' })
  })

  it('honors stored Light and Dark preferences over the OS', () => {
    expect(initializeTheme('light', false).dataset).toEqual({ themePreference: 'light', theme: 'light' })
    expect(initializeTheme('dark', true).dataset).toEqual({ themePreference: 'dark', theme: 'dark' })
  })

  it('falls back safely when the stored preference is malformed', () => {
    expect(initializeTheme('unknown-theme', true).dataset).toEqual({ themePreference: 'system', theme: 'light' })
  })
})
