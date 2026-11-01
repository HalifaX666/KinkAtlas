import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phaseJ3JourneySeeds, runPhaseJ3Journey } from '../src/calibration/phaseJ3Journeys'
import { boundaryItems, boundaryOptions } from '../src/data/boundaries'
import { negotiationQuestions } from '../src/data/negotiation'
import { competencyDefinitions } from '../src/data/readiness'
import { roleLibrary } from '../src/taxonomy/roleLibrary'
import { buildEditableRoleProfileEntries, buildRoleProfileCandidates, optimizeRoleProfile, type EditableRoleProfileEntry } from '../src/engine/roleProfileOptimizer'
import { buildFullReflectionNarrative, defaultShareOptions, getShareableRoleSet, type ShareOptions, type ShareResultsData, type ShareableRoleResult } from '../src/engine/shareResults'
import { assessmentPersonas } from '../src/tests/fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from '../src/tests/helpers/assessmentPersonaRunner'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repositoryRoot, 'docs/phase-j/reflection-editorial-review.md')
const baselineCommit = '55b0ccdeafa4c1ddd07fb0214c4ad29703eab1c3'
const allOptions: ShareOptions = { roles: true, alignment: true, confidence: true, readiness: true, blindSpots: true, boundaries: true, negotiation: true }
const blindSpotLabels = { notice: 'Reflection cue', concern: 'Worth reviewing', critical: 'Important concept' } as const

const baselineRoleMetricsExplanation = (includeAlignment = true, includeConfidence = true) => [
  ...(includeAlignment ? ['Alignment describes how closely your answers resemble a role’s themes.'] : []),
  ...(includeConfidence ? ['Confidence describes how much relevant information was available; it does not determine ranking.'] : []),
  'Evidence breadth is the share of a role’s themes with usable answer evidence, not match strength.',
]

function baselineRoleSummaryLine(role: ShareableRoleResult, includeAlignment = true, includeConfidence = true): string {
  if (role.source === 'user-selected') return `• ${role.name} — Added by you; no assessment score or confidence.`
  if (role.alignment === undefined && role.confidence === undefined && role.evidenceBreadth === undefined) return `• ${role.name} — Assessment suggestion; no alignment score or confidence.`
  const details = [
    includeAlignment ? role.alignment : '',
    includeConfidence ? role.confidence : '',
    role.evidenceBreadth === undefined ? '' : `${role.evidenceBreadth}% evidence breadth`,
  ].filter(Boolean).join(' · ')
  return `• ${role.name}${details ? ` — ${details}` : ''}`
}

