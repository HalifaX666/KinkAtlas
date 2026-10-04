import { relationshipsForLibraryRole, roleLibrary, roleLibraryRoleById, type RoleLibraryRelationshipType } from '../taxonomy/roleLibrary'

export interface RelatedRoleProfileEntry {
  roleId: string
  label: string
  status: 'related'
  reason: string
  relationshipType?: string
}

const relationshipStrength: Record<RoleLibraryRelationshipType, number> = {
  alias: 150,
  'near-synonym': 145,
  'directional-counterpart': 140,
  'switch-counterpart': 135,
  'broader-than': 130,
  'narrower-than': 130,
  'activity-related': 120,
  'commonly-overlapping': 115,
  sibling: 110,
  'persona-related': 105,
}

const evidencePriority = (roleId: string) => {
  const role = roleLibraryRoleById.get(roleId)
  if (role?.recommendationEligibility === 'eligible-high-confidence') return 12
  if (role?.recommendationEligibility === 'eligible-with-direct-evidence') return 8
  if (role?.assessmentMode === 'explicit-selection') return 3
  return 0
}

export function buildRelatedRoleProfiles(seedRoleIds: string[], limit = 8): RelatedRoleProfileEntry[] {
  if (limit <= 0) return []
  const seedIds = new Set(seedRoleIds)
  const candidates = new Map<string, { priority: number; reason: string; relationshipType?: string }>()
  seedRoleIds.forEach((seedRoleId) => {
    const seed = roleLibraryRoleById.get(seedRoleId)
    if (!seed) return
    relationshipsForLibraryRole(seedRoleId).forEach((relationship) => {
      const roleId = relationship.fromRoleId === seedRoleId ? relationship.toRoleId : relationship.fromRoleId
      if (!seedIds.has(roleId)) candidates.set(roleId, {
        priority: relationshipStrength[relationship.type] + evidencePriority(roleId),
        reason: relationship.rationale,
        relationshipType: relationship.type,
      })
    })
    seed.familyIds.forEach((familyId) => {
      roleLibrary.roles.forEach((role) => {
        if (seedIds.has(role.id) || !role.familyIds.includes(familyId) || candidates.has(role.id)) return
        candidates.set(role.id, { priority: 20 + evidencePriority(role.id), reason: `Related through the reviewed ${roleLibrary.families[familyId]} family.` })
      })
    })
  })
  return [...candidates.entries()]
    .sort((left, right) => right[1].priority - left[1].priority
      || roleLibrary.roles.findIndex((role) => role.id === left[0]) - roleLibrary.roles.findIndex((role) => role.id === right[0]))
    .slice(0, limit)
    .flatMap(([roleId, context]) => {
      const role = roleLibraryRoleById.get(roleId)
      return role ? [{ roleId, label: role.label, status: 'related' as const, reason: context.reason, relationshipType: context.relationshipType }] : []
    })
}
