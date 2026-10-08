import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, expectRenderedSanity, installBrowserGuards } from './support/browserGuards'

test('built production preview supports ordinary assessment navigation without the persona harness', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find the words for')
  await expect(page.locator('html')).not.toHaveAttribute('data-persona-harness', /.+/)
  expect(await page.content()).not.toContain('KINKATLAS_E2E_PERSONA_HARNESS_V1')

  await page.getByRole('link', { name: 'Start exploring' }).first().click()
  await expect(page).toHaveURL(/\/assessment$/)
  await page.getByRole('button', { name: /begin/i }).click()
  const question = page.locator('fieldset.question-card')
  const firstQuestionId = await question.getByRole('radio').first().getAttribute('name')
  await question.locator('.answer-option').first().click()
  await expect.poll(() => question.getByRole('radio').first().getAttribute('name')).not.toBe(firstQuestionId)

  await expectRenderedSanity(page)
  await expectNoHorizontalOverflow(page)
  await guards.assertClean()
})

test('a pre-rendered public role page exposes content before JavaScript and boots the SPA', async ({ page, request }) => {
  const response = await request.get('/roles/dominant/index.html')
  expect(response.ok()).toBe(true)
  const html = await response.text()
  expect(html).toContain('<title>Dominant | KinkAtlas</title>')
  expect(html).toContain('<h1>Dominant</h1>')
  expect(html).toContain('A Dominant is someone who takes negotiated authority')
  expect(html).not.toContain('Your Kink Map')

  const guards = await installBrowserGuards(page)
  await page.goto('/roles/dominant')
  await expect(page.getByRole('heading', { level: 1, name: 'Dominant' })).toBeVisible()
  await expect(page).toHaveTitle('Dominant | KinkAtlas')
  await page.getByRole('link', { name: 'Back to Role Library' }).first().click()
  await expect(page).toHaveURL(/\/roles$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Explore the language of kink.' })).toBeVisible()
  await guards.assertClean()
})
