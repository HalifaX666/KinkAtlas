import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRecommendationQualityAudit } from '../src/calibration/recommendationQualityAudit'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = resolve(repositoryRoot, 'docs/phase-j')
const baselineCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim()
const audit = buildRecommendationQualityAudit()

const productionJourneys = audit.baseline.filter((scenario) => scenario.kind === 'production-selector-journey')
const selectedCandidates = audit.baseline.flatMap((scenario) => scenario.candidates.filter((candidate) => scenario.suggestedRoleIds.includes(candidate.roleId)))
const supportCounts = selectedCandidates.reduce<Record<string, number>>((counts, candidate) => {
  counts[candidate.supportClassification] = (counts[candidate.supportClassification] ?? 0) + 1
  return counts
}, {})
const zeroRoleScenarios = audit.baseline.filter((scenario) => scenario.suggestedRoleIds.length === 0)
const compactScenarios = audit.baseline.filter((scenario) => scenario.suggestedRoleIds.length < 5)
const fifthSlots = audit.baseline.filter((scenario) => scenario.fifthSlot)
const fifthSlotsWithMaterialRedundancy = fifthSlots.filter((scenario) => (scenario.fifthSlot?.redundancyPenalty ?? 0) >= .12)
const relationshipChanges = audit.relationshipCounterfactual.individual.filter((proposal) => proposal.affectedScenarios.length > 0)
const familyChanges = audit.familyCounterfactual.filter((proposal) => proposal.affectedScenarios.length > 0)

const relationshipRows = audit.relationshipCounterfactual.individual.map((proposal) => `| ${proposal.leftLabel} / ${proposal.rightLabel} | ${proposal.type} | ${proposal.endpointEligibleTogether.length} | ${proposal.membershipChangeCount} | ${proposal.primaryChangeCount} | ${proposal.affectedScenarios.length ? proposal.affectedScenarios.map((item) => item.scenarioId).join(', ') : 'none'} |`).join('\n')
const familyRows = audit.familyCounterfactual.map((proposal) => `| ${proposal.label} | ${proposal.proposedFamilyIds.join(', ') || 'none'} | ${proposal.decisionPathway} | ${proposal.eligibleScenarioIds.length} | ${proposal.affectedScenarios.length} |`).join('\n')
const tieRows = audit.tieBreaks.alternatives.map((alternative) => `| ${alternative.rule} | ${alternative.changedScenarioCount} | ${alternative.membershipChangeCount} | ${alternative.primaryChangeCount} |`).join('\n')
const sensitivityRows = audit.sensitivity.map((result) => `| ${result.id} | ${result.classification} | ${result.membershipChanged ? 'yes' : 'no'} | ${result.primaryChanged ? 'yes' : 'no'} | ${result.addedRoleIds.join(', ') || 'none'} | ${result.removedRoleIds.join(', ') || 'none'} |`).join('\n')
const journeyRows = productionJourneys.map((scenario) => `| ${scenario.scenarioId} | ${scenario.eligibleCandidateCount} | ${scenario.suggestedRoleIds.join(', ') || 'empty'} | ${scenario.suggestedPrimaryRoleId ?? 'none'} | ${scenario.omittedIndependentRoleIds.join(', ') || 'none'} |`).join('\n')
const reviewPromptRows = audit.qualitySummary.scenarioReviewFlags.map((flag) => `| ${flag.scenarioId} | ${flag.suggestedRoleIds.join(', ') || 'empty'} | ${flag.prompts.join(' ')} |`).join('\n')

