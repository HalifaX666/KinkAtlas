# Phase J.3 recommendation quality audit

Baseline commit: `32d3d6d0da12112f386659c3c35a6615ec1ca362`

This report is observational. It measures current production behavior with synthetic deterministic fixtures and does not change scoring, eligibility, recommendation weights, question selection, taxonomy, readiness, boundaries, privacy, historical snapshots, or production UI.

## Scope and method

- 50 existing recommendation scenarios preserve the accepted calibration baseline.
- 19 new journeys answer real questions through the production adaptive selector and then use production role matching, candidate construction, and optimization.
- 69 scenarios are analyzed in total.
- The development-only diagnostic adapter reproduced production selection and primary output in 69/69 scenarios.
- Counterfactual relationship analysis uses the same audited calculations with cloned relationship arrays because production helpers close over canonical metadata. Exact baseline equivalence is required before interpreting those simulations.

Synthetic journeys can expose internal consistency and regression risks. They do not validate identity accuracy, user satisfaction, or population frequency.

## Independent quality rubric

### Objective invariants

- Every selected role is eligible.
- No manual-only role is inferred.
- At most five roles are selected.
- Primary policy is direct-primary or competitive.
- Unmet explicit requirements prevent inferred eligibility.

### Heuristic quality signals

- Strong support requires high alignment, non-low confidence, and substantial evidence quality unless directly confirmed.
- Independent supported families omitted at the slot limit are coverage candidates, not automatic defects.
- Canonical/alias duplication is more concerning than intentional directional or family overlap.
- A fifth role is low-value when it adds material redundancy without a distinct supported theme.

### Editorial judgments

- Which related labels add useful nuance.
- Whether a broad or specific label communicates the evidence better.
- Whether a user should receive a headline primary role at all.

The rubric does not treat the optimizer objective as proof of quality. Support classification uses evidence type, raw alignment, confidence, and evidence quality; evidence breadth is retained separately for production-selector journeys.

## Baseline findings

- Selected-role support classifications: strong-independent-support 85; strong-direct-or-combined-support 7; direct-support-policy-dependent 4; moderate-support 44.
- Compact sets below five roles: 62/69; empty sets: 5.
- Fifth slots filled: 7; fifth slots with at least 0.12 redundancy penalty: 0.
- Selected unsupported-specificity signals: 0.
- Selected potential near-duplicate pairs: 0.
- Scenarios omitting at least one independently supported family candidate at the slot limit: 5.
- Primary-policy/support concerns: 0.
- Scenario-intent review prompts: 8.

These counts are diagnostics, not automatic defects. Related roles can add useful directional nuance, and a compact or empty set is valid when evidence is limited.

### Independent scenario-intent review prompts

| Scenario | Current output | Review prompt defined before evaluating output |
| --- | --- | --- |
| j3-dominance-without-top | role:dominant-4cfaa6ab, role:owner-4b1b8aa3 | Owner vocabulary should require pet-specific evidence rather than authority evidence alone. |
| j3-top-without-dominance | role:service-top-1030da11, role:service-submissive-8cbb9bd3, role:top-d5cdfcf7, role:service-switch-c5501773 | Opposite-direction service vocabulary should require independent service or yielding evidence. |
| j3-switch-both-directions | role:switch-39921a74, role:submissive-70cf87f8, role:gentle-dom-6a520856 | One-sided role additions beside Switch should remain independently explainable. |
| j3-rope-receiver-only | role:bottom-479ad21a, role:service-bottom-509ee821 | Strong rope-receiving evidence should not disappear behind only broad receiving-position labels. |
| j3-primal-directional-mix | role:primal-switch-705db664, role:switch-39921a74, role:primal-predator-a89f810a | Hunter versus Predator selection may expose incidental final-order behavior. |
| j3-sadism-versus-sensation | role:top-d5cdfcf7, role:impact-top-9da4c656, role:sensual-sadist-86047b8c | A specialized Sadist subtype should require differentiating evidence, and omission of the broad Sadist label needs review. |
| j3-broad-curiosity | role:kinkster-fbb59ce7, role:tease-6d5f3dc6, role:vers-1a60a8ce, role:pet-8f0d1b30, role:exhibitionist-a68c66d6 | A compact or empty set is valid; five role-specific suggestions from broad curiosity may overstate evidence. |
| j3-many-independent-interests | role:primal-predator-a89f810a, role:rigger-5d2f2d93, role:tease-6d5f3dc6, role:caregiver-b45607f2, role:exhibitionist-a68c66d6 | A supported independent family may be omitted at the slot limit; the fifth slot should add more value than the omitted candidate. |

