# Phase J.1 decision register

Baseline commit: `fb44e89b3b8e65e3949239dac32a8e8ae69b65e1`

| Finding ID | Affected family or roles | Current behavior | Evidence | Proposed action | Confidence | Expected benefit | Risk to existing semantics | Approval required | Suggested phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J1-001 | Authority Holder / Dominant | The scored Authority Holder has no exact library node; statistical overlap with Dominant is retained. | Scored-role data, nearest-role references, and the reviewed overlap diagnostic. | Decide whether Authority Holder needs a public node or an explicit mapping before proposing a relationship. | high | Makes a known distinction explainable in the public taxonomy. | High if a new eligible node or relationship is introduced. | yes | J.2 |
| J1-002 | Direct-interest pathways | Direct-interest metadata exists, but current candidate construction does not automatically qualify this pathway. | Role-library decision pathways compared with candidateEvidence(). | Define the intended evidence contract before changing eligibility or counting these families as assessed. | high | Aligns metadata claims with actual recommendation behavior. | Critical: eligibility and Suggested Role Sets could change. | yes | J.2 |
| J1-003 | Nine families without scored coverage | Nine families lack canonical scored-role-backed Discovery evidence; several still have domain questions or Refine metadata. | Family evidence map coverage layers. | Review each gap classification; preserve editorial-only families and test any proposed assessment gap separately. | high | Prevents editorial coverage from being mistaken for assessment coverage. | Medium to high if questions, mappings, or eligibility change. | yes | J.2 |
| J1-004 | 658 familyless roles | Familyless roles are all exploration-only by eligibility; 74 use explicit-selection modes. | Familyless role review and source metadata. | Review high-confidence candidates first; do not bulk-assign families. | high | Improves browsing consistency without inventing evidence. | Low for current manual-only roles, but family metadata is optimizer-sensitive if eligibility changes. | yes | J.2 |
| J1-005 | degradation-objectification / praise-affection | Praise-oriented labels overlap a family framed around degradation/objectification. | Current memberships and reviewed definitions. | Clarify whether the overlap is intentional polarity, multi-membership, or a misplaced assignment. | high | Reduces confusing editorial grouping. | Medium if family assignments change for eligible roles. | yes | J.2 |
| J1-006 | sexual-role-vocabulary | The family mixes activity, relationship, fetish, and reclaimed identity vocabulary. | Member inventory and overlapping family memberships. | Define the familyâ€™s editorial purpose before splitting, narrowing, or adding memberships. | high | Makes navigation and explanation more defensible. | Medium; many members carry direct-interest/hybrid metadata. | yes | J.2 |
| J1-007 | submissive / Bottom and directional candidates | Several high-value comparison pairs lack reviewed edges. | Existing edge patterns and proposed relationship review. | Approve only after optimizer counterfactual tests for each pair. | medium | Improves comparison and redundancy handling. | High for pairs that can co-occur as eligible candidates. | yes | J.2 |
| J1-008 | Adaptive family evidence | Existing journeys leave relevant adaptive questions unobserved for several families. | Fixture-observed effective coverage. | Add deterministic journeys before interpreting static coverage as reachable. | high | Separates bank presence from exercised assessment behavior. | Low for fixture-only work; high if routing later changes. | no for tests; yes for routing | J.2 |

## Classification rules

- Editorial metadata findings do not justify scoring changes.
- Assessment evidence findings require a measured distinction and regression fixture before semantic changes.
- Recommendation findings are behavior-sensitive whenever families or relationships could alter redundancy, representation, or primary centrality.
- Intentional exploration-only coverage is not a defect.
- Every candidate remains unimplemented pending explicit approval.
