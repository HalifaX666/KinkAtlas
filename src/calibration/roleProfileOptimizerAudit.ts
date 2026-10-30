import { roleLibrary, type RoleLibraryRelationship } from '../taxonomy/roleLibrary'
import type { ConfidenceLevel } from '../types'
import type { RoleProfileCandidate, RoleProfileOptimizationOptions, RoleProfileRecommendation } from '../engine/roleProfileOptimizer'

export type AuditTieRule = 'library-order' | 'stable-role-id' | 'stronger-independent-evidence' | 'greater-distinctiveness' | 'conservative-specificity'

const confidenceValue: Record<ConfidenceLevel, number> = { high: 1, moderate: .72, low: .35 }
const roleOrder = new Map(roleLibrary.roles.map((role, index) => [role.id, index]))
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const minimumBaseScore = .58
const minimumAdjustedScore = .52

export function auditBaseScore(candidate: RoleProfileCandidate) {
  const signals = {
    alignment: candidate.rawAlignment ?? (candidate.evidenceType === 'direct' ? .78 : .7),
    confidence: candidate.confidence ? confidenceValue[candidate.confidence] : 0,
    evidenceQuality: candidate.evidenceQuality,
    specificity: candidate.specificity,
    distinctiveness: candidate.distinctiveness,
    representationValue: candidate.representationValue,
    profileUsefulness: candidate.profileUsefulness,
  }
  const weighted = {
    alignment: signals.alignment * .28,
    confidence: signals.confidence * .18,
    evidenceQuality: signals.evidenceQuality * .2,
    specificity: signals.specificity * .08,
    distinctiveness: signals.distinctiveness * .1,
    representationValue: signals.representationValue * .08,
    profileUsefulness: signals.profileUsefulness * .08,
  }
  return { signals, weighted, total: clamp(Object.values(weighted).reduce((sum, value) => sum + value, 0)) }
}

function relationsFor(roleId: string, relationships: readonly RoleLibraryRelationship[]) {
  return relationships.filter((relationship) => relationship.fromRoleId === roleId || relationship.toRoleId === roleId)
}

function pairRedundancy(candidate: RoleProfileCandidate, existing: RoleProfileCandidate, relationships: readonly RoleLibraryRelationship[]) {
  const canonicalPenalty = candidate.canonicalRoleId && candidate.canonicalRoleId === existing.canonicalRoleId ? .4 : 0
  const relationship = relationsFor(candidate.roleId, relationships).find((edge) => edge.fromRoleId === existing.roleId || edge.toRoleId === existing.roleId)
  const relationshipPenalty = relationship?.type === 'alias' || relationship?.type === 'near-synonym'
    ? .3
    : relationship?.type === 'broader-than' || relationship?.type === 'narrower-than'
      ? .2
      : relationship?.type === 'sibling' || relationship?.type === 'commonly-overlapping'
        ? .12
        : 0
  const sharedFamilies = candidate.families.filter((family) => existing.families.includes(family))
  const familyPenalty = Math.min(.18, sharedFamilies.length * .08)
  return { canonicalPenalty, relationshipPenalty, familyPenalty, applied: Math.max(canonicalPenalty, relationshipPenalty, familyPenalty), sharedFamilies, relationshipType: relationship?.type }
}

function redundancy(candidate: RoleProfileCandidate, selected: readonly RoleProfileRecommendation[], relationships: readonly RoleLibraryRelationship[]) {
  const pairs = selected.map((item) => ({ roleId: item.candidate.roleId, ...pairRedundancy(candidate, item.candidate, relationships) }))
  return { total: pairs.reduce((sum, pair) => sum + pair.applied, 0), pairs }
}

