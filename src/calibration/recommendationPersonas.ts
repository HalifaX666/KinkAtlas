import { optimizeRoleProfile, type RoleProfileCandidate, type RoleProfileOptimizationOptions } from '../engine/roleProfileOptimizer'
import { roleLibrary, roleLibraryRoleById } from '../taxonomy/roleLibrary'

export type RecommendationFailureKind =
  | 'must-include'
  | 'must-exclude'
  | 'primary'
  | 'redundancy'
  | 'eligibility-policy'
  | 'rejection'
  | 'confirmation'
  | 'set-quality'
  | 'determinism'

export interface RecommendationPersona {
  id: string
  description: string
  candidates: CalibrationRoleProfileCandidate[]
  mustInclude?: string[]
  mustExclude?: string[]
  plausible?: string[]
  primary?: string
  recommendedCount?: [minimum: number, maximum: number]
  redundantPairs?: Array<[string, string]>
  minimumRepresentedFamilies?: number
  clarificationLabels?: string[]
  options?: RoleProfileOptimizationOptions
  focus: 'broad-specific' | 'directional' | 'service' | 'sparse-unsure' | 'contradictory' | 'near-tie' | 'general'
}

export interface RecommendationPersonaFailure {
  kind: RecommendationFailureKind
  message: string
}

type ExactLabelConfirmationState = 'not-asked' | 'confirmed' | 'rejected' | 'unsure'

interface CalibrationRoleProfileCandidate extends RoleProfileCandidate {
  exactLabelConfirmation?: ExactLabelConfirmationState
}

const libraryRoleByLabel = new Map(roleLibrary.roles.map((role) => [role.label, role]))

function roleId(label: string): string {
  const role = libraryRoleByLabel.get(label)
  if (!role) throw new Error(`Recommendation persona uses an unknown role label: ${label}.`)
  return role.id
}

const canonicalIds: Record<string, string> = {
  Dominant: 'dominant', submissive: 'submissive', Switch: 'switch', Top: 'top', Bottom: 'bottom',
  Rigger: 'rigger', 'Rope Bottom': 'rope-bottom', 'Bondage Switch': 'bondage-switch', 'Rope Switch': 'bondage-switch',
  'Service Dom': 'service-dominant', 'Service submissive': 'service-submissive', 'Service Top': 'service-top', 'Service Bottom': 'service-bottom',
  'Primal Hunter': 'primal-hunter', 'Primal Prey': 'primal-prey', 'Primal Switch': 'primal-switch',
  Sadist: 'sadist', Masochist: 'masochist', Exhibitionist: 'exhibitionist', Voyeur: 'voyeur',
}

function candidate(label: string, overrides: Partial<CalibrationRoleProfileCandidate> = {}): CalibrationRoleProfileCandidate {
  const id = roleId(label)
  return {
    roleId: id,
    label,
    canonicalRoleId: canonicalIds[label],
    evidenceType: 'inferred',
    decisionPathway: 'inferred',
    exactLabelConfirmation: 'not-asked',
    eligible: true,
    rawAlignment: .88,
    confidence: 'high',
    evidenceQuality: .86,
    specificity: .7,
    distinctiveness: .76,
    representationValue: .8,
    profileUsefulness: .8,
    primarySuitability: .78,
    families: roleLibraryRoleById.get(id)?.familyIds ?? [],
    evidenceThemes: [],
    evidenceExplanation: 'multiple independent responses support this vocabulary.',
    ...overrides,
  }
}

function weak(label: string, overrides: Partial<CalibrationRoleProfileCandidate> = {}) {
  return candidate(label, {
    eligible: true,
    rawAlignment: .4,
    confidence: 'low',
    evidenceQuality: .28,
    specificity: .4,
    distinctiveness: .45,
    representationValue: .4,
    profileUsefulness: .45,
    primarySuitability: .4,
    ...overrides,
  })
}

function confirmed(label: string, overrides: Partial<CalibrationRoleProfileCandidate> = {}) {
  return candidate(label, {
    evidenceType: 'exact-label',
    decisionPathway: 'explicit-confirmation',
    exactLabelConfirmation: 'confirmed',
    rawAlignment: undefined,
    confidence: undefined,
    evidenceQuality: .9,
    specificity: .8,
    distinctiveness: .76,
    representationValue: .72,
    profileUsefulness: .7,
    primarySuitability: .58,
    evidenceExplanation: `the user explicitly confirmed that the exact label “${label}” fits; no alignment percentage is inferred.`,
    ...overrides,
  })
}

