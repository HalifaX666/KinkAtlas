import { expect, type Page, type Request } from '@playwright/test'

const completionCountPath = '/.netlify/functions/completion-count'

export async function installBrowserGuards(page: Page) {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const unexpectedNetwork: string[] = []
  const completionWrites: { url: string; body: string | null }[] = []

  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('request', (request: Request) => {
    const url = new URL(request.url())
    const isLocal = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
    const isCompletionEndpoint = isLocal && url.pathname === completionCountPath && url.search === ''
    const isExpectedCompletionRequest = isCompletionEndpoint && (request.method() === 'GET' || request.method() === 'POST')
    const isStaticDevRequest = isLocal && request.method() === 'GET' && request.resourceType() !== 'fetch' && request.resourceType() !== 'xhr'
    if (!isExpectedCompletionRequest && !isStaticDevRequest) unexpectedNetwork.push(`${request.method()} ${request.url()}`)
  })

  await page.route(`**${completionCountPath}*`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const isLocal = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
    const isExactEndpoint = isLocal && url.pathname === completionCountPath && url.search === ''
    const method = request.method()
    const body = request.postData()

    if (!isExactEndpoint || (method !== 'GET' && method !== 'POST')) {
      unexpectedNetwork.push(`${method} ${request.url()}`)
      await route.abort()
      return
    }

    if (method === 'POST') {
      completionWrites.push({ url: request.url(), body })
      if (body !== null && body !== '') unexpectedNetwork.push(`POST ${request.url()} included an unexpected request body`)
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 1000 }) })
  })

  return {
    async assertClean() {
      await expect(page.getByRole('heading', { name: 'Something went wrong.' })).toHaveCount(0)
      expect(pageErrors, 'uncaught browser errors').toEqual([])
      expect(consoleErrors, 'console.error output').toEqual([])
      expect(unexpectedNetwork, 'unexpected or data-bearing network requests').toEqual([])
    },
    async assertCompletionWrites(expectedCount = 1) {
      await expect.poll(() => completionWrites.length, 'assessment completion POST count').toBe(expectedCount)
      for (const write of completionWrites) {
        const url = new URL(write.url)
        expect(url.pathname, 'completion POST endpoint').toBe(completionCountPath)
        expect(url.search, 'completion POST query string').toBe('')
        expect(write.body, 'completion POST body').toBeNull()
      }
    },
  }
}

export async function openPersonaResults(page: Page, personaId: string) {
  await page.goto(`/results?__kinkatlas_e2e_persona=${encodeURIComponent(personaId)}`)
  await expect(page.locator('html')).toHaveAttribute('data-persona-harness', 'KINKATLAS_E2E_PERSONA_HARNESS_V1')
  await expect(page.getByRole('heading', { name: 'A map, not a verdict.' })).toBeVisible()
}

export async function openRoleSetBuilder(page: Page) {
  const disclosure = page.locator('details.profile-builder-disclosure')
  await expect(disclosure).not.toHaveAttribute('open', '')
  await page.getByRole('heading', { name: 'Build your role set' }).click()
  await expect(disclosure).toHaveAttribute('open', '')
  await expect(page.getByRole('heading', { name: 'Suggested role set' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your role set', exact: true })).toBeVisible()
}

export async function roleSetLabels(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? '').filter(Boolean))
}

export async function namedRoleSetLabels(page: Page, listName: string): Promise<string[]> {
  return page.getByRole('list', { name: listName }).locator(':scope > li > div:first-child > strong').evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? '').filter(Boolean))
}

export async function expectRenderedSanity(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/\b(?:NaN|Infinity|undefined)\b/)
  await expect(page.getByText('Your map is still blank.')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Something went wrong.' })).toHaveCount(0)
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth, 'document horizontal overflow').toBeLessThanOrEqual(dimensions.clientWidth)
}
