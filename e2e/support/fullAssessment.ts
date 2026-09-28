import { expect, type Locator, type Page } from '@playwright/test'

export type AnswerMap = Readonly<Record<string, string>>

export interface FullAssessmentScenario {
  discovery?: AnswerMap
  discoveryFallback?: string
  refinement?: AnswerMap
  refinementFallback?: string
  readiness?: AnswerMap
  readinessFallback?: string
  boundaries?: Readonly<Record<string, string>>
  boundaryFallback?: string
  negotiation?: AnswerMap
  negotiationFallback?: string
}

export interface FullAssessmentTrace {
  discovery: string[]
  refinement: string[]
  readiness: string[]
  boundaries: string[]
  negotiation: string[]
}

const maxDiscoveryQuestions = 30
const maxRefinementQuestions = 6
const maxReflectionQuestions = 30
const maxNegotiationQuestions = 30

async function visible(locator: Locator) {
  return locator.isVisible().catch(() => false)
}

async function answerVisibleQuestion(
  page: Page,
  answers: AnswerMap | undefined,
  fallback: string,
  encountered: string[],
  completion: Locator,
) {
  const question = page.locator('fieldset.question-card')
  await expect(question).toBeVisible()
  const radios = question.locator('input[type="radio"]')
  const questionId = await radios.first().getAttribute('name')
  if (!questionId) throw new Error(`Visible question has no radio name. Encountered: ${encountered.join(', ') || '(none)'}`)

  const availableAnswers: string[] = []
  for (const radio of await radios.all()) {
    const value = await radio.getAttribute('value')
    if (value) availableAnswers.push(value)
  }

  const answerId = answers?.[questionId] ?? fallback
  if (!availableAnswers.includes(answerId)) {
    throw new Error(`${questionId}: answer ${answerId} is unavailable. Available: ${availableAnswers.join(', ')}. Encountered: ${encountered.join(', ') || '(none)'}`)
  }

  encountered.push(questionId)
  const radio = question.locator(`input[name="${questionId}"][value="${answerId}"]`)
  await radio.locator('..').click()
  await expect.poll(async () => {
    if (await visible(completion)) return 'complete'
    return page.locator('fieldset.question-card input[type="radio"]').first().getAttribute('name')
  }, { message: `${questionId} should advance after selecting ${answerId}` }).not.toBe(questionId)
}

async function answerQuestionStage(
  page: Page,
  heading: string,
  completion: Locator,
  answers: AnswerMap | undefined,
  fallback: string,
  encountered: string[],
  maximum: number,
) {
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()

  while (!(await visible(completion))) {
    if (encountered.length >= maximum) {
      throw new Error(`${heading} exceeded its ${maximum}-question safety limit. Encountered: ${encountered.join(', ')}`)
    }
    await answerVisibleQuestion(page, answers, fallback, encountered, completion)
  }
}

export async function completeAssessmentThroughBrowser(page: Page, scenario: FullAssessmentScenario = {}): Promise<FullAssessmentTrace> {
  const trace: FullAssessmentTrace = { discovery: [], refinement: [], readiness: [], boundaries: [], negotiation: [] }

  await page.goto('/assessment')
  await expect(page.locator('html')).not.toHaveAttribute('data-persona-harness', /.+/)
  await page.getByRole('button', { name: /begin/i }).click()

  const discoveryComplete = page.getByText(/answered enough for a first discovery map/i)
  await answerQuestionStage(page, 'Discover', discoveryComplete, scenario.discovery, scenario.discoveryFallback ?? 'prefer-not', trace.discovery, maxDiscoveryQuestions)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  const refinementComplete = page.getByText(/Refinement complete|No extra refinement is needed yet/i)
  await answerQuestionStage(page, 'Refine', refinementComplete, scenario.refinement, scenario.refinementFallback ?? 'prefer-not', trace.refinement, maxRefinementQuestions)
  expect(trace.refinement.length).toBeLessThanOrEqual(maxRefinementQuestions)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  const reflectionComplete = page.getByText('Reflection complete.', { exact: true })
  await answerQuestionStage(page, 'Reflect', reflectionComplete, scenario.readiness, scenario.readinessFallback ?? 'prefer-not', trace.readiness, maxReflectionQuestions)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Define', exact: true })).toBeVisible()
  const boundaryItems = page.locator('label.boundary-item')
  const boundaryCount = await boundaryItems.count()
  expect(boundaryCount).toBeGreaterThan(0)
  for (let index = 0; index < boundaryCount; index += 1) {
    const boundaryItem = boundaryItems.nth(index)
    const label = (await boundaryItem.locator('strong').innerText()).trim()
    const value = scenario.boundaries?.[label] ?? scenario.boundaryFallback ?? 'prefer-not'
    await boundaryItem.locator('select').selectOption(value)
    trace.boundaries.push(`${label}:${value}`)
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  const communicationComplete = page.getByText('Your first map is ready.', { exact: true })
  await answerQuestionStage(page, 'Communicate', communicationComplete, scenario.negotiation, scenario.negotiationFallback ?? 'prefer-not', trace.negotiation, maxNegotiationQuestions)
  await page.getByRole('button', { name: 'View my results', exact: true }).click()

  await expect(page).toHaveURL(/\/results$/)
  await expect(page.getByRole('heading', { name: 'A map, not a verdict.' })).toBeVisible()
  return trace
}
