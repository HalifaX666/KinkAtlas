import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeReflectionFixtures, buildPhaseJAssessmentAudit, type ReflectionFixtureObservation } from '../src/calibration/phaseJAssessmentAudit'
import { buildFullReflection, defaultShareOptions, type ShareOptions, type ShareResultsData } from '../src/engine/shareResults'
import { roleLibrary } from '../src/taxonomy/roleLibrary'
import { assessmentPersonas } from '../src/tests/fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from '../src/tests/helpers/assessmentPersonaRunner'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = resolve(repositoryRoot, 'docs/phase-j')
const evaluations = assessmentPersonas.map(evaluateAssessmentPersona)
const evaluationById = new Map(evaluations.map((evaluation) => [evaluation.persona.id, evaluation]))
const baselineCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim()
const audit = buildPhaseJAssessmentAudit(evaluations.map((evaluation) => ({ id: evaluation.persona.id, questionIds: evaluation.adaptiveQuestionIds })))

function requireEvaluation(id: string) {
  const evaluation = evaluationById.get(id)
  if (!evaluation) throw new Error(`Missing assessment persona ${id}.`)
  return evaluation
}

function fixture(id: string, scenarioId: string, description: string, data: ShareResultsData, options: ShareOptions): ReflectionFixtureObservation {
  return { id, scenarioId, description, output: buildFullReflection(data, options) }
}

const singleSuggested = evaluations.find((evaluation) => evaluation.suggestedRoleSet.length === 1)
const relatedSuggested = evaluations.find((evaluation) => {
  const selected = new Set(evaluation.suggestedRoleSet.map((role) => role.roleId))
  return roleLibrary.relationships.some((relationship) => selected.has(relationship.fromRoleId) && selected.has(relationship.toRoleId))
})
const mixedFamily = evaluations.find((evaluation) => {
  const selectedRoles = evaluation.suggestedRoleSet.map((entry) => roleLibrary.roles.find((role) => role.id === entry.roleId)).filter(Boolean)
  return new Set(selectedRoles.flatMap((role) => role?.familyIds ?? [])).size >= 3
})
const blindSpotEvaluation = evaluations.find((evaluation) => evaluation.readiness.blindSpots.length > 0)
const boundaryEvaluation = evaluations.find((evaluation) => Object.values(evaluation.persona.answers.boundaries).some((value) => !['neutral', 'prefer-not'].includes(value)))
const negotiationEvaluation = evaluations.find((evaluation) => Object.values(evaluation.persona.answers.negotiation).some((value) => value !== 'prefer-not'))

const missingFixtureCases = [
  ...(!singleSuggested ? ['single suggested role'] : []),
  ...(!relatedSuggested ? ['multiple related roles'] : []),
  ...(!mixedFamily ? ['mixed-family role set'] : []),
  ...(!blindSpotEvaluation ? ['blind spots included'] : []),
  ...(!boundaryEvaluation ? ['boundaries included'] : []),
  ...(!negotiationEvaluation ? ['negotiation included'] : []),
]

const balanced = requireEvaluation('balanced-authority-pattern')
const lowEvidence = requireEvaluation('high-uncertainty-pattern')
const manualRole = roleLibrary.roles.find((role) => role.label === 'Kinkster')
if (!manualRole) throw new Error('The reviewed Kinkster role is missing from the role library.')
const manuallyEditedRoleSet = balanced.suggestedRoleSet.length
  ? [...balanced.suggestedRoleSet.slice(0, -1), { roleId: manualRole.id, label: manualRole.label, source: 'user-selected' as const, definition: manualRole.definition }]
  : [{ roleId: manualRole.id, label: manualRole.label, source: 'user-selected' as const, definition: manualRole.definition }]

