import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, installBrowserGuards, namedRoleSetLabels, openPersonaResults, openRoleSetBuilder } from './support/browserGuards'

test('targeted assessment interaction remains usable', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await page.goto('/assessment')
  await page.getByRole('button', { name: /begin/i }).click()

  const question = page.locator('fieldset.question-card')
  const firstQuestionId = await question.getByRole('radio').first().getAttribute('name')
  await expect(question.locator('legend')).toBeVisible()
  await question.locator('.answer-option').first().click()
  await expect.poll(() => question.getByRole('radio').first().getAttribute('name')).not.toBe(firstQuestionId)

  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(question.getByRole('radio').first()).toHaveAttribute('name', firstQuestionId ?? '')
  await expectNoHorizontalOverflow(page)
  await guards.assertClean()
})

test('targeted Results and role navigation preserve the current role set', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await openPersonaResults(page, 'balanced-authority-pattern')
  await openRoleSetBuilder(page)
  const before = await namedRoleSetLabels(page, 'Current role set')

  await page.getByRole('link', { name: /Explore this result/i }).first().click()
  await expect(page.getByRole('heading', { name: 'Evidence from your answers' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to your map' }).click()
  await expect(page.getByRole('heading', { name: 'Role discovery' })).toBeVisible()
  await openRoleSetBuilder(page)

  expect(await namedRoleSetLabels(page, 'Current role set')).toEqual(before)
  await expectNoHorizontalOverflow(page)
  await guards.assertClean()
})

test('targeted mobile interaction has no horizontal overflow', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/assessment')
  await page.getByRole('button', { name: /begin/i }).click()
  await expect(page.locator('fieldset.question-card')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await guards.assertClean()
})
