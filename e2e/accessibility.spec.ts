import { expect, test } from '@playwright/test'
import { expectNoAxeViolations } from './support/accessibility'
import { installBrowserGuards, openPersonaResults, openRoleSetBuilder } from './support/browserGuards'

test('high-value application states have no WCAG A/AA axe violations', async ({ page }) => {
  const guards = await installBrowserGuards(page)

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expectNoAxeViolations(page, 'Home')

  await page.goto('/assessment')
  await expect(page.getByRole('button', { name: /begin/i })).toBeVisible()
  await expectNoAxeViolations(page, 'Assessment onboarding')

  await page.getByRole('button', { name: /begin/i }).click()
  await expect(page.locator('fieldset.question-card')).toBeVisible()
  await expectNoAxeViolations(page, 'Assessment active question')

  await openPersonaResults(page, 'balanced-authority-pattern')
  await expectNoAxeViolations(page, 'Results')

  await openRoleSetBuilder(page)
  await expectNoAxeViolations(page, 'Results with Role Set Builder open')

  await page.getByRole('link', { name: /Explore this result/i }).first().click()
  await expect(page.getByRole('heading', { name: 'Evidence from your answers' })).toBeVisible()
  await expectNoAxeViolations(page, 'Role detail')
  await guards.assertClean()
})