const explicitOptions: ShareOptions = { roles: true, alignment: true, confidence: true, readiness: true, blindSpots: true, boundaries: true, negotiation: true }
const fixtures: ReflectionFixtureObservation[] = [
  fixture('empty-role-set', balanced.persona.id, 'A valid Current Role Set intentionally cleared by the user.', { ...balanced.shareData, roleSet: [] }, defaultShareOptions),
  ...(singleSuggested ? [fixture('single-suggested-role', singleSuggested.persona.id, 'An existing deterministic persona that produces one suggested role.', singleSuggested.shareData, defaultShareOptions)] : []),
  ...(relatedSuggested ? [fixture('multiple-related-roles', relatedSuggested.persona.id, 'An existing deterministic persona whose suggested set contains a reviewed relationship pair.', relatedSuggested.shareData, defaultShareOptions)] : []),
  ...(mixedFamily ? [fixture('mixed-family-role-set', mixedFamily.persona.id, 'An existing deterministic persona whose suggested set represents at least three reviewed families.', mixedFamily.shareData, defaultShareOptions)] : []),
  fixture('manually-edited-role-set', balanced.persona.id, 'A valid user edit replaces the final suggested role with manually selected Kinkster.', { ...balanced.shareData, roleSet: manuallyEditedRoleSet }, defaultShareOptions),
  fixture('low-evidence-results', lowEvidence.persona.id, 'The existing high-uncertainty persona exercises low-evidence output.', lowEvidence.shareData, defaultShareOptions),
  fixture('readiness-included', balanced.persona.id, 'Reflection is explicitly selected in addition to the default role disclosure.', balanced.shareData, { ...defaultShareOptions, readiness: true }),
  ...(blindSpotEvaluation ? [fixture('blind-spots-included', blindSpotEvaluation.persona.id, 'Potential blind spots are explicitly selected.', blindSpotEvaluation.shareData, { ...defaultShareOptions, blindSpots: true })] : []),
  ...(boundaryEvaluation ? [fixture('boundaries-included', boundaryEvaluation.persona.id, 'Wants and boundaries are explicitly selected.', boundaryEvaluation.shareData, { ...defaultShareOptions, boundaries: true })] : []),
  ...(negotiationEvaluation ? [fixture('negotiation-included', negotiationEvaluation.persona.id, 'Negotiation preferences are explicitly selected.', negotiationEvaluation.shareData, { ...defaultShareOptions, negotiation: true })] : []),
  fixture('full-explicit-disclosure', balanced.persona.id, 'Every supported Full Reflection section is explicitly selected.', balanced.shareData, explicitOptions),
  fixture('default-disclosure', balanced.persona.id, 'The shipping default disclosure includes roles, alignment, and confidence only.', balanced.shareData, defaultShareOptions),
]
const reflectionAudit = analyzeReflectionFixtures(fixtures)

const detailedAudit = {
  baselineCommit,
  ...audit,
  fullReflection: {
    implementation: 'src/engine/shareResults.ts#buildFullReflection',
    defaultOptions: defaultShareOptions,
    missingRequestedCases: missingFixtureCases,
    fixtures,
    analysis: reflectionAudit,
  },
}

