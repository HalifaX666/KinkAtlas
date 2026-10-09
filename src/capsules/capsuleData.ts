import { boundaryItems, boundaryOptions } from '../data/boundaries'
import { getConversationStarter } from '../data/conversationStarters'
import { negotiationQuestions } from '../data/negotiation'
import { discoveryQuestions } from '../data/questions'
import { competencyDefinitions } from '../data/readiness'
import { readinessQuestions } from '../data/readiness'
import { refinementQuestions } from '../data/refinement'
import { traitById } from '../data/traits'
import { roleLibraryRoleForIdentity } from '../data/roleIdentity'
import { activityRecommendations } from '../engine/activityRecommendations'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { generateRecommendations } from '../engine/recommendations'
import { evaluateReadiness } from '../engine/readinessScoring'
import { explainRoleResult } from '../engine/roleExplanation'
import { matchRoles } from '../engine/roleMatching'
import { buildSuggestedRoleProfileEntries, type EditableRoleProfileEntry } from '../engine/roleProfileOptimizer'
import type { AssessmentNavigationState } from '../context/AssessmentContext'
import type { AssessmentAnswers, BoundaryValue, ReadinessBand } from '../types'
import { CapsuleError } from './capsuleError'
import { createCurrentPayloadContext } from './capsuleSchema'
import {
  DISCLOSURE_SECTION_IDS,
  SHARED_DISCLOSURE_DEFAULTS,
  type DisclosureManifest,
  type PrivateRestorePayload,
  type SharedDisclosurePayload,
  type SharedRoleDefinition,
  type SharedRoleReference,
} from './capsuleTypes'
import {
  ASSESSMENT_ENGINE_REVISION,
  ASSESSMENT_SCHEMA_VERSION,
  ROLE_LIBRARY_REVISION,
  ROLE_LIBRARY_SCHEMA_VERSION,
} from './capsuleVersions'

export const RESULT_SNAPSHOT_VERSION = 1 as const
export const PRIVATE_RESTORE_VERSION = 1 as const

export interface SnapshotRole {
  roleId: string
  label: string
  definition?: string
  source: EditableRoleProfileEntry['source']
  assessmentRoleId?: string
}

export interface SnapshotRoleDiscovery {
  roleId: string
  label: string
  definition: string
  alignment: string
  confidence: string
  evidenceBreadth: number
  explanation: ReturnType<typeof explainRoleResult>
}

export interface ResultSnapshot {
  snapshotVersion: typeof RESULT_SNAPSHOT_VERSION
  assessmentSchemaVersion: typeof ASSESSMENT_SCHEMA_VERSION
  engineRevision: string
  roleLibrarySchemaVersion: typeof ROLE_LIBRARY_SCHEMA_VERSION
  roleLibraryRevision: string
  strongestDimensions: Array<{ traitId: string; label: string; value: number; evidence: number }>
  suggestedRoleSet: SnapshotRole[]
  suggestedPrimaryRoleId?: string
  currentRoleSet: SnapshotRole[]
  chosenPrimaryRoleId?: string
  roleDiscovery: SnapshotRoleDiscovery[]
  readiness: Array<{ competency: string; label: string; description: string; band: string; value: number; evidence: number }>
  blindSpots: Array<{ id: string; title: string; description: string; severity: string; evidence: number; critical: boolean }>
  criticalFlags: Array<{ id: string; title: string; description: string; sourceQuestionIds: string[] }>
  boundaries: Array<{ id: string; label: string; description: string; response: BoundaryValue; responseLabel: string; status: string; message: string }>
  conversationStatements: Array<{ questionId: string; domain: string; statement: string }>
  learningRecommendations: Array<{ title: string; description: string }>
}

export interface PrivateRestoreState {
  restoreVersion: typeof PRIVATE_RESTORE_VERSION
  assessmentSchemaVersion: typeof ASSESSMENT_SCHEMA_VERSION
  engineRevision: string
  roleLibrarySchemaVersion: typeof ROLE_LIBRARY_SCHEMA_VERSION
  roleLibraryRevision: string
  answers: AssessmentAnswers
  navigation: AssessmentNavigationState
  currentRoleSet: EditableRoleProfileEntry[] | null
  resultSnapshot: ResultSnapshot | null
  completionRequested: boolean
}