const qualityReport = `# Phase J.3 recommendation quality audit

Baseline commit: \`${baselineCommit}\`

This report is observational. It measures current production behavior with synthetic deterministic fixtures and does not change scoring, eligibility, recommendation weights, question selection, taxonomy, readiness, boundaries, privacy, historical snapshots, or production UI.

## Scope and method

- ${audit.counts.existingRecommendationScenarios} existing recommendation scenarios preserve the accepted calibration baseline.
- ${audit.counts.productionSelectorJourneys} new journeys answer real questions through the production adaptive selector and then use production role matching, candidate construction, and optimization.
- ${audit.counts.totalScenarios} scenarios are analyzed in total.
- The development-only diagnostic adapter reproduced production selection and primary output in ${audit.adapterEquivalence.matchedScenarios}/${audit.adapterEquivalence.totalScenarios} scenarios.
- Counterfactual relationship analysis uses the same audited calculations with cloned relationship arrays because production helpers close over canonical metadata. Exact baseline equivalence is required before interpreting those simulations.

Synthetic journeys can expose internal consistency and regression risks. They do not validate identity accuracy, user satisfaction, or population frequency.

## Independent quality rubric

### Objective invariants

${audit.rubric.objectiveInvariants.map((item) => `- ${item}`).join('\n')}

### Heuristic quality signals

${audit.rubric.heuristicSignals.map((item) => `- ${item}`).join('\n')}

### Editorial judgments

${audit.rubric.editorialJudgments.map((item) => `- ${item}`).join('\n')}

The rubric does not treat the optimizer objective as proof of quality. Support classification uses evidence type, raw alignment, confidence, and evidence quality; evidence breadth is retained separately for production-selector journeys.

## Baseline findings

- Selected-role support classifications: ${Object.entries(supportCounts).map(([key, value]) => `${key} ${value}`).join('; ') || 'none'}.
- Compact sets below five roles: ${compactScenarios.length}/${audit.counts.totalScenarios}; empty sets: ${zeroRoleScenarios.length}.
- Fifth slots filled: ${fifthSlots.length}; fifth slots with at least 0.12 redundancy penalty: ${fifthSlotsWithMaterialRedundancy.length}.
- Selected unsupported-specificity signals: ${audit.qualitySummary.unsupportedSpecificity.length}.
- Selected potential near-duplicate pairs: ${audit.qualitySummary.redundantSelected.length}.
- Scenarios omitting at least one independently supported family candidate at the slot limit: ${audit.qualitySummary.scenariosWithOmittedIndependentInterests.length}.
- Primary-policy/support concerns: ${audit.qualitySummary.primaryConcerns.length}.
- Scenario-intent review prompts: ${audit.qualitySummary.scenarioReviewFlags.length}.

These counts are diagnostics, not automatic defects. Related roles can add useful directional nuance, and a compact or empty set is valid when evidence is limited.

### Independent scenario-intent review prompts

| Scenario | Current output | Review prompt defined before evaluating output |
| --- | --- | --- |
${reviewPromptRows}

These prompts are editorial review gates, not test expectations or confirmed defects. They prevent the audit from declaring an output good merely because it matches the current optimizer.

## Production-selector journeys

| Journey | Eligible candidates | Suggested Role Set | Suggested primary | Omitted independent candidates |
| --- | ---: | --- | --- | --- |
${journeyRows}

Candidate detail in the JSON contains every calibration-fixture candidate. For production-selector journeys it contains eligible candidates and threshold, redundancy, or slot-limit alternates; all excluded candidates remain counted by production exclusion reason. This keeps the report reviewable without hiding aggregate exclusions.

## Selection decisions and fifth-slot value

Each machine-readable scenario records exact weighted base-score components, step-by-step adjusted ranking, pairwise redundancy, marginal family representation, runner-ups, final order, primary role, and production library-order tie diagnostics. The adapter does not substitute a simplified objective: it is tested against production output for every scenario.

The fifth slot is not assumed to be beneficial. A filled fifth slot with high overlap is flagged for review; the optimizer maximum remains five and no audit rule forces a five-role result.

## Tie-breaking

Production selection encountered ${audit.tieBreaks.production.exactTieSteps} steps tied before the final library-order rule across ${audit.tieBreaks.production.scenariosWithTie.length} scenarios.

| Hypothetical final rule | Scenarios changed | Membership changes | Primary changes |
| --- | ---: | ---: | ---: |
${tieRows}

These are counterfactuals only. A changed set is not inherently better; the reports retain the affected scenario IDs and before/after role IDs for editorial review.

## Relationship-edge counterfactuals

| Proposed edge | Type | Endpoints eligible together | Membership changes | Primary changes | Affected scenarios |
| --- | --- | ---: | ---: | ---: | --- |
${relationshipRows}

Individual proposals with any measured score, order, membership, or primary effect: ${relationshipChanges.length}/7. The combined proposal changed membership in ${audit.relationshipCounterfactual.combined.membershipChangeCount} scenarios and primary in ${audit.relationshipCounterfactual.combined.primaryChangeCount} scenarios.

Directional-counterpart and switch-counterpart edges do not create a production selection redundancy penalty. They can affect primary centrality when both endpoints are selected. Commonly-overlapping edges can add a 0.12 pairwise redundancy penalty.

## Family-membership counterfactuals

| Role | Proposed families | Current pathway | Eligible scenarios | Affected scenarios |
| --- | --- | --- | ---: | ---: |
${familyRows}

Measured family-only changes: ${familyChanges.length}/${audit.familyCounterfactual.length}. Roles that never become candidates in this corpus have zero present optimizer effect; the audit does not manufacture eligibility to create an effect.

## Direct-interest policy

- Public roles declaring direct-interest: ${audit.directInterest.roleCount}.
- Production-selector eligible occurrences: ${audit.directInterest.productionSelectorEligibleOccurrences}.
- Synthetic calibration eligible occurrences: ${audit.directInterest.syntheticCalibrationEligibleOccurrences}; these are explicit optimizer fixtures, not proof of a production evidence path.
- Current Discovery stores exact per-label direct evidence: ${audit.directInterest.explicitEvidenceStoredByCurrentDiscovery ? 'yes' : 'no'}.

Policy A is current runtime exclusion. Policy B cannot be simulated faithfully until product guidance defines the exact user action, per-role evidence mapping, confidence semantics, safeguards, and primary policy. Enabling a related answer by assumption would fabricate identity evidence.

## Authority Holder mapping

- Scored role exists: ${audit.authorityHolder.scoredRoleExists ? 'yes' : 'no'}.
- Exact public node or canonical mapping: ${audit.authorityHolder.exactPublicNodeCount}.
- Public records with nearest-role references: ${audit.authorityHolder.nearestReferences.length}.

The scored construct cannot appear as its own Suggested Role Set label, role page, or primary. The three editorial options remain a dedicated node, an explicit alias/canonical mapping, or an intentionally internal construct with a documented user-facing translation. J.3 implements none of them.

## Sensitivity

| Variant | Classification | Membership changed | Primary changed | Added | Removed |
| --- | --- | --- | --- | --- | --- |
${sensitivityRows}

Expected threshold or contrary-evidence transitions are not classified as defects. Potential instability means the output deserves human review against the stated scenario intent.

## Confirmed versus unresolved

**Confirmed behavior:** production outputs, exact score components, exclusions, ties, tested metadata effects, and the missing Authority Holder public node.

**Counterfactual outcomes:** cloned relationship/family metadata, alternative final tie rules, and one-dimension variants.

**Editorial interpretation:** whether related roles add useful nuance, whether the fifth role adds enough meaning, and whether a broader label communicates evidence better.

**Unresolved policy:** direct-interest eligibility, Authority Holder public translation, adoption of J.1 metadata proposals, and whether a technically valid primary should sometimes be omitted.
`

