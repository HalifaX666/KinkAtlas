import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, installBrowserGuards, openPersonaResults, roleSetLabels } from './support/browserGuards'

test('Light page surfaces stay warm while deliberate dark graphics keep readable foregrounds', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await page.addInitScript(() => window.localStorage.setItem('kinkatlas-theme', 'light'))
  await page.goto('/')

  const homeStyles = await page.evaluate(() => {
    const editorial = getComputedStyle(document.querySelector('.editorial-band')!)
    const core = getComputedStyle(document.querySelector('.atlas-core')!)
    const title = getComputedStyle(document.querySelector('.atlas-core strong')!)
    const note = getComputedStyle(document.querySelector('.atlas-core small')!)
    return {
      editorialBackground: editorial.backgroundImage,
      coreBackground: core.backgroundImage,
      titleColor: title.color,
      noteColor: note.color,
    }
  })
  expect(homeStyles.editorialBackground).toContain('rgb(238, 226, 210)')
  expect(homeStyles.editorialBackground).toContain('rgb(255, 250, 242)')
  expect(homeStyles.coreBackground).toContain('rgb(43, 32, 37)')
  expect(homeStyles.titleColor).toBe('rgb(244, 239, 235)')
  expect(homeStyles.noteColor).toBe('rgb(185, 174, 175)')

  for (const width of [320, 375, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expectNoHorizontalOverflow(page)
    await expect(page.locator('.atlas-core strong')).toHaveText('Your map')
    for (const label of ['Structure', 'Play', 'Care']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
  }

  await page.goto('/assessment')
  await page.getByRole('button', { name: /begin/i }).click()
  await expect(page.locator('fieldset.question-card')).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await openPersonaResults(page, 'balanced-authority-pattern')
  const lightReflection = await page.locator('.editorial-band').evaluate((element) => getComputedStyle(element).backgroundImage)
  expect(lightReflection).toContain('rgb(238, 226, 210)')
  expect(lightReflection).toContain('rgb(255, 250, 242)')

  await page.getByLabel('Theme preference').selectOption('dark')
  const darkReflection = await page.locator('.editorial-band').evaluate((element) => getComputedStyle(element).backgroundImage)
  expect(darkReflection).toContain('rgb(33, 26, 29)')
  expect(darkReflection).toContain('rgb(24, 21, 23)')
  await guards.assertClean()
})

test('theme selection persists without changing Results or causing network activity', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await openPersonaResults(page, 'balanced-authority-pattern')
  const initialRoles = await roleSetLabels(page, '.current-role-cards-grid > li h3')
  const theme = page.getByLabel('Theme preference')

  await theme.selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('heading', { name: 'A map, not a verdict.' })).toBeVisible()

  const panel = page.locator('.role-set-export-section')
  const copy = panel.locator(':scope > div').first()
  const actions = panel.locator('.role-set-primary-actions')
  const save = panel.getByRole('button', { name: 'Save my assessment' })
  const share = panel.getByRole('button', { name: 'Share', exact: true })
  const [copyBox, actionsBox, saveBox, shareBox] = await Promise.all([copy.boundingBox(), actions.boundingBox(), save.boundingBox(), share.boundingBox()])
  expect(copyBox && actionsBox && saveBox && shareBox).toBeTruthy()
  expect(Math.abs((copyBox!.y + copyBox!.height / 2) - (actionsBox!.y + actionsBox!.height / 2))).toBeLessThanOrEqual(2)
  expect(Math.abs(saveBox!.height - shareBox!.height)).toBeLessThanOrEqual(1)
  expect(Math.abs((saveBox!.y + saveBox!.height / 2) - (shareBox!.y + shareBox!.height / 2))).toBeLessThanOrEqual(1)

  await theme.selectOption('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await roleSetLabels(page, '.current-role-cards-grid > li h3')).toEqual(initialRoles)

  await page.getByRole('button', { name: 'Share', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Share your KinkAtlas' })
  await expect(dialog).toBeVisible()
  for (const label of ['Public Card', 'Quick Summary', 'Full Reflection', 'Link & QR']) {
    await expect(dialog.getByRole('button', { name: new RegExp(label.replace('&', '\\&'), 'i') })).toBeVisible()
  }
  await page.keyboard.press('Escape')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('heading', { name: 'A map, not a verdict.' })).toBeVisible()
  await expect(page.locator('.current-role-cards-grid > li h3').first()).toBeVisible()
  expect(await roleSetLabels(page, '.current-role-cards-grid > li h3')).toEqual(initialRoles)

  await page.goto('/my-kinkatlas')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('heading', { name: 'Saved assessments' })).toBeVisible()
  await guards.assertClean()
})

test('Light theme remains usable without overflow across supported widths', async ({ page }) => {
  test.setTimeout(40_000)
  const guards = await installBrowserGuards(page)
  await openPersonaResults(page, 'balanced-authority-pattern')
  await page.getByLabel('Theme preference').selectOption('light')

  for (const width of [320, 375, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expectNoHorizontalOverflow(page)
    const save = page.getByRole('button', { name: 'Save my assessment' })
    const share = page.getByRole('button', { name: 'Share', exact: true })
    await expect(save).toBeVisible()
    await expect(share).toBeVisible()
    if (width <= 430) {
      const [saveBox, shareBox] = await Promise.all([save.boundingBox(), share.boundingBox()])
      expect(Math.abs(saveBox!.width - shareBox!.width)).toBeLessThanOrEqual(1)
    }
  }

  await page.setViewportSize({ width: 320, height: 900 })
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Share your KinkAtlas' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await guards.assertClean()
})
