import type { ResultSnapshot } from '../capsules/capsuleData'
import { validateResultSnapshot } from '../capsules/capsuleData'
import type { RoleEmblemRecipe } from '../data/roleEmblems'
import { buildRoleSetCardPresentations } from '../data/roleIdentity'
import type { EditableRoleProfileEntry } from '../engine/roleProfileOptimizer'
import type { RoleResult } from '../types'

export const SHARE_PACKAGE_MAGIC = 'kinkatlas-share-package' as const
export const SHARE_PACKAGE_VERSION = 1 as const
export const SHARE_PACKAGE_MAX_BYTES = 192 * 1024

export interface HistoricalRoleCard {
  roleId: string
  label: string
  familyLabel: string
  summary: string
  attributes: Array<{ label: string; value: string }>
  emblem: RoleEmblemRecipe
  sourceLabel: string
  assessmentDetails: string[]
}

export interface SharedHistoricalResult {
  snapshotVersion: 1
  assessmentSchemaVersion: number
  engineRevision: string
  roleLibrarySchemaVersion: number
  roleLibraryRevision: string
  strongestDimensions: ResultSnapshot['strongestDimensions']
  suggestedRoleSet: ResultSnapshot['suggestedRoleSet']
  suggestedPrimaryRoleId?: string
  currentRoleSet: ResultSnapshot['currentRoleSet']
  chosenPrimaryRoleId?: string
  roleDiscovery: Array<Omit<ResultSnapshot['roleDiscovery'][number], 'explanation'> & { explanationSummary: string }>
  readiness: ResultSnapshot['readiness']
  blindSpots: ResultSnapshot['blindSpots']
  criticalFlags: Array<Omit<ResultSnapshot['criticalFlags'][number], 'sourceQuestionIds'>>
  boundaries: Array<Omit<ResultSnapshot['boundaries'][number], 'response'>>
  conversationStatements: ResultSnapshot['conversationStatements']
  learningRecommendations: ResultSnapshot['learningRecommendations']
}

export interface SharePackage {
  magic: typeof SHARE_PACKAGE_MAGIC
  sharePackageVersion: typeof SHARE_PACKAGE_VERSION
  createdAt: string
  assessmentSchemaVersion: number
  engineRevision: string
  roleLibrarySchemaVersion: number
  roleLibraryRevision: string
  cards: HistoricalRoleCard[]
  result: SharedHistoricalResult
  manifest: { cards: true; result: true; currentRoleSet: true; roleDefinitions: true; rawAnswers: false }
  privacyReceipt: { included: string[]; excluded: string[] }
}

const encoder = new TextEncoder()
const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype'])

