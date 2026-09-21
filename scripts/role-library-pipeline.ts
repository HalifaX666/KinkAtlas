import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const roleLibrarySourcePath = resolve(projectRoot, 'src/data/role-library/role-library.source.json')
export const roleLibraryRuntimePath = resolve(projectRoot, 'src/data/role-library/role-library.json')

const assessmentModes = new Set([
  'inferred',
  'direct-interest',
  'hybrid',
  'explicit-selection',
  'exploration',
])
const recommendationModes = new Set([
  'eligible-high-confidence',
  'eligible-with-direct-evidence',
  'eligible-with-medium-confidence',
  'exploration-only',
  'insufficient-evidence',
])
const decisionPathways = new Set([
  'inferred',
  'direct-interest',
  'hybrid',
  'explicit-confirmation',
  'manual-only',
])
const relationshipTypes = new Set([
  'broader-than',
  'narrower-than',
  'sibling',
  'directional-counterpart',
  'switch-counterpart',
  'activity-related',
  'commonly-overlapping',
  'near-synonym',
  'alias',
  'persona-related',
])

const requiredRoleKeys = new Set([
  'id',
  'label',
  'aliases',
  'facets',
  'assessmentMode',
  'recommendationEligibility',
  'nearestRoleIds',
  'decisionPathway',
  'familyIds',
])
const optionalRoleKeys = new Set([
  'family',
  'category',
  'canonicalRoleId',
  'evidenceCluster',
  'definition',
])
const relationshipKeys = new Set(['fromRoleId', 'toRoleId', 'type', 'rationale'])

type JsonObject = Record<string, unknown>

export interface RoleLibraryGenerationResult {
  serialized: string
  roleCount: number
  definitionCount: number
  unavailableCount: number
  relationshipCount: number
  familyCount: number
}

function fail(message: string): never {
  throw new Error(`Invalid neutral role-library source: ${message}`)
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireObject(value: unknown, location: string): JsonObject {
  if (!isObject(value)) fail(`${location} must be an object.`)
  return value
}

function requireNonEmptyString(value: unknown, location: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${location} must be a non-empty string.`)
  }
  return value
}

function requireStringArray(value: unknown, location: string): string[] {
  if (!Array.isArray(value)) fail(`${location} must be an array.`)
  value.forEach((item, index) => requireNonEmptyString(item, `${location}[${index}]`))
  return value as string[]
}

function requireOnlyKeys(value: JsonObject, allowed: Set<string>, location: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${location} contains unsupported field ${JSON.stringify(key)}.`)
  }
}

function requireKeys(value: JsonObject, required: Set<string>, location: string): void {
  for (const key of required) {
    if (!Object.hasOwn(value, key)) fail(`${location} is missing required field ${JSON.stringify(key)}.`)
  }
}

function requireEnum(value: unknown, allowed: Set<string>, location: string): string {
  const text = requireNonEmptyString(value, location)
  if (!allowed.has(text)) fail(`${location} has unsupported value ${JSON.stringify(text)}.`)
  return text
}

function validateRole(roleValue: unknown, index: number): JsonObject {
  const location = `roles[${index}]`
  const role = requireObject(roleValue, location)
  requireKeys(role, requiredRoleKeys, location)
  requireOnlyKeys(role, new Set([...requiredRoleKeys, ...optionalRoleKeys]), location)

  const id = requireNonEmptyString(role.id, `${location}.id`)
  if (!/^role:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    fail(`${location}.id must use the neutral role:<slug> format.`)
  }
  requireNonEmptyString(role.label, `${location}.label`)
  requireStringArray(role.aliases, `${location}.aliases`)
  requireStringArray(role.facets, `${location}.facets`)
  requireEnum(role.assessmentMode, assessmentModes, `${location}.assessmentMode`)
  requireEnum(role.recommendationEligibility, recommendationModes, `${location}.recommendationEligibility`)
  requireStringArray(role.nearestRoleIds, `${location}.nearestRoleIds`)
  requireEnum(role.decisionPathway, decisionPathways, `${location}.decisionPathway`)
  requireStringArray(role.familyIds, `${location}.familyIds`)

  for (const key of optionalRoleKeys) {
    if (Object.hasOwn(role, key)) requireNonEmptyString(role[key], `${location}.${key}`)
  }
  return role
}

