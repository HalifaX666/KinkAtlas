import { discoveryQuestions } from '../data/questions'
import { refinementQuestions } from '../data/refinement'
import { roles } from '../data/roles'
import { traits } from '../data/traits'
import { refinementQuestionIdsForTarget, refinementTargetByRoleId } from '../engine/refinementEvidence'
import { roleLibrary, type RoleLibraryRelationshipType, type RoleLibraryRole } from '../taxonomy/roleLibrary'
import { recommendationResults } from './recommendationPersonas'
import type { TraitId } from '../types'

export type FamilyReviewOutcome =
  | 'Coherent and adequately represented'
  | 'Coherent but metadata incomplete'
  | 'Coherent but assessment evidence requires review'
  | 'Overlapping families requiring editorial clarification'
  | 'Conceptually ambiguous'
  | 'Intentionally exploration-only'
  | 'Requires human editorial decision'

export type FindingCategory =
  | 'Editorial metadata issue'
  | 'Assessment evidence issue'
  | 'Role discrimination issue'
  | 'Recommendation issue'
  | 'Explainability issue'
  | 'Intentional design'
  | 'Unverified hypothesis'

export interface FamilyJourneyObservation {
  id: string
  questionIds: string[]
}

interface FamilyDescriptor {
  purpose: string
  dimension: 'identity vocabulary' | 'activity position' | 'interpersonal dynamics' | 'practices' | 'interests' | 'community vocabulary'
  overlaps: string[]
  outcome: FamilyReviewOutcome
  outcomeReason: string
  discoveryDomains: string[]
  anchors: string[]
  gapClassification?: 'Intentional editorial-only coverage' | 'Supported through direct confirmation' | 'Potential assessment gap' | 'Requires editorial decision'
}