const decisionRegister = `# Phase J.3 recommendation decision register

Baseline commit: \`${baselineCommit}\`

No decision below is implemented by J.3.

## J3-D1 - Direct-interest eligibility

- **Current behavior:** ${audit.directInterest.roleCount} public roles declare direct-interest metadata, but production-selector journeys produced ${audit.directInterest.productionSelectorEligibleOccurrences} eligible occurrences.
- **Missing contract:** the explicit user action, exact label mapping, stored evidence, confidence treatment, primary eligibility, and rejection behavior.
- **Decision:** choose documented manual/exploration-only behavior or design a reviewed explicit-evidence gate. Do not infer eligibility from related broad answers.
- **Risk:** high; a permissive rule could generate unsupported identity suggestions.

## J3-D2 - Authority Holder public translation

- **Current behavior:** a scored construct exists with ${audit.authorityHolder.exactPublicNodeCount} exact public nodes and ${audit.authorityHolder.nearestReferences.length} nearest-role references.
- **Options:** dedicated public node; explicit alias/canonical mapping; internal-only construct with explicit translation.
- **Decision:** editorial and product approval is required before changing vocabulary or eligibility.
- **Risk:** medium to high; a public eligible node can change sets and primary selection.

## J3-D3 - Seven J.1 relationship proposals

- **Measured result:** ${relationshipChanges.length}/7 individual proposals affected at least one measured selection score/order/primary; the combined proposal changed ${audit.relationshipCounterfactual.combined.membershipChangeCount} memberships and ${audit.relationshipCounterfactual.combined.primaryChangeCount} primaries.
- **Decision:** review semantic correctness independently from optimizer impact. Zero measured effect is not evidence that an edge is editorially correct.
- **Risk:** commonly-overlapping edges can change redundancy; directional and switch edges can change primary centrality.

## J3-D4 - High-confidence family candidates

- **Measured result:** ${familyChanges.length}/${audit.familyCounterfactual.length} proposed memberships affected this corpus.
- **Decision:** review editorial membership first. Do not enable excluded roles merely to make family metadata influence recommendations.
- **Risk:** membership can change family novelty and redundancy if a role later becomes eligible.

## J3-D5 - Final tie rule

- **Current behavior:** ${audit.tieBreaks.production.exactTieSteps} exact pre-final-order ties; library order is deterministic but editorially incidental.
- **Measured alternatives:** ${audit.tieBreaks.alternatives.map((item) => `${item.rule} changed ${item.changedScenarioCount}`).join('; ')}.
- **Decision:** retain library order unless an independent rule has clearer semantics across reviewed scenarios.
- **Risk:** set membership can change even without a primary change.

## J3-D6 - Primary-role uncertainty

- **Current behavior:** the optimizer selects the strongest allowed primary whenever a qualifying primary-capable recommendation exists.
- **Measured concerns:** ${audit.qualitySummary.primaryConcerns.length} policy/support violations under the audit rubric.
- **Decision:** decide whether technically valid but closely balanced sets should allow no headline primary. Synthetic evidence alone is insufficient to change this product contract.
`

