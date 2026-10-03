import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export async function expectNoAxeViolations(page: Page, state: string) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze()
  expect(results.violations, `${state} accessibility violations:\n${results.violations.map((violation) => `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help}`).join('\n')}`).toEqual([])
}

export { wcagTags }
