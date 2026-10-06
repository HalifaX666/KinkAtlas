import { roleEmblemRecipe, type RoleEmblemRecipe } from './roleEmblems'
import { rolePresentationById, type RolePresentationAttribute } from './rolePresentation'
import type { EditableRoleProfileEntry } from '../engine/roleProfileOptimizer'
import { roleLibrary, roleLibraryRoleById, type RoleLibraryRole } from '../taxonomy/roleLibrary'
import { roleLibraryPath, roleLibraryRoleForScoredId } from '../taxonomy/roleLibrarySlugs'
import type { RoleResult } from '../types'

export interface RoleIdentityData {
  roleId: string
  label: string
  familyLabel: string
  summary?: string
  attributes: readonly RolePresentationAttribute[]
  emblem: RoleEmblemRecipe
  hasCuratedEditorial: boolean
}

export interface RoleSetCardPresentation extends RoleIdentityData {
  source: EditableRoleProfileEntry['source']
  sourceLabel: 'Your primary' | 'Suggested by assessment' | 'Added by you'
  assessmentDetails: readonly string[]
  alignment?: string
  confidence?: string
  evidenceBreadth?: number
  publicPath: string
}

const alignmentLabels: Record<RoleResult['alignment'], string> = {
  strong: 'Strong alignment',
  explore: 'Worth exploring',
  some: 'Some alignment',
  insufficient: 'Limited evidence',
}

const confidenceLabel = (confidence: RoleResult['confidence']) => confidence === 'moderate'
  ? 'Medium confidence'
  : `${confidence[0].toUpperCase()}${confidence.slice(1)} confidence`

export function roleFamilyLabel(role: RoleLibraryRole): string {
  return role.familyIds
    .map((id) => roleLibrary.families[id])
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ')
    || role.family
    || role.category
    || 'Role vocabulary'
}

export function roleAssessmentSupport(role: RoleLibraryRole): string {
  if (role.recommendationEligibility === 'exploration-only' || role.decisionPathway === 'manual-only') return 'Explorable in KinkAtlas'
  if (role.decisionPathway === 'explicit-confirmation' || role.assessmentMode === 'explicit-selection') return 'Available after direct confirmation'
  if (role.assessmentMode === 'direct-interest') return 'Available through direct interest'
  return 'KinkAtlas can suggest this'
}

export function roleIdentityForRole(role: RoleLibraryRole): RoleIdentityData {
  const presentation = rolePresentationById.get(role.id)
  return {
    roleId: role.id,
    label: role.label,
    familyLabel: roleFamilyLabel(role),
    summary: presentation?.shortSummary ?? role.definition,
    attributes: presentation?.attributes ?? [],
    emblem: roleEmblemRecipe(role),
    hasCuratedEditorial: Boolean(presentation),
  }
}

export function roleLibraryRoleForIdentity(id: string, assessmentRoleId?: string): RoleLibraryRole | undefined {
  return roleLibraryRoleById.get(id)
    ?? (assessmentRoleId ? roleLibraryRoleForScoredId(assessmentRoleId) : undefined)
    ?? roleLibraryRoleForScoredId(id)
}

export function roleIdentityForId(id: string, assessmentRoleId?: string): RoleIdentityData | undefined {
  const role = roleLibraryRoleForIdentity(id, assessmentRoleId)
  return role ? roleIdentityForRole(role) : undefined
}

export function buildRoleSetCardPresentations(roleSet: EditableRoleProfileEntry[], roleResults: RoleResult[]): RoleSetCardPresentation[] {
  const resultById = new Map(roleResults.map((result) => [result.role.id, result]))
  return roleSet.map((entry, index) => {
    const role = roleLibraryRoleForIdentity(entry.roleId, entry.assessmentRoleId)
    if (!role) throw new Error(`No role-library identity exists for ${entry.roleId}.`)
    const identity = roleIdentityForRole(role)
    const result = entry.source === 'recommended' && entry.assessmentRoleId
      ? resultById.get(entry.assessmentRoleId)
      : undefined
    const alignment = result ? alignmentLabels[result.alignment] : undefined
    const confidence = result ? confidenceLabel(result.confidence) : undefined
    const evidenceBreadth = result ? Math.round(result.coverage * 100) : undefined
    const assessmentDetails = entry.source === 'user-selected'
      ? ['No assessment score or confidence']
      : result
        ? [alignment!, confidence!, `${evidenceBreadth}% evidence breadth`]
        : []

    return {
      ...identity,
      label: entry.label,
      summary: identity.summary ?? entry.definition?.trim(),
      source: entry.source,
      sourceLabel: index === 0 ? 'Your primary' : entry.source === 'recommended' ? 'Suggested by assessment' : 'Added by you',
      assessmentDetails,
      alignment,
      confidence,
      evidenceBreadth,
      publicPath: roleLibraryPath(role),
    }
  })
}