export interface PrivacyReceipt {
  included: string[]
  notIncluded: string[]
}

export interface PrivateRestoreBuilderInput {
  answers: AssessmentAnswers
  navigation: AssessmentNavigationState
  currentRoleSet: EditableRoleProfileEntry[] | null
  historicalResultSnapshot: ResultSnapshot | null
  completionRequested: boolean
}

const readinessLabels: Record<ReadinessBand, string> = {
  strong: 'Established',
  developing: 'Building',
  explore: 'Further reflection',
  important: 'Needs more reflection',
}

const alignmentLabels = {
  strong: 'Strong alignment',
  explore: 'Worth exploring',
  some: 'Some alignment',
  insufficient: 'Limited evidence',
} as const

const confidenceLabels = {
  high: 'High confidence',
  moderate: 'Medium confidence',
  low: 'Low confidence',
} as const

const disclosureLabels: Record<keyof DisclosureManifest, string> = {
  currentRoleSet: 'Current Role Set',
  roleDefinitions: 'Role definitions',
  roleProvenance: 'Role provenance',
  alignment: 'Alignment',
  confidence: 'Confidence',
  evidenceBreadth: 'Evidence breadth',
  suggestedRoleSet: 'Suggested Role Set',
  roleDiscovery: 'Role Discovery details',
  communicationProfile: 'Communication profile',
  negotiationPreferences: 'Negotiation preferences',
  readiness: 'Readiness reflection',
  blindSpots: 'Potential blind spots',
  criticalFlags: 'Critical flags',
  boundaries: 'Boundaries',
  assessmentEvidence: 'Assessment evidence',
}

const boundaryValueSet = new Set<BoundaryValue>(boundaryOptions.map(({ value }) => value))
const phases = new Set(['intro', 'discovery', 'refinement', 'readiness', 'boundaries', 'negotiation'])
const answerOptionsBySection = {
  discovery: new Map(discoveryQuestions.map((question) => [question.id, new Set(question.answers.map((answer) => answer.id))])),
  refinement: new Map(refinementQuestions.map((question) => [question.id, new Set(question.answers.map((answer) => answer.id))])),
  readiness: new Map(readinessQuestions.map((question) => [question.id, new Set(question.answers.map((answer) => answer.id))])),
  negotiation: new Map(negotiationQuestions.map((question) => [question.id, new Set(question.answers.map((answer) => answer.id))])),
}

function copyAnswerMap<T extends string>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(value).map(([key, answer]) => [key, answer])) as Record<string, T>
}

function snapshotRole(entry: EditableRoleProfileEntry): SnapshotRole {
  const libraryRole = roleLibraryRoleForIdentity(entry.roleId, entry.assessmentRoleId)
  const definition = entry.definition?.trim() || libraryRole?.definition?.trim()
  return {
    roleId: entry.roleId,
    label: entry.label,
    source: entry.source,
    ...(definition ? { definition } : {}),
    ...(entry.assessmentRoleId ? { assessmentRoleId: entry.assessmentRoleId } : {}),
  }
}

function copyRoleEntry(entry: EditableRoleProfileEntry): EditableRoleProfileEntry {
  return {
    roleId: entry.roleId,
    label: entry.label,
    source: entry.source,
    ...(entry.definition ? { definition: entry.definition } : {}),
    ...(entry.assessmentRoleId ? { assessmentRoleId: entry.assessmentRoleId } : {}),
  }
}