function familyBonus(candidate: RoleProfileCandidate, selected: readonly RoleProfileRecommendation[], redundancyPenalty: number) {
  if (!selected.length || !candidate.families.length || redundancyPenalty >= .3) return { bonus: 0, novelFamilies: [] as string[] }
  const represented = new Set(selected.flatMap((item) => item.candidate.families))
  const novelFamilies = candidate.families.filter((family) => !represented.has(family))
  return { bonus: novelFamilies.length / candidate.families.length * candidate.representationValue * .06, novelFamilies }
}

function qualityComparison(left: RoleProfileCandidate, right: RoleProfileCandidate) {
  return right.evidenceQuality - left.evidenceQuality
    || (right.confidence ? confidenceValue[right.confidence] : 0) - (left.confidence ? confidenceValue[left.confidence] : 0)
    || right.representationValue - left.representationValue
    || right.distinctiveness - left.distinctiveness
}

function finalTieComparison(left: RoleProfileCandidate, right: RoleProfileCandidate, rule: AuditTieRule) {
  if (rule === 'stable-role-id') return left.roleId.localeCompare(right.roleId)
  if (rule === 'stronger-independent-evidence') return right.evidenceQuality - left.evidenceQuality || left.roleId.localeCompare(right.roleId)
  if (rule === 'greater-distinctiveness') return right.distinctiveness - left.distinctiveness || left.roleId.localeCompare(right.roleId)
  if (rule === 'conservative-specificity') return left.specificity - right.specificity || left.roleId.localeCompare(right.roleId)
  return (roleOrder.get(left.roleId) ?? Number.MAX_SAFE_INTEGER) - (roleOrder.get(right.roleId) ?? Number.MAX_SAFE_INTEGER)
}

export interface AuditRankedCandidate {
  roleId: string
  label: string
  base: ReturnType<typeof auditBaseScore>
  redundancy: ReturnType<typeof redundancy>
  familyBonus: ReturnType<typeof familyBonus>
  adjusted: number
  tiedBeforeFinalRule: boolean
}

function rank(candidates: Iterable<RoleProfileCandidate>, selected: readonly RoleProfileRecommendation[], relationships: readonly RoleLibraryRelationship[], rule: AuditTieRule) {
  const ranked = [...candidates].map((candidate) => {
    const base = auditBaseScore(candidate)
    const redundancyResult = redundancy(candidate, selected, relationships)
    const bonus = familyBonus(candidate, selected, redundancyResult.total)
    return { candidate, base, redundancy: redundancyResult, familyBonus: bonus, adjusted: base.total - redundancyResult.total + bonus.bonus }
  }).sort((left, right) => right.adjusted - left.adjusted || right.base.total - left.base.total || qualityComparison(left.candidate, right.candidate) || finalTieComparison(left.candidate, right.candidate, rule))
  return ranked.map((item, index) => ({
    ...item,
    tiedBeforeFinalRule: ranked.some((other, otherIndex) => otherIndex !== index
      && other.adjusted === item.adjusted
      && other.base.total === item.base.total
      && qualityComparison(item.candidate, other.candidate) === 0),
  }))
}

function primaryCentrality(candidate: RoleProfileCandidate, selected: readonly RoleProfileRecommendation[], relationships: readonly RoleLibraryRelationship[]) {
  if (selected.length <= 1) return 0
  const otherIds = new Set(selected.filter((item) => item.candidate.roleId !== candidate.roleId).map((item) => item.candidate.roleId))
  const connectionValue = relationsFor(candidate.roleId, relationships).reduce((sum, edge) => {
    const otherRoleId = edge.fromRoleId === candidate.roleId ? edge.toRoleId : edge.fromRoleId
    if (!otherIds.has(otherRoleId)) return sum
    if (edge.type === 'broader-than' && edge.fromRoleId === candidate.roleId) return sum + 1
    if (edge.type === 'alias' || edge.type === 'near-synonym') return sum + .35
    return sum + .55
  }, 0)
  return clamp(connectionValue / (selected.length - 1))
}

