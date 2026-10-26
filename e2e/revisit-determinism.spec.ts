import { chromium, expect, firefox, test, webkit, type BrowserType } from '@playwright/test'
import { expectNoAxeViolations } from './support/accessibility'
import { expectNoHorizontalOverflow, installBrowserGuards, openPersonaResults } from './support/browserGuards'

const baseURL = 'http://127.0.0.1:4178'
const personaId = 'multiple-hard-limits-pattern'

interface RevisitMeasurement {
  browser: string
  link: string
  encoded: string
  compressed: Uint8Array
  canonical: Uint8Array
  compressedDigest: string
  canonicalDigest: string
}

const launchers: Array<{ name: string; locale: string; type: BrowserType }> = [
  { name: 'Chromium', locale: 'en-CA', type: chromium },
  { name: 'Firefox', locale: 'tr-TR', type: firefox },
  { name: 'WebKit', locale: 'ja-JP', type: webkit },
]

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function decodeBase64Url(value: string): Uint8Array {
  const standard = value.replaceAll('-', '+').replaceAll('_', '/')
  return decodeBase64(standard.padEnd(standard.length + (4 - standard.length % 4) % 4, '='))
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
}

function inspectLink(
  browser: string,
  link: string,
  canonicalBase64: string,
  canonicalDigest: string,
  compressedDigest: string,
): RevisitMeasurement {
  const url = new URL(link)
  expect(url.origin).toBe(baseURL)
  expect(url.pathname).toBe('/revisit')
  expect(url.search).toBe('')
  const match = /^#r=v1\.lzss\.([A-Za-z0-9_-]+)$/u.exec(url.hash)
  expect(match).not.toBeNull()
  const encoded = match![1]
  const compressed = decodeBase64Url(encoded)
  const canonical = decodeBase64(canonicalBase64)
  return {
    browser,
    link,
    encoded,
    compressed,
    canonical,
    compressedDigest,
    canonicalDigest,
  }
}

async function createLink(type: BrowserType, locale: string) {
  const browser = await type.launch()
  const context = await browser.newContext({ locale })
  const page = await context.newPage()
  const guards = await installBrowserGuards(page)
  await openPersonaResults(page, personaId)
  await page.getByText('Advanced privacy options').click()
  await page.getByRole('button', { name: 'Create revisit link' }).click()
  const output = page.getByRole('textbox', { name: 'Revisit link' })
  await expect(output).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show QR' })).toHaveCount(0)
  await expect(page.getByText(/Anyone with the complete link can view this saved result/i)).toBeVisible()
  const first = await output.inputValue()

  await page.getByRole('button', { name: 'Create revisit link' }).click()
  await expect(output).toHaveValue(first)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'A map, not a verdict.' })).toBeVisible()
  await page.getByText('Advanced privacy options').click()
  await page.getByRole('button', { name: 'Create revisit link' }).click()
  await expect(page.getByRole('textbox', { name: 'Revisit link' })).toHaveValue(first)
  const details = await page.evaluate(async (link) => {
    const codecPath = '/src/revisit/revisitCodec.ts'
    const codec = await import(codecPath)
    const snapshot = await codec.parseRevisitFragment(new URL(link).hash)
    const bytes = new TextEncoder().encode(codec.serializeRevisitSnapshot(snapshot))
    const encoded = new URL(link).hash.split('.')[2]
    const standard = encoded.replaceAll('-', '+').replaceAll('_', '/')
    const compressed = Uint8Array.from(atob(standard.padEnd(standard.length + (4 - standard.length % 4) % 4, '=')), (character) => character.charCodeAt(0))
    const digest = async (value: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(value).buffer))).map((byte) => byte.toString(16).padStart(2, '0')).join('')
    let binary = ''
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
    }
    return {
      canonicalBase64: btoa(binary),
      canonicalDigest: await digest(bytes),
      compressedDigest: await digest(compressed),
    }
  }, first)
  await guards.assertClean()
  await context.close()
  await browser.close()
  return { link: first, ...details }
}