function invalid(): never { throw new Error('Invalid KinkAtlas share package') }
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid()
  return value as Record<string, unknown>
}
function exact(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void {
  const allowed = new Set([...required, ...optional])
  if (Object.keys(value).some((key) => dangerousKeys.has(key) || !allowed.has(key))) invalid()
  if (required.some((key) => !Object.hasOwn(value, key))) invalid()
}
function text(value: unknown, maximum = 8 * 1024): string {
  if (typeof value !== 'string' || encoder.encode(value).byteLength > maximum) invalid()
  return value
}
function finite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid()
  return value
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') invalid()
  return value
}
function stringArray(value: unknown, maximum = 256): string[] {
  if (!Array.isArray(value) || value.length > maximum) invalid()
  return value.map((item) => text(item))
}
function point(value: unknown): void {
  if (!Array.isArray(value) || value.length !== 2) invalid()
  finite(value[0]); finite(value[1])
}
function validateCommand(value: unknown): void {
  const command = record(value)
  const kind = text(command.kind, 32)
  if (kind === 'line') { exact(command, ['kind', 'from', 'to']); point(command.from); point(command.to); return }
  if (kind === 'polyline') {
    exact(command, ['kind', 'points'], ['closed'])
    if (!Array.isArray(command.points) || command.points.length > 64) invalid()
    command.points.forEach(point)
    if (command.closed !== undefined) boolean(command.closed)
    return
  }
  if (kind === 'circle') { exact(command, ['kind', 'center', 'radius']); point(command.center); finite(command.radius); return }
  if (kind === 'bezier') {
    exact(command, ['kind', 'start', 'control1', 'control2', 'end'])
    point(command.start); point(command.control1); point(command.control2); point(command.end); return
  }
  invalid()
}
function validateEmblem(value: unknown): void {
  const emblem = record(value)
  exact(emblem, ['identityKey', 'roleId', 'familyKey', 'motif', 'direction', 'enclosure', 'composition', 'core', 'semanticModifier', 'catalogOrdinal', 'commands'])
  for (const key of ['identityKey', 'roleId', 'familyKey', 'motif', 'direction', 'enclosure', 'composition', 'core', 'semanticModifier']) text(emblem[key], 256)
  if (!Number.isSafeInteger(emblem.catalogOrdinal) || Number(emblem.catalogOrdinal) < 1) invalid()
  if (!Array.isArray(emblem.commands) || emblem.commands.length < 1 || emblem.commands.length > 64) invalid()
  emblem.commands.forEach(validateCommand)
}
function validateRole(value: unknown): void {
  const role = record(value)
  exact(role, ['roleId', 'label', 'source'], ['definition', 'assessmentRoleId'])
  text(role.roleId, 256); text(role.label); text(role.source, 64)
  if (role.definition !== undefined) text(role.definition)
  if (role.assessmentRoleId !== undefined) text(role.assessmentRoleId, 256)
}
function resultArray(result: Record<string, unknown>, field: string, maximum = 256): unknown[] {
  const items = result[field]
  if (!Array.isArray(items) || items.length > maximum) invalid()
  return items
}
function validateHistoricalResult(value: unknown): void {
  const result = record(value)
  exact(result, [
    'snapshotVersion', 'assessmentSchemaVersion', 'engineRevision', 'roleLibrarySchemaVersion', 'roleLibraryRevision',
    'strongestDimensions', 'suggestedRoleSet', 'currentRoleSet', 'roleDiscovery', 'readiness', 'blindSpots',
    'criticalFlags', 'boundaries', 'conversationStatements', 'learningRecommendations',
  ], ['suggestedPrimaryRoleId', 'chosenPrimaryRoleId'])
  if (result.snapshotVersion !== 1 || !Number.isSafeInteger(result.assessmentSchemaVersion) || !Number.isSafeInteger(result.roleLibrarySchemaVersion)) invalid()
  text(result.engineRevision); text(result.roleLibraryRevision)
  if (result.suggestedPrimaryRoleId !== undefined) text(result.suggestedPrimaryRoleId, 256)
  if (result.chosenPrimaryRoleId !== undefined) text(result.chosenPrimaryRoleId, 256)
  for (const field of ['suggestedRoleSet', 'currentRoleSet'] as const) {
    if (!Array.isArray(result[field]) || result[field].length > 5) invalid()
    result[field].forEach(validateRole)
  }
  resultArray(result, 'strongestDimensions').forEach((item) => {
    const entry = record(item); exact(entry, ['traitId', 'label', 'value', 'evidence'])
    text(entry.traitId, 256); text(entry.label); finite(entry.value); finite(entry.evidence)
  })
  resultArray(result, 'roleDiscovery').forEach((item) => {
    const entry = record(item); exact(entry, ['roleId', 'label', 'definition', 'alignment', 'confidence', 'evidenceBreadth', 'explanationSummary'])
    text(entry.roleId, 256); text(entry.label); text(entry.definition); text(entry.alignment, 64); text(entry.confidence, 64); finite(entry.evidenceBreadth); text(entry.explanationSummary)
  })
  resultArray(result, 'readiness').forEach((item) => {
    const entry = record(item); exact(entry, ['competency', 'label', 'description', 'band', 'value', 'evidence'])
    text(entry.competency, 256); text(entry.label); text(entry.description); text(entry.band, 64); finite(entry.value); finite(entry.evidence)
  })
  resultArray(result, 'blindSpots').forEach((item) => {
    const entry = record(item); exact(entry, ['id', 'title', 'description', 'severity', 'evidence', 'critical'])
    text(entry.id, 256); text(entry.title); text(entry.description); text(entry.severity, 64); finite(entry.evidence); boolean(entry.critical)
  })
  resultArray(result, 'criticalFlags').forEach((item) => {
    const entry = record(item); exact(entry, ['id', 'title', 'description'])
    text(entry.id, 256); text(entry.title); text(entry.description)
  })
  resultArray(result, 'boundaries').forEach((item) => {
    const entry = record(item); exact(entry, ['id', 'label', 'description', 'responseLabel', 'status', 'message'])
    for (const key of ['id', 'label', 'description', 'responseLabel', 'status', 'message']) text(entry[key])
  })
  resultArray(result, 'conversationStatements').forEach((item) => {
    const entry = record(item); exact(entry, ['questionId', 'domain', 'statement'])
    text(entry.questionId, 256); text(entry.domain); text(entry.statement)
  })
  resultArray(result, 'learningRecommendations').forEach((item) => {
    const entry = record(item); exact(entry, ['title', 'description'])
    text(entry.title); text(entry.description)
  })
}

