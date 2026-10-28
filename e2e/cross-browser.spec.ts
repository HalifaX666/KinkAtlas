import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, installBrowserGuards, namedRoleSetLabels, openPersonaResults, openRoleSetBuilder } from './support/browserGuards'
import { createHostedApiState, installHostedApi } from './support/hostedApi'

const pilotRolePaths = [
  ['/roles/dominant', 'Dominant'],
  ['/roles/submissive', 'submissive'],
  ['/roles/switch', 'Switch'],
  ['/roles/top', 'Top'],
  ['/roles/bottom', 'Bottom'],
  ['/roles/vers', 'Vers'],
  ['/roles/rigger', 'Rigger'],
  ['/roles/rope-bottom', 'Rope Bottom'],
  ['/roles/brat', 'Brat'],
  ['/roles/brat-tamer', 'Brat Tamer'],
  ['/roles/primal-predator', 'Primal Predator'],
  ['/roles/primal-prey', 'Primal Prey'],
  ['/roles/primal-switch', 'Primal Switch'],
  ['/roles/pet', 'Pet'],
  ['/roles/owner', 'Owner'],
] as const

test('targeted assessment interaction remains usable', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await page.goto('/assessment')
  await page.getByRole('button', { name: /begin/i }).click()

  const question = page.locator('fieldset.question-card')
  const firstQuestionId = await question.getByRole('radio').first().getAttribute('name')
  await expect(question.locator('legend')).toBeVisible()
  await question.locator('.answer-option').first().click()
  await expect.poll(() => question.getByRole('radio').first().getAttribute('name')).not.toBe(firstQuestionId)

  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(question.getByRole('radio').first()).toHaveAttribute('name', firstQuestionId ?? '')
  await expectNoHorizontalOverflow(page)
  await guards.assertClean()
})