const proposals = `# Phase J.3 improvement proposals

Baseline commit: \`${baselineCommit}\`

No proposal below is implemented in J.3.

## Priority 1 - Resolve the direct-interest evidence contract

- **Evidence:** ${audit.directInterest.roleCount} metadata records versus ${audit.directInterest.productionSelectorEligibleOccurrences} eligible production-selector occurrences.
- **Benefit:** aligns metadata, user expectations, and testable eligibility.
- **Regression risk:** high; unsupported confirmation could alter eligibility, confidence, set membership, and primary selection.
- **Dependency:** explicit product and editorial decision from J3-D1.

## Priority 2 - Resolve Authority Holder translation

- **Evidence:** scored construct present, exact public node count ${audit.authorityHolder.exactPublicNodeCount}, nearest references ${audit.authorityHolder.nearestReferences.length}.
- **Benefit:** makes explanations, public navigation, and primary semantics intelligible.
- **Regression risk:** medium to high if a node becomes eligible; low for documentation of an intentional internal translation.
- **Dependency:** editorial decision from J3-D2.

## Priority 3 - Review measured omitted-interest and fifth-slot cases

- **Evidence:** ${audit.qualitySummary.scenariosWithOmittedIndependentInterests.length} scenarios omitted an independently supported family candidate; ${fifthSlotsWithMaterialRedundancy.length} fifth slots carried material redundancy.
- **Scenario-intent review:** ${audit.qualitySummary.scenarioReviewFlags.length} deliberately constructed journeys retain explicit review prompts for potentially over-broad, over-specific, directionally surprising, or slot-limited outputs.
- **Benefit:** focuses future optimizer work on concrete marginal-contribution cases rather than maximizing role count.
- **Regression risk:** high if weights or thresholds change globally.
- **Dependency:** human review of scenario intent and acceptable alternative sets.

## Priority 4 - Review relationship proposals with observed consequences first

- **Evidence:** ${relationshipChanges.length}/7 individual edges affected the measured corpus; combined membership changes ${audit.relationshipCounterfactual.combined.membershipChangeCount}, primary changes ${audit.relationshipCounterfactual.combined.primaryChangeCount}.
- **Benefit:** tests whether reviewed semantic edges reduce actual redundancy or improve explainability.
- **Regression risk:** medium; penalties and primary centrality can create cross-persona tradeoffs.
- **Dependency:** J.1 editorial approval and scenario-by-scenario review.

## Priority 5 - Keep family proposals editorially separate from eligibility

- **Evidence:** ${familyChanges.length}/${audit.familyCounterfactual.length} high-confidence family candidates affected current tested outputs.
- **Benefit:** improves taxonomy without falsely claiming assessment support.
- **Regression risk:** currently low for never-eligible roles, but future eligibility changes can activate optimizer effects.
- **Dependency:** family editorial review; no eligibility expansion in the same change.

## Priority 6 - Replace incidental tie order only with a demonstrated semantic rule

- **Evidence:** ${audit.tieBreaks.production.exactTieSteps} exact pre-final-order ties; alternative effects are recorded in the counterfactual JSON.
- **Benefit:** could make rare equal-score choices more explainable.
- **Regression risk:** medium because deterministic set membership may change.
- **Dependency:** reviewed acceptable-output sets and a documented independent criterion.

## Priority 7 - Retain J.3 journeys as regression coverage

- **Evidence:** ${audit.counts.productionSelectorJourneys} production-selector journeys and ${audit.sensitivity.length} bounded variants now exercise directional, related-role, mixed-interest, sparse, contrary, and threshold cases.
- **Benefit:** protects current behavior and makes future recommendation changes measurable.
- **Regression risk:** low; fixtures are observational and synthetic.
`

