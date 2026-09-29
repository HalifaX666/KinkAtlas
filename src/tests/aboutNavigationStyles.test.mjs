import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

describe('About contents navigation styles', () => {
  it('limits the sticky right rail to wide viewports and preserves reduced-motion behavior', () => {
    const wideLayout = css.match(/@media \(min-width: 901px\) \{([\s\S]*?)\n\}/)?.[1] ?? ''
    expect(wideLayout).toContain('.about-contents.is-docked')
    expect(wideLayout).toContain('position: sticky')
    expect(wideLayout).toContain('grid-template-columns')
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.about-contents\.is-docked \{\s*animation: none;/s)
  })
})

describe('accessibility CSS safeguards', () => {
  it('defines the shared accent token and keeps normal page text selectable', () => {
    expect(css).toMatch(/--accent:\s*var\(--gold\);/)
    expect(css).not.toMatch(/body\s*\{[^}]*user-select:\s*none;/s)
    expect(css).toMatch(/\.button,[\s\S]*summary\s*\{\s*user-select:\s*none;/)
  })

  it('expresses the intended visible first mobile navigation link once', () => {
    expect(css.match(/\.site-header nav a:first-child/g)).toHaveLength(1)
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.site-header nav a:first-child\s*\{\s*display:\s*inline-flex;/)
  })
})