export function buildResultSnapshot(answers: AssessmentAnswers, currentRoleSet: EditableRoleProfileEntry[]): ResultSnapshot {
  const traitScores = calculateTraitScores(answers.discovery)
  const roleResults = matchRoles(traitScores, answers.discovery)
  const suggestedRoleSet = buildSuggestedRoleProfileEntries(roleResults, answers.refinement, answers.discovery)
  const readiness = evaluateReadiness(answers.readiness)
  const guidance = activityRecommendations(answers.boundaries, boundaryItems)

  return {
    snapshotVersion: RESULT_SNAPSHOT_VERSION,
    assessmentSchemaVersion: ASSESSMENT_SCHEMA_VERSION,
    engineRevision: ASSESSMENT_ENGINE_REVISION,
    roleLibrarySchemaVersion: ROLE_LIBRARY_SCHEMA_VERSION,
    roleLibraryRevision: ROLE_LIBRARY_REVISION,
    strongestDimensions: Object.entries(traitScores)
      .sort(([, left], [, right]) => (right?.value ?? 0) - (left?.value ?? 0))
      .slice(0, 10)
      .map(([traitId, score]) => ({
        traitId,
        label: traitById[traitId as keyof typeof traitById].label,
        value: score!.value,
        evidence: score!.evidence,
      })),
    suggestedRoleSet: suggestedRoleSet.map(snapshotRole),
    suggestedPrimaryRoleId: suggestedRoleSet[0]?.roleId,
    currentRoleSet: currentRoleSet.map(snapshotRole),
    chosenPrimaryRoleId: currentRoleSet[0]?.roleId,
    roleDiscovery: roleResults.slice(0, 12).map((result) => ({
      roleId: result.role.id,
      label: result.role.name,
      definition: result.role.description,
      alignment: alignmentLabels[result.alignment],
      confidence: confidenceLabels[result.confidence],
      evidenceBreadth: Math.round(result.coverage * 100),
      explanation: explainRoleResult(result),
    })),
    readiness: readiness.competencies.map((item) => ({
      competency: item.competency,
      label: competencyDefinitions[item.competency].label,
      description: competencyDefinitions[item.competency].description,
      band: readinessLabels[item.band],
      value: item.value,
      evidence: item.evidence,
    })),
    blindSpots: readiness.blindSpots.map(({ id, title, description, severity, evidence, critical }) => ({
      id, title, description, severity, evidence, critical,
    })),
    criticalFlags: readiness.criticalFlags.map(({ id, title, description, sourceQuestionIds }) => ({
      id, title, description, sourceQuestionIds: [...sourceQuestionIds],
    })),
    boundaries: guidance.map((item) => ({
      id: item.item.id,
      label: item.item.label,
      description: item.item.description,
      response: answers.boundaries[item.item.id],
      responseLabel: boundaryOptions.find(({ value }) => value === answers.boundaries[item.item.id])?.label ?? 'Unknown',
      status: item.status,
      message: item.message,
    })),
    conversationStatements: negotiationQuestions.slice(0).flatMap((question) => {
      const answerId = answers.negotiation[question.id]
      const statement = answerId ? getConversationStarter(question.id, answerId) : undefined
      return statement ? [{ questionId: question.id, domain: question.domain, statement }] : []
    }).slice(0, 8),
    learningRecommendations: generateRecommendations(roleResults, readiness.competencies).map((item) => ({ ...item })),
  }
}

export function buildPrivateRestoreState(input: PrivateRestoreBuilderInput): PrivateRestoreState {
  const snapshot = input.historicalResultSnapshot
    ?? (input.currentRoleSet === null ? null : buildResultSnapshot(input.answers, input.currentRoleSet))
  return {
    restoreVersion: PRIVATE_RESTORE_VERSION,
    assessmentSchemaVersion: ASSESSMENT_SCHEMA_VERSION,
    engineRevision: ASSESSMENT_ENGINE_REVISION,
    roleLibrarySchemaVersion: ROLE_LIBRARY_SCHEMA_VERSION,
    roleLibraryRevision: ROLE_LIBRARY_REVISION,
    answers: {
      discovery: copyAnswerMap(input.answers.discovery),
      refinement: copyAnswerMap(input.answers.refinement),
      readiness: copyAnswerMap(input.answers.readiness),
      boundaries: copyAnswerMap(input.answers.boundaries),
      negotiation: copyAnswerMap(input.answers.negotiation),
    },
    navigation: {
      ...input.navigation,
      discoveryHistory: [...input.navigation.discoveryHistory],
      refinementHistory: [...input.navigation.refinementHistory],
    },
    currentRoleSet: input.currentRoleSet?.map(copyRoleEntry) ?? null,
    resultSnapshot: snapshot ? structuredClone(snapshot) : null,
    completionRequested: input.completionRequested,
  }
}

export function privateRestorePayload(state: PrivateRestoreState): PrivateRestorePayload {
  validatePrivateRestoreState(state)
  return { payloadType: 'private-restore', ...createCurrentPayloadContext(), restore: state as unknown as PrivateRestorePayload['restore'] }
}