export function validateSharePackage(value: unknown): asserts value is SharePackage {
  const pkg = record(value)
  exact(pkg, ['magic', 'sharePackageVersion', 'createdAt', 'assessmentSchemaVersion', 'engineRevision', 'roleLibrarySchemaVersion', 'roleLibraryRevision', 'cards', 'result', 'manifest', 'privacyReceipt'])
  if (pkg.magic !== SHARE_PACKAGE_MAGIC || pkg.sharePackageVersion !== SHARE_PACKAGE_VERSION) invalid()
  const createdAt = text(pkg.createdAt, 64)
  if (Number.isNaN(Date.parse(createdAt)) || new Date(createdAt).toISOString() !== createdAt) invalid()
  if (!Number.isSafeInteger(pkg.assessmentSchemaVersion) || !Number.isSafeInteger(pkg.roleLibrarySchemaVersion)) invalid()
  text(pkg.engineRevision); text(pkg.roleLibraryRevision)
  if (!Array.isArray(pkg.cards) || pkg.cards.length > 5) invalid()
  pkg.cards.forEach((item) => {
    const card = record(item)
    exact(card, ['roleId', 'label', 'familyLabel', 'summary', 'attributes', 'emblem', 'sourceLabel', 'assessmentDetails'])
    text(card.roleId, 256); text(card.label); text(card.familyLabel); text(card.summary); text(card.sourceLabel)
    if (!Array.isArray(card.attributes) || card.attributes.length > 6) invalid()
    card.attributes.forEach((attribute) => { const entry = record(attribute); exact(entry, ['label', 'value']); text(entry.label); text(entry.value) })
    validateEmblem(card.emblem)
    stringArray(card.assessmentDetails, 8)
  })
  validateHistoricalResult(pkg.result)
  const manifest = record(pkg.manifest)
  exact(manifest, ['cards', 'result', 'currentRoleSet', 'roleDefinitions', 'rawAnswers'])
  if (manifest.cards !== true || manifest.result !== true || manifest.currentRoleSet !== true || manifest.roleDefinitions !== true || manifest.rawAnswers !== false) invalid()
  const receipt = record(pkg.privacyReceipt)
  exact(receipt, ['included', 'excluded']); stringArray(receipt.included, 32); stringArray(receipt.excluded, 32)
  const result = pkg.result as Record<string, unknown>
  if (pkg.assessmentSchemaVersion !== result.assessmentSchemaVersion || pkg.engineRevision !== result.engineRevision
    || pkg.roleLibrarySchemaVersion !== result.roleLibrarySchemaVersion || pkg.roleLibraryRevision !== result.roleLibraryRevision) invalid()
  const resultRoleIds = (pkg.result as SharedHistoricalResult).currentRoleSet.map(({ roleId }) => roleId)
  if (pkg.cards.length !== resultRoleIds.length || pkg.cards.some((card, index) => card.roleId !== resultRoleIds[index])) invalid()
  if (encoder.encode(JSON.stringify(pkg)).byteLength > SHARE_PACKAGE_MAX_BYTES) invalid()
}

