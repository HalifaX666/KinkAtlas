# Phase J.6 recommendation integrity audit

## Production source of truth

J.6 traced and executed the production path: `calculateTraitScores()` → `matchRoles()` → `buildRoleProfileCandidates()` → `optimizeRoleProfile()` → `selectPrimaryRoleProfile()`. The J.3 diagnostic adapter reproduced the production membership, order, and primary for 69/69 scenarios, and current calibration reports zero production-reproduction mismatches across 50 recommendation personas.

## Current integrity findings

- Candidate policy is applied before optimization; ineligible and manual-only roles cannot enter Suggested Role Set.
- Inferred roles require positive alignment, non-low confidence, and satisfied qualification requirements.
- Hybrid and explicit-confirmation roles require both an eligible target-specific question and qualifying semantic evidence.
- Direct-interest roles are deliberately ineligible in production pending a defined per-label evidence contract.
- Exploration-only roles remain available for manual selection without assessment metrics.
- The optimizer returns zero to five roles; it does not pad a sparse set.
- Primary selection respects `direct-primary`, `competitive`, and `manual-only` policy. Tests cover valid no-primary output.
- Manual edits never mutate the immutable suggestion or optimizer output.
- Existing boundaries, readiness, blind spots, and negotiation answers do not enter candidate scoring.

## Unresolved J.3 items

### Ninety-four direct-interest records

Metadata declares `eligible-with-direct-evidence` for 94 records, while production `candidateEvidence()` returns `eligible: false` for every `direct-interest` pathway. No exact per-label Discovery evidence is stored. This is a conservative policy/documentation discrepancy, not an observed unsupported recommendation: current runtime excludes all 94. Enabling them would require an explicit user action, label mapping, confidence semantics, rejection behavior, and primary policy. Decision remains **needs product review**.

### Authority Holder

Authority Holder remains a scored internal construct with no exact public role node or canonical mapping; three public records carry nearest-role references. It can shape evidence but cannot appear as its own public suggestion or primary. Options remain: create a dedicated public node, map a reviewed alias/canonical label, or document it as an intentionally internal construct. Decision remains **needs product/editorial review**.

### Independently supported interests omitted at the five-role limit

Five audited scenarios omit at least one independently supported family candidate after the five-slot limit. This is not automatically a defect: the maximum is an intentional compact-set policy and zero fifth slots carried material redundancy under the J.3 rubric. `many-compatible-five-slots`, `role-rich-experienced`, `six-complementary-roles`, and `near-tied-valid-sets` omit Primal Hunter; `j3-many-independent-interests` omits Sadist while retaining five other independent interests. Exact candidates remain in `recommendation-quality-audit.json`; no threshold or slot-limit change is approved.

### Eight intent-review scenarios

| Scenario | Review question | J.6 status |
| --- | --- | --- |
| dominance without top | Owner may be broader than pet-specific evidence warrants. | Editorial review; production output unchanged. |
| top without dominance | Opposite-direction service labels need independently understandable evidence. | Editorial review; explanations are present, policy unchanged. |
| switch both directions | One-sided additions beside Switch must remain independently supported. | Supported in tested output; retain review. |
| rope receiver only | Broad Bottom labels may obscure rope-specific vocabulary. | Product vocabulary review. |
| primal directional mix | Hunter/Predator ordering can expose final-order policy. | Tie-policy review. |
| sadism versus sensation | Specialized Sadist subtype and broad-label omission need evidence review. | Editorial review. |
| broad curiosity | Five specific suggestions may overstate broad curiosity. | Editorial/product review. |
| many independent interests | Fifth-slot value versus omitted family needs human judgment. | Editorial/product review. |

## Stability, overlap, and ordering

- 85 selected roles had strong independent support, 7 strong direct/combined support, 4 direct-support-policy-dependent support, and 44 moderate support in J.3.
- Unsupported-specificity findings: 0. Canonical/alias redundant selections: 0. Primary policy/support concerns: 0.
- Twenty selection steps were tied before the deterministic final library-order rule. A stable-ID hypothetical changed five Suggested Role Sets and zero primaries in the 50-persona calibration report. This is deterministic but editorially incidental; no replacement rule has been approved.
- Seven proposed relationship edges and 27 proposed family memberships remain counterfactual review candidates only. One relationship proposal affected measured score/order; combined proposals changed zero memberships and zero primaries. Family proposals were inert in the tested corpus.

## Conclusion

Production recommendation behavior is deterministic, reproducible, conservative, and regression-tested. The direct-interest contract, Authority Holder translation, compact-set omissions, eight intent prompts, and final tie semantics remain product/editorial decisions rather than reproduced release-blocking defects.