mkdirSync(outputDirectory, { recursive: true })
writeFileSync(resolve(outputDirectory, 'recommendation-quality-audit.json'), `${JSON.stringify({
  baselineCommit,
  schemaVersion: audit.schemaVersion,
  safeguards: audit.safeguards,
  counts: audit.counts,
  adapterEquivalence: audit.adapterEquivalence,
  rubric: audit.rubric,
  baseline: audit.baseline,
  qualitySummary: audit.qualitySummary,
  directInterest: audit.directInterest,
  authorityHolder: audit.authorityHolder,
}, null, 2)}\n`)
writeFileSync(resolve(outputDirectory, 'recommendation-counterfactuals.json'), `${JSON.stringify({
  baselineCommit,
  tieBreaks: audit.tieBreaks,
  relationshipCounterfactual: audit.relationshipCounterfactual,
  familyCounterfactual: audit.familyCounterfactual,
  sensitivity: audit.sensitivity,
}, null, 2)}\n`)
writeFileSync(resolve(outputDirectory, 'recommendation-quality-audit.md'), qualityReport)
writeFileSync(resolve(outputDirectory, 'recommendation-decision-register.md'), decisionRegister)
writeFileSync(resolve(outputDirectory, 'j3-improvement-proposals.md'), proposals)

console.log(`Phase J.3 audit written for ${audit.counts.totalScenarios} scenarios.`)
console.log(`Production-equivalent diagnostic adapter: ${audit.adapterEquivalence.matchedScenarios}/${audit.adapterEquivalence.totalScenarios}.`)
console.log(`Exact pre-final-order ties: ${audit.tieBreaks.production.exactTieSteps}.`)
