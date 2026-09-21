import { addRoleProfileEntry, optimizeRoleProfile, type RoleProfileCandidate } from '../engine/roleProfileOptimizer'
import { roleLibrary } from '../taxonomy/roleLibrary'

export interface RecommendationOptimizerScenarioResult {
  id: string
  description: string
  passed: boolean
  observedLabels?: string[]
}

const idFor = (label: string) => roleLibrary.roles.find((role) => role.label === label)?.id ?? label
const candidate = (label: string, overrides: Partial<RoleProfileCandidate> = {}): RoleProfileCandidate => ({
  roleId: idFor(label), label, evidenceType: 'inferred', decisionPathway: 'inferred', eligible: true, rawAlignment: .88, confidence: 'high',
  evidenceQuality: .88, specificity: .72, distinctiveness: .75, representationValue: .8,
  profileUsefulness: .8, primarySuitability: .78, families: [label.toLocaleLowerCase('en-US')],
  evidenceExplanation: 'multiple independent responses support this vocabulary', ...overrides,
})

export function evaluateRecommendationOptimizerScenarios(): RecommendationOptimizerScenarioResult[] {
  const dominanceVariants = [
    candidate('Dominant', { rawAlignment: .95, families: ['dominance', 'power-exchange'], primarySuitability: .98 }),
    candidate('Gentle Dom', { rawAlignment: .94, families: ['dominance', 'power-exchange'] }),
    candidate('Pleasure Dom', { rawAlignment: .93, families: ['dominance', 'power-exchange'] }),
    candidate('Service Dom', { rawAlignment: .92, families: ['dominance', 'power-exchange', 'service'] }),
    candidate('Primal Predator', { rawAlignment: .88, families: ['primal'] }),
    candidate('Rigger', { rawAlignment: .84, families: ['rope-bondage'] }),
    candidate('Sadist', { rawAlignment: .82, families: ['sadomasochism'] }),
  ]
  const diverse = optimizeRoleProfile(dominanceVariants)
  const twoSupported = optimizeRoleProfile([candidate('Dominant'), candidate('Rigger'), candidate('Femboy', { eligible: false, evidenceType: 'explicit' })])
  const excluded = optimizeRoleProfile([candidate('Dominant', { rawAlignment: .96 }), candidate('Rigger', { rawAlignment: .84 })], 5, { excludedRoleIds: [idFor('Dominant')] })
  const preferred = optimizeRoleProfile([
    candidate('Primal Sadist', { rawAlignment: .96, primarySuitability: .25 }),
    candidate('Primal', { rawAlignment: .88, primarySuitability: 1 }),
  ])
  const manual = addRoleProfileEntry([], { roleId: idFor('Femboy'), label: 'Femboy', source: 'user-selected' })
  const ropeOnly = optimizeRoleProfile([
    candidate('Rigger', { families: ['rope-bondage'], rawAlignment: .91 }),
    candidate('Rope Bottom', { families: ['rope-bondage'], rawAlignment: .86 }),
    candidate('Dominant', { families: ['power-exchange'], eligible: false, rawAlignment: .4, confidence: 'low' }),
  ])
  const broadAndNiche = optimizeRoleProfile([
    candidate('Dominant', { families: ['dominance'], primarySuitability: 1 }),
    candidate('Service Dom', { families: ['dominance', 'service'], specificity: .95, primarySuitability: .55 }),
  ])
  const direct = optimizeRoleProfile([candidate('Latex Fetishist', { evidenceType: 'direct', decisionPathway: 'direct-interest', rawAlignment: undefined, confidence: 'moderate', families: ['material-fetish'] })])
  const unconfirmedHybrid = optimizeRoleProfile([candidate('Service Rigger', { evidenceType: 'hybrid', decisionPathway: 'hybrid', eligible: false, families: ['rope-bondage', 'service'] })])
  const semanticFamily = optimizeRoleProfile([
    candidate('Dominant', { families: ['dominance'] }), candidate('Gentle Dom', { families: ['dominance'] }),
    candidate('Pleasure Dom', { families: ['dominance'] }), candidate('Service Dom', { families: ['dominance'] }),
    candidate('Rigger', { families: ['rope-bondage'], rawAlignment: .8 }),
  ])
  const reviewedAlias = optimizeRoleProfile([
    candidate('Rope Switch', { canonicalRoleId: 'bondage-switch', families: ['rope-bondage'], rawAlignment: .92 }),
    candidate('Bondage Switch', { canonicalRoleId: 'bondage-switch', families: ['rope-bondage'], rawAlignment: .91 }),
    candidate('Sadist', { families: ['sadomasochism'], rawAlignment: .8 }),
  ])
  const ambiguousVocabulary = optimizeRoleProfile([
    candidate('Dominant', { families: ['dominance'], rawAlignment: .9 }),
    candidate('Domme', { families: ['dominance'], rawAlignment: .95, eligible: false, evidenceType: 'explicit' }),
  ])
  return [
    { id: 'A-family-diversity', description: 'High-scoring variants do not consume every slot when other supported families add representation.', passed: diverse.recommendations.filter((item) => item.candidate.families.includes('dominance')).length < 5 && diverse.recommendations.some((item) => item.candidate.label === 'Primal Predator') },
    { id: 'B-rope-without-power', description: 'Strong rope evidence does not require broad power-exchange evidence.', passed: ropeOnly.recommendations.some((item) => item.candidate.label === 'Rigger') && ropeOnly.recommendations.every((item) => item.candidate.label !== 'Dominant') },
    { id: 'C-broad-and-niche', description: 'A broad role can remain primary beside a supported niche refinement.', passed: broadAndNiche.primary?.candidate.label === 'Dominant' && broadAndNiche.recommendations.length === 2 },
    { id: 'D-fewer-than-five', description: 'The optimizer returns only defensible roles.', passed: twoSupported.recommendations.length === 2 },
    { id: 'E-manual-unsupported', description: 'Unsupported manual selections remain user-attributed without score fields.', passed: manual[0]?.source === 'user-selected' && !('confidence' in manual[0]) },
    { id: 'F-user-rejection', description: 'An explicit rejection excludes the highest-scoring recommendation.', passed: excluded.recommendations.every((item) => item.candidate.label !== 'Dominant') && excluded.recommendations.some((item) => item.candidate.label === 'Rigger') },
    { id: 'G-direct-confirmation', description: 'Direct confirmation can support a focused role without raw broad alignment.', passed: direct.recommendations[0]?.candidate.evidenceType === 'direct' && direct.recommendations[0]?.candidate.rawAlignment === undefined },
    { id: 'H-hybrid-unconfirmed', description: 'Broad context without direct confirmation cannot recommend a hybrid role.', passed: unconfirmedHybrid.recommendations.length === 0 },
    { id: 'I-semantic-redundancy', description: 'Several labels from one semantic family receive redundancy pressure.', passed: semanticFamily.recommendations.length < 5 && semanticFamily.recommendations.some((item) => item.candidate.label === 'Rigger') },
    { id: 'J-primary-representation', description: 'Primary suitability can outweigh a slightly higher niche alignment.', passed: preferred.primary?.candidate.label === 'Primal' },
    { id: 'K-reviewed-alias', description: 'A reviewed alias pair does not consume two profile slots when another supported family is available.', passed: reviewedAlias.recommendations.filter((item) => ['Rope Switch', 'Bondage Switch'].includes(item.candidate.label)).length === 1 && reviewedAlias.recommendations.some((item) => item.candidate.label === 'Sadist'), observedLabels: reviewedAlias.recommendations.map((item) => item.candidate.label) },
    { id: 'L-ambiguous-unpromoted', description: 'Reviewed-but-unpromoted vocabulary remains ineligible without exact-label evidence.', passed: ambiguousVocabulary.recommendations.some((item) => item.candidate.label === 'Dominant') && ambiguousVocabulary.recommendations.every((item) => item.candidate.label !== 'Domme') },
  ]
}