export function buildSharedDisclosurePayload(
  roleSet: EditableRoleProfileEntry[],
  requestedManifest: Pick<DisclosureManifest, 'currentRoleSet' | 'roleDefinitions'> = SHARED_DISCLOSURE_DEFAULTS,
): SharedDisclosurePayload {
  const manifest: DisclosureManifest = {
    ...SHARED_DISCLOSURE_DEFAULTS,
    currentRoleSet: requestedManifest.currentRoleSet,
    roleDefinitions: requestedManifest.roleDefinitions,
  }
  const roles: SharedRoleReference[] = roleSet.map((entry, index) => ({ roleId: entry.roleId, label: entry.label, primary: index === 0 }))
  const definitions: SharedRoleDefinition[] = roleSet.flatMap((entry) => {
    const definition = entry.definition?.trim() || roleLibraryRoleForIdentity(entry.roleId, entry.assessmentRoleId)?.definition?.trim()
    return definition ? [{ roleId: entry.roleId, definition }] : []
  })
  return {
    payloadType: 'shared-disclosure',
    ...createCurrentPayloadContext(),
    disclosureManifest: manifest,
    sections: {
      ...(manifest.currentRoleSet ? { currentRoleSet: roles } : {}),
      ...(manifest.roleDefinitions ? { roleDefinitions: definitions } : {}),
    },
  }
}

export function privacyReceiptForPayload(payload: SharedDisclosurePayload): PrivacyReceipt {
  const included = DISCLOSURE_SECTION_IDS.filter((id) => payload.disclosureManifest[id]).map((id) => disclosureLabels[id])
  const notIncluded = DISCLOSURE_SECTION_IDS.filter((id) => !payload.disclosureManifest[id]).map((id) => disclosureLabels[id])
  return { included, notIncluded: [...notIncluded, 'Raw assessment answers', 'Assessment navigation', 'Private restore state'] }
}

function fail(): never {
  throw new CapsuleError('payload-validation-failed')
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail()
  return value as Record<string, unknown>
}

function exact(value: Record<string, unknown>, required: string[], optional: string[] = []): void {
  const allowed = new Set([...required, ...optional])
  if (required.some((key) => !Object.hasOwn(value, key)) || Object.keys(value).some((key) => !allowed.has(key))) fail()
}

function text(value: unknown): string {
  if (typeof value !== 'string' || !value.length) fail()
  return value
}

function finite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail()
  return value
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') fail()
  return value
}

function textArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) fail()
  return value as string[]
}

function stringRecord(value: unknown, boundary = false): Record<string, string> {
  const source = record(value)
  for (const answer of Object.values(source)) {
    if (typeof answer !== 'string' || (boundary && !boundaryValueSet.has(answer as BoundaryValue))) fail()
  }
  return source as Record<string, string>
}

function answerRecord(value: unknown, section: keyof typeof answerOptionsBySection): Record<string, string> {
  const source = stringRecord(value)
  const questions = answerOptionsBySection[section]
  for (const [questionId, answerId] of Object.entries(source)) {
    if (!questions.get(questionId)?.has(answerId)) fail()
  }
  return source
}

function validateRoleEntry(value: unknown): void {
  const role = record(value)
  exact(role, ['roleId', 'label', 'source'], ['definition', 'assessmentRoleId'])
  text(role.roleId); text(role.label)
  if (role.source !== 'recommended' && role.source !== 'user-selected') fail()
  if (role.definition !== undefined) text(role.definition)
  if (role.assessmentRoleId !== undefined) text(role.assessmentRoleId)
}

