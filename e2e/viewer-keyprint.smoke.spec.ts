import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, installBrowserGuards } from './support/browserGuards'

const FIXED_PUBLIC_KEY = 'BGsX0fLhLEJH-Lzm5WOkQPJ3A32BLeszoPShOUXYmMKWT-NC4v4af5uO5-tKfA-eFivOM1drMV7Oy7ZAaDe_UfU'
const FIXED_FINGERPRINT = '564E1828919E2B83C0CDA4F6319AF221D8E3F2C4EE6E784D74C99DC2AED25E1C'
const FIXED_FIRST_44_BITS = '564E1828919'
const FIXED_INDEXES = [690, 902, 81, 281] as const
const FIXED_PHRASE = 'film ignore any case'
const FIXED_COMPARISON_CODE = '564E-1828-919 · 39'
const FIXED_QR_MATRIX_SHA256 = '0686b750ba21f3c09ae3d1c44d8114e7986f53ab9ca041bfa074e355d6f21768'
const FIXED_REQUEST = JSON.stringify({
  keyprint: { checksum: '39', fingerprint: FIXED_FINGERPRINT, short: '564E-1828-919', version: 1 },
  magic: 'kinkatlas-viewer-request',
  recipientPublicKey: FIXED_PUBLIC_KEY,
  requestId: 'AAAAAAAAAAAAAAAAAAAAAA',
  suite: 'ECDH-P256+HKDF-SHA-256+A256GCM',
  viewerRequestVersion: 1,
})

test('fixed Viewer Request renders one deterministic Four-Word Keyprint', async ({ page, browserName }) => {
  const guards = await installBrowserGuards(page)
  const encodedRequest = btoa(FIXED_REQUEST).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
  await page.goto(`/viewer-request#request=${encodedRequest}`)

  await expect(page).toHaveURL(/\/viewer-request$/)
  await expect(page.getByRole('heading', { name: 'Viewer Request Keyprint' })).toBeVisible()
  const panel = page.locator('.viewer-keyprint').filter({ hasText: FIXED_PHRASE })
  await expect(panel).toHaveCount(1)
  await expect(panel.locator('.viewer-word-keyprint')).toHaveText(FIXED_PHRASE)
  await expect(panel.locator('.viewer-comparison-code > strong')).toHaveText(FIXED_COMPARISON_CODE)
  await panel.locator('summary').getByText('Full fingerprint', { exact: true }).click()
  await expect(panel.locator('code')).toHaveText(FIXED_FINGERPRINT)

  const computed = await page.evaluate(({ fingerprint, expectedIndexes }) => {
    const first44Bits = fingerprint.slice(0, 11)
    const packed = expectedIndexes.reduce((value, index) => (value << 11n) | BigInt(index), 0n)
    return { first44Bits, packed: packed.toString(16).toUpperCase().padStart(11, '0') }
  }, { fingerprint: FIXED_FINGERPRINT, expectedIndexes: FIXED_INDEXES })
  expect(computed).toEqual({ first44Bits: FIXED_FIRST_44_BITS, packed: FIXED_FIRST_44_BITS })

  const fixedRequestLink = `https://kinkatlas.ca/viewer-request#request=${encodedRequest}`
  const fixedQr = await page.evaluate(async (link) => {
    const qrTransportPath = '/src/qr/qrTransport.ts'
    const { createQrTransport } = await import(qrTransportPath)
    const qr = createQrTransport(link, 'viewer-request')
    const matrixBits = qr.matrix.map((row: boolean[]) => row.map((module: boolean) => module ? '1' : '0').join('')).join('')
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(matrixBits))))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
    return { byteCount: qr.byteCount, version: qr.version, modules: qr.matrixModules, digest }
  }, fixedRequestLink)
  expect(fixedQr).toEqual({ byteCount: 572, version: 19, modules: 101, digest: FIXED_QR_MATRIX_SHA256 })

  for (const action of ['Copy Four-Word Keyprint', 'Copy comparison code', 'Copy full fingerprint']) {
    await panel.getByRole('button', { name: action }).click()
    await expect(page.getByRole('status')).toContainText(/copied|Copy is unavailable/i)
  }

  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(panel.locator('.viewer-word-keyprint')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  }

  await test.info().attach(`keyprint-${browserName}.json`, {
    body: JSON.stringify({ fingerprint: FIXED_FINGERPRINT, first44Bits: FIXED_FIRST_44_BITS, indexes: FIXED_INDEXES, phrase: FIXED_PHRASE, comparisonCode: FIXED_COMPARISON_CODE, qr: fixedQr }),
    contentType: 'application/json',
  })
  await guards.assertClean()
})

test('invalid Viewer Request data never renders a Four-Word Keyprint', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  const invalidRequest = btoa('{"magic":"not-a-viewer-request"}').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
  await page.goto(`/viewer-request#request=${invalidRequest}`)

  await expect(page.getByRole('status')).toContainText(/incomplete or invalid/i)
  await expect(page.locator('.viewer-word-keyprint')).toHaveCount(0)
  await guards.assertClean()
})