function historicalResult(snapshot: ResultSnapshot): SharedHistoricalResult {
  validateResultSnapshot(snapshot, { allowHistoricalRevisions: true })
  return {
    snapshotVersion: snapshot.snapshotVersion,
    assessmentSchemaVersion: snapshot.assessmentSchemaVersion,
    engineRevision: snapshot.engineRevision,
    roleLibrarySchemaVersion: snapshot.roleLibrarySchemaVersion,
    roleLibraryRevision: snapshot.roleLibraryRevision,
    strongestDimensions: structuredClone(snapshot.strongestDimensions),
    suggestedRoleSet: structuredClone(snapshot.suggestedRoleSet),
    ...(snapshot.suggestedPrimaryRoleId ? { suggestedPrimaryRoleId: snapshot.suggestedPrimaryRoleId } : {}),
    currentRoleSet: structuredClone(snapshot.currentRoleSet),
    ...(snapshot.chosenPrimaryRoleId ? { chosenPrimaryRoleId: snapshot.chosenPrimaryRoleId } : {}),
    roleDiscovery: snapshot.roleDiscovery.map(({ explanation, ...role }) => ({ ...structuredClone(role), explanationSummary: explanation.summary })),
    readiness: structuredClone(snapshot.readiness),
    blindSpots: structuredClone(snapshot.blindSpots),
    criticalFlags: snapshot.criticalFlags.map(({ sourceQuestionIds: _sourceQuestionIds, ...flag }) => ({ ...flag })),
    boundaries: snapshot.boundaries.map(({ response: _response, ...boundary }) => structuredClone(boundary)),
    conversationStatements: structuredClone(snapshot.conversationStatements),
    learningRecommendations: structuredClone(snapshot.learningRecommendations),
  }
}

export function buildSharePackage(snapshot: ResultSnapshot, roleSet: EditableRoleProfileEntry[], roleResults: RoleResult[], createdAt = new Date().toISOString()): SharePackage {
  const cards = buildRoleSetCardPresentations(roleSet, roleResults).map((card): HistoricalRoleCard => ({
    roleId: card.roleId,
    label: card.label,
    familyLabel: card.familyLabel,
    summary: card.summary ?? '',
    attributes: card.attributes.map(({ label, value }) => ({ label, value })),
    emblem: structuredClone(card.emblem),
    sourceLabel: card.sourceLabel,
    assessmentDetails: [...card.assessmentDetails],
  }))
  const result = historicalResult(snapshot)
  const pkg: SharePackage = {
    magic: SHARE_PACKAGE_MAGIC,
    sharePackageVersion: SHARE_PACKAGE_VERSION,
    createdAt,
    assessmentSchemaVersion: snapshot.assessmentSchemaVersion,
    engineRevision: snapshot.engineRevision,
    roleLibrarySchemaVersion: snapshot.roleLibrarySchemaVersion,
    roleLibraryRevision: snapshot.roleLibraryRevision,
    cards,
    result,
    manifest: { cards: true, result: true, currentRoleSet: true, roleDefinitions: true, rawAnswers: false },
    privacyReceipt: { included: ['Role cards', 'Current Role Set', 'Role definitions', 'Historical result sections'], excluded: ['Raw assessment answers', 'Assessment navigation', 'Restore state'] },
  }
  validateSharePackage(pkg)
  return pkg
}

export function serializeSharePackage(pkg: SharePackage): string {
  validateSharePackage(pkg)
  return JSON.stringify(pkg)
}

export function parseSharePackage(serialized: string): SharePackage {
  if (encoder.encode(serialized).byteLength > SHARE_PACKAGE_MAX_BYTES) invalid()
  let value: unknown
  try { value = JSON.parse(serialized) } catch { invalid() }
  validateSharePackage(value)
  return value
}
