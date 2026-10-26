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

test('Quick Share and its QR preserve historical cards without raw answers and remain owner-deletable', async ({ browser }) => {
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
  await dialog.getByRole('button', { name: 'Create link', exact: true }).click()
  const shareUrl = await dialog.getByLabel('Quick Share Link').inputValue()
  expect(new URL(shareUrl).pathname).toMatch(/^\/s\/[A-Za-z0-9_-]{22}$/u)
  expect(shareUrl.length).toBeLessThan(100)

  const createRequest = state.requests.find(({ method }) => method === 'POST')!
  const createBody = JSON.parse(createRequest.body!) as { kind: string; payload: unknown; deleteTokenHash: string }
  expect(createBody.kind).toBe('quick-share')
  expect(createBody).not.toHaveProperty('deleteToken')
  expect(createBody.deleteTokenHash).toMatch(/^[A-Za-z0-9_-]{43}$/u)
  expect([...recursiveKeys(createBody.payload)]).not.toEqual(expect.arrayContaining(['answers', 'discovery', 'refinement', 'negotiation', 'restore', 'navigation', 'response']))
  expect(createRequest.body).not.toContain('d-power-give')

  const qrChoice = dialog.getByRole('heading', { name: 'QR Code' }).locator('..')
  await qrChoice.getByRole('button', { name: 'Show QR' }).click()
  await qrChoice.getByRole('button', { name: 'Show QR' }).click()
  const qr = qrChoice.getByRole('img', { name: 'QR code for Quick Share Link' })
  const qrMetrics = await expectQrRoundTrip(qr, shareUrl)
  expect(qrMetrics.version).toBeLessThan(10)
  const mobile: Array<{ viewport: number; displayedPixels: number }> = []
  for (const width of [320, 375, 430]) {
    await owner.setViewportSize({ width, height: 800 })
    const box = await qr.boundingBox()
    expect(box).not.toBeNull()
    mobile.push({ viewport: width, displayedPixels: box!.width })
    await expect.poll(() => owner.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }
  console.log(`Quick Share QR metrics: ${JSON.stringify({ ...qrMetrics, path: undefined, mobile })}`)
  await expectNoAxeViolations(owner, 'Phase K Quick Share dialog')

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

test('ConsentCapsule encrypts a historical share for one recipient browser and uploads ciphertext only', async ({ browser }) => {
  test.setTimeout(60_000)
  const state = createHostedApiState()
  const recipientContext = await browser.newContext()
  const senderContext = await browser.newContext()
  const wrongContext = await browser.newContext()
  const recipient = await recipientContext.newPage()
  const sender = await senderContext.newPage()
  const wrong = await wrongContext.newPage()
  for (const page of [recipient, sender, wrong]) await installHostedApi(page, state)
  const recipientGuards = await installBrowserGuards(recipient, { allowHostedContent: true, allowExpectedHostedNotFound: true })
  const senderGuards = await installBrowserGuards(sender, { allowHostedContent: true })
  const wrongGuards = await installBrowserGuards(wrong, { allowHostedContent: true, allowExpectedHostedNotFound: true })

  await recipient.goto('/viewer-request')
  await recipient.getByLabel('Optional local label').fill('Phase K recipient')
  await recipient.getByRole('button', { name: 'Create Viewer Request' }).click()
  const pairingLink = await recipient.getByLabel('Viewer Request link').inputValue()

  await openPersonaResults(sender, 'balanced-authority-pattern')
  const expectedCards = await sender.locator('.current-role-cards-grid h3').allTextContents()
  await sender.getByRole('button', { name: 'Share', exact: true }).click()
  const dialog = sender.getByRole('dialog', { name: 'Share your KinkAtlas' })
  await dialog.getByLabel('Recipient pairing link').fill(pairingLink)
  await dialog.getByRole('button', { name: 'Confirm recipient' }).click()
  await dialog.getByRole('button', { name: 'Create ConsentCapsule™' }).click()
  const privateUrl = await dialog.getByLabel('Private share link').inputValue()
  expect(new URL(privateUrl).pathname).toMatch(/^\/p\/[A-Za-z0-9_-]{22}$/u)

  const privateCreate = state.requests.find(({ method, body }) => method === 'POST' && body?.includes('consent-capsule'))!
  const privateBody = JSON.parse(privateCreate.body!) as { payload: Record<string, unknown> }
  expect(Object.keys(privateBody.payload).sort()).toEqual(['ciphertext', 'compression', 'consentCapsuleVersion', 'ephemeralPublicKey', 'iv', 'kdf', 'magic', 'recipientKeyId', 'salt', 'suite'])
  expect(privateCreate.body).not.toContain(expectedCards[0])
  expect(privateCreate.body).not.toContain('d-power-give')
  expect(privateBody.payload).not.toHaveProperty('deleteToken')

  await wrong.goto(privateUrl)
  await expect(wrong.getByRole('heading', { name: 'Shared result unavailable' })).toBeVisible()
  await expect(wrong.getByText(/matching recipient key/i)).toBeVisible()
  await expect(wrong.getByRole('heading', { name: 'Their KinkAtlas' })).toHaveCount(0)

  await recipient.goto(privateUrl)
  await expect(recipient.getByRole('heading', { name: 'Their KinkAtlas' })).toBeVisible()
  expect(await recipient.locator('.current-role-cards-grid h3').allTextContents()).toEqual(expectedCards)
  await expectNoAxeViolations(recipient, 'Phase K ConsentCapsule result')

  await dialog.getByRole('button', { name: 'Delete share' }).click()
  await recipient.reload()
  await expect(recipient.getByRole('heading', { name: 'Shared result unavailable' })).toBeVisible()
  await recipientGuards.assertClean()
  await senderGuards.assertClean()
  await wrongGuards.assertClean()
  await recipientContext.close()
  await senderContext.close()
  await wrongContext.close()
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
