import { roleLibrary, type RoleLibraryRole } from './roleLibrary'
import { roleSlug } from './roleSlug'

export function roleLibrarySlug(role: Pick<RoleLibraryRole, 'label'>): string {
  return roleSlug(role)
}

export const roleLibraryRoleBySlug = new Map<string, RoleLibraryRole>()

roleLibrary.roles.forEach((role) => {
  roleLibraryRoleBySlug.set(roleLibrarySlug(role), role)
})

// Scored-role IDs were the original public route values. Keep the few that do
// not match a library label as read-only aliases while label slugs remain the
// canonical public URLs.
roleLibrary.roles.forEach((role) => {
  if (role.canonicalRoleId && !roleLibraryRoleBySlug.has(role.canonicalRoleId)) {
    roleLibraryRoleBySlug.set(role.canonicalRoleId, role)
  }
})

export function roleLibraryPath(role: Pick<RoleLibraryRole, 'label'>): string {
  return `/roles/${roleLibrarySlug(role)}`
}

export function roleLibraryRoleForScoredId(scoredRoleId: string): RoleLibraryRole | undefined {
  return roleLibrary.roles.find((role) => roleLibrarySlug(role) === scoredRoleId)
    ?? roleLibrary.roles.find((role) => role.canonicalRoleId === scoredRoleId)
}

export function roleLibraryRoleForScoredRole(role: { id: string; name: string }): RoleLibraryRole | undefined {
  return roleLibraryRoleForScoredId(role.id)
    ?? roleLibraryRoleBySlug.get(roleLibrarySlug({ label: role.name }))
}

export function rolePathForScoredRole(role: { id: string; name: string }): string {
  const libraryRole = roleLibraryRoleForScoredRole(role)
  return libraryRole ? roleLibraryPath(libraryRole) : `/roles/${roleLibrarySlug({ label: role.name })}`
}