function validateSnapshot(value: unknown): asserts value is ResultSnapshot {
  const snapshot = record(value)
  exact(snapshot, [
    'snapshotVersion', 'assessmentSchemaVersion', 'engineRevision', 'roleLibrarySchemaVersion', 'roleLibraryRevision',
    'strongestDimensions', 'suggestedRoleSet', 'currentRoleSet', 'roleDiscovery', 'readiness', 'blindSpots',
    'criticalFlags', 'boundaries', 'conversationStatements', 'learningRecommendations',
  ], ['suggestedPrimaryRoleId', 'chosenPrimaryRoleId'])
  if (snapshot.snapshotVersion !== RESULT_SNAPSHOT_VERSION || snapshot.assessmentSchemaVersion !== ASSESSMENT_SCHEMA_VERSION || snapshot.roleLibrarySchemaVersion !== ROLE_LIBRARY_SCHEMA_VERSION) fail()
  text(snapshot.engineRevision); text(snapshot.roleLibraryRevision)
  if (snapshot.suggestedPrimaryRoleId !== undefined) text(snapshot.suggestedPrimaryRoleId)
  if (snapshot.chosenPrimaryRoleId !== undefined) text(snapshot.chosenPrimaryRoleId)
  if (!Array.isArray(snapshot.strongestDimensions) || snapshot.strongestDimensions.length > 10) fail()
  snapshot.strongestDimensions.forEach((item) => {
    const dimension = record(item); exact(dimension, ['traitId', 'label', 'value', 'evidence'])
    text(dimension.traitId); text(dimension.label)
    const value = finite(dimension.value); const evidence = finite(dimension.evidence)
    if (value < 0 || value > 1 || evidence < 0) fail()
  })
  for (const field of ['suggestedRoleSet', 'currentRoleSet'] as const) {
    if (!Array.isArray(snapshot[field]) || snapshot[field].length > 5) fail()
    snapshot[field].forEach(validateRoleEntry)
  }
  if (!Array.isArray(snapshot.roleDiscovery) || snapshot.roleDiscovery.length > 12) fail()
  snapshot.roleDiscovery.forEach((item) => {
    const role = record(item); exact(role, ['roleId', 'label', 'definition', 'alignment', 'confidence', 'evidenceBreadth', 'explanation'])
    text(role.roleId); text(role.label); text(role.definition)
    if (!Object.values(alignmentLabels).includes(role.alignment as never) || !Object.values(confidenceLabels).includes(role.confidence as never)) fail()
    const breadth = finite(role.evidenceBreadth); if (breadth < 0 || breadth > 100) fail()
    const explanation = record(role.explanation)
    exact(explanation, ['summary', 'supportingSignals', 'differentiatingSignals', 'limitingSignals', 'contrarySignals', 'confidenceExplanation', 'coverageExplanation', 'consentConsiderations', 'reflectionQuestions'])
    text(explanation.summary); text(explanation.confidenceExplanation); text(explanation.coverageExplanation)
    for (const field of ['supportingSignals', 'differentiatingSignals', 'limitingSignals', 'contrarySignals'] as const) {
      if (!Array.isArray(explanation[field]) || explanation[field].length > 3) fail()
      explanation[field].forEach((item) => {
        const signal = record(item); exact(signal, ['traitId', 'label', 'description', 'strength'])
        text(signal.traitId); text(signal.label); text(signal.description)
        if (!['strong', 'moderate', 'limiting', 'contrary'].includes(String(signal.strength))) fail()
      })
    }
    textArray(explanation.consentConsiderations); textArray(explanation.reflectionQuestions)
  })
  if (!Array.isArray(snapshot.readiness) || snapshot.readiness.length > 32) fail()
  snapshot.readiness.forEach((item) => {
    const result = record(item); exact(result, ['competency', 'label', 'description', 'band', 'value', 'evidence'])
    text(result.competency); text(result.label); text(result.description); text(result.band); finite(result.value); finite(result.evidence)
  })
  if (!Array.isArray(snapshot.blindSpots) || snapshot.blindSpots.length > 64) fail()
  snapshot.blindSpots.forEach((item) => {
    const spot = record(item); exact(spot, ['id', 'title', 'description', 'severity', 'evidence', 'critical'])
    text(spot.id); text(spot.title); text(spot.description); text(spot.severity); finite(spot.evidence); boolean(spot.critical)
  })
  if (!Array.isArray(snapshot.criticalFlags) || snapshot.criticalFlags.length > 64) fail()
  snapshot.criticalFlags.forEach((item) => {
    const flag = record(item); exact(flag, ['id', 'title', 'description', 'sourceQuestionIds'])
    text(flag.id); text(flag.title); text(flag.description); textArray(flag.sourceQuestionIds)
  })
  if (!Array.isArray(snapshot.boundaries) || snapshot.boundaries.length > boundaryItems.length) fail()
  snapshot.boundaries.forEach((item) => {
    const boundary = record(item); exact(boundary, ['id', 'label', 'description', 'response', 'responseLabel', 'status', 'message'])
    text(boundary.id); text(boundary.label); text(boundary.description); text(boundary.responseLabel); text(boundary.status); text(boundary.message)
    if (!boundaryValueSet.has(boundary.response as BoundaryValue)) fail()
  })
  if (!Array.isArray(snapshot.conversationStatements) || snapshot.conversationStatements.length > 8) fail()
  snapshot.conversationStatements.forEach((item) => {
    const statement = record(item); exact(statement, ['questionId', 'domain', 'statement'])
    text(statement.questionId); text(statement.domain); text(statement.statement)
  })
  if (!Array.isArray(snapshot.learningRecommendations) || snapshot.learningRecommendations.length > 6) fail()
  snapshot.learningRecommendations.forEach((item) => {
    const recommendation = record(item); exact(recommendation, ['title', 'description'])
    text(recommendation.title); text(recommendation.description)
  })
}