test('Revisit compressed bytes and final URL are exactly deterministic across browsers', async () => {
  const measurements: RevisitMeasurement[] = []

  for (const launcher of launchers) {
    const { link, canonicalBase64, canonicalDigest, compressedDigest } = await createLink(launcher.type, launcher.locale)
    measurements.push(inspectLink(launcher.name, link, canonicalBase64, canonicalDigest, compressedDigest))
  }

  const reference = measurements[0]
  console.log(JSON.stringify(measurements.map(({ browser, compressed, canonical, compressedDigest, canonicalDigest, link }) => ({
    browser,
    compressedBytes: compressed.byteLength,
    canonicalBytes: canonical.byteLength,
    canonicalDigest,
    compressedDigest,
    linkCharacters: link.length,
  })), null, 2))
  for (const measurement of measurements.slice(1)) {
    expect(sameBytes(measurement.canonical, reference.canonical), `${measurement.browser} canonical bytes`).toBe(true)
    expect(sameBytes(measurement.compressed, reference.compressed), `${measurement.browser} compressed bytes`).toBe(true)
    expect(measurement.encoded, `${measurement.browser} base64url payload`).toBe(reference.encoded)
    expect(measurement.link, `${measurement.browser} final URL`).toBe(reference.link)
  }

  const freshChromium = await createLink(chromium, 'fr-CA')
  expect(freshChromium.link, 'fresh Chromium context final URL').toBe(reference.link)
})

test('Revisit bearer link opens read-only in a clean context without transmitting its fragment', async () => {
  const created = await createLink(chromium, 'en-CA')
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 430, height: 900 } })
  expect((await context.storageState()).origins).toEqual([])
  const page = await context.newPage()
  const guards = await installBrowserGuards(page)
  const requests: Array<{ url: string; method: string; type: string; body: string | null }> = []
  const webSockets: string[] = []
  page.on('request', (request) => requests.push({
    url: request.url(),
    method: request.method(),
    type: request.resourceType(),
    body: request.postData(),
  }))
  page.on('websocket', (socket) => webSockets.push(socket.url()))

  await page.goto(created.link)
  await expect(page.getByRole('heading', { name: 'Your saved KinkAtlas result' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your Role Set' })).toBeVisible()
  expect(page.url()).toBe(created.link)
  await expectNoAxeViolations(page, 'Revisit historical result')

  const documentRequest = requests.find(({ type }) => type === 'document')
  expect(documentRequest?.url).toBe(`${baseURL}/revisit`)
  expect(requests.every(({ url, body }) => !url.includes('#r=') && !url.includes(created.link.split('#r=')[1]) && !body?.includes(created.link.split('#r=')[1]))).toBe(true)
  const dataRequests = requests.filter(({ type }) => ['fetch', 'xhr', 'ping'].includes(type))
  expect(dataRequests.every(({ url, body }) => new URL(url).pathname === '/.netlify/functions/completion-count' && !body)).toBe(true)
  expect(webSockets.every((url) => !url.includes('#r=') && !url.includes(created.link.split('#r=')[1]))).toBe(true)

  const browserState = await page.evaluate(async () => ({
    localStorage: localStorage.length,
    sessionStorage: sessionStorage.length,
    indexedDbNames: typeof indexedDB.databases === 'function'
      ? (await indexedDB.databases()).map(({ name }) => name ?? '')
      : [],
  }))
  expect(browserState).toEqual({ localStorage: 0, sessionStorage: 0, indexedDbNames: [] })

  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 900 })
    await expectNoHorizontalOverflow(page)
  }

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your saved KinkAtlas result' })).toBeVisible()
  expect(page.url()).toBe(created.link)
  await guards.assertClean()
  await context.close()
  await browser.close()
})

test('malformed Revisit links fail closed without removing the bearer fragment', async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  const guards = await installBrowserGuards(page)
  const link = `${baseURL}/revisit#r=v1.lzss.damaged`
  await page.goto(link)
  const error = page.getByRole('heading', { name: 'Revisit link could not be opened' })
  await expect(error).toBeVisible()
  await expect(error).toBeFocused()
  expect(page.url()).toBe(link)
  await expect(page.getByRole('heading', { name: 'Your saved KinkAtlas result' })).toHaveCount(0)
  await expectNoAxeViolations(page, 'Malformed Revisit link')
  await guards.assertClean()
  await context.close()
  await browser.close()
})
