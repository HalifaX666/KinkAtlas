import { expect, test } from '@playwright/test'
import { expectNoAxeViolations } from './support/accessibility'
import { installBrowserGuards, openPersonaResults } from './support/browserGuards'

test('Secret Shared Disclosure stays in the fragment, removes it after capture, and opens locally', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await openPersonaResults(page, 'balanced-authority-pattern')
  await expect(page.locator('.current-role-cards-grid h3').first()).toBeVisible()
  const expectedRoles = await page.locator('.current-role-cards-grid h3').allTextContents()
  const artifact = await page.evaluate(async () => {
    const personasPath = '/src/tests/fixtures/assessmentPersonas.ts'
    const runnerPath = '/src/tests/helpers/assessmentPersonaRunner.ts'
    const dataPath = '/src/capsules/capsuleData.ts'
    const transportPath = '/src/capsules/capsuleTransport.ts'
    const [{ assessmentPersonas }, { evaluateAssessmentPersona }, { buildSharedDisclosurePayload }, { createSharedDisclosureArtifact }] = await Promise.all([
      import(personasPath), import(runnerPath), import(dataPath), import(transportPath),
    ])
    const persona = assessmentPersonas.find((candidate: { id: string }) => candidate.id === 'balanced-authority-pattern')!
    const evaluation = evaluateAssessmentPersona(persona)
    const created = await createSharedDisclosureArtifact(buildSharedDisclosurePayload(evaluation.yourRoleSet), window.location.origin)
    return { link: created.link, serializedEnvelope: created.serializedEnvelope, secret: created.secret }
  })

  expect(artifact.link).not.toContain(artifact.secret)
  expect(artifact.serializedEnvelope).not.toContain(artifact.secret)
  expect(new URL(artifact.link).pathname).toBe('/capsule')
  expect(new URL(artifact.link).search).toBe('')
  expect(new URL(artifact.link).hash).toMatch(/^#capsule=/)

  const documentRequests: string[] = []
  page.on('request', (request) => { if (request.isNavigationRequest()) documentRequests.push(request.url()) })
  await page.goto(artifact.link)
  await expect(page).toHaveURL(/\/capsule$/)
  expect(new URL(documentRequests.at(-1)!).hash).toBe('')
  expect(new URL(documentRequests.at(-1)!).search).toBe('')
  await expect(page.getByLabel('Encrypted Capsule text')).toHaveValue(artifact.serializedEnvelope)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)

  await page.getByLabel('Separately shared secret').fill('KA1-wrong.secret')
  await page.getByRole('button', { name: 'Unlock Capsule' }).click()
  await expect(page.getByText(/could not be unlocked/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Shared Role Set' })).toHaveCount(0)
  await page.getByLabel('Separately shared secret').fill(artifact.secret)
  await page.getByRole('button', { name: 'Unlock Capsule' }).click()
  await expect(page.getByRole('heading', { name: 'Shared Role Set' })).toBeVisible()
  expect(await page.locator('.historical-role-list > li > strong').allTextContents()).toEqual(expectedRoles)
  await expect(page.locator('.historical-role-list > li > p')).toHaveCount(expectedRoles.length)
  await expect(page.getByRole('heading', { name: 'Privacy receipt' })).toBeVisible()
  await expect(page.getByText('Raw assessment answers')).toBeVisible()
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 800 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }
  await expectNoAxeViolations(page, 'Unlocked Secret Shared Disclosure')
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'A map, not a verdict.' })).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(/\/capsule$/)
  expect(new URL(page.url()).hash).toBe('')
  await guards.assertClean()
})