These prompts are editorial review gates, not test expectations or confirmed defects. They prevent the audit from declaring an output good merely because it matches the current optimizer.

## Production-selector journeys

| Journey | Eligible candidates | Suggested Role Set | Suggested primary | Omitted independent candidates |
| --- | ---: | --- | --- | --- |
| j3-dominance-without-top | 3 | role:dominant-4cfaa6ab, role:owner-4b1b8aa3 | role:dominant-4cfaa6ab | none |
| j3-top-without-dominance | 4 | role:service-top-1030da11, role:service-submissive-8cbb9bd3, role:top-d5cdfcf7, role:service-switch-c5501773 | role:service-top-1030da11 | none |
| j3-submission-without-bottom | 1 | role:submissive-70cf87f8 | role:submissive-70cf87f8 | none |
| j3-bottom-without-submission | 3 | role:bottom-479ad21a, role:service-bottom-509ee821, role:masochist-a8bcaeab | role:bottom-479ad21a | none |
| j3-switch-both-directions | 3 | role:switch-39921a74, role:submissive-70cf87f8, role:gentle-dom-6a520856 | role:switch-39921a74 | none |
| j3-one-sided-directive | 7 | role:dominant-4cfaa6ab, role:owner-4b1b8aa3, role:top-d5cdfcf7, role:pleasure-dom-f0f5f5c7 | role:dominant-4cfaa6ab | none |
| j3-rope-giver-only | 3 | role:rigger-5d2f2d93, role:bondage-top-843060ea | role:rigger-5d2f2d93 | none |
| j3-rope-receiver-only | 2 | role:bottom-479ad21a, role:service-bottom-509ee821 | role:bottom-479ad21a | none |
| j3-rope-switch | 3 | role:bondage-switch-0bda5094, role:bondage-top-843060ea | role:bondage-switch-0bda5094 | none |
| j3-owner-not-pet | 7 | role:owner-4b1b8aa3, role:dominant-4cfaa6ab, role:caregiver-b45607f2, role:handler-53cae329 | role:owner-4b1b8aa3 | none |
| j3-pet-not-owner | 1 | role:pet-8f0d1b30 | role:pet-8f0d1b30 | none |
| j3-primal-directional-mix | 5 | role:primal-switch-705db664, role:switch-39921a74, role:primal-predator-a89f810a | role:primal-switch-705db664 | none |
| j3-brat-only | 1 | role:brat-19c33c26 | role:brat-19c33c26 | none |
| j3-brat-tamer-only | 3 | role:brat-tamer-e2e114dd, role:top-d5cdfcf7, role:protector-84edb6a5 | role:brat-tamer-e2e114dd | none |
| j3-service-direction-conflict | 5 | role:service-switch-c5501773, role:submissive-70cf87f8, role:service-top-1030da11, role:service-bottom-509ee821 | role:service-switch-c5501773 | none |
| j3-sadism-versus-sensation | 4 | role:top-d5cdfcf7, role:impact-top-9da4c656, role:sensual-sadist-86047b8c | role:top-d5cdfcf7 | none |
| j3-broad-curiosity | 10 | role:kinkster-fbb59ce7, role:tease-6d5f3dc6, role:vers-1a60a8ce, role:pet-8f0d1b30, role:exhibitionist-a68c66d6 | role:kinkster-fbb59ce7 | none |
| j3-many-independent-interests | 17 | role:primal-predator-a89f810a, role:rigger-5d2f2d93, role:tease-6d5f3dc6, role:caregiver-b45607f2, role:exhibitionist-a68c66d6 | role:primal-predator-a89f810a | role:sadist-967ed11a |
| j3-low-evidence-prefer-not | 0 | empty | none | none |

