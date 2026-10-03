import { describe, expect, it } from 'vitest'
import { analyzeCssCustomProperties } from './check-design-tokens.mjs'

describe('design-token validation', () => {
  it('accepts tokens defined anywhere in the application CSS surface', () => {
    const result = analyzeCssCustomProperties([
      { file: 'tokens.css', css: ':root { --gold: #d7a85f; --accent: var(--gold); }' },
      { file: 'components.css', css: '.link { color: var(--accent); }' },
    ])

    expect(result.undefinedReferences).toEqual([])
  })

  it('reports an undefined application token even when a fallback is present', () => {
    const result = analyzeCssCustomProperties([
      { file: 'components.css', css: '.link { color: var(--accent, rebeccapurple); }' },
    ])

    expect(result.undefinedReferences).toEqual([
      { file: 'components.css', token: '--accent', hasFallback: true },
    ])
  })

  it('supports a narrow explicit allowlist for externally supplied tokens', () => {
    const result = analyzeCssCustomProperties(
      [{ file: 'embed.css', css: '.embed { color: var(--host-color, currentColor); }' }],
      new Set(['--host-color']),
    )

    expect(result.undefinedReferences).toEqual([])
  })
})