function renderAuditMarkdown() {
  const familyless = audit.taxonomy.rolesWithoutExplicitFamilyMembership.length
  const multiFamily = audit.taxonomy.rolesWithMultipleFamilies.length
  const unobservedAdaptive = audit.questions.staticVersusEffective.effectiveFixtureCoverage.unobservedAdaptiveQuestionIds.length
  const withoutRelationships = audit.taxonomy.relationshipCoverage.rolesWithoutRelationshipMetadata.length
  const noStaticFamilyCoverage = audit.taxonomy.familyCoverage.filter((family) => !family.hasStaticDiscoveryCoverage).length
  const noDirectFamilyRefine = audit.taxonomy.familyCoverage.filter((family) => !family.hasDirectRefinementCoverage).length

  return `# Phase J.0 assessment-quality audit

Baseline commit: \`${baselineCommit}\`

This report is observational. It does not change scoring, questions, routing, recommendations, role data, Results UI, storage, privacy, or export formats. Detailed deterministic records are in [assessment-quality-audit.json](./assessment-quality-audit.json); representative Full Reflection outputs are in [full-reflection-fixtures.md](./full-reflection-fixtures.md).

## Architecture summary

- Discovery answers emit answer-specific trait effects. \`calculateTraitScores\` averages observed effects per trait; missing evidence is not scored as rejection.
- \`matchRole\` computes raw alignment, evidence coverage, evidence-adjusted ranking, confidence, evidence gates, and explanations for 101 scored roles.
- Discovery asks 20 broad questions first, then selects from ${audit.questions.adaptiveDiscoveryQuestions} adaptive questions, with a hard maximum of 26 Discovery answers.
- Refine is a separate optional-vocabulary layer with ${audit.questions.refineQuestions} questions and a six-question presentation cap. Semantic eligibility continues to validate evidence independently of that cap.
- The 1,107-role public library maps scored, directly confirmed, hybrid, and manual-only vocabulary into a maximum five-role Suggested Role Set. Your Role Set is a separate editable copy.
- Readiness and boundaries are separate lenses. Neither is an input to identity matching or Suggested Role Set selection.
- Assessment state is memory-only by default. Saving and hosted sharing are explicit user actions with separate privacy boundaries.

## Taxonomy inventory

| Measure | Current baseline |
| --- | ---: |
| Library roles | ${audit.taxonomy.totalLibraryRoles} |
| Scored roles | ${audit.taxonomy.totalScoredRoles} |
| Reviewed definitions | ${audit.taxonomy.totalDefinitions} |
| Families | ${audit.taxonomy.totalFamilies} |
| Roles with no explicit family | ${familyless} |
| Roles in multiple families | ${multiFamily} |
| Reviewed relationships | ${audit.taxonomy.relationshipCoverage.relationshipCount} |
| Roles participating in a relationship | ${audit.taxonomy.relationshipCoverage.participatingRoleCount} |
| Roles without relationship metadata | ${withoutRelationships} |

Family coverage is organizational, not scoring evidence. ${audit.taxonomy.interpretation.familylessExplorationOrManualRoles} of ${familyless} familyless roles are exploration/manual vocabulary. ${noStaticFamilyCoverage} families have no scored-role-backed static Discovery coverage, and ${noDirectFamilyRefine} have no exact-label Refine question.

## Question coverage

- Static bank: ${audit.questions.broadDiscoveryQuestions} broad Discovery, ${audit.questions.adaptiveDiscoveryQuestions} adaptive Discovery, and ${audit.questions.refineQuestions} Refine questions across ${audit.questions.traitCount} traits.
- Effective fixture journeys: ${audit.questions.staticVersusEffective.effectiveFixtureCoverage.journeyCount} complete deterministic journeys observed ${audit.questions.staticVersusEffective.effectiveFixtureCoverage.observedAdaptiveQuestionCount}/${audit.questions.adaptiveDiscoveryQuestions} adaptive questions; ${unobservedAdaptive} were not exercised by those fixtures.
- ${audit.questions.nearlyIdenticalTraitGroupQuestions.length} questions retain uniform trait groups across scored answers. This is a shape diagnostic, not proof that the answers are semantically redundant.
- ${audit.questions.duplicateTraitGroups.length} same-phase question groups share an identical declared trait set.
- ${audit.questions.overloadedQuestions.length} questions touch five or more traits and merit later semantic review for overload.
- ${audit.questions.independentEvidencePaths.filter((path) => path.hasPositiveAndNegativePaths).length}/${audit.questions.traitCount} traits have both positive and negative answer paths in the static bank.

Static coverage means a question exists and can emit evidence. Effective coverage means the current adaptive selector actually chose it in the existing persona journeys; neither metric alone proves population-level coverage.

## Role discrimination

- ${audit.discrimination.highOverlapPairs.length} scored-role pair(s) meet the 0.90 high-overlap threshold.
- ${audit.discrimination.exactEvidenceFingerprintGroups.length} groups share an exact scored evidence fingerprint.
- Five diagnostics are explicitly retained and reviewed: Dominant/Authority Holder statistical overlap, plus narrow single-axis signals for Voyeur, Kink Explorer, and Community Connector.
- Existing adaptive discrimination scenarios pass ${audit.calibration.adaptivePassed}/${audit.calibration.adaptiveTotal}.

The confirmed finding is statistical similarity, not semantic equivalence. No merge or weight change is justified by J.0 alone. Pairs outside the reviewed exception list remain potential journey-testing candidates.

## Recommendation baseline

- ${audit.recommendations.passedScenarioCount}/${audit.recommendations.scenarioCount} recommendation scenarios pass.
- Suggested Role Set is capped at ${audit.recommendations.thresholds.maximumSuggestedRoles}; base/adjusted optimizer thresholds are ${audit.recommendations.thresholds.minimumBaseScore}/${audit.recommendations.thresholds.minimumAdjustedScore}.
- Deterministic repeat: ${audit.recommendations.deterministicRepeat ? 'PASS' : 'FAIL'}.
- Candidate evidence, eligibility, exclusion reasons, selected families, role order, and suggested primary are recorded per scenario in JSON.
- Library order remains a final production tie resolver after substantive optimizer comparisons; existing diagnostics show 16 such selection steps and five hypothetical set-order differences under stable-ID final ordering, with zero suggested-primary differences.

## Full Reflection writing audit

${reflectionAudit.fixtureCount} valid fixtures cover empty, single-role, related-role, mixed-family, manually edited, low-evidence, optional-section, full-explicit, and default disclosure states${missingFixtureCases.length ? `, with gaps reported for: ${missingFixtureCases.join(', ')}` : ''}.

Verified findings:

${reflectionAudit.verifiedFindings.map((finding) => `- ${finding}`).join('\n')}

The current output is clear and privacy-explicit, but it reads as deterministic report assembly rather than a coherent reflection. Repeated metric explanations, bullets, caveats, and section headers create mechanical rhythm. The future rewrite can improve synthesis without changing scores or recommendations, but must preserve exact disclosure controls and deterministic output.

## Issue register

| Finding | Origin | Why it matters / affected users | Locked semantics? | Can address without scoring? | Status |
| --- | --- | --- | --- | --- | --- |
| Family metadata covers ${audit.taxonomy.totalLibraryRoles - familyless}/${audit.taxonomy.totalLibraryRoles} roles | \`role-library.source.json\` familyIds | Family-level coverage analysis is incomplete for exploratory vocabulary | No automatic reclassification in J.0 | Yes, through reviewed metadata work | Verified |
| Fixture journeys leave ${unobservedAdaptive} adaptive questions unobserved | Adaptive selector + current persona corpus | Unmeasured branches may hide coverage or navigation gaps | Selector behavior is locked for J.0 | Yes, add journey fixtures first | Verified measurement gap |
| Dominant and Authority Holder overlap statistically | Scored trait fingerprints | Nearby vocabulary may be hard to distinguish | Weights/roles locked in J.0 | Journey tests can improve evidence without changing scoring | Verified, intentionally accepted |
| Full Reflection is section-concatenated | \`buildFullReflection()\` | Readers receive correct facts with limited synthesis | Output semantics/formats locked in J.0 | Future deterministic writing layer can preserve data | Verified |
| ${withoutRelationships} roles lack reviewed relationship edges | Public role-library relationship metadata | Redundancy/exploration cannot use missing semantic edges | No relationship changes in J.0 | Yes, after editorial review | Verified inventory; incompleteness impact is a hypothesis |

## Current validation baseline

- Calibration personas: ${audit.calibration.passedPersonaCount}/${audit.calibration.personaCount}; critical failures ${audit.calibration.criticalFailureCount}; reviewed warnings ${audit.calibration.warningCount}.
- Adaptive discrimination: ${audit.calibration.adaptivePassed}/${audit.calibration.adaptiveTotal}.
- Decision pathways: ${audit.calibration.decisionPathPassed}/${audit.calibration.decisionPathPersonaCount}.
- Recommendation scenarios: ${audit.calibration.recommendationPassed}/${audit.calibration.recommendationPersonaCount}.
- Readiness critical-flag persistence: ${audit.calibration.readinessCriticalPersistence ? 'PASS' : 'FAIL'}.
- Boundary independence: ${audit.calibration.boundaryIndependence ? 'PASS' : 'FAIL'}.

## Known limitations and unmeasured areas

- Fixture-observed adaptive coverage is not real-user frequency or proof that every static branch is reachable.
- Similarity metrics operate on the 101 scored-role fingerprints, not the full editorial meaning of all 1,107 labels.
- Family membership and relationship gaps are inventory findings; they are not automatic evidence of defective taxonomy.
- Recommendation personas intentionally include constructed candidate sets; assessment-persona journeys provide a separate end-to-end baseline.
- Full Reflection review is deterministic text analysis plus representative fixtures, not user research.

## Proposed J.1 scope

1. Review familyless roles and family coverage gaps without changing recommendation eligibility.
2. Add deterministic journey fixtures for unobserved/high-value adaptive branches before changing routing.
3. Define family-to-trait-to-question coverage acceptance criteria and reviewed exceptions.
4. Add pairwise journey tests for potential discrimination gaps, keeping the five accepted diagnostics explicit.
5. Produce a change proposal that separates metadata-only improvements from any scoring-semantic change requiring separate approval.

J.1 should not change scoring until a measured gap, an intended product distinction, and a regression fixture all agree on the required behavior.
`
}

