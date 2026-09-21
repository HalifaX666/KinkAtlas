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

function relationshipExplanation(candidateLabel: string, seedLabel: string, type: RoleLibraryRelationshipType, candidateIsTarget: boolean): string {
  if (candidateLabel === 'Impact Top') return 'A more activity-specific Top role focused on delivering impact play.'
  if (candidateLabel === 'Sensation Top') return 'A more activity-specific Top role focused on giving sensation-based play.'
  if (candidateLabel === 'Bottom') return `A receiving-side role that may be worth exploring if some of your ${seedLabel} interests involve bottoming.`
  if (candidateLabel.toLowerCase() === 'little') return 'A related receiving-care role that may overlap with caregiving dynamics.'
  switch (type) {
    case 'directional-counterpart': return `A related role that explores a different direction from ${seedLabel}.`
    case 'switch-counterpart': return candidateIsTarget
      ? `A flexible role that can include the ${seedLabel} direction while leaving room to move between roles.`
      : `A related role that may connect with the flexible directions of ${seedLabel}.`
    case 'broader-than': return candidateIsTarget
      ? `A more focused role within the broader themes of ${seedLabel}.`
      : `A broader role that can include themes from ${seedLabel}.`
    case 'narrower-than': return candidateIsTarget
      ? `A broader role that can include themes from ${seedLabel}.`
      : `A more focused role within the broader themes of ${seedLabel}.`
    case 'alias': return `Another label for closely related ${seedLabel} vocabulary.`
    case 'near-synonym': return `Closely related vocabulary to ${seedLabel}, with potentially different personal meaning.`
    case 'activity-related': return `Related activity vocabulary that may overlap with ${seedLabel}.`
    case 'commonly-overlapping': return `Related vocabulary that may overlap with ${seedLabel} while keeping its own emphasis.`
    case 'sibling': return `A neighboring role in the same area as ${seedLabel}.`
    case 'persona-related': return `A related way of expressing themes near ${seedLabel}.`
  }
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
      const role = roleLibraryRoleById.get(roleId)
      if (!seedIds.has(roleId)) candidates.set(roleId, {
        priority: relationshipStrength[relationship.type] + evidencePriority(roleId),
        reason: relationshipExplanation(role?.label ?? 'This role', seed.label, relationship.type, relationship.toRoleId === roleId),
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
