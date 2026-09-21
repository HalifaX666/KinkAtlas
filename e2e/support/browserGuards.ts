import { expect, type Page, type Request } from '@playwright/test'

const completionCountPath = '/.netlify/functions/completion-count'

export async function installBrowserGuards(page: Page) {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const unexpectedNetwork: string[] = []

  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('request', (request: Request) => {
    const url = new URL(request.url())
    const isLocal = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
    const isExpectedCompletionRead = url.pathname === completionCountPath && request.method() === 'GET'
    const isStaticDevRequest = isLocal && request.method() === 'GET' && request.resourceType() !== 'fetch' && request.resourceType() !== 'xhr'
    if (!isExpectedCompletionRead && !isStaticDevRequest) unexpectedNetwork.push(`${request.method()} ${request.url()}`)
  })

  await page.route(`**${completionCountPath}`, async (route) => {
    if (route.request().method() !== 'GET') {
      unexpectedNetwork.push(`${route.request().method()} ${route.request().url()}`)
      await route.abort()
      return
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

export async function expectRenderedSanity(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/\b(?:NaN|Infinity|undefined)\b/)
  await expect(page.getByText('Your map is still blank.')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Something went wrong.' })).toHaveCount(0)
}
