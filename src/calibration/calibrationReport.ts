import { boundaryItems } from '../data/boundaries'
import { roleById, roles } from '../data/roles'
import { activityRecommendations } from '../engine/activityRecommendations'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { evaluateReadiness } from '../engine/readinessScoring'
import { matchRoles } from '../engine/roleMatching'
import { adaptiveValidationScenarios, evaluateAdaptiveScenario } from './adaptiveValidation'
import { evaluatePersona, failedExpectations } from './evaluatePersona'
import { calibrationPersonas } from './personas'
import { analyzeQuestionCoverage, analyzeTraitCorrelations, analyzeTraitCoverage } from './questionCoverage'
import { analyzeRoleHealth, highOverlapPairs } from './roleHealth'
import { decisionPathCalibrationResults } from './decisionPathPersonas'
import { recommendationResults } from './recommendationPersonas'

export interface CalibrationReport {
  personaCount: number
  passedPersonaCount: number
  criticalFailureCount: number
  warningCount: number
  failedPersonas: { id: string; failures: string[] }[]
  roleCount: number
  roleHealthIssueCount: number
  rolesWithIssues: number
  roleHealthWarnings: ReturnType<typeof analyzeRoleHealth>
  highOverlapPairs: ReturnType<typeof highOverlapPairs>
  underCoveredTraits: ReturnType<typeof analyzeTraitCoverage>
  correlatedTraits: ReturnType<typeof analyzeTraitCorrelations>
  uniformTraitGroupQuestions: ReturnType<typeof analyzeQuestionCoverage>
  adaptivePassed: number
  adaptiveTotal: number
  adaptiveScenarios: { id: string; passed: boolean; focusedScore: number; redundantScore: number }[]
  readinessCriticalPersistence: boolean
  boundaryIndependence: boolean
  decisionPathPersonaCount: number
  decisionPathPassed: number
  decisionPathFailures: { id: string; failures: string[] }[]
  recommendationPersonaCount: number
  recommendationPassed: number
  recommendationFailures: { id: string; failures: string[] }[]
}

export function buildCalibrationReport(): CalibrationReport {
  const personaEvaluations = calibrationPersonas.map(evaluatePersona)
  const roleHealth = analyzeRoleHealth()
  const traitCoverage = analyzeTraitCoverage()
  const questionCoverage = analyzeQuestionCoverage()
  const adaptive = adaptiveValidationScenarios.map(evaluateAdaptiveScenario)

  const discovery = { 'd-rope': 'strong', 'r-rope-give': 'strong' }
  const roleResultsBefore = matchRoles(calculateTraitScores(discovery), discovery)
  const hardLimitGuidance = activityRecommendations({ rope: 'hard-limit' }, boundaryItems)
  const roleResultsAfter = matchRoles(calculateTraitScores(discovery), discovery)
  const boundaryIndependence = JSON.stringify(roleResultsBefore) === JSON.stringify(roleResultsAfter)
    && hardLimitGuidance.some((item) => item.item.id === 'rope' && item.status === 'off-table')
  const readiness = evaluateReadiness({ 'c-stop-1': 'c', 'c-stop-2': 'a', 'c-ongoing-1': 'a' })
  const readinessCriticalPersistence = readiness.criticalFlags.some((flag) => flag.id === 'safeword-only')
  const failedPersonas = personaEvaluations.filter((evaluation) => !evaluation.passed).map((evaluation) => ({ id: evaluation.persona.id, failures: failedExpectations(evaluation) }))
  const roleHealthWarnings = roleHealth.filter((role) => role.issues.length)
  const criticalRoleHealth = roleHealthWarnings.filter((role) => role.issues.some((issue) => ['TOO_FEW_QUESTIONS', 'LOW_REACHABILITY', 'NO_DIFFERENTIATING_TRAITS', 'UNREACHABLE_HIGH_CONFIDENCE', 'POSSIBLE_DUPLICATE_ROLE'].includes(issue)))
  const underCoveredTraits = traitCoverage.filter((trait) => trait.issues.includes('UNUSED_TRAIT') || trait.issues.includes('TOUCHED_ONCE'))
  const correlatedTraits = analyzeTraitCorrelations()
  const uniformTraitGroupQuestions = questionCoverage.filter((question) => question.nearlyIdenticalTraitGroups)
  const highOverlap = highOverlapPairs(roleHealth)
  const criticalFailureCount = failedPersonas.length + criticalRoleHealth.length + underCoveredTraits.length + adaptive.filter((scenario) => !scenario.passed).length + Number(!readinessCriticalPersistence) + Number(!boundaryIndependence)
    + decisionPathCalibrationResults.filter((result) => !result.passed).length + recommendationResults.filter((result) => !result.passed).length
  const decisionPathFailures = decisionPathCalibrationResults.filter((result) => !result.passed).map((result) => ({ id: result.persona.id, failures: result.failures }))
  const recommendationFailures = recommendationResults.filter((result) => !result.passed).map((result) => ({ id: result.persona.id, failures: result.failures.map((failure) => `${failure.kind}: ${failure.message}`) }))

  return {
    personaCount: personaEvaluations.length + decisionPathCalibrationResults.length + recommendationResults.length,
    passedPersonaCount: personaEvaluations.filter((evaluation) => evaluation.passed).length + decisionPathCalibrationResults.filter((result) => result.passed).length + recommendationResults.filter((result) => result.passed).length,
    criticalFailureCount,
    warningCount: roleHealthWarnings.reduce((count, role) => count + role.issues.length, 0) + correlatedTraits.length,
    failedPersonas,
    roleCount: roles.length,
    roleHealthIssueCount: roleHealth.reduce((count, role) => count + role.issues.length, 0),
    rolesWithIssues: roleHealth.filter((role) => role.issues.length).length,
    roleHealthWarnings,
    highOverlapPairs: highOverlap,
    underCoveredTraits,
    correlatedTraits,
    uniformTraitGroupQuestions,
    adaptivePassed: adaptive.filter((scenario) => scenario.passed).length,
    adaptiveTotal: adaptive.length,
    adaptiveScenarios: adaptiveValidationScenarios.map((scenario, index) => ({ id: scenario.id, ...adaptive[index] })),
    readinessCriticalPersistence,
    boundaryIndependence,
    decisionPathPersonaCount: decisionPathCalibrationResults.length,
    decisionPathPassed: decisionPathCalibrationResults.filter((result) => result.passed).length,
    decisionPathFailures,
    recommendationPersonaCount: recommendationResults.length,
    recommendationPassed: recommendationResults.filter((result) => result.passed).length,
    recommendationFailures,
  }
}

