import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPhaseJFamilyAudit } from '../src/calibration/phaseJFamilyAudit'
import { assessmentPersonas } from '../src/tests/fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from '../src/tests/helpers/assessmentPersonaRunner'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = resolve(repositoryRoot, 'docs/phase-j')
const baselineCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim()
const evaluations = assessmentPersonas.map(evaluateAssessmentPersona)
const audit = buildPhaseJFamilyAudit(evaluations.map((evaluation) => ({ id: evaluation.persona.id, questionIds: evaluation.adaptiveQuestionIds })))

const classificationCounts = Object.entries(audit.familylessRoleReview.classificationCounts)
const noScored = new Map(audit.familiesWithoutScoredDiscoveryCoverage.map((family) => [family.familyId, family]))
const highPriorityFamilyless = audit.familylessRoleReview.roles
  .filter((role) => role.classification === 'potential-taxonomy-inconsistency' || (role.confidence === 'high' && role.proposedFamilyIds.length))
  .slice(0, 20)

function renderFamilyIntegrityAudit() {
  return `# Phase J.1 family integrity audit

Baseline commit: \`${baselineCommit}\`

This is an observational taxonomy review. It does not change role definitions, \`familyIds\`, relationships, scoring, questions, routing, recommendations, primary policy, Results, storage, privacy, snapshots, or sharing formats.

## Executive findings

- ${audit.counts.families} existing families organize ${audit.counts.roles - audit.counts.familylessRoles}/${audit.counts.roles} public roles; ${audit.counts.familylessRoles} roles remain explicitly familyless.
- Family membership is organizational and optimizer-facing. It creates neither scoring evidence nor recommendation eligibility.
- ${audit.familiesWithoutScoredDiscoveryCoverage.length} families have no canonical scored-role-backed Discovery coverage. That does not mean all nine are assessment defects.
- ${audit.familylessRoleReview.candidateCount} familyless roles produced conservative review candidates; ${audit.familylessRoleReview.highConfidenceCandidateCount} have high-confidence two-channel candidates. None are production assignments.
- The current ${audit.counts.reviewedRelationships} relationship records involve ${audit.counts.relationshipParticipants} roles. The proposed relationship list is deliberately limited to high-value comparison/redundancy cases.

## Coverage vocabulary

- **Editorial coverage:** public library members exist.
- **Scored coverage:** at least one family member has a canonical scored-role mapping.
- **Static Discovery coverage:** relevant scored traits or editorially related question domains exist. Domain relevance is reported separately and is not scoring evidence.
- **Effective adaptive coverage:** current deterministic journeys actually observed relevant adaptive questions.
- **Direct confirmation coverage:** a member has an exact Refine target with supporting questions.
- **Recommendation eligibility:** existing decision-path gates can qualify a role; family membership is never a gate.
- **Exploration-only coverage:** vocabulary remains browsable and manually selectable without an assessment claim.

## Family summary

| Family | Roles | Scored | Direct-confirm targets | Exploration-only | Review outcome |
| --- | ---: | ---: | ---: | ---: | --- |
${audit.families.map((family) => `| ${family.displayName} (\`${family.familyId}\`) | ${family.roleCount} | ${family.scoredCoverage.canonicalRoles.length} | ${family.directConfirmationCoverage.targets.length} | ${family.explorationOnlyCoverage.roleCount} | ${family.reviewOutcome} |`).join('\n')}

## Family-by-family review

