import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AssessmentProvider } from '../context/AssessmentContext'
import { RoleCard } from '../components/RoleCard'
import { roleById, roles } from '../data/roles'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { explainRoleResult, strongestContributingSignals } from '../engine/roleExplanation'
import { matchRole } from '../engine/roleMatching'
import { RolePage } from '../pages/RolePage'

const dominantAnswers = {
  'd-power-give': 'strong',
  'd-position-give': 'strong',
  'r-lead': 'strong',
  'r-responsibility': 'strong',
  'r-structure': 'some',
}

afterEach(cleanup)

describe('role result explanations', () => {
  it('gives every scored role a specific meaning without repeated reflection filler', () => {
    expect(roles).toHaveLength(101)
    expect(new Set(roles.map((role) => role.description)).size).toBe(101)
    roles.forEach((role) => {
      expect(role.description, role.name).not.toMatch(/^(?:May prefer|May enjoy|May find|May value|May be|May combine|May experience|May have|May place)/i)
      expect(role.description, role.name).not.toMatch(/This vocabulary may be useful|Only you can decide|may feel meaningful|might resonate|could fit/i)
    })
  })

  it('preserves the required distinctions in core role meanings', () => {
    expect(roleById.bottom.description).toMatch(/receiving position[\s\S]*does not[\s\S]*submission/i)
    expect(roleById.top.description).toMatch(/active, giving, or directing position[\s\S]*does not[\s\S]*dominance/i)
    expect(roleById.dominant.description).toMatch(/negotiated authority or responsibility[\s\S]*rather than simply performing an activity/i)
    expect(roleById.submissive.description).toMatch(/yield some negotiated authority[\s\S]*does not remove agency/i)
    expect(roleById.switch.description).toMatch(/more than one side[\s\S]*directing and yielding/i)
    expect(roleById['versatile-player'].description).toMatch(/giving and receiving activity positions[\s\S]*Unlike a Switch/i)
    expect(roleById.sadist.description).toMatch(/giving consensual pain[\s\S]*does not automatically imply dominance/i)
    expect(roleById.masochist.description).toMatch(/receiving consensual pain[\s\S]*does not automatically imply submission/i)
    expect(roleById.rigger.description).toMatch(/rope craft and responsibility, not automatic dominance/i)
    expect(roleById['service-dominant'].description).toMatch(/negotiated authority[\s\S]*style of dominance rather than submission/i)
    expect(roleById.caregiver.description).toMatch(/nurturing[\s\S]*does not itself confer authority/i)
    expect(roleById.owner.description).toMatch(/bounded authority[\s\S]*symbolic and negotiated/i)
    expect(roleById.brat.description).toMatch(/playful defiance[\s\S]*does not require a submissive role/i)
    expect(roleById['brat-tamer'].description).toMatch(/negotiated brattiness[\s\S]*Unlike a generic Dominant/i)
    expect(roleById.protector.description).toMatch(/Unlike a general Caregiver[\s\S]*centers protection/i)
  })

  it('derives why-it-matched copy from actual role evidence', () => {
    const result = matchRole(roleById.bottom, {
      pleasureReceiving: { value: .9, evidence: 1, positive: 1, negative: 0 },
      sensorySeeking: { value: .8, evidence: 1, positive: 1, negative: 0 },
    }, {})
    const explanation = explainRoleResult(result)

    expect(explanation.summary).toMatch(/receiving pleasure[\s\S]*sensation/i)
    expect(explanation.summary).toContain('Bottom result')
    expect(explanation.summary).not.toContain(roleById.bottom.description)
    expect(explanation.summary).not.toMatch(/This vocabulary may be useful for reflection|Only you can decide/i)
  })

  it('uses singular language when one answer-backed theme explains a result', () => {
    const result = matchRole(roleById.bottom, {
      pleasureReceiving: { value: .9, evidence: 1, positive: 1, negative: 0 },
    }, {})

    expect(explainRoleResult(result).summary).toMatch(/receiving pleasure\. That theme contributed to this Bottom result\./i)
  })

  it('does not repeat the same semantic signal in strongest contributing signals', () => {
    const result = matchRole(roleById['protocol-enthusiast'], {
      protocol: { value: 1, evidence: 1, positive: 1, negative: 0 },
      ritual: { value: .65, evidence: 1, positive: 1, negative: 0 },
    }, { 'r-protocol': 'strong' })
    const resultBeforePresentation = structuredClone(result)
    const explanation = explainRoleResult(result)

    render(<MemoryRouter><RoleCard result={result} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Role meaning' })).toBeInTheDocument()
    const disclosure = screen.getByText('Why this result appeared')
    expect(disclosure.closest('details')).not.toHaveAttribute('open')
    fireEvent.click(disclosure)
    const block = screen.getByRole('heading', { name: 'Strongest contributing signals' }).parentElement!
    const displayedSignals = [...block.querySelectorAll('.trait-up')].map((element) => element.textContent)

    expect(displayedSignals).toEqual(['Strong interest in protocol.', 'Moderate interest in ritual.'])
    expect(new Set(displayedSignals).size).toBe(displayedSignals.length)
    expect(strongestContributingSignals(explanation)).toEqual(strongestContributingSignals(explanation))
    expect(result).toEqual(resultBeforePresentation)
  })

  it('keeps long labels with punctuation and Unicode inside the role-card structure', () => {
    const result = matchRole(roleById.bottom, {
      pleasureReceiving: { value: .9, evidence: 1, positive: 1, negative: 0 },
    }, {})
    const label = 'Very Long Role Label — Teacher’s Pet / Explorer'

    render(<MemoryRouter><RoleCard result={{ ...result, role: { ...result.role, name: label } }} /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: label })).toBeInTheDocument()
    expect(screen.getByText('Why this result appeared')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /explore this result/i })).toBeInTheDocument()
  })

  it('builds supporting and differentiating signals only from scoring evidence', () => {
    const result = matchRole(roleById.dominant, calculateTraitScores(dominantAnswers), dominantAnswers)
    const explanation = explainRoleResult(result)
    const scoredSupportingIds = result.supportingTraits.map((item) => item.id)
    const scoredDifferentiatingIds = result.differentiatingEvidence.filter((item) => item.value >= .5).map((item) => item.id)

    expect(explanation.supportingSignals.length).toBeGreaterThan(0)
    expect(explanation.supportingSignals.every((item) => scoredSupportingIds.includes(item.traitId))).toBe(true)
    expect(explanation.differentiatingSignals.every((item) => scoredDifferentiatingIds.includes(item.traitId))).toBe(true)
  })

  it('explains confidence as evidence quantity rather than identity certainty', () => {
    const sparseAnswers = { 'd-power-give': 'strong' }
    const result = matchRole(roleById.dominant, calculateTraitScores(sparseAnswers), sparseAnswers)
    const explanation = explainRoleResult(result)

    expect(result.confidence).toBe('low')
    expect(explanation.confidenceExplanation).toMatch(/limited related evidence/i)
    expect(explanation.confidenceExplanation).toMatch(/strong alignment can still appear/i)
  })

  it('shows not-implied content and marks reflection prompts as non-scoring on RolePage', () => {
    render(<AssessmentProvider><MemoryRouter initialEntries={['/roles/dominant']}><Routes><Route path="/roles/:roleId" element={<RolePage />} /></Routes></MemoryRouter></AssessmentProvider>)

    expect(screen.getByText(roleById.dominant.notImplied)).toBeInTheDocument()
    expect(screen.getByText(/optional prompts do not affect scoring/i)).toBeInTheDocument()
    expect(screen.getByText(roleById.dominant.reflectionQuestions[0])).toBeInTheDocument()
  })

  it('offers reliable recovery for an unknown role route', () => {
    render(<AssessmentProvider><MemoryRouter initialEntries={['/roles/not-a-role']}><Routes><Route path="/roles/:roleId" element={<RolePage />} /></Routes></MemoryRouter></AssessmentProvider>)

    expect(screen.getByRole('heading', { name: 'Role not found.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start exploring' })).toHaveAttribute('href', '/assessment')
    expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('link', { name: /return to results/i })).not.toBeInTheDocument()
  })

  it('keeps reflection content outside role scoring', () => {
    const scores = calculateTraitScores(dominantAnswers)
    const before = matchRole(roleById.dominant, scores, dominantAnswers)
    const after = matchRole({ ...roleById.dominant, reflectionQuestions: ['A completely different reflection prompt?'] }, scores, dominantAnswers)

    expect(after.rawScore).toBe(before.rawScore)
    expect(after.rankedScore).toBe(before.rankedScore)
    expect(after.confidence).toBe(before.confidence)
    expect(after.alignment).toBe(before.alignment)
  })

  it('provides reflection and valid related-role metadata across the taxonomy', () => {
    const knownIds = new Set(roles.map((role) => role.id))
    expect(roles).toHaveLength(101)
    expect(roles.every((role) => role.reflectionQuestions.length >= 2)).toBe(true)
    expect(roles.every((role) => (role.relatedRoleIds ?? []).every((id) => id !== role.id && knownIds.has(id)))).toBe(true)
  })
})