export function validatePrivateRestoreState(value: unknown): asserts value is PrivateRestoreState {
  const state = record(value)
  exact(state, [
    'restoreVersion', 'assessmentSchemaVersion', 'engineRevision', 'roleLibrarySchemaVersion', 'roleLibraryRevision',
    'answers', 'navigation', 'currentRoleSet', 'resultSnapshot', 'completionRequested',
  ])
  if (state.restoreVersion !== PRIVATE_RESTORE_VERSION || state.assessmentSchemaVersion !== ASSESSMENT_SCHEMA_VERSION || state.roleLibrarySchemaVersion !== ROLE_LIBRARY_SCHEMA_VERSION) fail()
  text(state.engineRevision); text(state.roleLibraryRevision)
  const answers = record(state.answers)
  exact(answers, ['discovery', 'refinement', 'readiness', 'boundaries', 'negotiation'])
  answerRecord(answers.discovery, 'discovery'); answerRecord(answers.refinement, 'refinement'); answerRecord(answers.readiness, 'readiness'); answerRecord(answers.negotiation, 'negotiation')
  const boundaries = stringRecord(answers.boundaries, true)
  if (Object.keys(boundaries).some((id) => !boundaryItems.some((item) => item.id === id))) fail()
  const navigation = record(state.navigation)
  exact(navigation, ['phase', 'discoveryHistory', 'discoveryCursor', 'refinementHistory', 'refinementCursor', 'readinessIndex', 'negotiationIndex'])
  if (typeof navigation.phase !== 'string' || !phases.has(navigation.phase)) fail()
  for (const field of ['discoveryHistory', 'refinementHistory'] as const) {
    if (!Array.isArray(navigation[field]) || navigation[field].some((item) => typeof item !== 'string')) fail()
  }
  if ((navigation.discoveryHistory as string[]).some((id) => !answerOptionsBySection.discovery.has(id))) fail()
  if ((navigation.refinementHistory as string[]).some((id) => !answerOptionsBySection.refinement.has(id))) fail()
  for (const field of ['discoveryCursor', 'refinementCursor'] as const) {
    if (navigation[field] !== null && (!Number.isSafeInteger(navigation[field]) || (navigation[field] as number) < 0)) fail()
  }
  if (!Number.isSafeInteger(navigation.readinessIndex) || (navigation.readinessIndex as number) < 0 || !Number.isSafeInteger(navigation.negotiationIndex) || (navigation.negotiationIndex as number) < 0) fail()
  if ((navigation.readinessIndex as number) > readinessQuestions.length || (navigation.negotiationIndex as number) > negotiationQuestions.length) fail()
  if (state.currentRoleSet !== null) {
    if (!Array.isArray(state.currentRoleSet) || state.currentRoleSet.length > 5) fail()
    state.currentRoleSet.forEach(validateRoleEntry)
  }
  if (state.resultSnapshot !== null) validateSnapshot(state.resultSnapshot)
  if ((state.engineRevision !== ASSESSMENT_ENGINE_REVISION || state.roleLibraryRevision !== ROLE_LIBRARY_REVISION) && state.resultSnapshot === null) fail()
  if (typeof state.completionRequested !== 'boolean') fail()
}

export function restoreRevisionStatus(state: PrivateRestoreState): 'full' | 'historical-only' {
  return state.engineRevision === ASSESSMENT_ENGINE_REVISION && state.roleLibraryRevision === ROLE_LIBRARY_REVISION
    ? 'full'
    : 'historical-only'
}
