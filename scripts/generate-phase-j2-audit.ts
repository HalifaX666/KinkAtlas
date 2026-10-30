import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPhaseJ2Audit } from '../src/calibration/phaseJQuestionAudit'
import { assessmentPersonas } from '../src/tests/fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from '../src/tests/helpers/assessmentPersonaRunner'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = resolve(repositoryRoot, 'docs/phase-j')
const baselineCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim()
const originalJourneys = assessmentPersonas.map(evaluateAssessmentPersona).map((evaluation) => ({ id: evaluation.persona.id, questionIds: evaluation.adaptiveQuestionIds }))
const audit = buildPhaseJ2Audit(originalJourneys)

const reachabilityRows = audit.reachability.originallyUnobserved.map((question) => `| \`${question.questionId}\` | ${question.domain} | ${question.classification} | ${question.selectionWitnesses.join(', ') || 'none'} | ${question.rejectedJourneyCount}/${audit.counts.expandedJourneys} |`).join('\n')
const pairRows = audit.discrimination.map((pair) => `| ${pair.leftLabel} / ${pair.rightLabel} | ${pair.similarity.toFixed(3)} | ${pair.selectedDifferentiatingQuestionIds.join(', ') || 'none'} | ${pair.strongestContrastingJourney?.difference.toFixed(3) ?? 'n/a'} | ${pair.classification} |`).join('\n')
const familyRows = audit.familyGaps.map((family) => `| ${family.label} | ${family.scoredRoleIds.length} | ${family.directInterestRoleCount} | ${family.explorationOnlyRoleCount} | ${family.assessmentInferenceSupported ? 'scored Discovery support' : 'Refine/direct/manual only'} |`).join('\n')

const questionCoverage = `# Phase J.2 question coverage and adaptive reachability audit

Baseline commit: \`${baselineCommit}\`

This report is observational. J.2 adds deterministic fixtures and analysis only; it does not change question data, scoring, routing, eligibility, recommendations, privacy, or historical snapshots.

## Coverage layers

- **Static availability** means a question exists in the bank.
- **Adaptive eligibility** means it is unanswered and its broad domain was not rejected.
- **Selection** means the production selector ranked it first before the six-follow-up budget ended.
- **Usable evidence** requires a scored answer with trait effects; unknown and prefer-not paths do not contribute.
- **Role evidence** requires overlap with a scored role's weighted traits. A family match is never scoring evidence.
- **Recommendation eligibility** is evaluated later from alignment, confidence, explicit gates, and the role's decision pathway.

The machine-readable graph in [assessment-evidence-map.json](./assessment-evidence-map.json) retains each layer instead of treating a question mention as proof of discrimination.

## Effective fixture coverage

| Corpus | Journeys | Adaptive questions observed | Coverage |
| --- | ---: | ---: | ---: |
| Original J.0 corpus | ${audit.reachability.original.journeyCount} | ${audit.reachability.original.observedAdaptiveQuestionCount}/${audit.reachability.original.totalAdaptiveQuestionCount} | ${audit.reachability.original.coveragePercent}% |
| Original plus J.2 journeys | ${audit.reachability.expanded.journeyCount} | ${audit.reachability.expanded.observedAdaptiveQuestionCount}/${audit.reachability.expanded.totalAdaptiveQuestionCount} | ${audit.reachability.expanded.coveragePercent}% |

These are constructed regression journeys, not a model of user frequency. Six adaptive slots remain a real competition: broad or mixed profiles can leave relevant questions unasked even when they are eligible.

## Ten J.0-unobserved questions

| Question | Domain | Classification | Valid selector witness | Domain rejected in J.2 journeys |
| --- | --- | --- | --- | ---: |
${reachabilityRows}

Every witness listed above was produced by repeatedly calling \`selectNextDiscoveryQuestion\`; no adaptive question was injected. A non-selected question is classified as potentially starved or inconclusive, not declared unreachable.

## New deterministic journeys

${audit.reachability.newJourneys.map((journey) => `### ${journey.id}

${journey.description}