const familyDescriptors: Record<string, FamilyDescriptor> = {
  'power-exchange': { purpose: 'Broad vocabulary for negotiated authority, responsibility, and yielding.', dimension: 'interpersonal dynamics', overlaps: ['dominance', 'submission', 'switching'], outcome: 'Coherent and adequately represented', outcomeReason: 'The family has strong scored coverage in both authority directions and explicit Refine gates.', discoveryDomains: ['power-exchange', 'relationship-style'], anchors: ['power exchange', 'authority', 'control', 'decision making', 'obedience'] },
  dominance: { purpose: 'Vocabulary centered on holding negotiated authority or responsibility.', dimension: 'identity vocabulary', overlaps: ['power-exchange', 'play-position', 'discipline-protocol'], outcome: 'Coherent and adequately represented', outcomeReason: 'Multiple scored and directly reviewed styles preserve the distinction between authority and activity leadership.', discoveryDomains: ['power-exchange'], anchors: ['dominant', 'domme', 'dom ', 'authority', 'command'] },
  submission: { purpose: 'Vocabulary centered on consensually yielding negotiated authority.', dimension: 'identity vocabulary', overlaps: ['power-exchange', 'play-position', 'service'], outcome: 'Coherent and adequately represented', outcomeReason: 'Scored and Refine coverage distinguishes submission from receiving an activity.', discoveryDomains: ['power-exchange'], anchors: ['submissive', 'submission', 'sub ', 'yield authority', 'surrender'] },
  switching: { purpose: 'Vocabulary for moving between directions, positions, or dynamic roles.', dimension: 'activity position', overlaps: ['power-exchange', 'play-position', 'rope-bondage', 'service'], outcome: 'Coherent and adequately represented', outcomeReason: 'Multiple scored switch roles and directional Refine pathways make the bidirectional concept explicit.', discoveryDomains: ['power-exchange', 'play-position'], anchors: ['switch', 'both roles', 'either role', 'alternate between', 'bidirectional'] },
  'caregiver-little': { purpose: 'Adult caregiving, receiving-care, and age-roleplay vocabulary.', dimension: 'interpersonal dynamics', overlaps: ['roleplay', 'persona-fantasy', 'dominance', 'submission'], outcome: 'Overlapping families requiring editorial clarification', outcomeReason: 'Caregiving and adult age-roleplay are related but not interchangeable; the family intentionally contains both.', discoveryDomains: ['caregiving', 'roleplay'], anchors: ['caregiver', 'little', 'daddy', 'mommy', 'nurturing', 'age roleplay'] },
  'play-position': { purpose: 'Activity-scoped giving, receiving, and versatile positions without implied authority.', dimension: 'activity position', overlaps: ['dominance', 'submission', 'sensation-impact', 'rope-bondage'], outcome: 'Overlapping families requiring editorial clarification', outcomeReason: 'Position vocabulary correctly overlaps many practices, but must remain distinct from broader authority.', discoveryDomains: ['play-position'], anchors: [' top', 'bottom', 'vers', 'activity position', 'giving an activity', 'receiving an activity'] },
  'sensation-impact': { purpose: 'Vocabulary for giving, receiving, or exploring physical sensation and impact.', dimension: 'practices', overlaps: ['sadomasochism', 'play-position', 'rope-bondage'], outcome: 'Overlapping families requiring editorial clarification', outcomeReason: 'The practice-oriented family overlaps sadomasochistic identity without making pain preference an identity claim.', discoveryDomains: ['pain-sensation'], anchors: ['sensation', 'impact', 'spanking', 'flogging', 'whip', 'physical intensity'] },
  'pet-animal-roleplay': { purpose: 'Adult animal-inspired roleplay, care, training, and expression vocabulary.', dimension: 'interpersonal dynamics', overlaps: ['roleplay', 'persona-fantasy', 'power-exchange'], outcome: 'Coherent and adequately represented', outcomeReason: 'Owner/pet directions, specific personas, and Refine gates provide coherent coverage.', discoveryDomains: ['pet-owner', 'roleplay'], anchors: ['pet play', 'animal roleplay', 'puppy', 'kitten', 'handler', 'trainer'] },
  roleplay: { purpose: 'Agreed fictional characters, scenarios, and shared narrative frames.', dimension: 'practices', overlaps: ['persona-fantasy', 'caregiver-little', 'pet-animal-roleplay'], outcome: 'Coherent but metadata incomplete', outcomeReason: 'The core concept is coherent, but only a small subset of the much larger persona vocabulary is explicitly assigned.', discoveryDomains: ['roleplay'], anchors: ['roleplay', 'role play', 'fictional role', 'character', 'scenario'] },
  'discipline-protocol': { purpose: 'Rules, accountability, ritual, protocol, and negotiated consequences.', dimension: 'interpersonal dynamics', overlaps: ['power-exchange', 'dominance', 'service'], outcome: 'Coherent but metadata incomplete', outcomeReason: 'Scored evidence is coherent, but three explicit members do not represent all adjacent protocol vocabulary.', discoveryDomains: ['discipline-protocol'], anchors: ['discipline', 'protocol', 'rules', 'ritual', 'correction', 'accountability'] },
  sadomasochism: { purpose: 'Identity and interest vocabulary organized around consensual pain giving or receiving.', dimension: 'identity vocabulary', overlaps: ['sensation-impact', 'play-position', 'primal'], outcome: 'Overlapping families requiring editorial clarification', outcomeReason: 'The family is coherent but shares many members with the broader practice-oriented sensation family.', discoveryDomains: ['pain-sensation'], anchors: ['sadist', 'masochist', 'sadomasoch', 'pain giving', 'pain receiving'] },
  primal: { purpose: 'Instinctive, pursuit/evasion, and less-scripted embodied play vocabulary.', dimension: 'interpersonal dynamics', overlaps: ['sensation-impact', 'power-exchange', 'persona-fantasy'], outcome: 'Coherent and adequately represented', outcomeReason: 'Scored directional roles and Refine questions preserve pursuit, evasion, and switching distinctions.', discoveryDomains: ['primal'], anchors: ['primal', 'predator', 'prey', 'pursuit', 'evasion', 'instinctive'] },
  'sexual-role-vocabulary': { purpose: 'A broad editorial collection of sexual-position, activity, and self-description labels.', dimension: 'identity vocabulary', overlaps: ['play-position', 'material-fetish', 'praise-affection', 'persona-fantasy'], outcome: 'Conceptually ambiguous', outcomeReason: 'The family mixes activity positions, relationship labels, fetish labels, and reclaimed self-descriptions.', discoveryDomains: [], anchors: ['sexual role', 'slut', 'whore', 'oral', 'anal', 'fisting', 'pegging'] , gapClassification: 'Requires editorial decision' },
  'rope-bondage': { purpose: 'Rope craft, restraint, and tying/being-tied position vocabulary.', dimension: 'practices', overlaps: ['play-position', 'sensation-impact', 'service'], outcome: 'Coherent and adequately represented', outcomeReason: 'Scored craft and position roles plus exact Refine pathways provide strong evidence mapping.', discoveryDomains: ['rope-bondage'], anchors: ['rope', 'bondage', 'rigger', 'tying', 'being tied', 'restraint'] },
  'brat-dynamics': { purpose: 'Negotiated playful resistance and the response to it.', dimension: 'interpersonal dynamics', overlaps: ['submission', 'caregiver-little', 'play-position'], outcome: 'Coherent and adequately represented', outcomeReason: 'Scored directional roles and exact Refine questions distinguish resistance from response.', discoveryDomains: ['brat-dynamics'], anchors: ['brat', 'tamer', 'playful resistance', 'provocation', 'defiance'] },
  'persona-fantasy': { purpose: 'Fantasy, creature, supernatural, and persona-based vocabulary.', dimension: 'identity vocabulary', overlaps: ['roleplay', 'pet-animal-roleplay', 'caregiver-little'], outcome: 'Overlapping families requiring editorial clarification', outcomeReason: 'The editorial grouping is useful, but fantasy identity, scene persona, and age-role vocabulary are not one assessment construct.', discoveryDomains: ['roleplay'], anchors: ['fantasy', 'persona', 'angel', 'demon', 'vampire', 'creature', 'supernatural'], gapClassification: 'Supported through direct confirmation' },
  'material-fetish': { purpose: 'Material, clothing, object, and gear-centered fetish vocabulary.', dimension: 'interests', overlaps: ['sensation-impact', 'sexual-role-vocabulary', 'pet-animal-roleplay'], outcome: 'Coherent but assessment evidence requires review', outcomeReason: 'The family is coherent and has a relevant broad domain question, but no canonical scored member grounds family-level trait evidence.', discoveryDomains: ['fetish-material'], anchors: ['fetish', 'latex', 'leather', 'rubber', 'material', 'gear'], gapClassification: 'Potential assessment gap' },
  'degradation-objectification': { purpose: 'Degradation, objectification, and related affirming/devaluing role vocabulary.', dimension: 'interpersonal dynamics', overlaps: ['praise-affection', 'sexual-role-vocabulary', 'power-exchange'], outcome: 'Conceptually ambiguous', outcomeReason: 'Current membership combines degradation and praise-oriented labels without an explicit shared semantic boundary.', discoveryDomains: ['psychological-play'], anchors: ['degradation', 'degrade', 'objectification', 'objectified', 'humiliation'], gapClassification: 'Potential assessment gap' },
  'denial-control': { purpose: 'Denial, edging, chastity, and control-of-release vocabulary.', dimension: 'practices', overlaps: ['power-exchange', 'discipline-protocol', 'sexual-role-vocabulary'], outcome: 'Coherent but assessment evidence requires review', outcomeReason: 'The four-role direction set is coherent, but it has no canonical scored role or exact Refine target.', discoveryDomains: ['psychological-play', 'discipline-protocol'], anchors: ['denial', 'edging', 'chastity', 'orgasm control', 'release control'], gapClassification: 'Potential assessment gap' },
  'education-mentorship': { purpose: 'Teaching, learning, mentoring, and community knowledge roles.', dimension: 'community vocabulary', overlaps: ['community-participation', 'service'], outcome: 'Intentionally exploration-only', outcomeReason: 'These are useful community roles but are not identity-alignment claims made by the assessment.', discoveryDomains: ['community-identity'], anchors: ['mentor', 'educator', 'teacher', 'student', 'coach', 'teaching'], gapClassification: 'Intentional editorial-only coverage' },
  'praise-affection': { purpose: 'Praise, affection, reassurance, and consensual attention vocabulary.', dimension: 'interpersonal dynamics', overlaps: ['caregiver-little', 'service', 'degradation-objectification'], outcome: 'Coherent but assessment evidence requires review', outcomeReason: 'Dedicated Discovery questions exist, but the family has no canonical scored member and contains one degradation-family overlap.', discoveryDomains: ['caregiving', 'service'], anchors: ['praise', 'affection', 'cuddle', 'affirmation', 'reassurance'], gapClassification: 'Potential assessment gap' },
  service: { purpose: 'Giving, receiving, or structuring useful and attentive acts.', dimension: 'interpersonal dynamics', overlaps: ['power-exchange', 'play-position', 'caregiver-little'], outcome: 'Coherent and adequately represented', outcomeReason: 'Scored giving/receiving positions and Refine pathways separate service from authority.', discoveryDomains: ['service'], anchors: ['service', 'useful acts', 'attentive acts', 'serve', 'being served'] },
  'community-identity': { purpose: 'Broad community identity and relationship-to-vocabulary terms.', dimension: 'community vocabulary', overlaps: ['exploration-general', 'community-participation'], outcome: 'Coherent but metadata incomplete', outcomeReason: 'The single explicit member is coherent, but adjacent broad identity vocabulary remains familyless.', discoveryDomains: ['community-identity'], anchors: ['community identity', 'kinkster', 'community vocabulary', 'shared vocabulary', 'community belonging'] },
  'exhibition-voyeurism': { purpose: 'Consensual seeing, being seen, and audience-aware performance.', dimension: 'practices', overlaps: ['play-position', 'roleplay'], outcome: 'Coherent and adequately represented', outcomeReason: 'Scored directional roles provide clear static evidence even without exact Refine questions.', discoveryDomains: ['exhibition-observation'], anchors: ['exhibition', 'voyeur', 'being observed', 'observing others', 'audience'] },
  'exploration-general': { purpose: 'Undecided, exploratory, and intentionally non-specific vocabulary.', dimension: 'community vocabulary', overlaps: ['community-identity'], outcome: 'Intentionally exploration-only', outcomeReason: 'The family represents uncertainty and browsing rather than an assessable role claim.', discoveryDomains: ['community-identity'], anchors: ['exploring', 'undecided', 'not applicable', 'stay undecided', 'broad exploration'], gapClassification: 'Intentional editorial-only coverage' },
  'community-participation': { purpose: 'Organizing, hosting, facilitating, and other community participation roles.', dimension: 'community vocabulary', overlaps: ['education-mentorship', 'community-identity'], outcome: 'Intentionally exploration-only', outcomeReason: 'Participation roles are valuable library vocabulary but are not inferred identity alignments.', discoveryDomains: ['community-identity'], anchors: ['organizer', 'event organizer', 'host', 'facilitator', 'board member', 'staff'], gapClassification: 'Intentional editorial-only coverage' },
}

