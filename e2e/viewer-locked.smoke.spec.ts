import { expect, test } from '@playwright/test'
import { installBrowserGuards, openPersonaResults } from './support/browserGuards'

test('Viewer-Locked Capsule requires the recipient browser key and stops opening after deletion', async ({ browser }) => {
  test.setTimeout(60_000)
  const recipientContext = await browser.newContext()
  const senderContext = await browser.newContext()
  const cleanContext = await browser.newContext()
  const recipientPage = await recipientContext.newPage()
  const senderPage = await senderContext.newPage()
  const cleanPage = await cleanContext.newPage()
  const recipientGuards = await installBrowserGuards(recipientPage)
  const senderGuards = await installBrowserGuards(senderPage)
  const cleanGuards = await installBrowserGuards(cleanPage)

  await recipientPage.goto('/viewer-request')
  await expect(recipientPage.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(recipientPage.locator('link[rel="canonical"]')).toHaveCount(0)
  await recipientPage.getByLabel('Optional local label').fill('Recipient test request')
  await recipientPage.getByRole('button', { name: 'Create Viewer Request' }).click()
  const viewerRequestText = await recipientPage.getByLabel('Viewer Request text').inputValue()
  const viewerRequestLink = await recipientPage.getByLabel('Viewer Request link').inputValue()
  const keyprint = await recipientPage.locator('.viewer-keyprint > strong').first().innerText()
  expect(viewerRequestText).not.toContain('privateKey')
  expect(viewerRequestText).not.toContain('Recipient test request')
  expect(viewerRequestLink).not.toContain('Recipient%20test%20request')
  await recipientPage.getByRole('button', { name: 'Copy comparison code' }).first().click()
  await expect(recipientPage.getByRole('status')).toContainText(/Comparison code copied|Copy is unavailable/)
  const storedShape = await recipientPage.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kinkatlas-viewer-requests')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const record = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = database.transaction('viewer-requests', 'readonly').objectStore('viewer-requests').getAll()
      request.onsuccess = () => resolve(request.result[0] as Record<string, unknown>)
      request.onerror = () => reject(request.error)
    })
    const privateKey = record.privateKey as CryptoKey
    let exportRejected = false
    try {
      await crypto.subtle.exportKey('pkcs8', privateKey)
    } catch {
      exportRejected = true
    }
    database.close()
    return { keys: Object.keys(record).sort(), extractable: privateKey.extractable, exportRejected, keyType: privateKey.type, algorithm: privateKey.algorithm.name }
  })
  expect(storedShape).toEqual({
    keys: ['createdAt', 'label', 'privateKey', 'request', 'requestId'],
    extractable: false,
    exportRejected: true,
    keyType: 'private',
    algorithm: 'ECDH',
  })
  await recipientPage.getByLabel('Optional local label').fill('Unrelated test request')
  await recipientPage.getByRole('button', { name: 'Create Viewer Request' }).click()
  await recipientPage.reload()
  await expect(recipientPage.getByText('Recipient test request')).toBeVisible()
  await expect(recipientPage.getByText('Unrelated test request')).toBeVisible()

  await openPersonaResults(senderPage, 'balanced-authority-pattern')
  const expectedRoles = await senderPage.locator('.current-role-cards-grid h3').allTextContents()
  await senderPage.getByRole('button', { name: 'Create my role cards' }).click()
  const dialog = senderPage.getByRole('dialog', { name: 'Export & Share' })
  await dialog.getByRole('button', { name: /Encrypted Disclosure/i }).click()
  await dialog.getByRole('radio', { name: /Viewer-Locked Capsule/i }).check()
  await dialog.getByLabel('Recipient Viewer Request link or text').fill(viewerRequestText)
  await dialog.getByRole('button', { name: 'Validate Viewer Request' }).click()
  await expect(dialog.getByText(keyprint)).toBeVisible()
  await senderPage.setViewportSize({ width: 320, height: 800 })
  await expect.poll(() => senderPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await expect(dialog.getByRole('button', { name: 'Create Viewer-Locked Capsule' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Create Viewer-Locked Capsule' }).click()
  const capsuleLink = await dialog.getByLabel('Viewer-Locked Capsule link').inputValue()
  const capsuleText = await dialog.getByLabel('Viewer-Locked Capsule text').inputValue()
  expect(capsuleLink).not.toContain(viewerRequestText)
  expect(capsuleText).not.toContain(expectedRoles[0])
  expect(capsuleText).not.toContain('Recipient test request')
  await expect(dialog.getByLabel(/never embedded in the link/i)).toHaveCount(0)

  const cleanRequests: string[] = []
  cleanPage.on('request', (request) => { if (request.isNavigationRequest()) cleanRequests.push(request.url()) })
  await cleanPage.goto(capsuleLink)
  await expect(cleanPage).toHaveURL(/\/capsule$/)
  expect(new URL(cleanRequests.at(-1)!).hash).toBe('')
  await expect(cleanPage.getByRole('status')).toContainText(/not available in this browser profile/i)
  await expect(cleanPage.getByText(/Try the device, browser, and browser profile/i)).toBeVisible()
  await expect(cleanPage.getByText(/Secret Capsule instead/i)).toBeVisible()
  await expect(cleanPage.getByRole('link', { name: 'Create a new Viewer Request' })).toBeVisible()
  await expect(cleanPage.getByRole('heading', { name: 'Shared Role Set' })).toHaveCount(0)
  await expect(cleanPage.getByLabel('Separately shared secret')).toHaveCount(0)

  await recipientPage.goto(capsuleLink)
  await expect(recipientPage).toHaveURL(/\/capsule$/)
  await expect(recipientPage.getByRole('heading', { name: 'Shared Role Set' })).toBeVisible()
  expect(await recipientPage.locator('.historical-role-list > li > strong').allTextContents()).toEqual(expectedRoles)

  await recipientPage.goto('/viewer-request')
  const targetRequest = recipientPage.getByRole('listitem').filter({ hasText: 'Recipient test request' })
  await targetRequest.getByRole('button', { name: 'Delete this Viewer Request' }).click()
  await targetRequest.getByRole('button', { name: 'Permanently delete key' }).click()
  await expect(recipientPage.getByText('Recipient test request')).toHaveCount(0)
  await expect(recipientPage.getByText('Unrelated test request')).toBeVisible()
  await recipientPage.goto(capsuleLink)
  await expect(recipientPage.getByRole('status')).toContainText(/not available in this browser profile/i)
  await expect(recipientPage.getByRole('heading', { name: 'Shared Role Set' })).toHaveCount(0)

  await recipientGuards.assertClean()
  await senderGuards.assertClean()
  await cleanGuards.assertClean()
  await recipientContext.close()
  await senderContext.close()
  await cleanContext.close()
})

test('Viewer Request storage failures stay explicit and never use a persistence fallback', async ({ browser }) => {
  test.setTimeout(40_000)
  const failureModes = ['unavailable', 'open', 'transaction', 'clone'] as const
  for (const failureMode of failureModes) {
    const context = await browser.newContext()
    await context.addInitScript((mode) => {
      if (mode === 'unavailable') {
        Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: undefined })
      } else if (mode === 'open') {
        Object.defineProperty(IDBFactory.prototype, 'open', { configurable: true, value: () => { throw new DOMException('blocked', 'InvalidStateError') } })
      } else if (mode === 'transaction') {
        Object.defineProperty(IDBDatabase.prototype, 'transaction', { configurable: true, value: () => { throw new DOMException('blocked', 'InvalidStateError') } })
      } else {
        Object.defineProperty(IDBObjectStore.prototype, 'add', { configurable: true, value: () => { throw new DOMException('cannot clone key', 'DataCloneError') } })
      }
    }, failureMode)
    const page = await context.newPage()
    await page.goto('/viewer-request')
    await test.step(failureMode, async () => {
      await page.getByRole('button', { name: 'Create Viewer Request' }).click()
      await expect(page.getByRole('status')).toContainText(/key storage is unavailable/i)
    })
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 })
    await page.goto('/capsule')
    await expect(page.getByRole('heading', { name: 'Open a private KinkAtlas Capsule' })).toBeVisible()
    await context.close()
  }
})

