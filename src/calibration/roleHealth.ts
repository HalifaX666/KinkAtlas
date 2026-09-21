import { discoveryQuestions } from '../data/questions'
import { roles } from '../data/roles'
import { traits } from '../data/traits'
import type { Role, TraitId } from '../types'
import type { RoleHealthDiagnostic, RoleHealthIssue, RoleNeighbor } from './calibrationTypes'

const traitIds = traits.map((trait) => trait.id)
const rolesExpectedToUseContraries = new Set([
  'dominant', 'submissive', 'top', 'rigger', 'rope-bottom', 'sadist', 'masochist',
  'disciplinarian', 'discipline-receiver', 'brat', 'brat-tamer', 'exhibitionist', 'voyeur',
])

function roleFingerprint(role: Role): number[] {
  return traitIds.map((trait) => (
    (role.traits[trait] ?? 0)
    + (role.differentiatingTraits[trait] ?? 0) * .35
    - (role.contraryTraits?.[trait] ?? 0) * .35
  ))
}

const cosineSimilarity = (left: number[], right: number[]): number => {
  const dot = left.reduce((sum, value, index) => sum + value * right[index], 0)
  const leftMagnitude = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0))
  const rightMagnitude = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0))
  return leftMagnitude && rightMagnitude ? Math.max(0, dot / (leftMagnitude * rightMagnitude)) : 0
}

const jaccard = (left: string[], right: string[]): number => {
  const union = new Set([...left, ...right])
  const intersection = left.filter((value) => right.includes(value)).length
  return union.size ? intersection / union.size : 0
}

export function roleSimilarity(left: Role, right: Role): number {
  const traitSimilarity = cosineSimilarity(roleFingerprint(left), roleFingerprint(right))
  const facetSimilarity = jaccard(left.facets, right.facets)
  const categorySimilarity = left.primaryCategory === right.primaryCategory ? 1 : 0
  return traitSimilarity * .85 + facetSimilarity * .1 + categorySimilarity * .05
}

export function nearestRoleNeighbors(role: Role, roleDataset: Role[] = roles, limit = 3): RoleNeighbor[] {
  return roleDataset
    .filter((candidate) => candidate.id !== role.id)
    .map((candidate) => ({ roleId: candidate.id, name: candidate.name, similarity: roleSimilarity(role, candidate) }))
    .sort((left, right) => right.similarity - left.similarity || left.roleId.localeCompare(right.roleId))
    .slice(0, limit)
}

function questionTouchesTraits(questionIndex: number, traits: Set<TraitId>): boolean {
  return discoveryQuestions[questionIndex].answers.some((answer) => Object.keys(answer.effects ?? {}).some((trait) => traits.has(trait as TraitId)))
}

export function analyzeRoleHealth(roleDataset: Role[] = roles): RoleHealthDiagnostic[] {
  return roleDataset.map((role) => {
    const coreEntries = Object.entries(role.traits) as [TraitId, number][]
    const differentiatingEntries = Object.entries(role.differentiatingTraits) as [TraitId, number][]
    const contraryEntries = Object.entries(role.contraryTraits ?? {}) as [TraitId, number][]
    const evidenceTraits = new Set([...coreEntries, ...differentiatingEntries].map(([trait]) => trait))
    const touchingQuestions = discoveryQuestions.filter((_, index) => questionTouchesTraits(index, evidenceTraits))
    const reachableTraits = new Set<TraitId>()
    touchingQuestions.forEach((question) => question.answers.forEach((answer) => Object.keys(answer.effects ?? {}).forEach((trait) => {
      if (evidenceTraits.has(trait as TraitId)) reachableTraits.add(trait as TraitId)
    })))
    const totalWeight = [...coreEntries, ...differentiatingEntries].reduce((sum, [, weight]) => sum + weight, 0)
    const reachableWeight = [...coreEntries, ...differentiatingEntries].filter(([trait]) => reachableTraits.has(trait)).reduce((sum, [, weight]) => sum + weight, 0)
    const estimatedEvidenceCoverage = totalWeight ? reachableWeight / totalWeight : 0
    const coreWeight = coreEntries.reduce((sum, [, weight]) => sum + weight, 0)
    const largestTraitShare = coreWeight ? Math.max(...coreEntries.map(([, weight]) => weight)) / coreWeight : 1
    const nearestNeighbors = nearestRoleNeighbors(role, roleDataset)
    const nearest = nearestNeighbors[0]
    const canReachHighConfidence = touchingQuestions.length >= 6 && estimatedEvidenceCoverage >= .7
    const issues: RoleHealthIssue[] = []

    if (coreEntries.length < 3) issues.push('TOO_FEW_TRAITS')
    if (touchingQuestions.length < 3) issues.push('TOO_FEW_QUESTIONS')
    if (estimatedEvidenceCoverage < .7) issues.push('LOW_REACHABILITY')
    if (differentiatingEntries.length === 0) issues.push('NO_DIFFERENTIATING_TRAITS')
    if (largestTraitShare >= .45) issues.push('SINGLE_TRAIT_DEPENDENCY')
    if (!canReachHighConfidence) issues.push('UNREACHABLE_HIGH_CONFIDENCE')
    if (nearest?.similarity >= .9) issues.push('HIGH_DUPLICATION')
    if (nearest?.similarity >= .965) issues.push('POSSIBLE_DUPLICATE_ROLE')
    if (rolesExpectedToUseContraries.has(role.id) && contraryEntries.length === 0) issues.push('NO_CONTRARY_TRAITS_WHERE_EXPECTED')

    return {
      roleId: role.id,
      name: role.name,
      weightedTraitCount: coreEntries.length,
      differentiatingTraitCount: differentiatingEntries.length,
      contraryTraitCount: contraryEntries.length,
      facetCount: role.facets.length,
      questionCount: touchingQuestions.length,
      broadQuestionCount: touchingQuestions.filter((question) => question.phase === 'broad').length,
      refinementQuestionCount: touchingQuestions.filter((question) => question.phase === 'refine').length,
      estimatedEvidenceCoverage,
      largestTraitShare,
      canReachHighConfidence,
      nearestNeighbors,
      issues,
    }
  })
}

export function highOverlapPairs(diagnostics: RoleHealthDiagnostic[], threshold = .9): { left: string; right: string; similarity: number }[] {
  const seen = new Set<string>()
  return diagnostics.flatMap((diagnostic) => diagnostic.nearestNeighbors
    .filter((neighbor) => neighbor.similarity >= threshold)
    .flatMap((neighbor) => {
      const ids = [diagnostic.roleId, neighbor.roleId].sort()
      const key = ids.join('|')
      if (seen.has(key)) return []
      seen.add(key)
      return [{ left: ids[0], right: ids[1], similarity: neighbor.similarity }]
    }))
    .sort((left, right) => right.similarity - left.similarity)
}
