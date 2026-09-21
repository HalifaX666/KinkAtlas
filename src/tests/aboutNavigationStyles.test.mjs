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