- Adaptive order: ${journey.selectedAdaptiveQuestions.map((question) => `\`${question.questionId}\`=${question.answerId}`).join(', ') || 'none'}
- Eligible candidates: ${journey.eligibleCandidateRoleIds.join(', ') || 'none'}
- Suggested Role Set: ${journey.suggestedRoleIds.join(', ') || 'empty (valid)'}
- Suggested primary: ${journey.suggestedPrimaryRoleId ?? 'none'}
`).join('\n')}

## Interpretation

The added corpus exercises directional authority/activity, yielding/bottoming, rope, primal, service, pet/owner, sensation, visibility, praise, material, objectification, uncertainty, and mixed evidence. It is intentionally small and semantic. Coverage gains show test reachability, not population representativeness or a mandate to ask more questions.
`

const discriminationReport = `# Phase J.2 role discrimination audit

Baseline commit: \`${baselineCommit}\`

## Scored-role pairs

| Pair | Fingerprint similarity | Selected differentiators | Largest observed raw-alignment gap | Finding |
| --- | ---: | --- | ---: | --- |
${pairRows}

The comparison uses scored-role fingerprints, static differentiating/contrary traits, and actual J.2 selector journeys. It does not claim that all editorial meanings can be reduced to score distance. Manual-only vocabulary requires Refine or user selection rather than fabricated scored comparisons.

## Five retained diagnostics

${audit.acceptedDiagnostics.map((item) => `- **${item.roleId} / ${item.signal}:** ${item.remainsVisible ? 'retained and visible' : 'NOT FOUND (validation defect)'}. Static question count ${item.questionCount}; estimated evidence coverage ${item.estimatedEvidenceCoverage?.toFixed(3)}; nearest neighbor ${item.nearestNeighbor?.roleId ?? 'none'}${item.nearestNeighbor ? ` (${item.nearestNeighbor.similarity.toFixed(3)})` : ''}. Realistic checks: positive \`${item.representativeJourneys.positive?.journeyId}\` (${item.representativeJourneys.positive?.rawAlignment.toFixed(3)}), negative \`${item.representativeJourneys.negative?.journeyId}\` (${item.representativeJourneys.negative?.rawAlignment.toFixed(3)}), ambiguous \`${item.representativeJourneys.ambiguous?.journeyId}\` (${item.representativeJourneys.ambiguous?.rawAlignment.toFixed(3)}).`).join('\n')}

Dominant and Authority Holder are statistically close because responsibility, direction, structure, leadership, and control overlap. \`r-authority-style\`, explicit-authority qualification, dominance weighting, and structure weighting provide a defensible distinction, but the pair remains the weakest measured scored-role separation. The single-axis Voyeur, Kink Explorer, and Community Connector signals are narrow by design and have independent follow-ups; adding unrelated traits only to silence diagnostics would be misleading.

## Family-level evidence gaps

| Family | Scored roles | Direct-interest roles | Exploration-only roles | Current support |
| --- | ---: | ---: | ---: | --- |
${familyRows}

Exploration-only design is not automatically an omission. A future question is justified only when the product intends to infer a role, a qualifying scored role and evidence contract exist, and the question improves a measured distinction without creating false-positive identity suggestions.

## Authority Holder mapping

- Scored role exists: ${audit.authorityHolder.scoredRoleExists ? 'yes' : 'no'}.
- Exact public node or canonical mapping: ${audit.authorityHolder.exactPublicNodeCount}.
- Public records referencing it as a nearest scored role: ${audit.authorityHolder.nearestReferences.length}.
- Conclusion: **${audit.authorityHolder.conclusion}.** This is a real vocabulary mapping gap, not a reporting artifact. Whether it is intentional requires editorial approval; J.2 does not add a node.

## Direct-interest pathway

- Public roles marked direct-interest: ${audit.directInterest.roleCount}.
- Metadata eligibility distribution: ${Object.entries(audit.directInterest.recommendationEligibility).map(([key, value]) => `${key} ${value}`).join('; ')}.
- Runtime candidate eligibility: always false in \`candidateEvidence()\` for \`decisionPathway === 'direct-interest'\`.
- Conclusion: **metadata and candidate behavior are inconsistent or the intended manual-only policy is undocumented.** This requires a product decision before any eligibility change.
`

