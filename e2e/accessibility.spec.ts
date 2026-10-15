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

  await page.goto('/roles')
  await expect(page.getByRole('heading', { level: 1, name: 'Explore the language of kink.' })).toBeVisible()
  await expectNoAxeViolations(page, 'Role Library')

  await page.goto('/roles/dominant')
  await expect(page.getByRole('heading', { level: 1, name: 'Dominant' })).toBeVisible()
  await expectNoAxeViolations(page, 'Curated role detail')

  await page.goto('/roles/kinkster')
  await expect(page.locator('[data-emblem-key="kinkatlas-emblem:role:kinkster-fbb59ce7"]')).toBeVisible()
  await expectNoAxeViolations(page, 'Library role detail')

  await page.goto('/viewer-request')
  await expect(page.getByRole('heading', { name: 'Create a Viewer Request' })).toBeVisible()
  await expectNoAxeViolations(page, 'Viewer Request')

  await page.goto('/capsule')
  await expect(page.getByRole('heading', { name: 'Open a private KinkAtlas Capsule' })).toBeVisible()
  await expectNoAxeViolations(page, 'Capsule viewer')

  await page.goto('/restore')
  await expect(page.getByRole('heading', { name: 'Back up or restore your private session' })).toBeVisible()
  await expectNoAxeViolations(page, 'Private Restore')

  await openPersonaResults(page, 'balanced-authority-pattern')
  await expectNoAxeViolations(page, 'Results')

  await openRoleSetBuilder(page)
  await expectNoAxeViolations(page, 'Results with Role Set Builder open')

  await page.getByRole('link', { name: /Explore this result/i }).first().click()
  await expect(page.getByRole('heading', { name: 'How this relates to your answers' })).toBeVisible()
  await expectNoAxeViolations(page, 'Role detail')
  await guards.assertClean()
})
