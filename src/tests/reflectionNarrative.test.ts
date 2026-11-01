import { describe, expect, it } from 'vitest'
import { phaseJ3JourneySeeds, runPhaseJ3Journey } from '../calibration/phaseJ3Journeys'
import { roleLibrary } from '../taxonomy/roleLibrary'
import { buildEditableRoleProfileEntries, buildRoleProfileCandidates, optimizeRoleProfile, type EditableRoleProfileEntry } from '../engine/roleProfileOptimizer'
import { buildFullReflection, buildFullReflectionNarrative, defaultShareOptions, type ShareResultsData } from '../engine/shareResults'
import { assessmentPersonas } from './fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from './helpers/assessmentPersonaRunner'

function evaluation(id: string) {
  const persona = assessmentPersonas.find((candidate) => candidate.id === id)
  if (!persona) throw new Error(`Missing assessment persona ${id}.`)
  return evaluateAssessmentPersona(persona)
}

function journeyData(id: string): ShareResultsData {
  const seed = phaseJ3JourneySeeds.find((candidate) => candidate.id === id)
  if (!seed) throw new Error(`Missing Phase J.3 journey ${id}.`)
  const journey = runPhaseJ3Journey(seed)
  const discovery = { ...journey.broadAnswers, ...journey.adaptiveAnswers }
  const profile = optimizeRoleProfile(buildRoleProfileCandidates(journey.roleResults, {}, discovery))
  return {
    roleResults: journey.roleResults,
    roleSet: buildEditableRoleProfileEntries(profile),
    readiness: { competencies: [], blindSpots: [], criticalFlags: [] },
    boundaries: {},
    negotiation: {},
  }
}

