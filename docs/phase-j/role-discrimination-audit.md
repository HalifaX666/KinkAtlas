# Phase J.2 role discrimination audit

Baseline commit: `a69da54a808c56c6a4a991859efd3f4f80dabd53`

## Scored-role pairs

| Pair | Fingerprint similarity | Selected differentiators | Largest observed raw-alignment gap | Finding |
| --- | ---: | --- | ---: | --- |
| Dominant / Authority Holder | 0.916 | r-authority-style, r-discipline-give, r-lifestyle-power, r-protocol, r-structure-style | 0.107 | weak-statistical-discrimination |
| Submissive / Bottom | 0.122 | r-bottom, r-hum-receive, r-material-sense, r-receiving-focus, r-surrender | 0.512 | strong-observed-discrimination |
| Top / Dominant | 0.418 | r-authority-style, r-hum-give, r-lead, r-owner, r-primal-give, r-story-lead | 0.302 | strong-observed-discrimination |
| Rigger / Rope Bottom | 0.117 | r-lead, r-material-craft, r-rope-both, r-rope-give, r-rope-motivation, r-rope-receive | 0.659 | strong-observed-discrimination |
| Switch / Dominant | 0.489 | r-authority-style, r-lead, r-surrender | 0.434 | strong-observed-discrimination |
| Sadist / Sensation Top | 0.212 | r-bottom, r-pain-give, r-pain-receive, r-receiving-focus, r-top | 0.459 | strong-observed-discrimination |
| Pet / Owner | 0.285 | r-care-give, r-hum-give, r-owner, r-pet, r-protector, r-story-lead | 0.530 | strong-observed-discrimination |
| Owner / Handler | 0.751 | r-authority-style, r-hum-give, r-lead, r-owner, r-primal-give, r-protector, r-story-lead | 0.165 | strong-observed-discrimination |
| Primal Hunter / Primal Prey | 0.684 | r-hum-give, r-hum-receive, r-primal-give, r-primal-receive, r-story-lead, r-surrender | 0.231 | strong-observed-discrimination |
| Service Dominant / Service Submissive | 0.519 | r-lead, r-service-direct, r-service-position, r-top | 0.334 | strong-observed-discrimination |

The comparison uses scored-role fingerprints, static differentiating/contrary traits, and actual J.2 selector journeys. It does not claim that all editorial meanings can be reduced to score distance. Manual-only vocabulary requires Refine or user selection rather than fabricated scored comparisons.

## Five retained diagnostics

- **dominant / HIGH_DUPLICATION:** retained and visible. Static question count 30; estimated evidence coverage 1.000; nearest neighbor authority-holder (0.916). Realistic checks: positive `structured-discipline-giver` (0.765), negative `bounded-humiliation-receiver` (0.000), ambiguous `bounded-humiliation-giver` (0.490).
- **authority-holder / HIGH_DUPLICATION:** retained and visible. Static question count 30; estimated evidence coverage 1.000; nearest neighbor dominant (0.916). Realistic checks: positive `structured-discipline-giver` (0.767), negative `bounded-humiliation-receiver` (0.078), ambiguous `bounded-humiliation-giver` (0.467).
- **voyeur / SINGLE_TRAIT_DEPENDENCY:** retained and visible. Static question count 16; estimated evidence coverage 1.000; nearest neighbor audience-switch (0.533). Realistic checks: positive `observer-not-performer` (0.698), negative `objectification-receiving-frame` (0.019), ambiguous `high-uncertainty-low-evidence` (0.484).
- **kink-explorer / SINGLE_TRAIT_DEPENDENCY:** retained and visible. Static question count 13; estimated evidence coverage 1.000; nearest neighbor kinkster (0.759). Realistic checks: positive `observer-not-performer` (0.492), negative `rope-giver-craft` (0.083), ambiguous `observer-not-performer` (0.492).
- **community-connector / SINGLE_TRAIT_DEPENDENCY:** retained and visible. Static question count 30; estimated evidence coverage 1.000; nearest neighbor kinkster (0.649). Realistic checks: positive `broad-mixed-interests` (0.470), negative `material-sensory-focus` (0.085), ambiguous `broad-mixed-interests` (0.470).

Dominant and Authority Holder are statistically close because responsibility, direction, structure, leadership, and control overlap. `r-authority-style`, explicit-authority qualification, dominance weighting, and structure weighting provide a defensible distinction, but the pair remains the weakest measured scored-role separation. The single-axis Voyeur, Kink Explorer, and Community Connector signals are narrow by design and have independent follow-ups; adding unrelated traits only to silence diagnostics would be misleading.

## Family-level evidence gaps

| Family | Scored roles | Direct-interest roles | Exploration-only roles | Current support |
| --- | ---: | ---: | ---: | --- |
| Degradation and objectification | 0 | 4 | 1 | Refine/direct/manual only |
| Denial and control | 0 | 1 | 0 | Refine/direct/manual only |
| Material and fetish identity | 0 | 32 | 0 | Refine/direct/manual only |
| Praise and affection | 0 | 5 | 1 | Refine/direct/manual only |
| Persona and fantasy | 0 | 2 | 36 | Refine/direct/manual only |
| Sexual role vocabulary | 0 | 31 | 23 | Refine/direct/manual only |

Exploration-only design is not automatically an omission. A future question is justified only when the product intends to infer a role, a qualifying scored role and evidence contract exist, and the question improves a measured distinction without creating false-positive identity suggestions.

## Authority Holder mapping

- Scored role exists: yes.
- Exact public node or canonical mapping: 0.
- Public records referencing it as a nearest scored role: 3.
- Conclusion: **missing-public-role-node-not-a-reporting-artifact.** This is a real vocabulary mapping gap, not a reporting artifact. Whether it is intentional requires editorial approval; J.2 does not add a node.

## Direct-interest pathway

- Public roles marked direct-interest: 94.
- Metadata eligibility distribution: eligible-with-direct-evidence 94.
- Runtime candidate eligibility: always false in `candidateEvidence()` for `decisionPathway === 'direct-interest'`.
- Conclusion: **metadata and candidate behavior are inconsistent or the intended manual-only policy is undocumented.** This requires a product decision before any eligibility change.