function selectPrimary(selected: RoleProfileRecommendation[], relationships: readonly RoleLibraryRelationship[], options: RoleProfileOptimizationOptions) {
  const preferredIds = new Set(options.preferredPrimaryRoleIds ?? [])
  if (options.preferredPrimaryRoleId) preferredIds.add(options.preferredPrimaryRoleId)
  const primaryCapable = selected.filter((item) => item.candidate.primaryPolicy === 'direct-primary' || item.candidate.primaryPolicy === 'competitive')
  const preferred = primaryCapable.filter((item) => item.candidate.primaryPolicy === 'direct-primary' && preferredIds.has(item.candidate.roleId))
  return [...(preferred.length ? preferred : primaryCapable)].sort((left, right) => {
    const leftScore = auditBaseScore(left.candidate).total * .75 + primaryCentrality(left.candidate, selected, relationships) * .15 + left.candidate.representationValue * .1
    const rightScore = auditBaseScore(right.candidate).total * .75 + primaryCentrality(right.candidate, selected, relationships) * .15 + right.candidate.representationValue * .1
    return rightScore - leftScore
      || right.candidate.evidenceQuality - left.candidate.evidenceQuality
      || (right.candidate.confidence ? confidenceValue[right.candidate.confidence] : 0) - (left.candidate.confidence ? confidenceValue[left.candidate.confidence] : 0)
      || right.candidate.representationValue - left.candidate.representationValue
      || right.candidate.distinctiveness - left.candidate.distinctiveness
      || left.candidate.roleId.localeCompare(right.candidate.roleId)
  })[0]
}

export function auditOptimizeRoleProfile(
  candidates: readonly RoleProfileCandidate[],
  options: RoleProfileOptimizationOptions = {},
  relationships: readonly RoleLibraryRelationship[] = roleLibrary.relationships,
  tieRule: AuditTieRule = 'library-order',
) {
  const excluded = new Set(options.excludedRoleIds ?? [])
  const unique = [...new Map(candidates.map((candidate) => [candidate.roleId, candidate])).values()]
  const eligible = unique.filter((candidate) => candidate.eligible && !excluded.has(candidate.roleId))
  const selected: RoleProfileRecommendation[] = []
  const remaining = new Map(eligible.map((candidate) => [candidate.roleId, candidate]))
  const steps: Array<{ step: number; selectedRoleId: string; runnerUpRoleIds: string[]; rankings: AuditRankedCandidate[] }> = []

  while (selected.length < 5 && remaining.size) {
    const ranked = rank(remaining.values(), selected, relationships, tieRule)
    const next = ranked[0]
    if (!next || next.base.total < minimumBaseScore || next.adjusted < minimumAdjustedScore) break
    const winner: RoleProfileRecommendation = { candidate: next.candidate, optimizerScore: next.adjusted, explanation: '' }
    steps.push({
      step: selected.length + 1,
      selectedRoleId: next.candidate.roleId,
      runnerUpRoleIds: ranked.slice(1, 4).map((item) => item.candidate.roleId),
      rankings: ranked.map((item) => ({ roleId: item.candidate.roleId, label: item.candidate.label, base: item.base, redundancy: item.redundancy, familyBonus: item.familyBonus, adjusted: item.adjusted, tiedBeforeFinalRule: item.tiedBeforeFinalRule })),
    })
    remaining.delete(next.candidate.roleId)
    selected.push(winner)
  }

  const primary = selectPrimary(selected, relationships, options)
  const recommendations = primary ? [primary, ...selected.filter((item) => item.candidate.roleId !== primary.candidate.roleId)] : selected
  return {
    roleIds: recommendations.map((item) => item.candidate.roleId),
    primaryRoleId: primary?.candidate.roleId,
    steps,
    eligibleRoleIds: eligible.map((candidate) => candidate.roleId).sort(),
    thresholds: { minimumBaseScore, minimumAdjustedScore, maximumRoles: 5 },
  }
}