function rejected(label: string, overrides: Partial<CalibrationRoleProfileCandidate> = {}) {
  return candidate(label, {
    eligible: false,
    exactLabelConfirmation: 'rejected',
    evidenceExplanation: 'the user explicitly rejected this exact role label.',
    ...overrides,
  })
}

function direct(label: string, overrides: Partial<CalibrationRoleProfileCandidate> = {}) {
  return candidate(label, {
    evidenceType: 'direct',
    decisionPathway: 'direct-interest',
    rawAlignment: undefined,
    confidence: 'moderate',
    evidenceQuality: .8,
    specificity: .9,
    primarySuitability: .42,
    evidenceExplanation: 'the user directly confirmed this focused interest.',
    ...overrides,
  })
}

const p = (persona: RecommendationPersona) => persona

export const recommendationPersonas: RecommendationPersona[] = [
  p({ id: 'broad-dominant-only', description: 'Broad negotiated authority is central without a specific activity identity.', candidates: [candidate('Dominant', { primarySuitability: .98 })], mustInclude: ['Dominant'], primary: 'Dominant', recommendedCount: [1, 1], clarificationLabels: ['Domme', 'Hard Dom'], focus: 'broad-specific' }),
  p({ id: 'broad-submissive-only', description: 'Broad chosen submission is central without a specific activity identity.', candidates: [candidate('submissive', { primarySuitability: .98 })], mustInclude: ['submissive'], primary: 'submissive', recommendedCount: [1, 1], clarificationLabels: ['Sub-leaning Switch'], focus: 'broad-specific' }),
  p({ id: 'balanced-power-switch', description: 'Balanced movement between authority directions supports broad Switch vocabulary.', candidates: [candidate('Switch', { primarySuitability: .98 })], mustInclude: ['Switch'], primary: 'Switch', recommendedCount: [1, 1], clarificationLabels: ['Dom-leaning Switch', 'Sub-leaning Switch'], focus: 'directional' }),
  p({ id: 'confirmed-dom-leaning-switch', description: 'The user explicitly identifies with a dominant-leaning Switch label.', candidates: [confirmed('Dom-leaning Switch', { primarySuitability: .9 })], mustInclude: ['Dom-leaning Switch'], primary: 'Dom-leaning Switch', recommendedCount: [1, 1], focus: 'directional' }),
  p({ id: 'confirmed-sub-leaning-switch', description: 'The user explicitly identifies with a submissive-leaning Switch label.', candidates: [confirmed('Sub-leaning Switch', { primarySuitability: .9 })], mustInclude: ['Sub-leaning Switch'], primary: 'Sub-leaning Switch', recommendedCount: [1, 1], focus: 'directional' }),
  p({ id: 'confirmed-top-leaning-switch', description: 'The user explicitly identifies with a Top-leaning Switch activity label.', candidates: [confirmed('Top-leaning Switch', { primarySuitability: .9 })], mustInclude: ['Top-leaning Switch'], primary: 'Top-leaning Switch', recommendedCount: [1, 1], focus: 'directional' }),
  p({ id: 'confirmed-bottom-leaning-switch', description: 'The user explicitly identifies with a Bottom-leaning Switch activity label.', candidates: [confirmed('Bottom-leaning Switch', { primarySuitability: .9 })], mustInclude: ['Bottom-leaning Switch'], primary: 'Bottom-leaning Switch', recommendedCount: [1, 1], focus: 'directional' }),
  p({ id: 'rope-focused-rigger', description: 'Rope craft and giving direction dominate over broad power identity.', candidates: [candidate('Rigger', { rawAlignment: .97, primarySuitability: .98 }), candidate('Top', { rawAlignment: .78, primarySuitability: .72 }), weak('Dominant')], mustInclude: ['Rigger', 'Top'], mustExclude: ['Dominant'], primary: 'Rigger', recommendedCount: [2, 2], focus: 'directional' }),
  p({ id: 'rope-focused-bottom', description: 'Being tied is central, with Bottom as a useful broader activity position.', candidates: [candidate('Rope Bottom', { rawAlignment: .97, primarySuitability: .96 }), candidate('Bottom', { rawAlignment: .79, primarySuitability: .7 }), weak('submissive')], mustInclude: ['Rope Bottom', 'Bottom'], mustExclude: ['submissive'], primary: 'Rope Bottom', recommendedCount: [2, 2], focus: 'directional' }),
  p({ id: 'service-oriented-dominant', description: 'Negotiated authority and service-focused responsibility are independently supported.', candidates: [candidate('Dominant', { primarySuitability: .98 }), candidate('Service Dom', { rawAlignment: .9 })], mustInclude: ['Dominant', 'Service Dom'], primary: 'Dominant', recommendedCount: [2, 2], focus: 'service' }),
  p({ id: 'service-oriented-submissive', description: 'Chosen submission and service-giving identity are independently supported.', candidates: [candidate('submissive', { primarySuitability: .98 }), candidate('Service submissive', { rawAlignment: .9 })], mustInclude: ['submissive', 'Service submissive'], primary: 'submissive', recommendedCount: [2, 2], focus: 'service' }),
  p({ id: 'service-top-independent', description: 'Active service provision is supported without importing dominance.', candidates: [candidate('Service Top', { rawAlignment: .95, primarySuitability: .92 }), candidate('Top', { rawAlignment: .81 }), weak('Dominant')], mustInclude: ['Service Top', 'Top'], mustExclude: ['Dominant'], primary: 'Service Top', focus: 'service' }),
  p({ id: 'service-bottom-independent', description: 'Receiving service is supported without importing submission.', candidates: [candidate('Service Bottom', { rawAlignment: .95, primarySuitability: .92 }), candidate('Bottom', { rawAlignment: .81 }), weak('submissive')], mustInclude: ['Service Bottom', 'Bottom'], mustExclude: ['submissive'], primary: 'Service Bottom', focus: 'service' }),
  p({ id: 'primal-direction-flexible', description: 'Strong primal evidence supports changing pursuit and evasion directions.', candidates: [candidate('Primal Switch', { rawAlignment: .94, primarySuitability: .94 })], mustInclude: ['Primal Switch'], primary: 'Primal Switch', focus: 'directional' }),
  p({ id: 'hunter-without-primal-confirmation', description: 'Pursuit-direction evidence supports Primal Hunter but cannot confirm broad Primal.', candidates: [candidate('Primal Hunter', { rawAlignment: .95 }), candidate('Primal', { eligible: false, evidenceType: 'exact-label', decisionPathway: 'explicit-confirmation', rawAlignment: undefined, confidence: undefined })], mustInclude: ['Primal Hunter'], mustExclude: ['Primal'], primary: 'Primal Hunter', clarificationLabels: ['Primal'], focus: 'directional' }),
  p({ id: 'prey-without-primal-confirmation', description: 'Evasion-direction evidence supports Primal Prey but cannot confirm broad Primal.', candidates: [candidate('Primal Prey', { rawAlignment: .95 }), candidate('Primal', { eligible: false, evidenceType: 'exact-label', decisionPathway: 'explicit-confirmation', rawAlignment: undefined, confidence: undefined })], mustInclude: ['Primal Prey'], mustExclude: ['Primal'], primary: 'Primal Prey', clarificationLabels: ['Primal'], focus: 'directional' }),
  p({ id: 'confirmed-broad-primal', description: 'The exact broad Primal label is explicitly confirmed without a psychometric score.', candidates: [confirmed('Primal', { primarySuitability: .9 })], mustInclude: ['Primal'], primary: 'Primal', focus: 'general' }),
  p({ id: 'confirmed-domme', description: 'The user explicitly confirms Domme as their exact self-presentation.', candidates: [confirmed('Domme', { primarySuitability: .9 })], mustInclude: ['Domme'], primary: 'Domme', focus: 'general' }),
  p({ id: 'dominant-rejects-domme', description: 'Broad Dominant evidence is strong while Domme is explicitly rejected.', candidates: [candidate('Dominant', { rawAlignment: .95 }), rejected('Domme', { evidenceType: 'exact-label', decisionPathway: 'explicit-confirmation', rawAlignment: undefined, confidence: undefined })], mustInclude: ['Dominant'], mustExclude: ['Domme'], primary: 'Dominant', focus: 'contradictory' }),
  p({ id: 'rejects-dominant', description: 'Strong broad dominance evidence does not override rejection of the exact Dominant label.', candidates: [rejected('Dominant', { rawAlignment: .96 }), candidate('Rigger', { rawAlignment: .84 })], mustInclude: ['Rigger'], mustExclude: ['Dominant'], primary: 'Rigger', focus: 'contradictory' }),
  p({ id: 'rejects-submissive', description: 'Strong broad submission evidence does not override rejection of the exact submissive label.', candidates: [rejected('submissive', { rawAlignment: .96 }), candidate('Bottom', { rawAlignment: .84 })], mustInclude: ['Bottom'], mustExclude: ['submissive'], primary: 'Bottom', focus: 'contradictory' }),
  p({ id: 'many-compatible-five-slots', description: 'Seven supported dimensions must be represented within five slots.', candidates: [candidate('Dominant'), candidate('Rigger'), candidate('Sadist'), candidate('Service Top'), candidate('Exhibitionist'), candidate('Primal Hunter'), candidate('Voyeur')], recommendedCount: [5, 5], plausible: ['Primal Hunter', 'Voyeur'], minimumRepresentedFamilies: 4, focus: 'general' }),
  p({ id: 'near-synonymous-rope-labels', description: 'Two reviewed aliases should not consume two scarce slots.', candidates: [candidate('Rope Switch', { canonicalRoleId: 'bondage-switch', rawAlignment: .93 }), candidate('Bondage Switch', { canonicalRoleId: 'bondage-switch', rawAlignment: .92 }), candidate('Sadist', { rawAlignment: .8 })], mustInclude: ['Sadist'], redundantPairs: [['Rope Switch', 'Bondage Switch']], recommendedCount: [2, 2], focus: 'near-tie' }),
  p({ id: 'broad-specific-overlap', description: 'Broad Dominant and meaningfully specific Service Dom both improve representation.', candidates: [candidate('Dominant', { rawAlignment: .93, primarySuitability: .98 }), candidate('Service Dom', { rawAlignment: .91, representationValue: .9 })], mustInclude: ['Dominant', 'Service Dom'], primary: 'Dominant', focus: 'broad-specific' }),
  p({ id: 'activity-heavy-weak-ds', description: 'Strong activity roles coexist without a weak D/s identity being padded into the set.', candidates: [candidate('Top', { rawAlignment: .93 }), candidate('Rigger', { rawAlignment: .91 }), candidate('Sadist', { rawAlignment: .88 }), weak('Dominant')], mustInclude: ['Top', 'Rigger', 'Sadist'], mustExclude: ['Dominant'], recommendedCount: [3, 3], focus: 'directional' }),
  p({ id: 'ds-heavy-few-activities', description: 'Strong negotiated authority with no activity evidence yields a compact set.', candidates: [candidate('Dominant', { rawAlignment: .96 }), weak('Top'), weak('Rigger')], mustInclude: ['Dominant'], mustExclude: ['Top', 'Rigger'], recommendedCount: [1, 1], focus: 'directional' }),
  p({ id: 'fetish-heavy-direct-interests', description: 'Several directly confirmed interests remain scoreless but eligible.', candidates: [direct('Latex pony'), direct('Foot Fetishist'), direct('Gear Fetishist')], mustInclude: ['Latex pony', 'Foot Fetishist', 'Gear Fetishist'], recommendedCount: [3, 3], minimumRepresentedFamilies: 1, focus: 'general' }),
  p({ id: 'role-rich-experienced', description: 'A role-rich experienced profile has several strong complementary identities.', candidates: [candidate('Dominant'), candidate('Rigger'), candidate('Sadist'), candidate('Service Top'), candidate('Exhibitionist'), candidate('Primal Hunter')], recommendedCount: [5, 5], minimumRepresentedFamilies: 4, focus: 'general' }),
  p({ id: 'low-experience-curious', description: 'Curiosity with limited evidence supports one cautious focused interest.', candidates: [direct('Latex pony', { evidenceQuality: .72 }), weak('Kinkster')], mustInclude: ['Latex pony'], mustExclude: ['Kinkster'], recommendedCount: [1, 1], focus: 'sparse-unsure' }),
  p({ id: 'frequently-unsure', description: 'Unsure responses provide no positive recommendation evidence.', candidates: [candidate('Domme', { eligible: false, evidenceType: 'exact-label', decisionPathway: 'explicit-confirmation', exactLabelConfirmation: 'unsure', rawAlignment: undefined, confidence: undefined }), candidate('Primal', { eligible: false, evidenceType: 'exact-label', decisionPathway: 'explicit-confirmation', exactLabelConfirmation: 'unsure', rawAlignment: undefined, confidence: undefined })], mustExclude: ['Domme', 'Primal'], recommendedCount: [0, 0], focus: 'sparse-unsure' }),
  p({ id: 'sparse-broad-evidence', description: 'One weak broad signal is insufficient for a recommendation.', candidates: [weak('Dominant'), weak('Top')], mustExclude: ['Dominant', 'Top'], recommendedCount: [0, 0], clarificationLabels: ['Domme'], focus: 'sparse-unsure' }),
  p({ id: 'contradictory-discovery', description: 'Conflicting broad evidence lowers confidence rather than manufacturing a fixed identity.', candidates: [weak('Dominant'), weak('submissive'), candidate('Switch', { rawAlignment: .65, confidence: 'moderate', evidenceQuality: .62 })], mustExclude: ['Dominant', 'submissive'], plausible: ['Switch'], recommendedCount: [0, 1], focus: 'contradictory' }),
  p({ id: 'top-not-dominant', description: 'Strong active play-position evidence can coexist with submission while remaining distinct from weak authority evidence.', candidates: [candidate('Top', { rawAlignment: .96 }), candidate('submissive', { rawAlignment: .88 }), weak('Dominant')], mustInclude: ['Top', 'submissive'], mustExclude: ['Dominant'], primary: 'Top', focus: 'directional' }),
  p({ id: 'dominant-not-top', description: 'Strong authority evidence remains distinct from weak active play-position evidence.', candidates: [candidate('Dominant', { rawAlignment: .96 }), weak('Top')], mustInclude: ['Dominant'], mustExclude: ['Top'], primary: 'Dominant', focus: 'directional' }),
  p({ id: 'bottom-not-submissive', description: 'Strong receptive activity evidence can coexist with dominance while remaining distinct from weak submission evidence.', candidates: [candidate('Bottom', { rawAlignment: .96 }), candidate('Dominant', { rawAlignment: .88 }), weak('submissive')], mustInclude: ['Bottom', 'Dominant'], mustExclude: ['submissive'], primary: 'Bottom', focus: 'directional' }),
  p({ id: 'submissive-not-bottom', description: 'Strong submission evidence remains distinct from weak receptive activity evidence.', candidates: [candidate('submissive', { rawAlignment: .96 }), weak('Bottom')], mustInclude: ['submissive'], mustExclude: ['Bottom'], primary: 'submissive', focus: 'directional' }),
  p({ id: 'power-switch-top-direction', description: 'Broad power-direction flexibility coexists with primarily active play.', candidates: [candidate('Switch', { rawAlignment: .94, primarySuitability: .96 }), candidate('Top', { rawAlignment: .88 })], mustInclude: ['Switch', 'Top'], primary: 'Switch', focus: 'directional' }),
  p({ id: 'multi-direction-activity-not-switch', description: 'Both activity directions are supported without inferring a Switch identity.', candidates: [candidate('Top', { rawAlignment: .91 }), candidate('Bottom', { rawAlignment: .9 }), candidate('Switch', { eligible: false, rawAlignment: .45, confidence: 'low' })], mustInclude: ['Top', 'Bottom'], mustExclude: ['Switch'], recommendedCount: [2, 2], focus: 'directional' }),
  p({ id: 'confirmed-niche-loses-to-broad', description: 'A confirmed overlapping niche label does not displace a much stronger broad representative.', candidates: [candidate('Dominant', { rawAlignment: .97, primarySuitability: .98 }), confirmed('Domme')], mustInclude: ['Dominant'], mustExclude: ['Domme'], primary: 'Dominant', focus: 'broad-specific' }),
  p({ id: 'confirmed-niche-adds-representation', description: 'A confirmed niche label from another dimension adds meaningful information.', candidates: [candidate('Dominant', { rawAlignment: .94, primarySuitability: .98 }), confirmed('Primal')], mustInclude: ['Dominant', 'Primal'], primary: 'Dominant', recommendedCount: [2, 2], focus: 'broad-specific' }),
  p({ id: 'rejected-high-niche', description: 'A rejected high-scoring niche role cannot be reinserted by optimization.', candidates: [rejected('Rigger', { rawAlignment: .98 }), candidate('Top', { rawAlignment: .86 })], mustInclude: ['Top'], mustExclude: ['Rigger'], primary: 'Top', focus: 'contradictory' }),
  p({ id: 'manual-only-user-addition', description: 'A manual-only role is not recommended, while a later user addition remains scoreless.', candidates: [candidate('Fetishist', { eligible: false, evidenceType: 'exploration', decisionPathway: 'manual-only', rawAlignment: undefined, confidence: undefined })], mustExclude: ['Fetishist'], recommendedCount: [0, 0], focus: 'general' }),
  p({ id: 'five-complementary-roles', description: 'Exactly five independently supported dimensions all add representation.', candidates: [candidate('Dominant'), candidate('Rigger'), candidate('Sadist'), candidate('Service Top'), candidate('Exhibitionist')], mustInclude: ['Dominant', 'Rigger', 'Sadist', 'Service Top', 'Exhibitionist'], recommendedCount: [5, 5], minimumRepresentedFamilies: 4, focus: 'general' }),
  p({ id: 'six-complementary-roles', description: 'Six independently supported dimensions require a defensible five-slot choice without padding.', candidates: [candidate('Dominant', { rawAlignment: .94 }), candidate('Rigger', { rawAlignment: .92 }), candidate('Sadist', { rawAlignment: .9 }), candidate('Service Top', { rawAlignment: .88 }), candidate('Exhibitionist', { rawAlignment: .86 }), candidate('Primal Hunter', { rawAlignment: .84 })], recommendedCount: [5, 5], plausible: ['Primal Hunter'], minimumRepresentedFamilies: 4, focus: 'general' }),
  p({ id: 'broad-primary-over-higher-niche', description: 'Broad identity centrality and suitability outweigh a slightly higher niche alignment.', candidates: [candidate('Dominant', { rawAlignment: .89, primarySuitability: 1 }), candidate('Service Dom', { rawAlignment: .97, primarySuitability: .38 })], mustInclude: ['Dominant', 'Service Dom'], primary: 'Dominant', focus: 'broad-specific' }),
  p({ id: 'broad-identity-primary', description: 'A broad identity is the best umbrella for two supported refinements.', candidates: [candidate('Dominant', { rawAlignment: .93, primarySuitability: 1 }), candidate('Service Dom', { rawAlignment: .91, primarySuitability: .52 }), candidate('Top', { rawAlignment: .86, primarySuitability: .62 })], mustInclude: ['Dominant', 'Service Dom', 'Top'], primary: 'Dominant', focus: 'broad-specific' }),
  p({ id: 'specific-identity-primary', description: 'Overwhelming rope-centered evidence makes Rigger more representative than broad Top.', candidates: [candidate('Rigger', { rawAlignment: .98, evidenceQuality: .97, primarySuitability: .96 }), candidate('Top', { rawAlignment: .76, evidenceQuality: .72, primarySuitability: .65 })], mustInclude: ['Rigger', 'Top'], primary: 'Rigger', focus: 'broad-specific' }),
  p({ id: 'near-tied-valid-sets', description: 'Several equally plausible complementary roles retain a stable deterministic order.', candidates: [candidate('Dominant', { rawAlignment: .88 }), candidate('Rigger', { rawAlignment: .88 }), candidate('Sadist', { rawAlignment: .88 }), candidate('Exhibitionist', { rawAlignment: .88 }), candidate('Primal Hunter', { rawAlignment: .88 }), candidate('Voyeur', { rawAlignment: .88 })], recommendedCount: [5, 5], minimumRepresentedFamilies: 4, focus: 'near-tie' }),
  p({ id: 'no-supported-recommendation', description: 'No role has sufficient evidence or confirmed eligibility.', candidates: [weak('Dominant'), candidate('Primal', { eligible: false, evidenceType: 'exact-label', decisionPathway: 'explicit-confirmation', rawAlignment: undefined, confidence: undefined }), candidate('Fetishist', { eligible: false, evidenceType: 'exploration', decisionPathway: 'manual-only', rawAlignment: undefined, confidence: undefined })], recommendedCount: [0, 0], focus: 'sparse-unsure' }),
  p({ id: 'two-supported-recommendations', description: 'Only two sufficiently supported roles produce a two-role set.', candidates: [candidate('Dominant'), candidate('Rigger'), weak('Sadist'), candidate('Primal', { eligible: false, evidenceType: 'exact-label', decisionPathway: 'explicit-confirmation', rawAlignment: undefined, confidence: undefined })], mustInclude: ['Dominant', 'Rigger'], recommendedCount: [2, 2], focus: 'sparse-unsure' }),
]

