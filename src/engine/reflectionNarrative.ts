import type { BlindSpotSeverity, ReadinessBand } from '../types'
import { traits } from '../data/traits'

export type ReflectionClaimCategory = 'direct-observation' | 'supported-interpretation' | 'qualified-possibility' | 'explicit-choice' | 'unknown'
export type ReflectionProvenanceSource = 'role-result' | 'role-set-choice' | 'readiness' | 'blind-spot' | 'boundary' | 'negotiation' | 'missing-evidence' | 'disclosure'

export interface ReflectionClaimProvenance {
  source: ReflectionProvenanceSource
  ids: string[]
}

export interface ReflectionClaim {
  id: string
  category: ReflectionClaimCategory
  text: string
  provenance: ReflectionClaimProvenance[]
}

export interface ReflectionSectionPlan {
  id: 'opening' | 'interests' | 'roles' | 'nuance' | 'readiness' | 'blind-spots' | 'boundaries' | 'negotiation' | 'closing'
  heading: string
  claims: ReflectionClaim[]
}

export interface ReflectionRoleFact {
  roleId: string
  label: string
  definition: string
  source: 'recommended' | 'user-selected'
  alignment?: string
  confidence?: string
  evidenceBreadth?: number
  supportingSignals: string[]
}

export interface ReflectionReadinessFact {
  competencyId: string
  label: string
  band: ReadinessBand
}

export interface ReflectionBlindSpotFact {
  id: string
  title: string
  description: string
  severity: BlindSpotSeverity
}

export interface ReflectionBoundaryFact {
  id: string
  label: string
  responseLabel: string
}

export interface ReflectionNegotiationFact {
  questionId: string
  domain: string
  answerId: string
  answerLabel: string
}

export interface ReflectionNarrativeInput {
  roles?: ReflectionRoleFact[]
  readiness?: ReflectionReadinessFact[]
  blindSpots?: ReflectionBlindSpotFact[]
  boundaries?: ReflectionBoundaryFact[]
  negotiation?: ReflectionNegotiationFact[]
  includeAlignment: boolean
  includeConfidence: boolean
}

export interface ReflectionNarrative {
  sections: ReflectionSectionPlan[]
  text: string
}

const severityOrder: Record<BlindSpotSeverity, number> = { critical: 0, concern: 1, notice: 2 }
const severityLabels: Record<BlindSpotSeverity, string> = { critical: 'Important concept', concern: 'Worth reviewing', notice: 'Reflection cue' }
const signalPhraseByLabel = new Map(traits.map((trait) => [trait.label.toLocaleLowerCase('en-CA'), trait.description]))

const ensureSentence = (value: string) => /[.!?]$/u.test(value.trim()) ? value.trim() : `${value.trim()}.`