Candidate detail in the JSON contains every calibration-fixture candidate. For production-selector journeys it contains eligible candidates and threshold, redundancy, or slot-limit alternates; all excluded candidates remain counted by production exclusion reason. This keeps the report reviewable without hiding aggregate exclusions.

## Selection decisions and fifth-slot value

Each machine-readable scenario records exact weighted base-score components, step-by-step adjusted ranking, pairwise redundancy, marginal family representation, runner-ups, final order, primary role, and production library-order tie diagnostics. The adapter does not substitute a simplified objective: it is tested against production output for every scenario.

The fifth slot is not assumed to be beneficial. A filled fifth slot with high overlap is flagged for review; the optimizer maximum remains five and no audit rule forces a five-role result.

## Tie-breaking

Production selection encountered 20 steps tied before the final library-order rule across 9 scenarios.

| Hypothetical final rule | Scenarios changed | Membership changes | Primary changes |
| --- | ---: | ---: | ---: |
| stable-role-id | 7 | 2 | 1 |
| stronger-independent-evidence | 7 | 2 | 1 |
| greater-distinctiveness | 7 | 2 | 1 |
| conservative-specificity | 7 | 2 | 1 |

These are counterfactuals only. A changed set is not inherently better; the reports retain the affected scenario IDs and before/after role IDs for editorial review.

## Relationship-edge counterfactuals

| Proposed edge | Type | Endpoints eligible together | Membership changes | Primary changes | Affected scenarios |
| --- | --- | ---: | ---: | ---: | --- |
| submissive / Bottom | commonly-overlapping | 4 | 0 | 0 | bottom-not-submissive |
| Owner / Pet | directional-counterpart | 0 | 0 | 0 | none |
| Trainer / Pet | directional-counterpart | 0 | 0 | 0 | none |
| Bondage Top / Bondage Switch | switch-counterpart | 2 | 0 | 0 | none |
| Bondage Bottom / Bondage Switch | switch-counterpart | 0 | 0 | 0 | none |
| Handler / Pet | directional-counterpart | 0 | 0 | 0 | none |
| Rigger / Rope Switch | commonly-overlapping | 0 | 0 | 0 | none |

Individual proposals with any measured score, order, membership, or primary effect: 1/7. The combined proposal changed membership in 0 scenarios and primary in 0 scenarios.

Directional-counterpart and switch-counterpart edges do not create a production selection redundancy penalty. They can affect primary centrality when both endpoints are selected. Commonly-overlapping edges can add a 0.12 pairwise redundancy penalty.

## Family-membership counterfactuals