export const recommendationClarificationPoolSize = roleLibrary.roles.filter((role) => (
  role.decisionPathway === 'direct-interest'
  || role.decisionPathway === 'hybrid'
  || role.decisionPathway === 'explicit-confirmation'
)).length

function selectCalibrationClarifications(persona: RecommendationPersona, limit = 6) {
  const answeredRoleIds = new Set(persona.candidates
    .filter((candidate) => candidate.decisionPathway === 'explicit-confirmation' && candidate.exactLabelConfirmation !== 'not-asked')
    .map((candidate) => candidate.roleId))
  return (persona.clarificationLabels ?? [])
    .map((label) => libraryRoleByLabel.get(label))
    .filter((role) => role && !answeredRoleIds.has(role.id))
    .slice(0, Math.max(0, Math.min(6, limit)))
}

export function evaluateRecommendationPersona(persona: RecommendationPersona) {
  const optimization = optimizeRoleProfile(persona.candidates, 5, persona.options)
  const repeated = optimizeRoleProfile(persona.candidates, 5, persona.options)
  const labels = optimization.recommendations.map((item) => item.candidate.label)
  const selectedFamilies = new Set(optimization.recommendations.flatMap((item) => item.candidate.families))
  const failures: RecommendationPersonaFailure[] = []
  persona.mustInclude?.forEach((label) => {
    if (!labels.includes(label)) failures.push({ kind: 'must-include', message: `${label} was expected in the representative set.` })
  })
  persona.mustExclude?.forEach((label) => {
    if (labels.includes(label)) failures.push({ kind: 'must-exclude', message: `${label} was prohibited from the representative set.` })
  })
  if (persona.primary && optimization.primary?.candidate.label !== persona.primary) failures.push({ kind: 'primary', message: `Expected ${persona.primary} as primary; received ${optimization.primary?.candidate.label ?? 'none'}.` })
  if (persona.recommendedCount && (labels.length < persona.recommendedCount[0] || labels.length > persona.recommendedCount[1])) failures.push({ kind: 'set-quality', message: `Expected ${persona.recommendedCount[0]}–${persona.recommendedCount[1]} roles; received ${labels.length}.` })
  persona.redundantPairs?.forEach(([left, right]) => {
    if (labels.includes(left) && labels.includes(right)) failures.push({ kind: 'redundancy', message: `${left} and ${right} redundantly consumed two slots.` })
  })
  if (persona.minimumRepresentedFamilies && selectedFamilies.size < persona.minimumRepresentedFamilies) failures.push({ kind: 'set-quality', message: `Expected at least ${persona.minimumRepresentedFamilies} represented families; received ${selectedFamilies.size}.` })
  optimization.recommendations.forEach(({ candidate: selected }) => {
    const calibrationCandidate = persona.candidates.find((candidate) => candidate.roleId === selected.roleId)
    if (!selected.eligible || selected.decisionPathway === 'manual-only') failures.push({ kind: 'eligibility-policy', message: `${selected.label} entered Top-5 without policy eligibility.` })
    if (calibrationCandidate?.exactLabelConfirmation === 'rejected') failures.push({ kind: 'rejection', message: `${selected.label} entered Top-5 despite explicit rejection.` })
    if (selected.decisionPathway === 'explicit-confirmation' && calibrationCandidate?.exactLabelConfirmation !== 'confirmed') failures.push({ kind: 'confirmation', message: `${selected.label} entered Top-5 without exact-label confirmation.` })
    if (!libraryRoleByLabel.has(selected.label)) failures.push({ kind: 'eligibility-policy', message: `${selected.label} is not an exact role-library label.` })
  })
  if (labels.length > 5) failures.push({ kind: 'set-quality', message: `Optimizer returned ${labels.length} roles.` })
  if (JSON.stringify(optimization) !== JSON.stringify(repeated)) failures.push({ kind: 'determinism', message: 'Identical inputs changed optimizer output.' })
  const clarifications = selectCalibrationClarifications(persona)
  return { persona, optimization, labels, clarifications, failures, passed: failures.length === 0 }
}

export const recommendationResults = recommendationPersonas.map(evaluateRecommendationPersona)