test('targeted Results and role navigation preserve the current role set', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await openPersonaResults(page, 'balanced-authority-pattern')
  await openRoleSetBuilder(page)
  const before = await namedRoleSetLabels(page, 'Current role set')
  await expect(page.getByRole('list', { name: 'Current role cards' }).locator('.role-identity-card')).toHaveCount(before.length)

  const exploreResult = page.getByRole('link', { name: /Explore this result/i }).first()
  await Promise.all([
    page.waitForURL(/\/roles\//),
    exploreResult.dispatchEvent('click'),
  ])
  await expect(page.getByRole('heading', { name: 'How this relates to your answers' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to your results' }).click()
  await expect(page.getByRole('heading', { name: 'Role discovery' })).toBeVisible()
  await openRoleSetBuilder(page)

  expect(await namedRoleSetLabels(page, 'Current role set')).toEqual(before)
  await expectNoHorizontalOverflow(page)
  await guards.assertClean()
})

test('Phase K hosted sharing and local vault remain compatible', async ({ page }) => {
  test.setTimeout(60_000)
  const state = createHostedApiState()
  await installHostedApi(page, state)
  const guards = await installBrowserGuards(page, { allowHostedContent: true })

  await page.goto('/viewer-request')
  await page.getByRole('button', { name: 'Create Viewer Request' }).click()
  await expect(page.getByLabel('Viewer Request link')).toBeVisible()

  await openPersonaResults(page, 'balanced-authority-pattern')
  await page.getByRole('button', { name: 'Save my assessment' }).click()
  await expect(page.getByRole('status')).toContainText('Assessment saved')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Share your KinkAtlas' })
  await expect(dialog.getByText(/Advanced privacy options|ConsentCapsule|recipient pairing|Encrypted Capsule/i)).toHaveCount(0)
  await dialog.getByRole('button', { name: /Link & QR/i }).click()
  await dialog.getByRole('button', { name: 'Create share', exact: true }).click()
  const shareUrl = await dialog.getByLabel('Share link').inputValue()
  await expect(dialog.getByRole('img', { name: 'QR code for shared KinkAtlas result' })).toBeVisible()

  const persistedKey = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kinkatlas-vault')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const key = await new Promise<CryptoKey>((resolve, reject) => {
      const request = database.transaction('vault-key', 'readonly').objectStore('vault-key').get('primary')
      request.onsuccess = () => resolve((request.result as { key: CryptoKey }).key)
      request.onerror = () => reject(request.error)
    })
    let exportRejected = false
    try { await crypto.subtle.exportKey('raw', key) } catch { exportRejected = true }
    database.close()
    return { algorithm: key.algorithm.name, extractable: key.extractable, exportRejected }
  })
  expect(persistedKey).toEqual({ algorithm: 'AES-GCM', extractable: false, exportRejected: true })

  await page.goto(shareUrl)
  await expect(page.getByRole('heading', { name: 'Their KinkAtlas' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Their KinkAtlas' })).toBeVisible()

  await page.goto('/my-kinkatlas')
  await expect(page.getByRole('heading', { name: 'Saved assessments' })).toBeVisible()
  await page.getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('heading', { name: 'Saved assessment preview' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await guards.assertClean()
})

test('public Role Library and standalone role pages work without assessment state', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await page.goto('/roles')
  await expect(page.getByText('Browse role vocabulary', { exact: true })).toBeVisible()
  await expect(page.getByText(/812 (?:roles|terms)/i)).toHaveCount(0)
  await expect(page.getByText(/role identity/i)).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Search roles' }).fill('Primal Predator')
  await expect(page.getByRole('link', { name: 'Explore Primal Predator' })).toBeVisible()
  await page.getByRole('link', { name: 'Explore Primal Predator' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Primal Predator' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'At a glance' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to Role Library' }).click()
  await page.goto('/roles/kinkster')
  await expect(page.locator('[data-emblem-key="kinkatlas-emblem:role:kinkster-fbb59ce7"]')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await guards.assertClean()
})

test('all curated pilot routes and library-wide identity states render', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  for (const [path, label] of pilotRolePaths) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: label, exact: true })).toBeVisible()
    await expect(page.locator('.role-library-detail-hero .role-identity-card.has-curated-editorial .role-emblem')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  }

  await page.goto('/roles/kinkster')
  await expect(page.locator('[data-emblem-key="kinkatlas-emblem:role:kinkster-fbb59ce7"]')).toBeVisible()
  await page.goto('/roles/gag-bottom')
  await expect(page.getByRole('heading', { level: 1, name: 'Gag Bottom', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What does this mean?' })).toBeVisible()
  await expect(page.getByText(/takes the receiving position in gag play/i).first()).toBeVisible()
  await page.goto('/roles/not-a-real-role')
  await expect(page.getByRole('heading', { level: 1, name: 'Role not found.' })).toBeVisible()
  await guards.assertClean()
})

test('browse cards keep long and short content inside one fixed-height layout', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  const labels = ['Aesthetic Exhibitionist', 'Aesthetic Fetishist', 'Adult baby', 'Intellectual Sadomasochist', 'Angel']

  for (const width of [1280, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/roles')
    const heights: number[] = []

    for (const label of labels) {
      await page.getByRole('searchbox', { name: 'Search roles' }).fill(label)
      const card = page.locator('.role-identity-card-browse', { has: page.getByRole('heading', { name: label, exact: true }) })
      await expect(card).toHaveCount(1)
      const layout = await card.evaluate((element) => {
        const cardRect = element.getBoundingClientRect()
        const title = element.querySelector('h2, h3, h4')!
        const summary = element.querySelector('.role-identity-copy p')!
        const status = element.querySelector('.role-identity-context')!
        const footer = element.querySelector('.role-identity-link')!
        const titleStyle = getComputedStyle(title)
        const summaryStyle = getComputedStyle(summary)
        const titleRect = title.getBoundingClientRect()
        const summaryRect = summary.getBoundingClientRect()
        const statusRect = status.getBoundingClientRect()
        const footerRect = footer.getBoundingClientRect()
        const contentInside = Array.from(element.children).every((child) => {
          const childRect = child.getBoundingClientRect()
          return childRect.top >= cardRect.top && childRect.bottom <= cardRect.bottom
        })
        return {
          cardHeight: cardRect.height,
          hasOverflow: element.scrollHeight - element.clientHeight > 1,
          contentInside,
          titleLines: titleRect.height / Number.parseFloat(titleStyle.lineHeight),
          summaryLines: summaryRect.height / Number.parseFloat(summaryStyle.lineHeight),
          statusBeforeFooter: statusRect.bottom <= footerRect.top,
          footerInside: footerRect.bottom <= cardRect.bottom,
        }
      })

      heights.push(layout.cardHeight)
      expect(layout.hasOverflow, `${label} overflowed at ${width}px`).toBe(false)
      expect(layout.contentInside, `${label} content escaped its card at ${width}px`).toBe(true)
      expect(layout.titleLines, `${label} title exceeded two lines at ${width}px`).toBeLessThanOrEqual(2.05)
      expect(layout.summaryLines, `${label} summary exceeded two lines at ${width}px`).toBeLessThanOrEqual(2.05)
      expect(layout.statusBeforeFooter, `${label} status collided with its footer at ${width}px`).toBe(true)
      expect(layout.footerInside, `${label} footer escaped its card at ${width}px`).toBe(true)
    }

    expect(new Set(heights), `browse cards differed in height at ${width}px`).toHaveProperty('size', 1)
    await expectNoHorizontalOverflow(page)
  }

  await guards.assertClean()
})

test('targeted mobile interaction has no horizontal overflow', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/assessment')
  await page.getByRole('button', { name: /begin/i }).click()
  await expect(page.locator('fieldset.question-card')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/roles')
    await expect(page.getByRole('heading', { level: 1, name: 'Explore the language of kink.' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.goto('/roles/brat')
    await expect(page.getByRole('heading', { level: 1, name: 'Brat' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  }
  await guards.assertClean()
})