export function validateRoleLibraryDataset(value: unknown): JsonObject {
  const dataset = requireObject(value, 'dataset')
  const datasetKeys = new Set(['schemaVersion', 'roles', 'relationships', 'families'])
  requireKeys(dataset, datasetKeys, 'dataset')
  requireOnlyKeys(dataset, datasetKeys, 'dataset')
  if (dataset.schemaVersion !== 1) fail('schemaVersion must be 1.')
  if (!Array.isArray(dataset.roles)) fail('roles must be an array.')
  if (!Array.isArray(dataset.relationships)) fail('relationships must be an array.')

  const families = requireObject(dataset.families, 'families')
  for (const [familyId, familyLabel] of Object.entries(families)) {
    requireNonEmptyString(familyId, 'family ID')
    requireNonEmptyString(familyLabel, `families[${JSON.stringify(familyId)}]`)
  }

  const roleIds = new Set<string>()
  const roles = dataset.roles.map((role, index) => validateRole(role, index))
  roles.forEach((role, index) => {
    const id = role.id as string
    if (roleIds.has(id)) fail(`duplicate role ID ${JSON.stringify(id)} at roles[${index}].`)
    roleIds.add(id)
  })

  roles.forEach((role, roleIndex) => {
    const familyIds = role.familyIds as string[]
    for (const familyId of familyIds) {
      if (!Object.hasOwn(families, familyId)) {
        fail(`roles[${roleIndex}].familyIds references missing family ${JSON.stringify(familyId)}.`)
      }
    }
  })

  dataset.relationships.forEach((relationshipValue, index) => {
    const location = `relationships[${index}]`
    const relationship = requireObject(relationshipValue, location)
    requireKeys(relationship, relationshipKeys, location)
    requireOnlyKeys(relationship, relationshipKeys, location)
    const fromRoleId = requireNonEmptyString(relationship.fromRoleId, `${location}.fromRoleId`)
    const toRoleId = requireNonEmptyString(relationship.toRoleId, `${location}.toRoleId`)
    requireEnum(relationship.type, relationshipTypes, `${location}.type`)
    requireNonEmptyString(relationship.rationale, `${location}.rationale`)
    if (!roleIds.has(fromRoleId)) fail(`${location}.fromRoleId references missing role ${JSON.stringify(fromRoleId)}.`)
    if (!roleIds.has(toRoleId)) fail(`${location}.toRoleId references missing role ${JSON.stringify(toRoleId)}.`)
    if (fromRoleId === toRoleId) fail(`${location} cannot relate a role to itself.`)
  })

  return dataset
}

export async function generateRoleLibrary(): Promise<RoleLibraryGenerationResult> {
  const sourceText = await readFile(roleLibrarySourcePath, 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(sourceText)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    fail(`JSON could not be parsed: ${detail}`)
  }
  const dataset = validateRoleLibraryDataset(parsed)
  const roles = dataset.roles as JsonObject[]
  const relationships = dataset.relationships as JsonObject[]
  const families = dataset.families as JsonObject
  const definitionCount = roles.filter((role) => typeof role.definition === 'string').length
  return {
    serialized: `${JSON.stringify(dataset, null, 2)}\n`,
    roleCount: roles.length,
    definitionCount,
    unavailableCount: roles.length - definitionCount,
    relationshipCount: relationships.length,
    familyCount: Object.keys(families).length,
  }
}

export async function writeRoleLibraryRuntime(): Promise<void> {
  const result = await generateRoleLibrary()
  await writeFile(roleLibraryRuntimePath, result.serialized, 'utf8')
  console.log(
    `Wrote neutral role library: ${result.roleCount} roles, ${result.definitionCount} definitions, ` +
      `${result.unavailableCount} unavailable, ${result.relationshipCount} relationships, ${result.familyCount} families.`,
  )
}