describe('human-readable Full Reflection narrative', () => {
  it('produces byte-identical output for identical inputs and does not mutate assessment results', () => {
    const result = evaluation('balanced-authority-pattern')
    const before = JSON.stringify({ roleResults: result.roleResults, roleSet: result.shareData.roleSet, readiness: result.readiness })
    const outputs = Array.from({ length: 12 }, () => buildFullReflection(result.shareData, { ...defaultShareOptions, readiness: true, boundaries: true }))

    expect(new Set(outputs)).toHaveLength(1)
    expect(JSON.stringify({ roleResults: result.roleResults, roleSet: result.shareData.roleSet, readiness: result.readiness })).toBe(before)
  })

  it('attaches non-empty provenance to every planned claim', () => {
    const result = evaluation('balanced-authority-pattern')
    const narrative = buildFullReflectionNarrative(result.shareData, {
      roles: true,
      alignment: true,
      confidence: true,
      readiness: true,
      blindSpots: true,
      boundaries: true,
      negotiation: true,
    })

    expect(narrative.sections.length).toBeGreaterThan(4)
    for (const section of narrative.sections) {
      expect(section.claims.length, section.id).toBeGreaterThan(0)
      for (const item of section.claims) {
        expect(item.provenance.length, item.id).toBeGreaterThan(0)
        expect(item.provenance.every((source) => source.ids.length > 0), item.id).toBe(true)
      }
    }
  })

  it('keeps stable claim identities while realizing openings and trait evidence in plain language', () => {
    const result = evaluation('balanced-authority-pattern')
    const narrative = buildFullReflectionNarrative(result.shareData, defaultShareOptions)
    const claims = narrative.sections.flatMap((section) => section.claims)
    const opening = claims.find((item) => item.id === 'opening-assessment-supported-roles')
    const interests = claims.find((item) => item.id === 'interests-recurring-themes')
    const order = claims.find((item) => item.id === 'roles-current-order')

    expect(opening?.text).not.toMatch(/contains \d+ assessment-supported labels?/iu)
    expect(interests?.text).toContain('consensually directing an exchange')
    expect(interests?.text).not.toMatch(/recorded evidence|role flexibility/iu)
    expect(order?.text).toBe('Here they are in the order you currently have them.')
    for (const item of [opening, interests, order]) {
      expect(item?.provenance.length).toBeGreaterThan(0)
      expect(item?.provenance.every((source) => source.ids.length > 0)).toBe(true)
    }
  })

  it('uses meaningfully different observations for different evidence profiles', () => {
    const authority = buildFullReflection(journeyData('j3-dominance-without-top'))
    const activity = buildFullReflection(journeyData('j3-top-without-dominance'))
    const pet = buildFullReflection(journeyData('j3-pet-not-owner'))
    const rope = buildFullReflection(journeyData('j3-rope-giver-only'))

    expect(authority).toContain('Dominant')
    expect(activity).toContain('Service Top')
    expect(pet).toContain('Pet')
    expect(rope).toContain('Rigger')
    expect(new Set([authority, activity, pet, rope])).toHaveLength(4)
    expect(authority.match(/Interests and dynamics\n([^\n]+)/u)?.[1]).not.toBe(activity.match(/Interests and dynamics\n([^\n]+)/u)?.[1])
  })

  it.each([
    ['j3-dominance-without-top', 'Dominant'],
    ['j3-top-without-dominance', 'Top'],
    ['j3-submission-without-bottom', 'submissive'],
    ['j3-bottom-without-submission', 'Bottom'],
    ['j3-switch-both-directions', 'Switch'],
    ['j3-rope-giver-only', 'Rigger'],
    ['j3-rope-receiver-only', 'Bottom'],
    ['j3-rope-switch', 'Bondage Switch'],
    ['j3-owner-not-pet', 'Owner'],
    ['j3-pet-not-owner', 'Pet'],
    ['j3-sadism-versus-sensation', 'Sensual Sadist'],
  ])('keeps the %s distinction grounded in production-selected vocabulary', (id, expectedRole) => {
    const output = buildFullReflection(journeyData(id))
    expect(output).toContain(expectedRole)
    expect(output).not.toMatch(/trauma|attachment style|sexual orientation|gender identity|psychological motive|true identity/iu)
  })

  it('leaves sparse and missing evidence unknown rather than turning it into rejection', () => {
    const sparse = evaluation('high-uncertainty-pattern')
    const output = buildFullReflection(sparse.shareData)

    expect(output).toContain('There are no roles in your current set')
    expect(output).toContain('Anything unselected or unanswered remains open')
    expect(output).not.toMatch(/you rejected|you are not interested|you dislike/iu)
  })

  it('treats manual roles as choices without inventing assessment metrics', () => {
    const result = evaluation('balanced-authority-pattern')
    const manualRole = roleLibrary.roles.find((role) => role.label === 'Kinkster')
    if (!manualRole) throw new Error('Missing Kinkster role.')
    const manualEntry: EditableRoleProfileEntry = { roleId: manualRole.id, label: manualRole.label, definition: manualRole.definition, source: 'user-selected' }
    const removedRole = result.shareData.roleSet.at(-1)?.label
    const roleSet = [...result.shareData.roleSet.slice(0, -1), manualEntry]
    const output = buildFullReflection({ ...result.shareData, roleSet })
    const manualLine = output.split('\n').find((line) => line.startsWith('• Kinkster'))

    expect(output).toContain('You also added Kinkster to the set yourself')
    expect(output).toContain('without an assessment score or confidence')
    expect(manualLine).not.toMatch(/Strong alignment|Worth exploring|High confidence|Medium confidence|evidence covered/iu)
    if (removedRole) expect(output).not.toContain(`• ${removedRole}`)
    expect(result.shareData.roleSet).toEqual(result.suggestedRoleSet)
  })

  it('keeps readiness, blind spots, boundaries, and negotiation behind their existing disclosure controls', () => {
    const result = evaluation('multiple-hard-limits-pattern')
    const defaultOutput = buildFullReflection(result.shareData)
    const explicitOutput = buildFullReflection(result.shareData, {
      roles: true,
      alignment: true,
      confidence: true,
      readiness: true,
      blindSpots: true,
      boundaries: true,
      negotiation: true,
    })

    expect(defaultOutput).not.toContain('Reflection and readiness')
    expect(defaultOutput).not.toContain('Potential blind spots')
    expect(defaultOutput).not.toContain('Wants and boundaries')
    expect(defaultOutput).not.toContain('Conversation preferences')
    expect(explicitOutput).toContain('Reflection and readiness')
    expect(explicitOutput).toContain('Potential blind spots')
    expect(explicitOutput).toContain('Wants & boundaries')
    expect(explicitOutput).toContain('Conversation preferences')
    expect(explicitOutput).toContain('Hard limit')
    expect(explicitOutput).toContain('not a safety score or proof of real-world readiness')
    expect(explicitOutput).toContain('sharing it does not communicate consent')
  })

  it('does not leak role metrics when role or metric disclosure is disabled', () => {
    const result = evaluation('balanced-authority-pattern')
    const noRoles = buildFullReflection(result.shareData, { ...defaultShareOptions, roles: false, readiness: true })
    const noMetrics = buildFullReflection(result.shareData, { ...defaultShareOptions, alignment: false, confidence: false })

    expect(noRoles).not.toContain('Roles and vocabulary')
    expect(noRoles).not.toContain(result.shareData.roleSet[0]?.label ?? 'missing role')
    expect(noMetrics).not.toMatch(/Strong alignment|Worth exploring|High confidence|Medium confidence/iu)
    expect(noMetrics).toContain('Roles and vocabulary')
  })
})
