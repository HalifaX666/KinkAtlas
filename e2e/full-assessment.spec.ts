import { expect, test } from '@playwright/test'
import { expectRenderedSanity, installBrowserGuards, namedRoleSetLabels, openRoleSetBuilder } from './support/browserGuards'
import { completeAssessmentThroughBrowser } from './support/fullAssessment'

test('Full journey: Dominant vocabulary and a hard limit remain independent', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  const trace = await completeAssessmentThroughBrowser(page, {
    discovery: {
      'd-power-give': 'strong',
      'r-authority-style': 'strong',
      'r-lead': 'strong',
    },
    discoveryFallback: 'no',
    refinement: { 'ref-power-exchange-vocabulary': 'dominant' },
    readinessFallback: 'a',
    boundaries: { 'Power exchange': 'hard-limit' },
    boundaryFallback: 'prefer-not',
    negotiationFallback: 'p1',
  })

  expect(trace.discovery).toContain('d-power-give')
  expect(trace.refinement).toContain('ref-power-exchange-vocabulary')
  expect(trace.refinement.length).toBeLessThanOrEqual(6)

  await openRoleSetBuilder(page)
  expect(await namedRoleSetLabels(page, 'Suggested roles')).toContain('Dominant')
  const dominantSuggestion = page.locator('.profile-recommendation-summary > ol > li').filter({ hasText: 'Dominant' }).first()
  await expect(dominantSuggestion).toContainText('Suggested primary')
  await dominantSuggestion.getByText('About this role').click()
  await expect(dominantSuggestion).toContainText('Exact vocabulary confirmed')
  await expect(dominantSuggestion).toContainText(/Strong assessment evidence|Assessment evidence/)

  const dominantDiscovery = page.locator('.role-card').filter({ has: page.getByRole('heading', { name: 'Dominant', exact: true }) }).first()
  await expect(dominantDiscovery).toContainText(/Strong alignment|Worth exploring/)
  await expect(dominantDiscovery).toContainText(/High confidence|Medium confidence/)

  const powerBoundary = page.locator('.boundary-result').filter({ has: page.getByRole('heading', { name: 'Power exchange', exact: true }) })
  await expect(powerBoundary).toContainText('Hard limit')
  await expect(page.getByText('These choices guide activity suggestions but never alter role alignment or ordering.')).toBeVisible()

  await expectRenderedSanity(page)
  await guards.assertCompletionWrites()
  await guards.assertClean()

  await page.getByRole('link', { name: 'Go back to assessment' }).click()
  await expect(page).toHaveURL(/\/assessment$/)
  await expect(page.getByRole('heading', { name: 'Communicate', exact: true })).toBeVisible()
  await expect(page.locator('fieldset.question-card input[type="radio"]:checked')).toHaveCount(1)
  await guards.assertCompletionWrites()
  await guards.assertClean()

  await page.locator('fieldset.question-card input[type="radio"]:checked').locator('..').click()
  await page.getByRole('button', { name: 'View my results', exact: true }).click()
  await expect(page).toHaveURL(/\/results$/)
  await guards.assertCompletionWrites()

  await page.getByRole('link', { name: 'Go back to assessment' }).click()
  const dismissedReset = page.waitForEvent('dialog').then(async (dialog) => {
    expect(dialog.type()).toBe('confirm')
    await dialog.dismiss()
  })
  await page.getByRole('button', { name: 'Start over' }).click()
  await dismissedReset
  await expect(page.getByRole('heading', { name: 'Communicate', exact: true })).toBeVisible()

  const confirmedReset = page.waitForEvent('dialog').then(async (dialog) => {
    expect(dialog.type()).toBe('confirm')
    await dialog.accept()
  })
  await page.getByRole('button', { name: 'Start over' }).click()
  await confirmedReset
  await expect(page.getByRole('heading', { name: 'A private reflection for adults.' })).toBeVisible()
})

test('Memory-only session: reload presents a browser unload warning', async ({ page }) => {
  await page.goto('/assessment')
  await page.getByRole('button', { name: /begin/i }).click()
  await page.locator('fieldset.question-card .answer-option').first().click()

  const unloadWarning = page.waitForEvent('dialog').then(async (dialog) => {
    expect(dialog.type()).toBe('beforeunload')
    await dialog.dismiss()
  })
  const reloadAttempt = page.reload({ timeout: 2_000 }).catch(() => null)
  await unloadWarning
  await reloadAttempt
})

test('Full journey: Rigger vocabulary follows real rope evidence', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  const trace = await completeAssessmentThroughBrowser(page, {
    discovery: {
      'd-rope': 'strong',
      'r-rope-give': 'strong',
      'r-rope-motivation': 'strong',
      'r-lead': 'strong',
    },
    discoveryFallback: 'no',
    refinement: { 'ref-rope-vocabulary': 'rigger' },
    readinessFallback: 'a',
    boundaries: { 'Rope & bondage': 'want' },
    boundaryFallback: 'prefer-not',
    negotiationFallback: 'p1',
  })

  expect(trace.discovery).toContain('d-rope')
  expect(trace.discovery).toContain('r-rope-give')
  expect(trace.discovery).toContain('r-rope-motivation')
  expect(trace.refinement).toContain('ref-rope-vocabulary')
  expect(trace.refinement.length).toBeLessThanOrEqual(6)

  await openRoleSetBuilder(page)
  expect(await namedRoleSetLabels(page, 'Suggested roles')).toContain('Rigger')
  const riggerSuggestion = page.locator('.profile-recommendation-summary > ol > li').filter({ hasText: 'Rigger' }).first()
  await riggerSuggestion.getByText('About this role').click()
  await expect(riggerSuggestion).toContainText('Exact vocabulary confirmed')
  await expect(riggerSuggestion).toContainText(/Strong assessment evidence|Assessment evidence/)

  const riggerDiscovery = page.locator('.role-card').filter({ has: page.getByRole('heading', { name: 'Rigger', exact: true }) }).first()
  await expect(riggerDiscovery).toContainText(/Strong alignment|Worth exploring/)
  await expect(riggerDiscovery).toContainText(/High confidence|Medium confidence/)
  await expect(page.locator('.profile-recommendation-summary').getByText('Suggested primary', { exact: true })).toHaveCount(1)

  await expectRenderedSanity(page)
  await guards.assertCompletionWrites()
  await guards.assertClean()
})

test('Full journey: sparse and uncertain answers produce a coherent map without a fabricated primary', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  const trace = await completeAssessmentThroughBrowser(page, {
    discoveryFallback: 'prefer-not',
    refinementFallback: 'prefer-not',
    readinessFallback: 'prefer-not',
    boundaryFallback: 'prefer-not',
    negotiationFallback: 'prefer-not',
  })

  expect(trace.discovery.length).toBeGreaterThan(0)
  expect(trace.refinement.length).toBeLessThanOrEqual(6)
  expect(trace.readiness.length).toBeGreaterThan(0)
  expect(trace.boundaries.length).toBeGreaterThan(0)
  expect(trace.negotiation.length).toBeGreaterThan(0)

  await expect(page.getByRole('heading', { name: 'Strongest dimensions' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Reflection' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Independent by design' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Conversation starters' })).toBeVisible()
  await openRoleSetBuilder(page)
  await expect(page.getByText(/do not currently support an automatic role suggestion/i)).toBeVisible()
  await expect(page.locator('.profile-suggested-primary-note')).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Suggested roles' })).toHaveCount(0)

  await expectRenderedSanity(page)
  await guards.assertCompletionWrites()
  await guards.assertClean()
})