test('Viewer Request lifecycle remains usable at narrow mobile widths', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 760 } })
  const page = await context.newPage()
  const guards = await installBrowserGuards(page)
  await page.goto('/viewer-request')
  await page.getByLabel('Optional local label').fill('A deliberately long local-only request label for mobile layout review')
  await page.getByRole('button', { name: 'Create Viewer Request' }).click()
  await expect(page.getByRole('heading', { name: 'Send this Viewer Request' })).toBeFocused()

  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 800 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await expect(page.getByRole('button', { name: 'Copy comparison code' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download request file' })).toBeVisible()
  }

  const request = page.getByRole('listitem').filter({ hasText: 'deliberately long local-only' })
  await request.getByRole('button', { name: 'Delete this Viewer Request' }).click()
  await expect(request).toContainText('KinkAtlas cannot recover it')
  await expect(request).toContainText('does not revoke copies already opened')
  await request.getByRole('button', { name: 'Permanently delete key' }).click()
  await expect(page.getByRole('button', { name: 'Create Viewer Request' })).toBeFocused()
  await expect(request).toHaveCount(0)
  await guards.assertClean()
  await context.close()
})

test('malformed stored Viewer Request records fail closed', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/viewer-request')
  await page.getByRole('button', { name: 'Create Viewer Request' }).click()
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kinkatlas-viewer-requests')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = database.transaction('viewer-requests', 'readwrite')
    const store = transaction.objectStore('viewer-requests')
    const record = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result[0] as Record<string, unknown>)
      request.onerror = () => reject(request.error)
    })
    store.put({ ...record, unexpectedSensitiveField: 'must not be accepted' })
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    database.close()
  })
  await page.reload()
  await expect(page.getByRole('status')).toContainText(/key storage is unavailable/i)
  await expect(page.getByText('must not be accepted')).toHaveCount(0)
  await context.close()
})