const percent = (value: number) => `${Math.round(value * 100)}%`

export function renderCalibrationReport(report = buildCalibrationReport()): string {
  const overlaps = report.highOverlapPairs.slice(0, 8).map((pair) => `  - ${roleById[pair.left].name} / ${roleById[pair.right].name}: ${percent(pair.similarity)}`)
  const failed = report.failedPersonas.flatMap((persona) => persona.failures.map((failure) => `  - ${persona.id}: ${failure.replace(/^FAIL: /, '')}`)).slice(0, 12)
  return [
    'KinkAtlas Calibration Report',
    '',
    `SUMMARY: ${report.criticalFailureCount} critical failures; ${report.warningCount} diagnostic warnings`,
    '',
    `PERSONAS: ${report.passedPersonaCount}/${report.personaCount} passed`,
    ...(failed.length ? ['Highest-priority persona failures:', ...failed] : ['  No expectation failures.']),
    '',
    `ROLE HEALTH: ${report.roleCount} roles analyzed; ${report.rolesWithIssues} roles have diagnostic warnings (${report.roleHealthIssueCount} signals)`,
    ...report.roleHealthWarnings.slice(0, 10).map((role) => `  - ${role.name}: ${role.issues.join(', ')}`),
    `  ${report.highOverlapPairs.length} high-overlap neighbor pairs (diagnostic only)`,
    ...overlaps,
    '',
    `TRAIT COVERAGE: ${report.underCoveredTraits.length} under-covered traits; ${report.correlatedTraits.length} mechanically correlated pairs`,
    ...report.underCoveredTraits.slice(0, 8).map((trait) => `  - ${trait.traitId}: ${trait.questionCount} question(s), ${trait.roleCount} role(s)`),
    `  ${report.uniformTraitGroupQuestions.length} questions use uniform trait groups across scored answers`,
    ...report.correlatedTraits.slice(0, 8).map((pair) => `  - ${pair.left} / ${pair.right}: ${percent(pair.coOccurrenceRatio)} co-occurrence, ${pair.meanEffectDifference.toFixed(2)} mean effect difference`),
    '',
    `ADAPTIVE QUESTIONING: ${report.adaptivePassed}/${report.adaptiveTotal} discrimination scenarios passed`,
    ...report.adaptiveScenarios.map((scenario) => `  - ${scenario.id}: ${scenario.passed ? 'passed' : 'FAILED'} (focused ${scenario.focusedScore.toFixed(3)}, redundant ${scenario.redundantScore.toFixed(3)})`),
    `READINESS: critical misconception persistence ${report.readinessCriticalPersistence ? 'passed' : 'FAILED'}`,
    `BOUNDARY INDEPENDENCE: ${report.boundaryIndependence ? 'passed' : 'FAILED'}`,
    `DECISION-PATH PERSONAS: ${report.decisionPathPassed}/${report.decisionPathPersonaCount} passed`,
    ...report.decisionPathFailures.flatMap((failure) => failure.failures.map((message) => `  - ${failure.id}: ${message}`)),
    `RECOMMENDATION PERSONAS: ${report.recommendationPassed}/${report.recommendationPersonaCount} passed`,
    ...report.recommendationFailures.flatMap((failure) => failure.failures.map((message) => `  - ${failure.id}: ${message}`)),
  ].join('\n')
}