function renderReflectionFixturesMarkdown() {
  return `# Phase J.0 Full Reflection fixtures

Baseline commit: \`${baselineCommit}\`

These are deterministic outputs from existing valid assessment personas and supported Current Role Set edits. They are audit fixtures, not proposed copy.

${fixtures.map((item) => `## ${item.id}

- Scenario: \`${item.scenarioId}\`
- Purpose: ${item.description}

\`\`\`text
${item.output}
\`\`\``).join('\n\n')}

## Writing observations

${reflectionAudit.verifiedFindings.map((finding) => `- ${finding}`).join('\n')}
`
}

mkdirSync(outputDirectory, { recursive: true })
writeFileSync(resolve(outputDirectory, 'assessment-quality-audit.json'), `${JSON.stringify(detailedAudit, null, 2)}\n`)
writeFileSync(resolve(outputDirectory, 'assessment-quality-audit.md'), renderAuditMarkdown())
writeFileSync(resolve(outputDirectory, 'full-reflection-fixtures.md'), renderReflectionFixturesMarkdown())

console.log(`Phase J.0 audit written for ${audit.taxonomy.totalLibraryRoles} library roles, ${audit.taxonomy.totalScoredRoles} scored roles, ${audit.questions.broadDiscoveryQuestions + audit.questions.adaptiveDiscoveryQuestions} Discovery questions, and ${fixtures.length} Full Reflection fixtures.`)
console.log(`Family coverage: ${audit.taxonomy.totalLibraryRoles - audit.taxonomy.rolesWithoutExplicitFamilyMembership.length}/${audit.taxonomy.totalLibraryRoles}; adaptive fixture coverage: ${audit.questions.staticVersusEffective.effectiveFixtureCoverage.observedAdaptiveQuestionCount}/${audit.questions.adaptiveDiscoveryQuestions}.`)
