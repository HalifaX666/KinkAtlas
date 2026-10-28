import { expect, test } from '@playwright/test'
import { expectNoAxeViolations } from './support/accessibility'
import { installBrowserGuards, openPersonaResults, openRoleSetBuilder } from './support/browserGuards'

test('high-value application states have no WCAG A/AA axe violations', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('kinkatlas-theme', 'dark'))
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
  await page.getByRole('button', { name: 'Create Viewer Request' }).click()
  await expect(page.locator('.viewer-word-keyprint').first()).toBeVisible()
  await expectNoAxeViolations(page, 'Viewer Request with Four-Word Keyprint')

  await page.goto('/capsule')
  await expect(page.getByRole('heading', { name: 'Open an encrypted KinkAtlas Capsule' })).toBeVisible()
  await expectNoAxeViolations(page, 'Capsule viewer')

  await page.goto('/restore')
  await expect(page.getByRole('heading', { name: 'Back up or restore your private session' })).toBeVisible()
  await expectNoAxeViolations(page, 'Private Restore')

  await openPersonaResults(page, 'balanced-authority-pattern')
  await expectNoAxeViolations(page, 'Results')

  const shareButton = page.getByRole('button', { name: 'Share', exact: true })
  await shareButton.click()
  const shareDialog = page.getByRole('dialog', { name: 'Share your KinkAtlas' })
  await expect(shareDialog).toBeVisible()
  await expectNoAxeViolations(page, 'Share options')
  await shareDialog.getByRole('button', { name: /Link & QR/i }).click()
  await expect(shareDialog.getByRole('heading', { name: 'Link & QR' })).toBeVisible()
  await expectNoAxeViolations(page, 'Link and QR before creation')
  await page.keyboard.press('Escape')
  await expect(shareDialog).toBeHidden()
  await expect(shareButton).toBeFocused()

  await openRoleSetBuilder(page)
  await expectNoAxeViolations(page, 'Results with Role Set Builder open')

  await page.getByRole('link', { name: /Explore this result/i }).first().click()
  await expect(page.getByRole('heading', { name: 'How this relates to your answers' })).toBeVisible()
  await expectNoAxeViolations(page, 'Role detail')
  await guards.assertClean()
})

test('Light theme has no WCAG A/AA axe violations on key public and private surfaces', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('kinkatlas-theme', 'light'))
  const guards = await installBrowserGuards(page)

  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expectNoAxeViolations(page, 'Light Home')

  await page.goto('/assessment')
  await page.getByRole('button', { name: /begin/i }).click()
  await expect(page.locator('fieldset.question-card')).toBeVisible()
  await expectNoAxeViolations(page, 'Light Assessment question')

  await page.goto('/about')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expectNoAxeViolations(page, 'Light About')

  await page.goto('/faq')
  await expect(page.getByRole('heading', { name: 'Common questions, clear answers.' })).toBeVisible()
  await expectNoAxeViolations(page, 'Light FAQ')

  await openPersonaResults(page, 'balanced-authority-pattern')
  await expectNoAxeViolations(page, 'Light Results')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Share your KinkAtlas' })
  await expectNoAxeViolations(page, 'Light Share options')
  await dialog.getByRole('button', { name: /Link & QR/i }).click()
  await expectNoAxeViolations(page, 'Light Link and QR before creation')
  await page.keyboard.press('Escape')

  await page.goto('/my-kinkatlas')
  await expect(page.getByRole('heading', { name: 'Saved assessments' })).toBeVisible()
  await expectNoAxeViolations(page, 'Light My KinkAtlas')
  await guards.assertClean()
})
