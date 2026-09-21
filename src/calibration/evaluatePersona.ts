import { boundaryItems } from '../data/boundaries'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { matchRoles } from '../engine/roleMatching'
import { evaluateReadiness } from '../engine/readinessScoring'
import { activityRecommendations } from '../engine/activityRecommendations'
import type { AlignmentBand } from '../types'
import type { CalibrationExpectation, CalibrationPersona, ExpectationResult, PersonaEvaluation } from './calibrationTypes'

const bandRank: Record<AlignmentBand, number> = { insufficient: 0, some: 1, explore: 2, strong: 3 }

function describeExpectation(expectation: CalibrationExpectation): string {
  switch (expectation.kind) {
    case 'role-in-top': return `${expectation.roleId} appears in the top ${expectation.top}`
    case 'role-above': return `${expectation.higherRoleId} ranks above ${expectation.lowerRoleId}`
    case 'minimum-band': return `${expectation.roleId} is at least ${expectation.band}`
    case 'maximum-band': return `${expectation.roleId} is no higher than ${expectation.band}`
    case 'confidence': return `${expectation.roleId} confidence is ${expectation.allowed.join(' or ')}`
    case 'raw-above-ranking': return `${expectation.roleId} raw alignment exceeds its evidence-adjusted ranking`
    case 'minimum-role-count': return `at least ${expectation.count} roles are ${expectation.band}`
    case 'maximum-role-count': return `at most ${expectation.count} roles are ${expectation.band}`
    case 'readiness-band': return `${expectation.competency} readiness is ${expectation.allowed.join(' or ')}`
    case 'blind-spot': return `blind spot ${expectation.blindSpotId} remains visible`
    case 'critical-flag': return `critical flag ${expectation.flagId} remains visible`
    case 'activity-status': return `${expectation.itemId} activity guidance is ${expectation.status}`
  }
}

function evaluateExpectation(expectation: CalibrationExpectation, evaluation: Omit<PersonaEvaluation, 'expectationResults' | 'passed'>): ExpectationResult {
  const roleIndex = (roleId: string) => evaluation.roleResults.findIndex((result) => result.role.id === roleId)
  const role = (roleId: string) => evaluation.roleResults.find((result) => result.role.id === roleId)
  let passed = false

  switch (expectation.kind) {
    case 'role-in-top': passed = roleIndex(expectation.roleId) >= 0 && roleIndex(expectation.roleId) < expectation.top; break
    case 'role-above': passed = roleIndex(expectation.higherRoleId) >= 0 && roleIndex(expectation.higherRoleId) < roleIndex(expectation.lowerRoleId); break
    case 'minimum-band': passed = Boolean(role(expectation.roleId) && bandRank[role(expectation.roleId)!.alignment] >= bandRank[expectation.band]); break
    case 'maximum-band': passed = Boolean(role(expectation.roleId) && bandRank[role(expectation.roleId)!.alignment] <= bandRank[expectation.band]); break
    case 'confidence': passed = Boolean(role(expectation.roleId) && expectation.allowed.includes(role(expectation.roleId)!.confidence)); break
    case 'raw-above-ranking': passed = Boolean(role(expectation.roleId) && role(expectation.roleId)!.rawScore > role(expectation.roleId)!.rankedScore); break
    case 'minimum-role-count': passed = evaluation.roleResults.filter((result) => result.alignment === expectation.band).length >= expectation.count; break
    case 'maximum-role-count': passed = evaluation.roleResults.filter((result) => result.alignment === expectation.band).length <= expectation.count; break
    case 'readiness-band': passed = Boolean(evaluation.readiness.competencies.find((item) => item.competency === expectation.competency && expectation.allowed.includes(item.band))); break
    case 'blind-spot': passed = evaluation.readiness.blindSpots.some((spot) => spot.id === expectation.blindSpotId); break
    case 'critical-flag': passed = evaluation.readiness.criticalFlags.some((flag) => flag.id === expectation.flagId); break
    case 'activity-status': passed = evaluation.activityGuidance.some((item) => item.item.id === expectation.itemId && item.status === expectation.status); break
  }

  return { expectation, passed, message: `${passed ? 'PASS' : 'FAIL'}: ${describeExpectation(expectation)}` }
}

function declaredExpectations(persona: CalibrationPersona): CalibrationExpectation[] {
  return [
    ...(persona.expectedStrongRoles ?? []).map((roleId) => ({ kind: 'minimum-band' as const, roleId, band: 'strong' as const })),
    ...(persona.expectedPlausibleRoles ?? []).map((roleId) => ({ kind: 'minimum-band' as const, roleId, band: 'explore' as const })),
    ...(persona.rolesNotExpectedHigh ?? []).map((roleId) => ({ kind: 'maximum-band' as const, roleId, band: 'some' as const })),
    ...Object.entries(persona.expectedConfidence ?? {}).flatMap(([roleId, allowed]) => allowed ? [{ kind: 'confidence' as const, roleId, allowed }] : []),
    ...(persona.expectedBlindSpots ?? []).map((blindSpotId) => ({ kind: 'blind-spot' as const, blindSpotId })),
    ...persona.expectations,
  ]
}

export function evaluatePersona(persona: CalibrationPersona): PersonaEvaluation {
  const discoveryAnswers = persona.discoveryAnswers ?? {}
  const traitScores = calculateTraitScores(discoveryAnswers)
  const base = {
    persona,
    traitScores,
    roleResults: matchRoles(traitScores, discoveryAnswers),
    readiness: evaluateReadiness(persona.readinessAnswers ?? {}),
    activityGuidance: activityRecommendations(persona.boundaryIntent ?? {}, boundaryItems),
  }
  const expectationResults = declaredExpectations(persona).map((expectation) => evaluateExpectation(expectation, base))
  return { ...base, expectationResults, passed: expectationResults.every((result) => result.passed) }
}

export const failedExpectations = (evaluation: PersonaEvaluation): string[] => evaluation.expectationResults.filter((result) => !result.passed).map((result) => result.message)
