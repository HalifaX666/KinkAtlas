import { describe, expect, it } from 'vitest'
import { discoveryQuestionById, discoveryQuestions } from '../data/questions'
import { roleById } from '../data/roles'
import { questionInformationValue, selectNextDiscoveryQuestion } from '../engine/adaptiveQuestioning'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { matchRoles } from '../engine/roleMatching'
import type { AssessmentAnswers } from '../types'

const emptyAnswers = (): AssessmentAnswers => ({ discovery: {}, readiness: {}, boundaries: {}, negotiation: {} })

describe('adaptive role-family information value', () => {
  it('values a service-style differentiator above another generic dominance question for nearby dominant roles', () => {
    const plausible = ['dominant', 'service-dominant', 'pleasure-dominant', 'brat-tamer'].map((id) => roleById[id])
    const focused = questionInformationValue(discoveryQuestionById['r-service-direct'], plausible, {})
    const generic = questionInformationValue(discoveryQuestionById['r-lead'], plausible, {})
    expect(focused.total).toBeGreaterThan(generic.total)
    expect(focused.unresolvedFamilyDirection).toBeGreaterThan(0)
  })

  it('keeps the mandatory discovery ceiling at 26', () => {
    const answers = emptyAnswers()
    Object.assign(answers.discovery, Object.fromEntries(Array.from({ length: 26 }, (_, index) => [`answered-${index}`, 'strong'])))
    expect(selectNextDiscoveryQuestion(answers, {})).toBeUndefined()
  })

  it('is deterministic for identical evidence', () => {
    const plausible = ['rigger', 'bondage-top', 'rope-bottom', 'rope-model'].map((id) => roleById[id])
    expect(questionInformationValue(discoveryQuestionById['r-rope-give'], plausible, {}))
      .toEqual(questionInformationValue(discoveryQuestionById['r-rope-give'], plausible, {}))
  })

  it('does not ask arbitrary refinements after twenty unknown broad answers', () => {
    const answers = emptyAnswers()
    Object.assign(answers.discovery, Object.fromEntries(
      discoveryQuestions.filter((question) => question.phase === 'broad').map((question) => [question.id, 'unknown']),
    ))
    const traitScores = calculateTraitScores(answers.discovery)
    const plausible = matchRoles(traitScores, answers.discovery)
      .filter((result) => result.relevantAnswers > 0 && result.rawScore >= .38)
    expect(traitScores).toEqual({})
    expect(plausible).toEqual([])
    expect(selectNextDiscoveryQuestion(answers, traitScores)).toBeUndefined()
  })

  it('preserves evidence-backed refinement and the six-question adaptive cap', () => {
    const answers = emptyAnswers()
    Object.assign(answers.discovery, Object.fromEntries(
      discoveryQuestions.filter((question) => question.phase === 'broad').map((question) => [
        question.id, question.id === 'd-rope' ? 'strong' : 'unknown',
      ]),
    ))
    const asked: string[] = []
    while (true) {
      const next = selectNextDiscoveryQuestion(answers, calculateTraitScores(answers.discovery))
      if (!next) break
      asked.push(next.id)
      answers.discovery[next.id] = 'unknown'
    }
    expect(asked[0]).toBe('r-rope-give')
    expect(asked).toHaveLength(6)
    expect(Object.keys(answers.discovery)).toHaveLength(26)
  })
})
