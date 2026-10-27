import { expect, test } from '@playwright/test'
import { expectNoAxeViolations } from './support/accessibility'
import { installBrowserGuards, openPersonaResults } from './support/browserGuards'
import { createHostedApiState, installHostedApi } from './support/hostedApi'
import { expectQrRoundTrip } from './support/qr'

function recursiveKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => recursiveKeys(item, keys))
  else if (typeof value === 'object' && value !== null) Object.entries(value).forEach(([key, item]) => { keys.add(key); recursiveKeys(item, keys) })
  return keys
}

test('Link & QR preserves historical cards without raw answers and remains owner-deletable', async ({ browser }) => {
  test.setTimeout(60_000)
  const state = createHostedApiState()
  const ownerContext = await browser.newContext()
  const cleanContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  const clean = await cleanContext.newPage()
  await installHostedApi(owner, state)
  await installHostedApi(clean, state)
  const ownerGuards = await installBrowserGuards(owner, { allowHostedContent: true })
  const cleanGuards = await installBrowserGuards(clean, { allowHostedContent: true, allowExpectedHostedNotFound: true })

  await openPersonaResults(owner, 'balanced-authority-pattern')
  const expectedCards = await owner.locator('.current-role-cards-grid h3').allTextContents()
  expect(state.requests.filter(({ method }) => method === 'POST')).toHaveLength(0)
  await owner.getByRole('button', { name: 'Share', exact: true }).click()
  const dialog = owner.getByRole('dialog', { name: 'Share your KinkAtlas' })
  for (const option of ['Public Card', 'Quick Summary', 'Full Reflection', 'Link & QR']) await expect(dialog.getByRole('button', { name: new RegExp(option, 'i') })).toBeVisible()
  await expect(dialog.getByText(/Advanced privacy options|ConsentCapsule|recipient pairing|Encrypted Capsule/i)).toHaveCount(0)
  await dialog.getByRole('button', { name: /Link & QR/i }).click()
  await expect(dialog.getByText(/individual assessment answers are not included/i)).toBeVisible()
  await expect(dialog.locator('.link-share-preview article')).toHaveCount(expectedCards.length)
  await dialog.getByRole('button', { name: 'Create share', exact: true }).click()
  const shareUrl = await dialog.getByLabel('Share link').inputValue()
  expect(new URL(shareUrl).pathname).toMatch(/^\/s\/[A-Za-z0-9_-]{22}$/u)
  expect(shareUrl.length).toBeLessThan(100)

  const createRequest = state.requests.find(({ method }) => method === 'POST')!
  const createBody = JSON.parse(createRequest.body!) as { kind: string; payload: unknown; deleteTokenHash: string }
  expect(createBody.kind).toBe('quick-share')
  expect(createBody).not.toHaveProperty('deleteToken')
  expect(createBody.deleteTokenHash).toMatch(/^[A-Za-z0-9_-]{43}$/u)
  expect([...recursiveKeys(createBody.payload)]).not.toEqual(expect.arrayContaining(['answers', 'discovery', 'refinement', 'negotiation', 'restore', 'navigation', 'response']))
  expect(createRequest.body).not.toContain('d-power-give')

  const qr = dialog.getByRole('img', { name: 'QR code for shared KinkAtlas result' })
  const qrMetrics = await expectQrRoundTrip(qr, shareUrl)
  expect(qrMetrics.version).toBeLessThan(10)
  const qrDownload = owner.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download QR as SVG' }).click()
  expect((await qrDownload).suggestedFilename()).toBe('kinkatlas-share-qr.svg')
  const mobile: Array<{ viewport: number; displayedPixels: number }> = []
  for (const width of [320, 375, 430]) {
    await owner.setViewportSize({ width, height: 800 })
    const box = await qr.boundingBox()
    expect(box).not.toBeNull()
    mobile.push({ viewport: width, displayedPixels: box!.width })
    await expect.poll(() => owner.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }
  console.log(`Link & QR metrics: ${JSON.stringify({ ...qrMetrics, path: undefined, mobile })}`)
  await expectNoAxeViolations(owner, 'Phase K Link & QR dialog')

  await clean.goto(shareUrl)
  await expect(clean.getByRole('heading', { name: 'Their KinkAtlas' })).toBeVisible()
  expect(await clean.locator('.current-role-cards-grid h3').allTextContents()).toEqual(expectedCards)
  await expect(clean.getByRole('heading', { name: 'Their result experience' })).toBeVisible()
  await expect(clean.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(clean.locator('link[rel="canonical"]')).toHaveCount(0)
  for (const width of [320, 375, 430]) {
    await clean.setViewportSize({ width, height: 800 })
    await expect.poll(() => clean.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }

  await dialog.getByRole('button', { name: 'Delete share' }).click()
  await clean.reload()
  await expect(clean.getByRole('heading', { name: 'Shared result unavailable' })).toBeVisible()
  await ownerGuards.assertClean()
  await cleanGuards.assertClean()
  await ownerContext.close()
  await cleanContext.close()
})

test('legacy encrypted-sharing routes remain available outside the normal Share interface', async ({ page }) => {
  const state = createHostedApiState()
  await installHostedApi(page, state)
  const guards = await installBrowserGuards(page, { allowHostedContent: true, allowExpectedHostedNotFound: true })

  await page.goto('/viewer-request')
  await expect(page.getByRole('heading', { name: 'Create a Viewer Request' })).toBeVisible()
  await page.goto('/capsule')
  await expect(page.getByRole('heading', { name: 'Open an encrypted KinkAtlas Capsule' })).toBeVisible()
  await page.goto('/restore')
  await expect(page.getByRole('heading', { name: 'Back up or restore your private session' })).toBeVisible()
  await page.goto('/p/AAAAAAAAAAAAAAAAAAAAAA')
  await expect(page.getByRole('heading', { name: 'Shared result unavailable' })).toBeVisible()

  await openPersonaResults(page, 'balanced-authority-pattern')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Share your KinkAtlas' })
  await expect(dialog.getByRole('button', { name: /Link & QR/i })).toBeVisible()
  await expect(dialog.getByText(/ConsentCapsule|recipient pairing|Encrypted Capsule/i)).toHaveCount(0)

  await guards.assertClean()
})

test('Saved Assessment writes only after explicit Save, reopens locally, restores explicitly, and deletes remotely', async ({ browser }) => {
  test.setTimeout(60_000)
  const state = createHostedApiState()
  const context = await browser.newContext()
  const page = await context.newPage()
  await installHostedApi(page, state)
  const guards = await installBrowserGuards(page, { allowHostedContent: true })

  await openPersonaResults(page, 'balanced-authority-pattern')
  const expectedCards = await page.locator('.current-role-cards-grid h3').allTextContents()
  expect(state.requests.filter(({ method }) => method === 'POST')).toHaveLength(0)

  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Share your KinkAtlas' })).toBeVisible()
  await page.getByRole('button', { name: 'Close export and sharing dialog' }).click()
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('beforeunload', { cancelable: true }))
  })
  await page.waitForTimeout(100)
  expect(state.requests.filter(({ method }) => method === 'POST')).toHaveLength(0)

  await page.getByRole('link', { name: 'My KinkAtlas' }).first().click()
  await expect(page.getByRole('heading', { name: 'Saved assessments' })).toBeVisible()
  expect(state.requests.filter(({ method }) => method === 'POST')).toHaveLength(0)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'A map, not a verdict.' })).toBeVisible()
  expect(state.requests.filter(({ method }) => method === 'POST')).toHaveLength(0)

  await page.getByRole('button', { name: 'Save my assessment' }).click()
  await expect(page.getByRole('status')).toContainText('Assessment saved')

  const saveRequest = state.requests.find(({ method, body }) => method === 'POST' && body?.includes('saved-assessment'))!
  const saveBody = JSON.parse(saveRequest.body!) as { payload: Record<string, unknown> }
  expect(Object.keys(saveBody.payload).sort()).toEqual(['ciphertext', 'compression', 'iv', 'magic', 'savedAssessmentVersion', 'suite'])
  expect(saveRequest.body).not.toContain('d-power-give')
  expect(saveRequest.body).not.toContain(expectedCards[0])

  const localVault = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kinkatlas-vault')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const keyRecord = await new Promise<{ id: string; key: CryptoKey }>((resolve, reject) => {
      const request = database.transaction('vault-key', 'readonly').objectStore('vault-key').get('primary')
      request.onsuccess = () => resolve(request.result as { id: string; key: CryptoKey })
      request.onerror = () => reject(request.error)
    })
    const saved = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      const request = database.transaction('saved-assessments', 'readonly').objectStore('saved-assessments').getAll()
      request.onsuccess = () => resolve(request.result as Record<string, unknown>[])
      request.onerror = () => reject(request.error)
    })
    let exportRejected = false
    try { await crypto.subtle.exportKey('raw', keyRecord.key) } catch { exportRejected = true }
    database.close()
    return {
      stores: Array.from(database.objectStoreNames),
      key: { id: keyRecord.id, extractable: keyRecord.key.extractable, algorithm: keyRecord.key.algorithm.name, exportRejected },
      savedKeys: Object.keys(saved[0]).sort(),
      savedJson: JSON.stringify(saved),
    }
  })
  expect(localVault.key).toEqual({ id: 'primary', extractable: false, algorithm: 'AES-GCM', exportRejected: true })
  expect(localVault.stores.sort()).toEqual(['hosted-shares', 'saved-assessments', 'vault-key'])
  expect(localVault.savedKeys).toEqual(['createdAt', 'deleteToken', 'id'])
  expect(localVault.savedJson).not.toContain('answers')

  await page.reload()
  await expect(page.getByRole('heading', { name: 'A map, not a verdict.' })).toBeVisible()
  await page.getByRole('link', { name: 'My KinkAtlas' }).first().click()
  await expect(page.getByRole('heading', { name: 'Saved assessments' })).toBeVisible()
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(page.getByRole('button', { name: 'Open' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Rename' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Rename' }).click()
  await page.getByLabel('Saved name').fill('<Phase K save>')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByText('<Phase K save>')).toBeVisible()
  await page.getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('heading', { name: 'Saved assessment preview' })).toBeFocused()
  expect(await page.locator('.saved-assessment-preview .current-role-cards-grid h3').allTextContents()).toEqual(expectedCards)
  await expect(page.getByText(/Current work warning/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirm and open assessment' }).click()
  await expect(page).toHaveURL(/\/results$/u)
  expect(await page.locator('.current-role-cards-grid h3').allTextContents()).toEqual(expectedCards)

  await page.goto('/my-kinkatlas')
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Confirm delete' }).click()
  await expect(page.getByText('No assessments have been explicitly saved on this browser.')).toBeVisible()
  expect(state.objects.size).toBe(0)
  await guards.assertClean()
  await context.close()
})
