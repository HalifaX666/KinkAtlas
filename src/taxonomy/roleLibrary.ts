import libraryJson from '../data/role-library/role-library.json'

export type RoleLibraryAssessmentMode = 'inferred' | 'direct-interest' | 'hybrid' | 'explicit-selection' | 'exploration'
export type RoleLibraryRecommendationEligibility = 'eligible-high-confidence' | 'eligible-with-direct-evidence' | 'eligible-with-medium-confidence' | 'exploration-only' | 'insufficient-evidence'
export type RoleLibraryDecisionPathway = 'inferred' | 'direct-interest' | 'hybrid' | 'explicit-confirmation' | 'manual-only'
export type RoleLibraryRelationshipType = 'broader-than' | 'narrower-than' | 'sibling' | 'directional-counterpart' | 'switch-counterpart' | 'activity-related' | 'commonly-overlapping' | 'near-synonym' | 'alias' | 'persona-related'

export interface RoleLibraryRole {
  id: string
  label: string
  aliases: string[]
  family?: string
  category?: string
  facets: string[]
  assessmentMode: RoleLibraryAssessmentMode
  recommendationEligibility: RoleLibraryRecommendationEligibility
  canonicalRoleId?: string
  nearestRoleIds: string[]
  evidenceCluster?: string
  decisionPathway: RoleLibraryDecisionPathway
  familyIds: string[]
  definition?: string
}

export interface RoleLibraryRelationship {
  fromRoleId: string
  toRoleId: string
  type: RoleLibraryRelationshipType
  rationale: string
}

export interface RoleLibraryDataset {
  schemaVersion: 1
  roles: RoleLibraryRole[]
  relationships: RoleLibraryRelationship[]
  families: Record<string, string>
}

export const roleLibrary = libraryJson as RoleLibraryDataset
export const roleLibraryRoleById = new Map(roleLibrary.roles.map((role) => [role.id, role]))

export function relationshipsForLibraryRole(roleId: string): RoleLibraryRelationship[] {
  return roleLibrary.relationships.filter((relationship) => relationship.fromRoleId === roleId || relationship.toRoleId === roleId)
}
