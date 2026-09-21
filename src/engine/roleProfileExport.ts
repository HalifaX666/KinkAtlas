import type { EditableRoleProfileEntry } from './roleProfileOptimizer'

export function buildRoleLabelList(roles: EditableRoleProfileEntry[]): string {
  return roles.map((role) => role.label).join('\n')
}