const proposals = `# Phase J.2 improvement proposals

Baseline commit: \`${baselineCommit}\`

No proposal below is implemented in J.2.

## Priority 1 — Decide the direct-interest evidence contract

- **Impact/evidence:** ${audit.directInterest.roleCount} public records declare a direct-interest pathway, while runtime construction makes all of them ineligible.
- **Decision needed:** manual exploration only, direct confirmation without recommendation, or a separately gated eligible path.
- **Risk:** high. Enabling it without a narrow gate could add unsupported identity recommendations.

## Priority 2 — Resolve Authority Holder public vocabulary mapping

- **Impact/evidence:** the scored role exists and participates in an accepted overlap diagnostic, but no exact public node maps to it.
- **Decision needed:** intentional internal scoring concept, alias/canonical mapping, or new reviewed public node.
- **Risk:** medium to high because a new eligible node or relationship can change optimization.

## Priority 3 — Preserve new reachability witnesses as regressions

- **Impact/evidence:** the original corpus observed ${audit.reachability.original.observedAdaptiveQuestionCount}/${audit.reachability.original.totalAdaptiveQuestionCount}; the expanded corpus observes ${audit.reachability.expanded.observedAdaptiveQuestionCount}/${audit.reachability.expanded.totalAdaptiveQuestionCount}.
- **Action:** retain focused selector journeys for praise, material, objectification, discipline, position flexibility, and bounded psychological direction.
- **Risk:** low; fixture-only coverage protects behavior without altering it.

## Priority 4 — Improve Dominant / Authority Holder explanation before changing weights

- **Impact/evidence:** the pair remains above the accepted overlap threshold, but explicit authority style and structure evidence create a defensible distinction.
- **Action:** first clarify public mapping and result explanations; consider a new independent differentiator only if user research shows confusion.
- **Risk:** high for scoring changes; low for reviewed explanatory copy.

## Priority 5 — Review adaptive budget competition

- **Impact/evidence:** mixed-interest journeys demonstrate that eligible questions compete for six slots. Non-selection is not unreachability.
- **Action:** add counterfactual ranking diagnostics before considering weight or budget changes.
- **Risk:** high: ranking changes can reshape evidence and recommendations across unrelated roles.

## Priority 6 — Review the six named family gaps editorially

- **Impact/evidence:** degradation/objectification, denial/control, material/fetish, praise/affection, persona/fantasy, and sexual-role vocabulary combine scored, Refine, direct-interest, and exploration-only support in different proportions.
- **Action:** state which labels KinkAtlas is intended to infer. Prefer direct confirmation for narrow identity vocabulary without a validated scored fingerprint.
- **Risk:** medium to high if new traits, gates, or eligible roles are introduced; low for documentation and regression fixtures.

## Guardrail

Do not add questions merely to increase coverage. Require an intended distinction, independent evidence, a plausible user-facing benefit, a false-positive analysis, and a regression journey before changing production semantics.
`

mkdirSync(outputDirectory, { recursive: true })
writeFileSync(resolve(outputDirectory, 'assessment-evidence-map.json'), `${JSON.stringify({ baselineCommit, ...audit.evidenceMap }, null, 2)}\n`)
writeFileSync(resolve(outputDirectory, 'adaptive-reachability.json'), `${JSON.stringify({ baselineCommit, ...audit.reachability }, null, 2)}\n`)
writeFileSync(resolve(outputDirectory, 'question-coverage-audit.md'), questionCoverage)
writeFileSync(resolve(outputDirectory, 'role-discrimination-audit.md'), discriminationReport)
writeFileSync(resolve(outputDirectory, 'j2-improvement-proposals.md'), proposals)

console.log(`Phase J.2 audit written: original ${audit.reachability.original.observedAdaptiveQuestionCount}/${audit.reachability.original.totalAdaptiveQuestionCount}; expanded ${audit.reachability.expanded.observedAdaptiveQuestionCount}/${audit.reachability.expanded.totalAdaptiveQuestionCount}.`)
console.log(`Originally unobserved now selected: ${audit.reachability.originallyUnobserved.filter((question) => question.expandedJourneyCount > 0).length}/${audit.reachability.originallyUnobserved.length}.`)