function buildBaselineFullReflection(data: ShareResultsData, options: ShareOptions): string {
  const lines = ['Kink Atlas — My Full Reflection', 'KinkAtlas is a private self-reflection tool that suggests role vocabulary from your answers, not an identity assignment.', '']
  if (options.roles) {
    lines.push(...baselineRoleMetricsExplanation(options.alignment, options.confidence), '')
    const roles = getShareableRoleSet(data.roleSet, data.roleResults)
    if (!roles.length) lines.push('Your role set is empty. An empty set is valid.', '')
    else lines.push('Your Role Set', ...roles.map((role) => baselineRoleSummaryLine(role, options.alignment, options.confidence)), '')
  }
  if (options.readiness && data.readiness.competencies.length) {
    const established = data.readiness.competencies.filter((item) => item.band === 'strong')
    const toExplore = data.readiness.competencies.filter((item) => item.band !== 'strong')
    const labels = { strong: 'Established', developing: 'Building', explore: 'Further reflection', important: 'Needs more reflection' } as const
    lines.push('Reflection')
    if (established.length) {
      lines.push('Established foundations')
      established.forEach((item) => lines.push(`• ${competencyDefinitions[item.competency].label} — ${labels[item.band]}`))
    }
    if (toExplore.length) {
      lines.push('Areas to explore')
      toExplore.forEach((item) => lines.push(`• ${competencyDefinitions[item.competency].label} — ${labels[item.band]}`))
    }
    lines.push('This is not a safety score. It reflects knowledge and attitudes expressed through your answers. It cannot evaluate real-world behavior or certify anyone as a safe partner.', '')
  }
  if (options.blindSpots && data.readiness.blindSpots.length) {
    lines.push('Potential blind spots', 'Reflection cue: a theme to consider. Worth reviewing: a stronger concern. Important concept: a critical concept to revisit. These labels describe answer signals, not a judgment of you or your real-world behavior.')
    data.readiness.blindSpots.forEach((spot) => lines.push(`• ${spot.title} — ${blindSpotLabels[spot.severity]}. Why it appeared: ${spot.description}`))
    lines.push('')
  }
  if (options.boundaries) {
    const selected = boundaryItems.flatMap((item) => {
      const value = data.boundaries[item.id]
      if (!value || value === 'neutral' || value === 'prefer-not') return []
      return [`• ${item.label} — ${boundaryOptions.find((option) => option.value === value)?.label ?? value}`]
    })
    if (selected.length) lines.push('Wants & boundaries', ...selected, '', 'Boundaries shown here reflect the selections made when this result was generated and should never replace direct communication.', '')
  }
  if (options.negotiation) {
    const selected = negotiationQuestions.flatMap((question) => {
      const answerId = data.negotiation[question.id]
      const answer = question.answers.find((candidate) => candidate.id === answerId)
      return answer ? [`• ${question.domain}: ${answer.label}`] : []
    })
    if (selected.length) lines.push('Negotiation preferences', ...selected, '')
  }
  lines.push(
    'Generated privately with KinkAtlas.',
    'Role results describe vocabulary worth exploring, not identity or consent.',
    'Reflection considers knowledge and attitudes, not real-world readiness. Boundaries remain independent of role alignment.',
    'Results do not certify safety or replace education, communication, or consent negotiation.',
    'Sharing a result does not communicate consent, availability, boundaries, or agreement to any activity.',
  )
  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

function evaluation(id: string) {
  const persona = assessmentPersonas.find((candidate) => candidate.id === id)
  if (!persona) throw new Error(`Missing assessment persona ${id}.`)
  return evaluateAssessmentPersona(persona)
}

function journeyData(id: string): ShareResultsData {
  const seed = phaseJ3JourneySeeds.find((candidate) => candidate.id === id)
  if (!seed) throw new Error(`Missing Phase J.3 journey ${id}.`)
  const journey = runPhaseJ3Journey(seed)
  const discovery = { ...journey.broadAnswers, ...journey.adaptiveAnswers }
  const roleSet = buildEditableRoleProfileEntries(optimizeRoleProfile(buildRoleProfileCandidates(journey.roleResults, {}, discovery)))
  return { roleResults: journey.roleResults, roleSet, readiness: { competencies: [], blindSpots: [], criticalFlags: [] }, boundaries: {}, negotiation: {} }
}

function manualData(): ShareResultsData {
  const balanced = evaluation('balanced-authority-pattern')
  const role = roleLibrary.roles.find((candidate) => candidate.label === 'Kinkster')
  if (!role) throw new Error('Missing Kinkster role.')
  const manual: EditableRoleProfileEntry = { roleId: role.id, label: role.label, definition: role.definition, source: 'user-selected' }
  return { ...balanced.shareData, roleSet: [...balanced.shareData.roleSet.slice(0, -1), manual] }
}

function sectionObservation(output: string): string {
  const lines = output.split('\n')
  const index = lines.indexOf('Interests and dynamics')
  return index >= 0 ? lines[index + 1] ?? 'No observation.' : 'No interests section was produced.'
}

interface Fixture {
  id: string
  description: string
  data: ShareResultsData
  options: ShareOptions
}

const fixtures: Fixture[] = [
  { id: 'balanced-related', description: 'Multiple assessment-supported roles with overlapping evidence themes.', data: evaluation('balanced-authority-pattern').shareData, options: defaultShareOptions },
  { id: 'single-role', description: 'One suggested role.', data: evaluation('observing-exhibition-emphasis').shareData, options: defaultShareOptions },
  { id: 'sparse-empty', description: 'High uncertainty and an empty role set.', data: evaluation('high-uncertainty-pattern').shareData, options: defaultShareOptions },
  { id: 'manual-edit', description: 'Current Role Set includes a manually added role.', data: manualData(), options: defaultShareOptions },
  { id: 'full-explicit', description: 'All optional disclosure sections selected.', data: evaluation('balanced-authority-pattern').shareData, options: allOptions },
  { id: 'hard-limits', description: 'Explicit boundaries and strong reflection cues.', data: evaluation('multiple-hard-limits-pattern').shareData, options: allOptions },
  ...[
    ['top-without-dominance', 'Activity leadership without broader authority.', 'j3-top-without-dominance'],
    ['dominance-without-top', 'Authority without activity-leading interest.', 'j3-dominance-without-top'],
    ['submission-without-bottom', 'Yielding without receiving-position interest.', 'j3-submission-without-bottom'],
    ['bottom-without-submission', 'Receiving-position interest without broader yielding.', 'j3-bottom-without-submission'],
    ['switch-directions', 'Supported interests in both directions.', 'j3-switch-both-directions'],
    ['rope-giver', 'Rope-giving without rope-receiving.', 'j3-rope-giver-only'],
    ['rope-receiver', 'Rope-receiving without rope-giving.', 'j3-rope-receiver-only'],
    ['pet', 'Pet expression without ownership interest.', 'j3-pet-not-owner'],
    ['owner', 'Owner guidance without taking the pet position.', 'j3-owner-not-pet'],
    ['sadism-sensation', 'Sadism and sensation vocabulary under current production selection.', 'j3-sadism-versus-sensation'],
    ['no-suggested-roles', 'Production-selector journey with low evidence and prefer-not answers.', 'j3-low-evidence-prefer-not'],
  ].map(([id, description, journeyId]) => ({ id, description, data: journeyData(journeyId), options: defaultShareOptions })),
]

const observations = fixtures.map((fixture) => {
  const narrative = buildFullReflectionNarrative(fixture.data, fixture.options)
  return {
    ...fixture,
    output: narrative.text,
    sectionCount: narrative.sections.length,
    claimCount: narrative.sections.reduce((total, section) => total + section.claims.length, 0),
    unsupportedClaimCount: narrative.sections.flatMap((section) => section.claims).filter((item) => item.provenance.length === 0 || item.provenance.some((source) => source.ids.length === 0)).length,
  }
})

if (process.argv.includes('--print-complete')) {
  observations.forEach((item) => console.log(`\n===== ${item.id} =====\n${item.output}\n`))
}

const observationById = new Map(observations.map((item) => [item.id, item]))
function requireObservation(id: string) {
  const item = observationById.get(id)
  if (!item) throw new Error(`Missing J.5 reflection fixture ${id}.`)
  return item
}

const comparisonRows = ['dominance-without-top', 'top-without-dominance', 'pet', 'owner', 'rope-giver', 'rope-receiver']
  .map((id) => {
    const item = requireObservation(id)
    return `| ${id} | ${item.data.roleSet.map((role) => role.label).join(', ') || 'None'} | ${sectionObservation(item.output)} |`
  }).join('\n')

const fixtureRows = observations.map((item) => `| ${item.id} | ${item.data.roleSet.length} | ${item.sectionCount} | ${item.claimCount} | ${item.unsupportedClaimCount} |`).join('\n')

const balanced = requireObservation('balanced-related')
const single = requireObservation('single-role')
const mixed = requireObservation('switch-directions')
const sparse = requireObservation('sparse-empty')
const manual = requireObservation('manual-edit')
const explicit = requireObservation('full-explicit')

const editorialCases = [
  ['Balanced profile', balanced],
  ['Strong single-interest profile', single],
  ['Mixed-direction profile', mixed],
  ['Sparse profile', sparse],
  ['Manually edited role set', manual],
  ['Full-disclosure profile', explicit],
] as const

const completeComparisons = editorialCases.map(([label, item]) => `### ${label}

#### Before (pre-J.5 renderer, identical fixture input)

\`\`\`text
${buildBaselineFullReflection(item.data, item.options)}
\`\`\`

#### After (final J.5 renderer)

\`\`\`text
${item.output}
\`\`\``).join('\n\n')

const rewordedClaimIds = new Set([
  'opening-empty-role-set',
  'opening-assessment-supported-roles',
  'opening-manual-roles',
  'interests-recurring-themes',
  'roles-current-order',
  'nuance-limited-confidence',
  'nuance-evidence-breadth',
  'closing-takeaway',
])

const markdownCell = (value: string) => value.replace(/\|/gu, '\\|').replace(/\n/gu, '<br>')
const rewordedProvenanceRows = editorialCases.flatMap(([label, item]) => item.output
  ? buildFullReflectionNarrative(item.data, item.options).sections.flatMap((section) => section.claims
      .filter((entry) => rewordedClaimIds.has(entry.id))
      .map((entry) => `| ${label} | ${entry.id} | ${entry.category} | ${entry.provenance.map((source) => `${source.source}: ${source.ids.join(', ')}`).join('; ')} | ${markdownCell(entry.text)} |`))
  : []).join('\n')

const markdown = `# Phase J.5 reflection editorial review

Baseline commit: \`${baselineCommit}\`

This review uses deterministic production-selector fixtures. Scores are structured editorial judgments, not user research. Independent human editorial approval remains pending.

## Editorial rubric

Each dimension uses the same 1–5 scale: **1** = materially misleading or unusable; **2** = weak and noticeably mechanical; **3** = serviceable with clear editorial problems; **4** = strong with minor limitations; **5** = unusually clear, natural, and publication-ready after independent review.

| Dimension | What is reviewed |
| --- | --- |
| Naturalness | Reads like connected human prose rather than concatenated templates. |
| Specificity | Responds to this evidence profile rather than almost anyone. |
| Coherence | Sections develop a readable sequence without contradiction. |
| Evidence fidelity | Substantive claims stay within authorized evidence. |
| Appropriate uncertainty | Confidence and missing evidence are neither inflated nor treated as rejection. |
| Non-repetition | Claims and caveats are not needlessly repeated. |
| Tone | Warm, plain, respectful, and non-therapeutic. |
| Usefulness | Gives understandable vocabulary and distinctions without prescribing identity. |
| Identity humility | Keeps suggestions and personal choices distinct from assigned identity. |
| Readability | Uses manageable sentences, lists, and section lengths. |

## Before-and-after scoring

| Fixture | Version | Naturalness | Specificity | Coherence | Fidelity | Uncertainty | Non-repetition | Tone | Usefulness | Identity humility | Readability |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Balanced related roles | J.0 baseline | 2 | 2 | 2 | 5 | 4 | 2 | 3 | 2 | 5 | 3 |
| Balanced related roles | J.5 candidate | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 5 | 4 |
| Strong single-interest | J.0 baseline | 2 | 3 | 2 | 5 | 4 | 2 | 3 | 3 | 5 | 3 |
| Strong single-interest | J.5 candidate | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 5 | 4 |
| Mixed-direction | J.0 baseline | 2 | 3 | 2 | 5 | 4 | 2 | 3 | 3 | 5 | 3 |
| Mixed-direction | J.5 candidate | 4 | 5 | 4 | 5 | 5 | 4 | 4 | 5 | 5 | 4 |
| Sparse / empty set | J.0 baseline | 2 | 2 | 2 | 5 | 4 | 2 | 3 | 2 | 5 | 3 |
| Sparse / empty set | J.5 candidate | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 5 | 5 |
| Manual edit | J.0 baseline | 2 | 3 | 2 | 5 | 5 | 2 | 3 | 3 | 5 | 3 |
| Manual edit | J.5 candidate | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 5 | 4 |
| Full explicit disclosure | J.0 baseline | 2 | 3 | 2 | 5 | 4 | 2 | 3 | 3 | 5 | 2 |
| Full explicit disclosure | J.5 candidate | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 5 | 4 |

No dimension is scored 5 for naturalness merely because the implementation changed. The output has not received independent human editorial review. Role definitions and explicit communication preferences intentionally retain structured list presentation where prose would obscure exact user-selected content.

## Complete identical-input before-and-after review

The pre-J.5 renderer is reproduced locally in the audit script and receives the same structured fixture data and disclosure options as the final renderer. These are complete outputs, not hand-written excerpts.

${completeComparisons}

## Provenance review for reworded claims

Every substantive claim whose realization changed retains its original claim ID, category, deterministic position, and authorized provenance. The table below covers all such claims in the six required complete review cases.

| Fixture | Claim ID | Category | Provenance | Final wording |
| --- | --- | --- | --- | --- |
${rewordedProvenanceRows}

No reworded claim in these cases has empty provenance. The wording changes presentation only; they do not add a new evidence source or broaden a claim.

## Anti-genericity comparison

| Fixture | Production-selected roles | First evidence-specific observation |
| --- | --- | --- |
${comparisonRows}

The main observations differ because they are selected from the supporting signals attached to the actual scored roles. Labels are not merely substituted into one generic paragraph. Where no supporting signal exists, the engine omits the interests section instead of inventing one.

## Claim audit

| Fixture | Current roles | Sections | Claims | Claims lacking provenance |
| --- | ---: | ---: | ---: | ---: |
${fixtureRows}

Claim provenance remains internal. It identifies role results, explicit Current Role Set choices, readiness competencies, blind-spot signals, boundary selections, negotiation selections, missing evidence, or disclosure rules. It is not included in copied prose or sent anywhere.

## Weak and difficult cases

- **Sparse profiles:** produce a short opening, an explicit unknown-evidence statement, and the shared closing. They do not receive filler sections.
- **Mixed-direction profiles:** report the production-selected vocabulary and supporting traits without describing switching as indecision or calling opposite directions contradictory.
- **Manual roles:** are described as user choices and never receive assessment alignment or confidence.
- **Large readiness bands:** use a count and representative reviewed labels rather than a 17-item sentence.
- **Many blind-spot signals:** retain the five strongest detailed cues and summarize the remaining count with representative titles. The claim provenance retains every included signal ID.
- **Negotiation preferences:** remain an explicit list when selected. This is intentionally more structured than the interpretive sections because paraphrasing exact communication choices could change meaning.

## Remaining editorial concerns

- Role definitions remain a structured list. This preserves reviewed meaning, but a human editor may prefer lighter transitions for five-role sets.
- Current Full Reflection input identifies the current set and each role's source, but it does not contain a complete immutable Suggested Role Set comparison. Removed roles are therefore not characterized or treated as rejected.
- Reviewed role relationships are not narrated because the share input does not currently carry a relationship-specific explanation contract. The engine does not infer relationships from family or label similarity.
- The five-item blind-spot detail cap is an editorial prioritization choice and merits human review with people who use the report.
- The rubric scores were applied by implementation review, not an independent editor or user study.

## Human review status

**Pending.** Automated evidence and repetition checks pass for these fixtures, but they cannot establish human-quality prose. A human editor should review the complete generated sample set before J.5 is treated as editorially final.
`

writeFileSync(outputPath, markdown, 'utf8')
console.log(`Phase J.5 editorial review written for ${observations.length} deterministic fixtures.`)
