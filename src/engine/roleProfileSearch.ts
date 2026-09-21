import { roleLibrary, type RoleLibraryRole } from '../taxonomy/roleLibrary'

function normalized(value: string): string {
  return value.toLocaleLowerCase('en-US')
}

function labelRelevance(label: string, query: string): number | undefined {
  const value = normalized(label)
  if (value === query) return 0
  if (value.startsWith(query)) return 1
  if (value.split(/[^\p{L}\p{N}]+/u).some((word) => word.startsWith(query))) return 2
  if (value.includes(query)) return 3
  return undefined
}

function aliasRelevance(aliases: string[], query: string): number | undefined {
  return aliases.some((alias) => normalized(alias).includes(query)) ? 4 : undefined
}

export function searchRoleLibrary(roles: RoleLibraryRole[], query: string, limit = 30): RoleLibraryRole[] {
  const normalizedQuery = normalized(query.trim())
  if (!normalizedQuery || limit <= 0) return []
  return roles.map((role, index) => {
    const familyTerms = role.familyIds.flatMap((familyId) => [familyId, roleLibrary.families[familyId]])
    const semanticTerms = [role.definition, role.family, role.category, ...role.facets, ...familyTerms]
    const relevance = labelRelevance(role.label, normalizedQuery)
      ?? aliasRelevance(role.aliases, normalizedQuery)
      ?? (semanticTerms.some((value) => value?.toLocaleLowerCase('en-US').includes(normalizedQuery)) ? 5 : undefined)
    return relevance === undefined ? undefined : { role, relevance, index }
  }).flatMap((match) => match ? [match] : [])
    .sort((left, right) => left.relevance - right.relevance || left.index - right.index)
    .slice(0, limit)
    .map((match) => match.role)
}