test('Private Restore export requires file, secret, preview, and explicit confirmation', async ({ browser }, testInfo) => {
  test.setTimeout(60_000)
  const context = await browser.newContext()
  const exportPage = await context.newPage()
  const exportGuards = await installBrowserGuards(exportPage)
  await openPersonaResults(exportPage, 'balanced-authority-pattern')
  await expect(exportPage.locator('.current-role-cards-grid h3').first()).toBeVisible()
  const exportedRoles = await exportPage.locator('.current-role-cards-grid h3').allTextContents()
  const exportedDiscovery = await exportPage.locator('.role-grid > .role-card h3').allTextContents()
  await exportPage.evaluate(() => { history.pushState(null, '', '/restore'); dispatchEvent(new PopStateEvent('popstate')) })
  await expect(exportPage).toHaveURL(/\/restore$/)
  await expect(exportPage.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await exportPage.getByRole('button', { name: 'Create encrypted restore' }).click()
  await expect(exportPage.getByRole('button', { name: 'Show QR' })).toHaveCount(0)
  const secret = await exportPage.getByLabel('Generated restore secret').locator('code').innerText()
  const downloadPromise = exportPage.waitForEvent('download')
  await exportPage.getByRole('button', { name: 'Download restore file' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('kinkatlas-private-restore.kinkatlas-restore')
  const restorePath = await download.path()
  expect(restorePath).toBeTruthy()
  const restoreFile = testInfo.outputPath(download.suggestedFilename())
  await download.saveAs(restoreFile)
  await exportGuards.assertClean()

  const importPage = await context.newPage()
  const importGuards = await installBrowserGuards(importPage)
  await openPersonaResults(importPage, 'multiple-hard-limits-pattern')
  await expect(importPage.locator('.current-role-cards-grid h3').first()).toBeVisible()
  const existingRoles = await importPage.locator('.current-role-cards-grid h3').allTextContents()
  await importPage.evaluate(() => { history.pushState(null, '', '/restore'); dispatchEvent(new PopStateEvent('popstate')) })
  await importPage.getByRole('button', { name: 'Private Restore file', exact: true }).setInputFiles(restoreFile)
  await expect(importPage.getByText(/Encrypted file validated/)).toBeVisible()
  await importPage.getByLabel('Restore secret').fill('KA1-wrong.secret')
  await importPage.getByRole('button', { name: 'Unlock preview' }).click()
  await expect(importPage.getByText(/could not be unlocked/)).toBeVisible()
  await expect(importPage.getByRole('heading', { name: 'Restore preview' })).toHaveCount(0)
  await importPage.getByLabel('Restore secret').fill(secret)
  await importPage.getByRole('button', { name: 'Unlock preview' }).click()
  await expect(importPage.getByRole('heading', { name: 'Restore preview' })).toBeFocused()
  for (const width of [320, 375, 430]) {
    await importPage.setViewportSize({ width, height: 800 })
    await expect.poll(() => importPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }
  await expectNoAxeViolations(importPage, 'Private Restore confirmation preview')
  await expect(importPage.getByText(/Historical result included/)).toBeVisible()
  await expect(importPage.getByRole('heading', { name: 'Your saved KinkAtlas result' })).toHaveCount(0)
  await importPage.getByRole('button', { name: 'Cancel' }).click()
  await expect(importPage.getByRole('heading', { name: 'Restore preview' })).toHaveCount(0)
  await importPage.goBack()
  await expect(importPage.getByRole('heading', { name: 'A map, not a verdict.' })).toBeVisible()
  expect(await importPage.locator('.current-role-cards-grid h3').allTextContents()).toEqual(existingRoles)

  await importPage.evaluate(() => { history.pushState(null, '', '/restore'); dispatchEvent(new PopStateEvent('popstate')) })
  await importPage.getByRole('button', { name: 'Private Restore file', exact: true }).setInputFiles(restoreFile)
  await importPage.getByLabel('Restore secret').fill(secret)
  await importPage.getByRole('button', { name: 'Unlock preview' }).click()
  await expect(importPage.getByRole('heading', { name: 'Restore preview' })).toBeFocused()
  await importPage.getByRole('button', { name: 'Confirm restore' }).click()
  await expect(importPage.getByRole('status')).toContainText(/Restore complete/)
  await expect(importPage.getByRole('status')).toBeFocused()
  await expect(importPage.getByRole('heading', { name: 'Your saved KinkAtlas result' })).toBeVisible()
  expect(await importPage.locator('.historical-role-list > li > strong').allTextContents()).toEqual(exportedRoles)
  await expect(importPage.locator('link[rel="canonical"]')).toHaveCount(0)
  await importPage.goBack()
  await expect(importPage.getByRole('heading', { name: 'A map, not a verdict.' })).toBeVisible()
  expect(await importPage.locator('.current-role-cards-grid h3').allTextContents()).toEqual(exportedRoles)
  expect(await importPage.locator('.role-grid > .role-card h3').allTextContents()).toEqual(exportedDiscovery)
  await importGuards.assertClean()
  await context.close()
})
