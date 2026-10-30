# Phase J.3 recommendation decision register

Baseline commit: `32d3d6d0da12112f386659c3c35a6615ec1ca362`

No decision below is implemented by J.3.

## J3-D1 - Direct-interest eligibility

- **Current behavior:** 94 public roles declare direct-interest metadata, but production-selector journeys produced 0 eligible occurrences.
- **Missing contract:** the explicit user action, exact label mapping, stored evidence, confidence treatment, primary eligibility, and rejection behavior.
- **Decision:** choose documented manual/exploration-only behavior or design a reviewed explicit-evidence gate. Do not infer eligibility from related broad answers.
- **Risk:** high; a permissive rule could generate unsupported identity suggestions.

## J3-D2 - Authority Holder public translation

- **Current behavior:** a scored construct exists with 0 exact public nodes and 3 nearest-role references.
- **Options:** dedicated public node; explicit alias/canonical mapping; internal-only construct with explicit translation.
- **Decision:** editorial and product approval is required before changing vocabulary or eligibility.
- **Risk:** medium to high; a public eligible node can change sets and primary selection.

## J3-D3 - Seven J.1 relationship proposals

- **Measured result:** 1/7 individual proposals affected at least one measured selection score/order/primary; the combined proposal changed 0 memberships and 0 primaries.
- **Decision:** review semantic correctness independently from optimizer impact. Zero measured effect is not evidence that an edge is editorially correct.
- **Risk:** commonly-overlapping edges can change redundancy; directional and switch edges can change primary centrality.

## J3-D4 - High-confidence family candidates

- **Measured result:** 0/27 proposed memberships affected this corpus.
- **Decision:** review editorial membership first. Do not enable excluded roles merely to make family metadata influence recommendations.
- **Risk:** membership can change family novelty and redundancy if a role later becomes eligible.

## J3-D5 - Final tie rule

- **Current behavior:** 20 exact pre-final-order ties; library order is deterministic but editorially incidental.
- **Measured alternatives:** stable-role-id changed 7; stronger-independent-evidence changed 7; greater-distinctiveness changed 7; conservative-specificity changed 7.
- **Decision:** retain library order unless an independent rule has clearer semantics across reviewed scenarios.
- **Risk:** set membership can change even without a primary change.

## J3-D6 - Primary-role uncertainty

- **Current behavior:** the optimizer selects the strongest allowed primary whenever a qualifying primary-capable recommendation exists.
- **Measured concerns:** 0 policy/support violations under the audit rubric.
- **Decision:** decide whether technically valid but closely balanced sets should allow no headline primary. Synthetic evidence alone is insufficient to change this product contract.