const futureFamilyClusters = [
  { id: 'relationship-patterns', label: 'Relationship and partner-pattern vocabulary', anchors: ['polyamory', 'non monogamy', 'swinger', 'hotwife', 'cuckold', 'partner exchange'] },
  { id: 'body-presentation-identity', label: 'Body and presentation identity vocabulary', anchors: ['body type', 'body presentation', 'gender expression', 'masculine identity', 'feminine identity', 'size identity'] },
]

const intentionalFamilylessAnchors = [
  'broad term',
  'umbrella term',
  'general label',
  'does not specify',
  'not a single role',
  'varies widely',
  'community reference',
  'self description',
]

const normalize = (value: string) => value.normalize('NFKD').toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/gu, ' ').trim()
const excerpt = (value?: string) => value?.trim().replace(/\s+/gu, ' ').slice(0, 220) ?? ''
const countBy = <T>(items: readonly T[], keyFor: (item: T) => string) => Object.fromEntries(
  [...items.reduce((counts, item) => {
    const key = keyFor(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
    return counts
  }, new Map<string, number>())].sort(([left], [right]) => left.localeCompare(right)),
)

function matchingAnchors(text: string, anchors: readonly string[]) {
  const normalized = ` ${normalize(text)} `
  return anchors.filter((anchor) => normalized.includes(` ${normalize(anchor)} `))
}

function roleFamilyCandidates(role: RoleLibraryRole) {
  const labelText = [role.label, ...role.aliases].join(' ')
  const definitionText = role.definition ?? ''
  return Object.entries(familyDescriptors).flatMap(([familyId, descriptor]) => {
    const labelAnchors = matchingAnchors(labelText, descriptor.anchors)
    const definitionAnchors = matchingAnchors(definitionText, descriptor.anchors)
    const supported = (labelAnchors.length > 0 && definitionAnchors.length > 0) || definitionAnchors.length >= 2
    if (!supported) return []
    return [{
      familyId,
      familyLabel: roleLibrary.families[familyId],
      labelAnchors,
      definitionAnchors,
      confidence: labelAnchors.length >= 1 && definitionAnchors.length >= 2 ? 'high' as const : 'medium' as const,
      rationale: `Candidate discovery found semantic support in ${labelAnchors.length ? 'the role label/aliases and ' : ''}the reviewed definition (${[...new Set([...labelAnchors, ...definitionAnchors])].join(', ')}). This is a review lead, not an automatic assignment.`,
    }]
  }).sort((left, right) => left.familyId.localeCompare(right.familyId))
}

function futureFamilyCandidate(role: RoleLibraryRole) {
  const labelText = [role.label, ...role.aliases].join(' ')
  const definitionText = role.definition ?? ''
  return futureFamilyClusters.map((cluster) => ({
    ...cluster,
    labelAnchors: matchingAnchors(labelText, cluster.anchors),
    definitionAnchors: matchingAnchors(definitionText, cluster.anchors),
  })).find((candidate) => candidate.labelAnchors.length > 0 && candidate.definitionAnchors.length > 0)
}

function relatedAssignedExamples(familyId: string, anchors: readonly string[]) {
  return roleLibrary.roles
    .filter((role) => role.familyIds.includes(familyId))
    .map((role) => ({
      role,
      sharedAnchors: matchingAnchors([role.label, ...role.aliases, role.definition ?? ''].join(' '), anchors),
    }))
    .filter((candidate) => candidate.sharedAnchors.length > 0)
    .sort((left, right) => right.sharedAnchors.length - left.sharedAnchors.length || left.role.label.localeCompare(right.role.label))
    .slice(0, 3)
    .map((candidate) => ({ roleId: candidate.role.id, label: candidate.role.label, sharedAnchors: candidate.sharedAnchors }))
}

function familylessReview() {
  return roleLibrary.roles.filter((role) => role.familyIds.length === 0).map((role) => {
    const candidates = roleFamilyCandidates(role)
    const futureCandidate = candidates.length ? undefined : futureFamilyCandidate(role)
    const intentionalAnchors = matchingAnchors(role.definition ?? '', intentionalFamilylessAnchors)
    const highConfidence = candidates.filter((candidate) => candidate.confidence === 'high')
    const classification = futureCandidate
      ? 'vocabulary-that-may-warrant-a-future-family'
      : role.assessmentMode !== 'exploration' && highConfidence.length > 0
        ? 'potential-taxonomy-inconsistency'
        : candidates.length > 1
          ? 'potential-multiple-family-membership'
          : candidates.length === 1 && candidates[0].labelAnchors.length > 0
            ? 'plausible-existing-family-membership'
            : candidates.length > 0
              ? 'unclear-or-ambiguous-membership'
              : role.assessmentMode === 'exploration' && intentionalAnchors.length > 0
                ? 'clearly-intentional-familyless-vocabulary'
                : role.assessmentMode === 'exploration'
                  ? 'unclear-or-ambiguous-membership'
                  : 'editorial-review-required'
    const proposedFamilies = candidates.map((candidate) => candidate.familyId)
    return {
      roleId: role.id,
      label: role.label,
      assessmentMode: role.assessmentMode,
      decisionPathway: role.decisionPathway,
      recommendationEligibility: role.recommendationEligibility,
      currentFamilyIds: role.familyIds,
      classification,
      definitionExcerpt: excerpt(role.definition),
      canonicalRoleId: role.canonicalRoleId ?? null,
      proposedFamilyIds: proposedFamilies,
      candidateEvidence: candidates,
      relatedAssignedExamples: candidates.map((candidate) => ({
        familyId: candidate.familyId,
        roles: relatedAssignedExamples(candidate.familyId, [...candidate.labelAnchors, ...candidate.definitionAnchors]),
      })),
      futureFamilyCandidate: futureCandidate ? { id: futureCandidate.id, label: futureCandidate.label, anchors: [...futureCandidate.labelAnchors, ...futureCandidate.definitionAnchors] } : null,
      intentionalFamilylessAnchors: intentionalAnchors,
      confidence: highConfidence.length === 1 ? 'high' : candidates.length ? 'medium' : futureCandidate ? 'low' : role.assessmentMode === 'exploration' ? 'medium' : 'low',
      metadataOnly: true,
      optimizerImpact: 'No current effect while recommendationEligibility remains exploration-only; assigning familyIds is nevertheless behavior-sensitive if this role later becomes eligible.',
      reviewReason: candidates.length
        ? 'Two-channel or multi-anchor semantic evidence produced review candidates; no membership is inferred from a single keyword.'
        : futureCandidate
          ? 'No existing family passed the conservative evidence rule; a repeated out-of-architecture concept is flagged only for editorial review.'
          : role.assessmentMode === 'exploration' && intentionalAnchors.length
            ? `The role is manual exploration vocabulary and its reviewed definition explicitly uses broad/reference framing (${intentionalAnchors.join(', ')}).`
            : role.assessmentMode === 'exploration'
              ? 'The role is manual exploration vocabulary with no structured family link or conservative semantic candidate; intent cannot be established without editorial review.'
            : 'The role has an explicit-selection pathway but no structured family link or conservative semantic candidate, so editorial review is required.',
    }
  }).sort((left, right) => left.label.localeCompare(right.label) || left.roleId.localeCompare(right.roleId))
}

const relationshipCandidates: Array<{ leftLabel: string; rightLabel: string; type: RoleLibraryRelationshipType; justification: string }> = [
  { leftLabel: 'submissive', rightLabel: 'Bottom', type: 'commonly-overlapping', justification: 'These can co-occur, but yielding authority and receiving an activity remain distinct.' },
  { leftLabel: 'Owner', rightLabel: 'Pet', type: 'directional-counterpart', justification: 'The scored owner and pet roles are the reviewed guiding and receiving directions in adult pet play.' },
  { leftLabel: 'Trainer', rightLabel: 'Pet', type: 'directional-counterpart', justification: 'Trainer is guiding/training vocabulary commonly paired with the pet position while remaining distinct from ownership.' },
  { leftLabel: 'Bondage Top', rightLabel: 'Bondage Switch', type: 'switch-counterpart', justification: 'Bondage Switch can include the restraint-giving position represented by Bondage Top.' },
  { leftLabel: 'Bondage Bottom', rightLabel: 'Bondage Switch', type: 'switch-counterpart', justification: 'Bondage Switch can include the restraint-receiving position represented by Bondage Bottom.' },
  { leftLabel: 'Handler', rightLabel: 'Pet', type: 'directional-counterpart', justification: 'Handler is guiding vocabulary commonly paired with the pet position while remaining distinct from ownership.' },
  { leftLabel: 'Rigger', rightLabel: 'Rope Switch', type: 'commonly-overlapping', justification: 'A Rope Switch may tie, while Rigger emphasizes the tying/craft direction rather than bidirectionality.' },
]

function buildRelationshipReview() {
  const byLabel = new Map(roleLibrary.roles.map((role) => [role.label, role]))
  return relationshipCandidates.map((candidate) => {
    const left = byLabel.get(candidate.leftLabel)
    const right = byLabel.get(candidate.rightLabel)
    if (!left || !right) throw new Error(`Missing relationship review role: ${candidate.leftLabel} / ${candidate.rightLabel}`)
    const exists = roleLibrary.relationships.some((relationship) => (
      relationship.fromRoleId === left.id && relationship.toRoleId === right.id
    ) || (
      relationship.fromRoleId === right.id && relationship.toRoleId === left.id
    ))
    const cooccurringRecommendationPersonas = recommendationResults.filter((result) => {
      const ids = new Set(result.persona.candidates.map((item) => item.roleId))
      return ids.has(left.id) && ids.has(right.id)
    }).map((result) => result.persona.id).sort()
    return {
      leftRoleId: left.id,
      leftLabel: left.label,
      rightRoleId: right.id,
      rightLabel: right.label,
      proposedType: candidate.type,
      semanticJustification: candidate.justification,
      alreadyHasReviewedRelationship: exists,
      cooccurringRecommendationPersonas,
      possibleOptimizerImpact: cooccurringRecommendationPersonas.length
        ? 'Behavior-sensitive: this relationship type can change redundancy penalties in existing candidate scenarios.'
        : 'Behavior-sensitive in future candidate sets because reviewed relationships participate in redundancy penalties.',
      classification: 'Unverified hypothesis' as FindingCategory,
    }
  })
}

function familyEvidence(journeys: readonly FamilyJourneyObservation[]) {
  const scoredRoleById = new Map(roles.map((role) => [role.id, role]))
  const observedQuestions = new Set(journeys.flatMap((journey) => journey.questionIds))
  return Object.entries(roleLibrary.families).sort(([left], [right]) => left.localeCompare(right)).map(([familyId, displayName]) => {
    const descriptor = familyDescriptors[familyId]
    if (!descriptor) throw new Error(`Missing J.1 family descriptor for ${familyId}`)
    const members = roleLibrary.roles.filter((role) => role.familyIds.includes(familyId)).sort((left, right) => left.label.localeCompare(right.label))
    const canonicalScoredRoles = [...new Set(members.flatMap((role) => role.canonicalRoleId && scoredRoleById.has(role.canonicalRoleId) ? [role.canonicalRoleId] : []))]
      .sort().map((roleId) => scoredRoleById.get(roleId)!)
    const nearestScoredRoleIds = [...new Set(members.flatMap((role) => role.nearestRoleIds.filter((roleId) => scoredRoleById.has(roleId))))].filter((roleId) => !canonicalScoredRoles.some((role) => role.id === roleId)).sort()
    const relevantTraits = [...new Set(canonicalScoredRoles.flatMap((role) => [
      ...Object.keys(role.traits), ...Object.keys(role.differentiatingTraits), ...Object.keys(role.contraryTraits ?? {}),
    ] as TraitId[]))].sort()
    const traitQuestionIds = discoveryQuestions.filter((question) => question.answers.some((answer) => Object.keys(answer.effects ?? {}).some((traitId) => relevantTraits.includes(traitId as TraitId)))).map((question) => question.id)
    const domainQuestionIds = discoveryQuestions.filter((question) => descriptor.discoveryDomains.includes(question.domain)).map((question) => question.id)
    const directTargets = members.flatMap((member) => {
      const target = refinementTargetByRoleId.get(member.id)
      return target ? [{ roleId: member.id, label: member.label, targetId: target.id, questionIds: refinementQuestionIdsForTarget(target.id).sort() }] : []
    })
    const staticQuestionIds = [...new Set([...traitQuestionIds, ...domainQuestionIds])].sort()
    const relevantAdaptiveQuestionIds = staticQuestionIds.filter((questionId) => discoveryQuestions.find((question) => question.id === questionId)?.phase === 'refine')
    return {
      familyId,
      displayName,
      conceptualPurpose: descriptor.purpose,
      conceptualDimension: descriptor.dimension,
      overlappingFamilyIds: descriptor.overlaps,
      reviewOutcome: descriptor.outcome,
      reviewReason: descriptor.outcomeReason,
      roleCount: members.length,
      roles: members.map((role) => ({ roleId: role.id, label: role.label, assessmentMode: role.assessmentMode, decisionPathway: role.decisionPathway, recommendationEligibility: role.recommendationEligibility, familyIds: role.familyIds, canonicalRoleId: role.canonicalRoleId ?? null })),
      byAssessmentMode: countBy(members, (role) => role.assessmentMode),
      byDecisionPathway: countBy(members, (role) => role.decisionPathway),
      byRecommendationEligibility: countBy(members, (role) => role.recommendationEligibility),
      editorialCoverage: { covered: members.length > 0, roleCount: members.length },
      scoredCoverage: {
        covered: canonicalScoredRoles.length > 0,
        canonicalRoles: canonicalScoredRoles.map((role) => ({ roleId: role.id, label: role.name, evidenceRequirements: role.evidenceRequirements ?? [] })),
        nearestReferenceRoleIds: nearestScoredRoleIds,
        traitIds: relevantTraits,
      },
      staticDiscoveryCoverage: {
        scoredTraitQuestionIds: traitQuestionIds,
        editorialDomainQuestionIds: domainQuestionIds,
        allRelevantQuestionIds: staticQuestionIds,
        note: 'Editorial domain relevance is not scoring evidence. Only canonical scored-role traits create scored coverage.',
      },
      effectiveAdaptiveCoverage: {
        relevantAdaptiveQuestionIds,
        observedQuestionIds: relevantAdaptiveQuestionIds.filter((questionId) => observedQuestions.has(questionId)),
        unobservedAdaptiveQuestionIds: relevantAdaptiveQuestionIds.filter((questionId) => !observedQuestions.has(questionId)),
        journeyCount: journeys.length,
      },
      directConfirmationCoverage: {
        covered: directTargets.some((target) => target.questionIds.length > 0),
        targets: directTargets,
      },
      recommendationEligibility: {
        roleCounts: countBy(members, (role) => role.recommendationEligibility),
        decisionPathCounts: countBy(members, (role) => role.decisionPathway),
        gates: {
          inferred: 'Positive alignment, non-low confidence, no unmet evidence requirement, and no declined exact-vocabulary confirmation.',
          'direct-interest': 'Current candidate construction does not automatically qualify this pathway; direct-interest metadata therefore requires separate semantic review.',
          hybrid: 'Qualifying Discovery evidence plus supported, semantically eligible Refine evidence.',
          'explicit-confirmation': 'Supported exact-label Refine evidence plus target-specific semantic eligibility.',
          'manual-only': 'Never automatically eligible; available for user selection only.',
        },
        note: 'Family membership is not an eligibility gate and creates no evidence.',
      },
      explorationOnlyCoverage: {
        roleCount: members.filter((role) => role.recommendationEligibility === 'exploration-only').length,
        roleIds: members.filter((role) => role.recommendationEligibility === 'exploration-only').map((role) => role.id),
      },
      noScoredDiscoveryCoverageReview: canonicalScoredRoles.length ? null : {
        classification: descriptor.gapClassification ?? 'Requires editorial decision',
        explanation: descriptor.outcomeReason,
        manualExplorationRemainsAvailable: true,
        directConfirmationRoleCount: directTargets.filter((target) => target.questionIds.length > 0).length,
      },
    }
  })
}

export function buildPhaseJFamilyAudit(journeys: readonly FamilyJourneyObservation[] = []) {
  const families = familyEvidence(journeys)
  const familylessRoles = familylessReview()
  const proposedRelationships = buildRelationshipReview()
  const familyIds = new Set(Object.keys(roleLibrary.families))
  const roleIds = new Set(roleLibrary.roles.map((role) => role.id))
  const traitIds = new Set(traits.map((trait) => trait.id))
  const questionIds = new Set(discoveryQuestions.map((question) => question.id))
  const refinementQuestionIds = new Set(refinementQuestions.map((question) => question.id))
  return {
    schemaVersion: 1,
    safeguards: {
      observationalOnly: true,
      familyMembershipCreatesScoringEvidence: false,
      familyMembershipCreatesRecommendationEligibility: false,
      productionMetadataChanged: false,
    },
    counts: {
      roles: roleLibrary.roles.length,
      scoredRoles: roles.length,
      families: familyIds.size,
      familylessRoles: familylessRoles.length,
      multiFamilyRoles: roleLibrary.roles.filter((role) => role.familyIds.length > 1).length,
      reviewedRelationships: roleLibrary.relationships.length,
      relationshipParticipants: new Set(roleLibrary.relationships.flatMap((relationship) => [relationship.fromRoleId, relationship.toRoleId])).size,
      journeys: journeys.length,
    },
    families,
    familiesWithoutScoredDiscoveryCoverage: families.filter((family) => !family.scoredCoverage.covered).map((family) => ({
      familyId: family.familyId,
      displayName: family.displayName,
      classification: family.noScoredDiscoveryCoverageReview!.classification,
      directConfirmationRoleCount: family.noScoredDiscoveryCoverageReview!.directConfirmationRoleCount,
      editorialDomainQuestionIds: family.staticDiscoveryCoverage.editorialDomainQuestionIds,
    })),
    familylessRoleReview: {
      roles: familylessRoles,
      classificationCounts: countBy(familylessRoles, (role) => role.classification),
      candidateCount: familylessRoles.filter((role) => role.proposedFamilyIds.length > 0).length,
      highConfidenceCandidateCount: familylessRoles.filter((role) => role.confidence === 'high' && role.proposedFamilyIds.length > 0).length,
      caveat: 'Candidates require human review. Keyword anchors are used only when corroborated across label/alias and definition channels or by multiple definition anchors.',
    },
    relationships: {
      existingCount: roleLibrary.relationships.length,
      byType: countBy(roleLibrary.relationships, (relationship) => relationship.type),
      proposed: proposedRelationships,
      caveat: 'No relationship is applied. Relationship metadata can change optimizer redundancy and primary centrality.',
    },
    integrity: {
      unknownFamilyIds: families.flatMap((family) => family.roles.flatMap((role) => role.familyIds.filter((familyId) => !familyIds.has(familyId)))).filter((id, index, all) => all.indexOf(id) === index),
      unknownProposedFamilyIds: familylessRoles.flatMap((role) => role.proposedFamilyIds).filter((familyId) => !familyIds.has(familyId)).filter((id, index, all) => all.indexOf(id) === index),
      unknownRoleIds: families.flatMap((family) => family.roles.map((role) => role.roleId)).filter((roleId) => !roleIds.has(roleId)),
      unknownFamilylessRoleIds: familylessRoles.map((role) => role.roleId).filter((roleId) => !roleIds.has(roleId)),
      unknownRelatedExampleRoleIds: familylessRoles.flatMap((role) => role.relatedAssignedExamples.flatMap((family) => family.roles.map((example) => example.roleId))).filter((roleId) => !roleIds.has(roleId)).filter((id, index, all) => all.indexOf(id) === index),
      unknownTraitIds: families.flatMap((family) => family.scoredCoverage.traitIds).filter((traitId) => !traitIds.has(traitId as TraitId)).filter((id, index, all) => all.indexOf(id) === index),
      unknownQuestionIds: families.flatMap((family) => family.staticDiscoveryCoverage.allRelevantQuestionIds).filter((questionId) => !questionIds.has(questionId)).filter((id, index, all) => all.indexOf(id) === index),
      unknownRefinementQuestionIds: families.flatMap((family) => family.directConfirmationCoverage.targets.flatMap((target) => target.questionIds)).filter((questionId) => !refinementQuestionIds.has(questionId)).filter((id, index, all) => all.indexOf(id) === index),
      invalidExistingRelationships: roleLibrary.relationships.filter((relationship) => !roleIds.has(relationship.fromRoleId) || !roleIds.has(relationship.toRoleId)),
      invalidProposedRelationships: proposedRelationships.filter((relationship) => !roleIds.has(relationship.leftRoleId) || !roleIds.has(relationship.rightRoleId)),
    },
    explicitExceptions: [
      { id: 'dominant-authority-holder-overlap', classification: 'Role discrimination issue' as FindingCategory, status: 'Retained reviewed diagnostic', note: 'The scored-role overlap is explicit; no semantic equivalence or merge is inferred.' },
      { id: 'family-membership-not-evidence', classification: 'Intentional design' as FindingCategory, status: 'Protected invariant', note: 'Family membership remains organizational and optimizer-facing only.' },
      { id: 'exploration-only-not-gap', classification: 'Intentional design' as FindingCategory, status: 'Protected invariant', note: 'Exploration-only vocabulary is not counted as a failed recommendation.' },
    ],
  }
}

export type PhaseJFamilyAudit = ReturnType<typeof buildPhaseJFamilyAudit>
