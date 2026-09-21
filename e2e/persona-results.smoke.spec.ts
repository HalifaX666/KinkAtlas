import { expect, test } from '@playwright/test'
import { expectRenderedSanity, installBrowserGuards, openPersonaResults, openRoleSetBuilder, roleSetLabels } from './support/browserGuards'

test('Persona smoke: completed assessment renders coherent Results', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await openPersonaResults(page, 'balanced-authority-pattern')

  await expect(page.getByRole('heading', { name: 'Strongest dimensions' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Role discovery' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Reflection' })).toBeVisible()
  await expect(page.getByText(/Wants & boundaries/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Conversation starters' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create my role cards' })).toBeVisible()

  await openRoleSetBuilder(page)
  const suggested = await roleSetLabels(page, '.profile-recommendation-summary > ol > li strong')
  const current = await roleSetLabels(page, '.profile-role-list > li > div:first-child > strong')
  expect(suggested.length).toBeGreaterThan(0)
  expect(current).toEqual(suggested)

  await expectRenderedSanity(page)
  await guards.assertClean()
})

test('Persona smoke: edited Your Role Set drives Export & Share', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await openPersonaResults(page, 'balanced-authority-pattern')
  await openRoleSetBuilder(page)

  const before = await roleSetLabels(page, '.profile-role-list > li > div:first-child > strong')
  expect(before.length).toBeGreaterThan(1)
  const replacedRole = before[1]

  await page.getByRole('button', { name: `Replace ${replacedRole}` }).click()
  await page.getByRole('searchbox', { name: 'Search roles' }).fill('Soft Dom')
  await page.getByRole('button', { name: 'Replace with Soft Dom', exact: true }).click()
  await expect(page.getByText('Soft Dom selected as a replacement. You can reorder it or make it primary.')).toBeVisible()
  await page.getByRole('button', { name: 'Move Soft Dom up' }).click()

  const edited = await roleSetLabels(page, '.profile-role-list > li > div:first-child > strong')
  expect(edited[0]).toBe('Soft Dom')
  expect(edited).not.toContain(replacedRole)

  await page.getByRole('button', { name: 'Create my role cards' }).click()
  const dialog = page.getByRole('dialog', { name: 'Export & Share' })
  await expect(dialog).toBeVisible()
  const exported = await roleSetLabels(page, '.role-card-options > label > span:last-child > strong')
  expect(exported).toEqual(edited)
  expect(exported).not.toContain(replacedRole)

  const manualRole = dialog.locator('.role-card-options > label').filter({ hasText: 'Soft Dom' })
  await expect(manualRole).toContainText('Added by you')
  await expect(manualRole).toContainText('No assessment score or confidence')
  await expect(manualRole).not.toContainText(/Strong alignment|High confidence|Medium confidence|evidence breadth/i)
  await expect(dialog).toContainText('manually post to FetLife')
  await expect(dialog).toContainText('never connects to or posts to a FetLife profile')

  await expectRenderedSanity(page)
  await guards.assertClean()
})

test('Persona smoke: hard-limit profile preserves coherent Results', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await openPersonaResults(page, 'multiple-hard-limits-pattern')
  await openRoleSetBuilder(page)

  await expect(page.getByRole('heading', { name: 'Role discovery' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Suggested role set' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your role set', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Reflection' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Independent by design' })).toBeVisible()
  await expect(page.getByText('These choices guide activity suggestions but never alter role alignment or ordering.')).toBeVisible()
  await expect(page.locator('.boundary-result').filter({ hasText: 'Hard limit' })).toHaveCount(5)
  await expect(page.getByText('You marked this as a hard boundary. It remains off the table unless you independently change it.').first()).toBeVisible()

  await expectRenderedSanity(page)
  await guards.assertClean()
})
