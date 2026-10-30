# Phase J.3 improvement proposals

Baseline commit: `32d3d6d0da12112f386659c3c35a6615ec1ca362`

No proposal below is implemented in J.3.

## Priority 1 - Resolve the direct-interest evidence contract

- **Evidence:** 94 metadata records versus 0 eligible production-selector occurrences.
- **Benefit:** aligns metadata, user expectations, and testable eligibility.
- **Regression risk:** high; unsupported confirmation could alter eligibility, confidence, set membership, and primary selection.
- **Dependency:** explicit product and editorial decision from J3-D1.

## Priority 2 - Resolve Authority Holder translation

- **Evidence:** scored construct present, exact public node count 0, nearest references 3.
- **Benefit:** makes explanations, public navigation, and primary semantics intelligible.
- **Regression risk:** medium to high if a node becomes eligible; low for documentation of an intentional internal translation.
- **Dependency:** editorial decision from J3-D2.

## Priority 3 - Review measured omitted-interest and fifth-slot cases

- **Evidence:** 5 scenarios omitted an independently supported family candidate; 0 fifth slots carried material redundancy.
- **Scenario-intent review:** 8 deliberately constructed journeys retain explicit review prompts for potentially over-broad, over-specific, directionally surprising, or slot-limited outputs.
- **Benefit:** focuses future optimizer work on concrete marginal-contribution cases rather than maximizing role count.
- **Regression risk:** high if weights or thresholds change globally.
- **Dependency:** human review of scenario intent and acceptable alternative sets.

## Priority 4 - Review relationship proposals with observed consequences first

- **Evidence:** 1/7 individual edges affected the measured corpus; combined membership changes 0, primary changes 0.
- **Benefit:** tests whether reviewed semantic edges reduce actual redundancy or improve explainability.
- **Regression risk:** medium; penalties and primary centrality can create cross-persona tradeoffs.
- **Dependency:** J.1 editorial approval and scenario-by-scenario review.

## Priority 5 - Keep family proposals editorially separate from eligibility

- **Evidence:** 0/27 high-confidence family candidates affected current tested outputs.
- **Benefit:** improves taxonomy without falsely claiming assessment support.
- **Regression risk:** currently low for never-eligible roles, but future eligibility changes can activate optimizer effects.
- **Dependency:** family editorial review; no eligibility expansion in the same change.

## Priority 6 - Replace incidental tie order only with a demonstrated semantic rule

- **Evidence:** 20 exact pre-final-order ties; alternative effects are recorded in the counterfactual JSON.
- **Benefit:** could make rare equal-score choices more explainable.
- **Regression risk:** medium because deterministic set membership may change.
- **Dependency:** reviewed acceptable-output sets and a documented independent criterion.

## Priority 7 - Retain J.3 journeys as regression coverage

- **Evidence:** 19 production-selector journeys and 6 bounded variants now exercise directional, related-role, mixed-interest, sparse, contrary, and threshold cases.
- **Benefit:** protects current behavior and makes future recommendation changes measurable.
- **Regression risk:** low; fixtures are observational and synthetic.
