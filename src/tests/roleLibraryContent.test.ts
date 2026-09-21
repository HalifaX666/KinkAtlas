import { describe, expect, it } from 'vitest'
import { roleLibrary } from '../taxonomy/roleLibrary'

const PROHIBITED_PUBLIC_TEXT = /verified catalog|exact catalog|source-backed|source-derived|source association|source definition|https?:\/\//i
const PLACEHOLDER_TEXT = /\b(?:todo|tbd|lorem ipsum)\b|placeholder definition|definition (?:is )?unavailable/i

describe('public role-library content policy', () => {
  it('contains independently maintained descriptions or an intentional unavailable state', () => {
    const available = roleLibrary.roles.filter((role) => role.definition !== undefined)
    const unavailable = roleLibrary.roles.filter((role) => role.definition === undefined)

    expect(available).toHaveLength(702)
    expect(unavailable).toHaveLength(110)
    expect(new Set(available.map((role) => role.definition)).size).toBe(available.length)

    available.forEach((role) => {
      const definition = role.definition ?? ''
      const wordCount = definition.trim().split(/\s+/).length
      expect(definition, role.label).toBe(definition.trim())
      expect(wordCount, role.label).toBeGreaterThanOrEqual(20)
      expect(wordCount, role.label).toBeLessThanOrEqual(70)
      expect(definition, role.label).not.toMatch(PROHIBITED_PUBLIC_TEXT)
      expect(definition, role.label).not.toMatch(PLACEHOLDER_TEXT)
    })
  })

  it('contains no URLs or private workflow language', () => {
    expect(JSON.stringify(roleLibrary)).not.toMatch(PROHIBITED_PUBLIC_TEXT)
  })
})