${audit.families.map((family) => `### ${family.displayName} (\`${family.familyId}\`)

- Purpose: ${family.conceptualPurpose}
- Dimension: ${family.conceptualDimension}
- Members: ${family.roleCount}; examples: ${family.roles.slice(0, 8).map((role) => role.label).join(', ')}${family.roleCount > 8 ? ', â€¦' : ''}
- Modes: ${Object.entries(family.byAssessmentMode).map(([key, value]) => `${key} ${value}`).join('; ')}
- Decision pathways: ${Object.entries(family.byDecisionPathway).map(([key, value]) => `${key} ${value}`).join('; ')}
- Canonical scored roles: ${family.scoredCoverage.canonicalRoles.length ? family.scoredCoverage.canonicalRoles.map((role) => role.label).join(', ') : 'none'}
- Static questions: ${family.staticDiscoveryCoverage.scoredTraitQuestionIds.length} scored-trait-backed; ${family.staticDiscoveryCoverage.editorialDomainQuestionIds.length} editorial-domain-relevant
- Effective adaptive questions: ${family.effectiveAdaptiveCoverage.observedQuestionIds.length} observed; ${family.effectiveAdaptiveCoverage.unobservedAdaptiveQuestionIds.length} relevant adaptive questions unobserved
- Exact-target Refine: ${family.directConfirmationCoverage.targets.length ? family.directConfirmationCoverage.targets.map((target) => `${target.label} (${target.questionIds.join(', ') || 'no supporting question'})`).join('; ') : 'none'}
- Overlaps: ${family.overlappingFamilyIds.length ? family.overlappingFamilyIds.map((id) => `\`${id}\``).join(', ') : 'none recorded in this audit'}
- Outcome: **${family.reviewOutcome}.** ${family.reviewReason}
${noScored.has(family.familyId) ? `- No-scored-coverage classification: **${noScored.get(family.familyId)!.classification}.**` : ''}`).join('\n\n')}

## Familyless review summary

| Classification | Roles |
| --- | ---: |
${classificationCounts.map(([classification, count]) => `| ${classification} | ${count} |`).join('\n')}

Candidate generation requires corroborating label/alias and definition evidence, or multiple definition anchors. A word match alone never establishes membership. Full per-role evidence and excerpts are in [familyless-role-review.json](./familyless-role-review.json).

### Highest-priority review candidates

${highPriorityFamilyless.length ? highPriorityFamilyless.map((role) => `- **${role.label}** (\`${role.roleId}\`): ${role.classification}; candidate families ${role.proposedFamilyIds.map((id) => `\`${id}\``).join(', ')}; confidence ${role.confidence}.`).join('\n') : '- No high-confidence familyless proposals passed the conservative rule.'}

## Architecture assessment

Confirmed strengths:

- Directional families for authority, activity position, rope, primal, service, brat, and pet vocabulary retain coherent distinctions.
- Multi-family membership represents genuinely orthogonal dimensions for many reviewed roles.
- Exploration-only families can organize vocabulary without manufacturing assessment claims.

Confirmed review areas:

- \`degradation-objectification\` currently combines degradation and praise-oriented vocabulary.
- \`sexual-role-vocabulary\` is a broad editorial catch-all spanning activities, identities, relationship labels, and fetish vocabulary.
- \`caregiver-little\`, \`persona-fantasy\`, and \`roleplay\` have useful but editorially porous boundaries.
- \`sadomasochism\` and \`sensation-impact\` overlap intentionally but express identity versus practice at different levels.
- Direct-interest metadata and current candidate eligibility require a separate assessment-semantic decision; J.1 does not alter either.

No new family is justified automatically. Potential future-family clusters in the machine-readable review are low-confidence editorial leads only.
`
}

function renderRelationshipReview() {
  return `# Phase J.1 relationship review

Baseline commit: \`${baselineCommit}\`

## Existing coverage

- Reviewed relationships: ${audit.relationships.existingCount}
- Participating roles: ${audit.counts.relationshipParticipants}/${audit.counts.roles}
- By type: ${Object.entries(audit.relationships.byType).map(([type, count]) => `${type} ${count}`).join('; ')}

Low graph density is an inventory fact, not a requirement to connect every role. This review prioritizes relationships that clarify scored vocabulary or could affect recommendation redundancy.

## High-value candidates

${audit.relationships.proposed.map((relationship) => `### ${relationship.leftLabel} â†” ${relationship.rightLabel}

- Proposed type: \`${relationship.proposedType}\`
- Rationale: ${relationship.semanticJustification}
- Existing edge: ${relationship.alreadyHasReviewedRelationship ? 'yes â€” do not duplicate' : 'no'}
- Existing recommendation candidate co-occurrence: ${relationship.cooccurringRecommendationPersonas.length ? relationship.cooccurringRecommendationPersonas.join(', ') : 'none in the 50 deterministic scenarios'}
- Optimizer consequence: ${relationship.possibleOptimizerImpact}
- Status: hypothesis requiring editorial and behavioral approval; not applied.
`).join('\n')}

## Important non-edge finding

The scored role **Authority Holder** has no exact public-library node, even though other library roles reference its scored ID as a nearest role. The accepted Dominant/Authority Holder overlap therefore cannot be represented as a normal reviewed library edge until the intended public vocabulary mapping receives an editorial decision.

## Behavioral boundary