function naturalList(values: readonly string[]): string {
  const unique = values.filter((value, index) => values.indexOf(value) === index)
  if (unique.length === 0) return ''
  if (unique.length === 1) return unique[0]
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`
  return `${unique.slice(0, -1).join(', ')}, and ${unique.at(-1)}`
}

function lowerCaseOpening(value: string): string {
  return value ? `${value[0].toLocaleLowerCase('en-CA')}${value.slice(1)}` : value
}

function signalPhrase(label: string): string {
  const description = signalPhraseByLabel.get(label.toLocaleLowerCase('en-CA'))
  if (!description) return lowerCaseOpening(label)
  return lowerCaseOpening(description.replace(/^(?:interest in|enjoyment of|appeal of|comfort|meaning found in|focus on|preference for|curiosity about|importance of|value placed on)\s+/iu, ''))
}

function claim(id: string, category: ReflectionClaimCategory, text: string, source: ReflectionProvenanceSource, ids: string[]): ReflectionClaim {
  return { id, category, text, provenance: [{ source, ids }] }
}

function deduplicateClaims(claims: ReflectionClaim[]): ReflectionClaim[] {
  const seen = new Set<string>()
  return claims.filter((item) => {
    const key = item.text.trim().toLocaleLowerCase('en-CA')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function openingClaims(input: ReflectionNarrativeInput): ReflectionClaim[] {
  if (input.roles) {
    if (input.roles.length === 0) {
      return [claim(
        'opening-empty-role-set',
        'unknown',
        'There are no roles in your current set. The available information cannot show whether that comes from limited evidence, changes you made, or both.',
        'missing-evidence',
        ['current-role-set'],
      )]
    }

    const recommended = input.roles.filter((role) => role.source === 'recommended')
    const manual = input.roles.filter((role) => role.source === 'user-selected')
    const claims: ReflectionClaim[] = []
    if (recommended.length) {
      const labels = naturalList(recommended.map((role) => role.label))
      claims.push(claim(
        'opening-assessment-supported-roles',
        'direct-observation',
        recommended.length === 1
          ? `The assessment points to ${recommended[0].label} as vocabulary worth exploring.`
          : recommended.length === 2
            ? `${labels} are the role labels this assessment brought forward for exploration.`
            : recommended.length === 3
              ? `The assessment points toward ${labels} as possible vocabulary for these answers.`
              : `These answers brought several role labels into view: ${labels}.`,
        'role-result',
        recommended.map((role) => role.roleId),
      ))
    }
    if (manual.length) {
      claims.push(claim(
        'opening-manual-roles',
        'explicit-choice',
        manual.length === 1
          ? `You also added ${manual[0].label} to the set yourself, so it is shown without an assessment score or confidence.`
          : `You also added ${naturalList(manual.map((role) => role.label))} to the set yourself, so they are shown without assessment scores or confidence.`,
        'role-set-choice',
        manual.map((role) => role.roleId),
      ))
    }
    return claims
  }

  const included = [
    input.readiness !== undefined ? 'reflection' : '',
    input.blindSpots !== undefined ? 'potential blind spots' : '',
    input.boundaries !== undefined ? 'wants and boundaries' : '',
    input.negotiation !== undefined ? 'negotiation preferences' : '',
  ].filter(Boolean)
  if (included.length) {
    return [claim('opening-selected-sections', 'explicit-choice', `This copy includes ${naturalList(included)} because those are the sections selected for sharing.`, 'disclosure', included)]
  }
  return [claim('opening-no-sections', 'unknown', 'No result sections are selected for this reflection yet.', 'disclosure', ['none'])]
}

function interestClaims(roles: ReflectionRoleFact[]): ReflectionClaim[] {
  const supported = roles.filter((role) => role.source === 'recommended' && role.supportingSignals.length)
  if (!supported.length) return []

  const signalCounts = new Map<string, { label: string; count: number; first: number; roleIds: string[] }>()
  let first = 0
  supported.forEach((role) => role.supportingSignals.forEach((label) => {
    const key = label.toLocaleLowerCase('en-CA')
    const current = signalCounts.get(key)
    if (current) {
      current.count += 1
      current.roleIds.push(role.roleId)
    } else {
      signalCounts.set(key, { label, count: 1, first: first++, roleIds: [role.roleId] })
    }
  }))
  const themes = [...signalCounts.values()].sort((left, right) => right.count - left.count || left.first - right.first).slice(0, 3)
  if (!themes.length) return []

  const recurring = themes.filter((theme) => theme.count > 1)
  const presentedThemes = recurring.length ? recurring : themes
  const phrases = presentedThemes.map((theme) => signalPhrase(theme.label))
  const hasCompoundPhrase = phrases.length > 1 && phrases.some((phrase) => /\b(?:and|or)\b/iu.test(phrase))
  const naturalThemes = hasCompoundPhrase ? phrases.join('; ') : naturalList(phrases)
  const singleRoleSubject = /^[a-z]/u.test(supported[0].label) ? `The label ${supported[0].label}` : supported[0].label
  const text = supported.length === 1
    ? hasCompoundPhrase
      ? `${singleRoleSubject} came forward through several themes in your answers: ${naturalThemes}.`
      : `${singleRoleSubject} came forward through answers about ${naturalThemes}.`
    : recurring.length
      ? hasCompoundPhrase
        ? `These suggestions share several themes: ${naturalThemes}.`
        : `Answers about ${naturalThemes} connect these suggestions most clearly.`
      : `The answers behind these suggestions touch on ${naturalThemes}.`
  return [claim('interests-recurring-themes', recurring.length ? 'supported-interpretation' : 'direct-observation', text, 'role-result', [...new Set(themes.flatMap((theme) => theme.roleIds))])]
}

function roleMetricText(role: ReflectionRoleFact, input: ReflectionNarrativeInput): string {
  if (role.source === 'user-selected') return ''
  const metrics: string[] = []
  if (input.includeAlignment && role.alignment) metrics.push(role.alignment.toLocaleLowerCase('en-CA'))
  if (input.includeConfidence && role.confidence) metrics.push(role.confidence.toLocaleLowerCase('en-CA'))
  if (role.evidenceBreadth !== undefined) metrics.push(`${role.evidenceBreadth}% evidence breadth`)
  return metrics.length ? `(${metrics.join('; ')})` : ''
}

function roleClaims(input: ReflectionNarrativeInput, roles: ReflectionRoleFact[]): ReflectionClaim[] {
  if (!roles.length) return []
  const order = claim(
    'roles-current-order',
    'explicit-choice',
    roles.length === 1
      ? 'Here is the role currently in your set.'
      : 'Here they are in the order you currently have them.',
    'role-set-choice',
    roles.map((role) => role.roleId),
  )
  const details = roles.map((role) => {
    const definition = ensureSentence(role.definition)
    const metrics = roleMetricText(role, input)
    const sourceText = role.source !== 'user-selected' && !role.alignment && !role.confidence
        ? 'This suggestion has no scored alignment or confidence label in the available data.'
        : ''
    return claim(
      `role-${role.roleId}`,
      role.source === 'user-selected' ? 'explicit-choice' : 'direct-observation',
      `• ${role.label}${metrics ? ` ${metrics}` : ''} — ${[definition, sourceText].filter(Boolean).join(' ')}`,
      role.source === 'user-selected' ? 'role-set-choice' : 'role-result',
      [role.roleId],
    )
  })
  return [order, ...details]
}

function nuanceClaims(input: ReflectionNarrativeInput, roles: ReflectionRoleFact[]): ReflectionClaim[] {
  if (!roles.length) return []
  const recommended = roles.filter((role) => role.source === 'recommended')
  const lowerConfidence = recommended.filter((role) => role.confidence && !/^high\b/iu.test(role.confidence))
  const unscored = recommended.filter((role) => !role.confidence)
  const claims: ReflectionClaim[] = []
  if (lowerConfidence.length) {
    claims.push(claim(
      'nuance-limited-confidence',
      'qualified-possibility',
      `There was less relevant information behind ${naturalList(lowerConfidence.map((role) => role.label))}. Confidence reflects how much evidence was available, not certainty about identity.`,
      'role-result',
      lowerConfidence.map((role) => role.roleId),
    ))
  }
  if (unscored.length) {
    claims.push(claim(
      'nuance-unscored-suggestions',
      'unknown',
      `${naturalList(unscored.map((role) => role.label))} ${unscored.length === 1 ? 'has' : 'have'} no scored confidence label in this report. That gap is left open rather than filled by inference.`,
      'missing-evidence',
      unscored.map((role) => role.roleId),
    ))
  }
  if (recommended.some((role) => role.evidenceBreadth !== undefined)) {
    claims.push(claim('nuance-evidence-breadth', 'direct-observation', 'Evidence breadth shows how much of each role’s reviewed theme set had usable answers. It does not describe the strength of the match.', 'role-result', recommended.map((role) => role.roleId)))
  }
  return claims
}

function summarizeEstablished(labels: string[]): string {
  if (labels.length <= 4) return naturalList(labels)
  return `${labels.slice(0, 3).join(', ')}, and ${labels.length - 3} other reviewed areas`
}

function summarizedBandSentence(items: ReflectionReadinessFact[], shortText: string, longText: string): string {
  if (items.length <= 4) return `${naturalList(items.map((item) => item.label))} ${shortText}`
  return `${items.length} reviewed areas ${longText}, including ${naturalList(items.slice(0, 3).map((item) => item.label))}.`
}

function readinessClaims(readiness: ReflectionReadinessFact[]): ReflectionClaim[] {
  if (!readiness.length) return [claim('readiness-missing', 'unknown', 'The selected answers do not provide enough readiness evidence to summarize. Missing information is left unknown.', 'missing-evidence', ['readiness'])]
  const byBand = new Map<ReadinessBand, ReflectionReadinessFact[]>()
  readiness.forEach((item) => byBand.set(item.band, [...(byBand.get(item.band) ?? []), item]))
  const claims: ReflectionClaim[] = []
  const established = byBand.get('strong') ?? []
  if (established.length) {
    claims.push(claim(
      'readiness-established',
      'direct-observation',
      `The scenario answers showed established foundations in ${summarizeEstablished(established.map((item) => item.label))}.`,
      'readiness',
      established.map((item) => item.competencyId),
    ))
  }
  const developing = byBand.get('developing') ?? []
  if (developing.length) claims.push(claim('readiness-developing', 'qualified-possibility', summarizedBandSentence(developing, `${developing.length === 1 ? 'has' : 'have'} some foundation with room for further reflection.`, 'showed some foundation with room for further reflection'), 'readiness', developing.map((item) => item.competencyId)))
  const explore = byBand.get('explore') ?? []
  if (explore.length) claims.push(claim('readiness-explore', 'qualified-possibility', summarizedBandSentence(explore, `${explore.length === 1 ? 'is' : 'are'} less settled in the available scenario answers.`, 'were less settled in the available scenario answers'), 'readiness', explore.map((item) => item.competencyId)))
  const important = byBand.get('important') ?? []
  if (important.length) claims.push(claim('readiness-important', 'direct-observation', summarizedBandSentence(important, `${important.length === 1 ? 'was' : 'were'} marked for closer reflection.`, 'were marked for closer reflection'), 'readiness', important.map((item) => item.competencyId)))
  claims.push(claim('readiness-safety-boundary', 'direct-observation', 'These observations come from selected scenarios. They are not a safety score or proof of real-world readiness.', 'disclosure', ['readiness']))
  return claims
}

function blindSpotClaims(blindSpots: ReflectionBlindSpotFact[]): ReflectionClaim[] {
  if (!blindSpots.length) return [claim('blind-spots-none', 'unknown', 'No consistent blind-spot signal appeared in the selected answers. That is limited information, not a safety certification.', 'missing-evidence', ['blind-spots'])]
  const ordered = blindSpots.map((spot, index) => ({ spot, index })).sort((left, right) => severityOrder[left.spot.severity] - severityOrder[right.spot.severity] || left.index - right.index)
  const detailed = ordered.slice(0, 5).map(({ spot }) => claim(
    `blind-spot-${spot.id}`,
    'direct-observation',
    `• ${severityLabels[spot.severity]} — ${spot.title}: ${ensureSentence(spot.description)}`,
    'blind-spot',
    [spot.id],
  ))
  const remaining = ordered.slice(5).map(({ spot }) => spot)
  if (remaining.length) detailed.push(claim('blind-spots-additional', 'direct-observation', `${remaining.length} additional cues were recorded, including ${naturalList(remaining.slice(0, 4).map((spot) => spot.title))}.`, 'blind-spot', remaining.map((spot) => spot.id)))
  return detailed
}

function boundaryClaims(boundaries: ReflectionBoundaryFact[]): ReflectionClaim[] {
  if (!boundaries.length) {
    return [claim('boundaries-none', 'unknown', 'No specific want or limit is included here. Neutral, skipped, and prefer-not answers are not interpreted as rejection.', 'missing-evidence', ['boundaries'])]
  }
  const groups = new Map<string, ReflectionBoundaryFact[]>()
  boundaries.forEach((item) => groups.set(item.responseLabel, [...(groups.get(item.responseLabel) ?? []), item]))
  const claims = [...groups.entries()].map(([response, items]) => claim(
    `boundaries-${response.toLocaleLowerCase('en-CA').replace(/[^a-z0-9]+/gu, '-')}`,
    'explicit-choice',
    `• ${response}: ${naturalList(items.map((item) => item.label))}.`,
    'boundary',
    items.map((item) => item.id),
  ))
  claims.push(claim('boundaries-independent', 'direct-observation', 'Boundaries shown here reflect the selections made when this result was generated. They remain independent of role alignment and never replace direct consent or communication.', 'disclosure', ['boundaries']))
  return claims
}

function negotiationClaims(preferences: ReflectionNegotiationFact[]): ReflectionClaim[] {
  if (!preferences.length) return [claim('negotiation-none', 'unknown', 'No negotiation preferences are included here.', 'missing-evidence', ['negotiation'])]
  const withheld = preferences.filter((item) => item.answerId === 'prefer-not')
  const open = preferences.filter((item) => item.answerId !== 'prefer-not' && /don['’]t know|it varies|case by case/iu.test(item.answerLabel))
  const specific = preferences.filter((item) => item.answerId !== 'prefer-not' && !open.includes(item))
  const claims = specific.map((item) => claim(`negotiation-${item.questionId}`, 'explicit-choice', `• ${item.domain}: ${ensureSentence(item.answerLabel)}`, 'negotiation', [item.questionId]))
  if (open.length) {
    const domains = open.length > 6 ? `${open.length} communication areas, including ${naturalList(open.slice(0, 4).map((item) => item.domain))}` : naturalList(open.map((item) => item.domain))
    claims.push(claim('negotiation-open', 'explicit-choice', `You left ${domains} open or context-dependent in these answers.`, 'negotiation', open.map((item) => item.questionId)))
  }
  if (withheld.length) {
    const domains = withheld.length > 6 ? `${withheld.length} communication areas, including ${naturalList(withheld.slice(0, 4).map((item) => item.domain))}` : naturalList(withheld.map((item) => item.domain))
    claims.push(claim('negotiation-withheld', 'explicit-choice', `You chose not to include an answer for ${domains}.`, 'negotiation', withheld.map((item) => item.questionId)))
  }
  return claims
}

function closingClaims(input: ReflectionNarrativeInput): ReflectionClaim[] {
  const hasRoles = Boolean(input.roles?.length)
  return [
    claim(
      'closing-takeaway',
      'qualified-possibility',
      hasRoles
        ? 'Treat these labels and patterns as starting points for reflection or conversation, not a verdict about who you are. Keep what fits and leave the rest open.'
        : 'This reflection includes only what the selected sections support. Anything unselected or unanswered remains open.',
      'disclosure',
      ['reflection-scope'],
    ),
    claim('closing-consent', 'direct-observation', 'It does not certify safety or readiness, and sharing it does not communicate consent, availability, boundaries, or agreement to any activity.', 'disclosure', ['safety', 'consent', 'sharing']),
    claim('closing-private-generation', 'direct-observation', 'Generated privately with KinkAtlas.', 'disclosure', ['local-generation']),
  ]
}

function section(id: ReflectionSectionPlan['id'], heading: string, claims: ReflectionClaim[]): ReflectionSectionPlan | undefined {
  const unique = deduplicateClaims(claims)
  return unique.length ? { id, heading, claims: unique } : undefined
}

export function planFullReflection(input: ReflectionNarrativeInput): ReflectionSectionPlan[] {
  const roles = input.roles ?? []
  return [
    section('opening', 'What stood out', openingClaims(input)),
    input.roles ? section('interests', 'Interests and dynamics', interestClaims(roles)) : undefined,
    input.roles ? section('roles', 'Roles and vocabulary', roleClaims(input, roles)) : undefined,
    input.roles ? section('nuance', 'Nuance and uncertainty', nuanceClaims(input, roles)) : undefined,
    input.readiness ? section('readiness', 'Reflection and readiness', readinessClaims(input.readiness)) : undefined,
    input.blindSpots ? section('blind-spots', 'Potential blind spots', blindSpotClaims(input.blindSpots)) : undefined,
    input.boundaries ? section('boundaries', 'Wants & boundaries', boundaryClaims(input.boundaries)) : undefined,
    input.negotiation ? section('negotiation', 'Conversation preferences', negotiationClaims(input.negotiation)) : undefined,
    section('closing', 'What to take from this', closingClaims(input)),
  ].filter((item): item is ReflectionSectionPlan => Boolean(item))
}

export function renderFullReflection(sections: readonly ReflectionSectionPlan[]): string {
  const lines = ['KinkAtlas — My Full Reflection', '']
  sections.forEach((item) => lines.push(item.heading, ...item.claims.map((entry) => entry.text), ''))
  return lines.join('\n').trim()
}

export function composeFullReflection(input: ReflectionNarrativeInput): ReflectionNarrative {
  const sections = planFullReflection(input)
  return { sections, text: renderFullReflection(sections) }
}
