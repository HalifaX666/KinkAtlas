import { expect, test } from '@playwright/test'
import { expectNoAxeViolations } from './support/accessibility'
import { installBrowserGuards, openPersonaResults } from './support/browserGuards'

test('Reveal Request permits an explicit partial Viewer-Locked response and nothing automatic', async ({ browser }) => {
  test.setTimeout(60_000)
  const recipientContext = await browser.newContext()
  const senderContext = await browser.newContext()
  const recipientPage = await recipientContext.newPage()
  const senderPage = await senderContext.newPage()
  const recipientGuards = await installBrowserGuards(recipientPage)
  const senderGuards = await installBrowserGuards(senderPage)

  await recipientPage.goto('/viewer-request')
  await recipientPage.getByLabel('Optional local label').fill('Private Reveal recipient')
  await recipientPage.getByRole('button', { name: 'Create Viewer Request' }).click()
  await recipientPage.getByRole('link', { name: 'Create a Reveal Request' }).click()
  await expect(recipientPage).toHaveURL(/\/reveal-request$/u)
  await expect(recipientPage.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(recipientPage.locator('link[rel="canonical"]')).toHaveCount(0)
  const sectionChoices = recipientPage.getByRole('group', { name: 'Sections to request' })
  await sectionChoices.getByRole('checkbox', { name: /^Current Role Set/i }).check()
  await sectionChoices.getByRole('checkbox', { name: /^Role definitions/i }).check()
  await recipientPage.getByRole('button', { name: 'Review and create request' }).click()
  await expect(recipientPage.getByRole('heading', { name: 'Send this Reveal Request' })).toBeFocused()
  const revealLink = await recipientPage.getByLabel('Reveal Request link').inputValue()
  const revealText = await recipientPage.getByLabel('Reveal Request text').inputValue()
  const fullSizes = await recipientPage.evaluate(({ text, link }) => ({
    serializedBytes: new TextEncoder().encode(text).length,
    linkBytes: new TextEncoder().encode(link).length,
  }), { text: revealText, link: revealLink })
  expect(revealText).not.toContain('Private Reveal recipient')
  expect(revealText).not.toMatch(/discovery|refinement|readiness|boundar|negotiation|navigation|privateKey/iu)
  expect(new URL(revealLink).pathname).toBe('/reveal-request')
  expect(new URL(revealLink).search).toBe('')
  expect(new URL(revealLink).hash).toMatch(/^#request=/u)
  const keyprint = await recipientPage.locator('.viewer-word-keyprint').first().innerText()
  await recipientPage.getByRole('button', { name: 'Copy request link' }).click()
  await expect(recipientPage.getByRole('status')).toContainText(/Reveal Request link copied|Copy is unavailable/i)
  const requestDownload = recipientPage.waitForEvent('download')
  await recipientPage.getByRole('button', { name: 'Download request file' }).click()
  expect((await requestDownload).suggestedFilename()).toBe('kinkatlas-reveal-request.kinkatlas-reveal-request')

  await sectionChoices.getByRole('checkbox', { name: /^Role definitions/i }).uncheck()
  await recipientPage.getByRole('button', { name: 'Review and create request' }).click()
  const oneSectionText = await recipientPage.getByLabel('Reveal Request text').inputValue()
  const oneSectionLink = await recipientPage.getByLabel('Reveal Request link').inputValue()
  const oneSectionSizes = await recipientPage.evaluate(({ text, link }) => ({
    serializedBytes: new TextEncoder().encode(text).length,
    linkBytes: new TextEncoder().encode(link).length,
  }), { text: oneSectionText, link: oneSectionLink })
  const qrButton = recipientPage.getByRole('button', { name: 'Show QR' })
  let qr: { version: string | null; modules: string | null; bytes: string | null } | null = null
  if (await qrButton.count()) {
    await qrButton.click()
    const qrImage = recipientPage.getByRole('img', { name: 'QR code for Reveal Request' })
    qr = {
      version: await qrImage.getAttribute('data-qr-version'),
      modules: await qrImage.getAttribute('data-qr-modules'),
      bytes: await qrImage.getAttribute('data-qr-bytes'),
    }
  } else {
    await expect(recipientPage.getByText(/too large for a reliable single QR code/i)).toBeVisible()
  }
  console.log(`Reveal Request transport metrics: ${JSON.stringify({ oneSection: oneSectionSizes, full: fullSizes, qr })}`)

  for (const width of [320, 375, 430]) {
    await recipientPage.setViewportSize({ width, height: 800 })
    await expect.poll(() => recipientPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }
  await expectNoAxeViolations(recipientPage, 'Reveal Request creation')

  await openPersonaResults(senderPage, 'balanced-authority-pattern')
  const expectedRoles = await senderPage.locator('.current-role-cards-grid h3').allTextContents()
  await senderPage.getByRole('button', { name: 'Create my role cards' }).click()
  const dialog = senderPage.getByRole('dialog', { name: 'Export & Share' })
  await dialog.getByRole('button', { name: /Encrypted Capsule/i }).click()
  await dialog.getByText('Review a Reveal Request').click()
  const requestInput = dialog.getByLabel('Reveal Request link or text')
  await requestInput.fill('not-a-valid-request')
  await dialog.getByRole('button', { name: 'Review request' }).click()
  await expect(dialog.getByRole('status')).toContainText(/incomplete or invalid/i)
  await expect(dialog.getByRole('status')).not.toContainText('not-a-valid-request')

  await requestInput.fill(revealLink)
  await dialog.getByRole('button', { name: 'Review request' }).click()
  await expect(dialog.getByRole('heading', { name: 'Choose what to share' })).toBeFocused()
  await expect(dialog.getByText(keyprint)).toBeVisible()
  const choices = dialog.getByRole('group', { name: 'Select requested sections to share' })
  await expect(choices.getByRole('checkbox', { name: /^Current Role Set/i })).toBeChecked()
  await expect(choices.getByRole('checkbox', { name: /^Role definitions/i })).toBeChecked()

  let downloads = 0
  senderPage.on('download', () => { downloads += 1 })
  await dialog.getByRole('button', { name: 'Decline' }).click()
  await expect(dialog.getByRole('status')).toContainText(/No disclosure artifact was created/i)
  await expect(requestInput).toBeFocused()
  await expect(dialog.getByLabel('Viewer-Locked Capsule link')).toHaveCount(0)
  expect(downloads).toBe(0)

  await requestInput.fill(revealLink)
  await dialog.getByRole('button', { name: 'Review request' }).click()
  await choices.getByRole('checkbox', { name: /^Role definitions/i }).uncheck()
  await expect(dialog.locator('.reveal-request-receipt')).toContainText('Role definitions')
  await dialog.getByRole('button', { name: 'Share selected' }).click()
  await expect(dialog.getByRole('heading', { name: 'Viewer-Locked response ready' })).toBeFocused()
  const capsuleLink = await dialog.getByLabel('Viewer-Locked Capsule link').inputValue()
  await expect(dialog.locator('.reveal-request-receipt')).toContainText('Current Role Set')
  await expectNoAxeViolations(senderPage, 'Reveal Request partial response')
  for (const width of [320, 375, 430]) {
    await senderPage.setViewportSize({ width, height: 800 })
    await expect.poll(() => senderPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }

  await recipientPage.goto(capsuleLink)
  await expect(recipientPage).toHaveURL(/\/capsule$/u)
  await expect(recipientPage.getByRole('heading', { name: 'Shared Role Set' })).toBeVisible()
  expect(await recipientPage.locator('.historical-role-list > li > strong').allTextContents()).toEqual(expectedRoles)
  await expect(recipientPage.locator('.historical-role-list > li > p')).toHaveCount(0)
  await expect(recipientPage.getByText('Role definitions')).toBeVisible()
  await expect(recipientPage.getByText('Raw assessment answers')).toBeVisible()

  await recipientGuards.assertClean()
  await senderGuards.assertClean()
  await recipientContext.close()
  await senderContext.close()
})