Reviewed relationship types participate in optimizer redundancy and primary centrality. Even a semantically correct edge can change Suggested Role Set composition. Every proposed edge therefore requires scenario-level optimizer comparison before production metadata changes.
`
}

const decisions = [
  ['J1-001', 'Authority Holder / Dominant', 'The scored Authority Holder has no exact library node; statistical overlap with Dominant is retained.', 'Scored-role data, nearest-role references, and the reviewed overlap diagnostic.', 'Decide whether Authority Holder needs a public node or an explicit mapping before proposing a relationship.', 'high', 'Makes a known distinction explainable in the public taxonomy.', 'High if a new eligible node or relationship is introduced.', 'yes', 'J.2'],
  ['J1-002', 'Direct-interest pathways', 'Direct-interest metadata exists, but current candidate construction does not automatically qualify this pathway.', 'Role-library decision pathways compared with candidateEvidence().', 'Define the intended evidence contract before changing eligibility or counting these families as assessed.', 'high', 'Aligns metadata claims with actual recommendation behavior.', 'Critical: eligibility and Suggested Role Sets could change.', 'yes', 'J.2'],
  ['J1-003', 'Nine families without scored coverage', 'Nine families lack canonical scored-role-backed Discovery evidence; several still have domain questions or Refine metadata.', 'Family evidence map coverage layers.', 'Review each gap classification; preserve editorial-only families and test any proposed assessment gap separately.', 'high', 'Prevents editorial coverage from being mistaken for assessment coverage.', 'Medium to high if questions, mappings, or eligibility change.', 'yes', 'J.2'],
  ['J1-004', '658 familyless roles', 'Familyless roles are all exploration-only by eligibility; 74 use explicit-selection modes.', 'Familyless role review and source metadata.', 'Review high-confidence candidates first; do not bulk-assign families.', 'high', 'Improves browsing consistency without inventing evidence.', 'Low for current manual-only roles, but family metadata is optimizer-sensitive if eligibility changes.', 'yes', 'J.2'],
  ['J1-005', 'degradation-objectification / praise-affection', 'Praise-oriented labels overlap a family framed around degradation/objectification.', 'Current memberships and reviewed definitions.', 'Clarify whether the overlap is intentional polarity, multi-membership, or a misplaced assignment.', 'high', 'Reduces confusing editorial grouping.', 'Medium if family assignments change for eligible roles.', 'yes', 'J.2'],
  ['J1-006', 'sexual-role-vocabulary', 'The family mixes activity, relationship, fetish, and reclaimed identity vocabulary.', 'Member inventory and overlapping family memberships.', 'Define the familyâ€™s editorial purpose before splitting, narrowing, or adding memberships.', 'high', 'Makes navigation and explanation more defensible.', 'Medium; many members carry direct-interest/hybrid metadata.', 'yes', 'J.2'],
  ['J1-007', 'submissive / Bottom and directional candidates', 'Several high-value comparison pairs lack reviewed edges.', 'Existing edge patterns and proposed relationship review.', 'Approve only after optimizer counterfactual tests for each pair.', 'medium', 'Improves comparison and redundancy handling.', 'High for pairs that can co-occur as eligible candidates.', 'yes', 'J.2'],
  ['J1-008', 'Adaptive family evidence', 'Existing journeys leave relevant adaptive questions unobserved for several families.', 'Fixture-observed effective coverage.', 'Add deterministic journeys before interpreting static coverage as reachable.', 'high', 'Separates bank presence from exercised assessment behavior.', 'Low for fixture-only work; high if routing later changes.', 'no for tests; yes for routing', 'J.2'],
]

function renderDecisionRegister() {
  return `# Phase J.1 decision register

Baseline commit: \`${baselineCommit}\`

| Finding ID | Affected family or roles | Current behavior | Evidence | Proposed action | Confidence | Expected benefit | Risk to existing semantics | Approval required | Suggested phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${decisions.map((decision) => `| ${decision.join(' | ')} |`).join('\n')}

## Classification rules

- Editorial metadata findings do not justify scoring changes.
- Assessment evidence findings require a measured distinction and regression fixture before semantic changes.
- Recommendation findings are behavior-sensitive whenever families or relationships could alter redundancy, representation, or primary centrality.
- Intentional exploration-only coverage is not a defect.
- Every candidate remains unimplemented pending explicit approval.
`
}

mkdirSync(outputDirectory, { recursive: true })
writeFileSync(resolve(outputDirectory, 'family-evidence-map.json'), `${JSON.stringify({ baselineCommit, schemaVersion: audit.schemaVersion, safeguards: audit.safeguards, counts: audit.counts, families: audit.families, familiesWithoutScoredDiscoveryCoverage: audit.familiesWithoutScoredDiscoveryCoverage, integrity: audit.integrity, explicitExceptions: audit.explicitExceptions }, null, 2)}\n`)
writeFileSync(resolve(outputDirectory, 'familyless-role-review.json'), `${JSON.stringify({ baselineCommit, schemaVersion: audit.schemaVersion, counts: audit.counts, review: audit.familylessRoleReview }, null, 2)}\n`)
writeFileSync(resolve(outputDirectory, 'family-integrity-audit.md'), renderFamilyIntegrityAudit())
writeFileSync(resolve(outputDirectory, 'relationship-review.md'), renderRelationshipReview())
writeFileSync(resolve(outputDirectory, 'j1-decision-register.md'), renderDecisionRegister())

console.log(`Phase J.1 family audit written for ${audit.counts.families} families and ${audit.counts.familylessRoles} familyless roles.`)
console.log(`No-scored-coverage families: ${audit.familiesWithoutScoredDiscoveryCoverage.length}; familyless review candidates: ${audit.familylessRoleReview.candidateCount}; relationship candidates: ${audit.relationships.proposed.length}.`)