| Role | Proposed families | Current pathway | Eligible scenarios | Affected scenarios |
| --- | --- | --- | ---: | ---: |
| Battle Sub | submission | manual-only | 0 | 0 |
| Brat Breaker | brat-dynamics, persona-fantasy | manual-only | 0 | 0 |
| Chaos Creature | persona-fantasy | manual-only | 0 | 0 |
| Creature | persona-fantasy | manual-only | 0 | 0 |
| Daddy Chaser | caregiver-little | manual-only | 0 | 0 |
| Dark Dom | dominance | manual-only | 0 | 0 |
| Dominant Little | caregiver-little, dominance | manual-only | 0 | 0 |
| Emotional Support Sub | submission | manual-only | 0 | 0 |
| Fairy Kink Daddy | caregiver-little | manual-only | 0 | 0 |
| Latex Mistress | material-fetish, power-exchange | manual-only | 0 | 0 |
| MaleDom Submissive | submission | manual-only | 0 | 0 |
| Nymphic Domme | dominance | manual-only | 0 | 0 |
| prey | primal | manual-only | 0 | 0 |
| Primal Dom | dominance, primal | manual-only | 0 | 0 |
| Primal Pet | primal | manual-only | 0 | 0 |
| Princess Domme | dominance | manual-only | 0 | 0 |
| Pro Domme | dominance | manual-only | 0 | 0 |
| Rope Dummy | rope-bondage | manual-only | 0 | 0 |
| Rope Model | rope-bondage | manual-only | 0 | 0 |
| Rope Monkey | rope-bondage | manual-only | 0 | 0 |
| Satyric Dominant | dominance, power-exchange | manual-only | 0 | 0 |
| Stay-at-Home Dominant | dominance | manual-only | 0 | 0 |
| Stay-at-Home Sub | submission | manual-only | 0 | 0 |
| Strap-On Domme | dominance | manual-only | 0 | 0 |
| Vampire Bait | persona-fantasy, primal | manual-only | 0 | 0 |
| Vampire Concubine | persona-fantasy | manual-only | 0 | 0 |
| Whip Wielder | sensation-impact | manual-only | 0 | 0 |

Measured family-only changes: 0/27. Roles that never become candidates in this corpus have zero present optimizer effect; the audit does not manufacture eligibility to create an effect.

## Direct-interest policy

- Public roles declaring direct-interest: 94.
- Production-selector eligible occurrences: 0.
- Synthetic calibration eligible occurrences: 4; these are explicit optimizer fixtures, not proof of a production evidence path.
- Current Discovery stores exact per-label direct evidence: no.

Policy A is current runtime exclusion. Policy B cannot be simulated faithfully until product guidance defines the exact user action, per-role evidence mapping, confidence semantics, safeguards, and primary policy. Enabling a related answer by assumption would fabricate identity evidence.

## Authority Holder mapping

- Scored role exists: yes.
- Exact public node or canonical mapping: 0.
- Public records with nearest-role references: 3.

The scored construct cannot appear as its own Suggested Role Set label, role page, or primary. The three editorial options remain a dedicated node, an explicit alias/canonical mapping, or an intentionally internal construct with a documented user-facing translation. J.3 implements none of them.

## Sensitivity

| Variant | Classification | Membership changed | Primary changed | Added | Removed |
| --- | --- | --- | --- | --- | --- |
| authority-to-unknown | acceptable-uncertainty | yes | yes | none | role:dominant-4cfaa6ab, role:owner-4b1b8aa3 |
| top-add-authority | expected-sensitivity | yes | no | role:pleasure-dom-f0f5f5c7, role:protector-84edb6a5 | role:service-submissive-8cbb9bd3 |
| submission-to-prefer-not | stable | no | no | none | none |
| rope-giver-contrary | expected-sensitivity | yes | yes | none | role:rigger-5d2f2d93, role:bondage-top-843060ea |
| pet-owner-missing-authority | acceptable-uncertainty | yes | yes | role:protector-84edb6a5 | role:owner-4b1b8aa3, role:dominant-4cfaa6ab |
| mixed-add-observation | acceptable-uncertainty | yes | no | role:voyeur-4af03138 | role:exhibitionist-a68c66d6 |

Expected threshold or contrary-evidence transitions are not classified as defects. Potential instability means the output deserves human review against the stated scenario intent.

## Confirmed versus unresolved

**Confirmed behavior:** production outputs, exact score components, exclusions, ties, tested metadata effects, and the missing Authority Holder public node.

**Counterfactual outcomes:** cloned relationship/family metadata, alternative final tie rules, and one-dimension variants.

**Editorial interpretation:** whether related roles add useful nuance, whether the fifth role adds enough meaning, and whether a broader label communicates evidence better.

**Unresolved policy:** direct-interest eligibility, Authority Holder public translation, adoption of J.1 metadata proposals, and whether a technically valid primary should sometimes be omitted.
