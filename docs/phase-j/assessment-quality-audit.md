# Phase J.0 assessment-quality audit

Baseline commit: `6d642c7dcaaa9abf01ffc55ca57a7e7228f214b4`

This report is observational. It does not change scoring, questions, routing, recommendations, role data, Results UI, storage, privacy, or export formats. Detailed deterministic records are in [assessment-quality-audit.json](./assessment-quality-audit.json); representative Full Reflection outputs are in [full-reflection-fixtures.md](./full-reflection-fixtures.md).

## Architecture summary

- Discovery answers emit answer-specific trait effects. `calculateTraitScores` averages observed effects per trait; missing evidence is not scored as rejection.
- `matchRole` computes raw alignment, evidence coverage, evidence-adjusted ranking, confidence, evidence gates, and explanations for 101 scored roles.
- Discovery asks 20 broad questions first, then selects from 52 adaptive questions, with a hard maximum of 26 Discovery answers.
- Refine is a separate optional-vocabulary layer with 28 questions and a six-question presentation cap. Semantic eligibility continues to validate evidence independently of that cap.
- The 1,107-role public library maps scored, directly confirmed, hybrid, and manual-only vocabulary into a maximum five-role Suggested Role Set. Your Role Set is a separate editable copy.
- Readiness and boundaries are separate lenses. Neither is an input to identity matching or Suggested Role Set selection.
- Assessment state is memory-only by default. Saving and hosted sharing are explicit user actions with separate privacy boundaries.

## Taxonomy inventory

| Measure | Current baseline |
| --- | ---: |
| Library roles | 1107 |
| Scored roles | 101 |
| Reviewed definitions | 1107 |
| Families | 26 |
| Roles with no explicit family | 658 |
| Roles in multiple families | 174 |
| Reviewed relationships | 59 |
| Roles participating in a relationship | 53 |
| Roles without relationship metadata | 1054 |

Family coverage is organizational, not scoring evidence. 584 of 658 familyless roles are exploration/manual vocabulary. 9 families have no scored-role-backed static Discovery coverage, and 11 have no exact-label Refine question.

## Question coverage

- Static bank: 20 broad Discovery, 52 adaptive Discovery, and 28 Refine questions across 44 traits.
- Effective fixture journeys: 37 complete deterministic journeys observed 42/52 adaptive questions; 10 were not exercised by those fixtures.
- 49 questions retain uniform trait groups across scored answers. This is a shape diagnostic, not proof that the answers are semantically redundant.
- 2 same-phase question groups share an identical declared trait set.
- 7 questions touch five or more traits and merit later semantic review for overload.
- 44/44 traits have both positive and negative answer paths in the static bank.

Static coverage means a question exists and can emit evidence. Effective coverage means the current adaptive selector actually chose it in the existing persona journeys; neither metric alone proves population-level coverage.

## Role discrimination

- 1 scored-role pair(s) meet the 0.90 high-overlap threshold.
- 0 groups share an exact scored evidence fingerprint.
- Five diagnostics are explicitly retained and reviewed: Dominant/Authority Holder statistical overlap, plus narrow single-axis signals for Voyeur, Kink Explorer, and Community Connector.
- Existing adaptive discrimination scenarios pass 7/7.

The confirmed finding is statistical similarity, not semantic equivalence. No merge or weight change is justified by J.0 alone. Pairs outside the reviewed exception list remain potential journey-testing candidates.

## Recommendation baseline

- 50/50 recommendation scenarios pass.
- Suggested Role Set is capped at 5; base/adjusted optimizer thresholds are 0.58/0.52.
- Deterministic repeat: PASS.
- Candidate evidence, eligibility, exclusion reasons, selected families, role order, and suggested primary are recorded per scenario in JSON.
- Library order remains a final production tie resolver after substantive optimizer comparisons; existing diagnostics show 16 such selection steps and five hypothetical set-order differences under stable-ID final ordering, with zero suggested-primary differences.

## Full Reflection writing audit

12 valid fixtures cover empty, single-role, related-role, mixed-family, manually edited, low-evidence, optional-section, full-explicit, and default disclosure states.

Verified findings:

- The output is deterministic and section-oriented rather than narratively synthesized.
- Role entries use repeated metric templates and bullet construction.
- Safety, identity, consent, and independence caveats are explicit but repeated across outputs.
- Optional sections are concatenated with headings; there are no transitions connecting role patterns to reflection, boundaries, or communication.
- The current implementation does not use random prose, runtime AI, or external language generation.

The current output is clear and privacy-explicit, but it reads as deterministic report assembly rather than a coherent reflection. Repeated metric explanations, bullets, caveats, and section headers create mechanical rhythm. The future rewrite can improve synthesis without changing scores or recommendations, but must preserve exact disclosure controls and deterministic output.

## Issue register

| Finding | Origin | Why it matters / affected users | Locked semantics? | Can address without scoring? | Status |
| --- | --- | --- | --- | --- | --- |
| Family metadata covers 449/1107 roles | `role-library.source.json` familyIds | Family-level coverage analysis is incomplete for exploratory vocabulary | No automatic reclassification in J.0 | Yes, through reviewed metadata work | Verified |
| Fixture journeys leave 10 adaptive questions unobserved | Adaptive selector + current persona corpus | Unmeasured branches may hide coverage or navigation gaps | Selector behavior is locked for J.0 | Yes, add journey fixtures first | Verified measurement gap |
| Dominant and Authority Holder overlap statistically | Scored trait fingerprints | Nearby vocabulary may be hard to distinguish | Weights/roles locked in J.0 | Journey tests can improve evidence without changing scoring | Verified, intentionally accepted |
| Full Reflection is section-concatenated | `buildFullReflection()` | Readers receive correct facts with limited synthesis | Output semantics/formats locked in J.0 | Future deterministic writing layer can preserve data | Verified |
| 1054 roles lack reviewed relationship edges | Public role-library relationship metadata | Redundancy/exploration cannot use missing semantic edges | No relationship changes in J.0 | Yes, after editorial review | Verified inventory; incompleteness impact is a hypothesis |

## Current validation baseline

- Calibration personas: 100/100; critical failures 0; reviewed warnings 5.
- Adaptive discrimination: 7/7.
- Decision pathways: 10/10.
- Recommendation scenarios: 50/50.
- Readiness critical-flag persistence: PASS.
- Boundary independence: PASS.

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
