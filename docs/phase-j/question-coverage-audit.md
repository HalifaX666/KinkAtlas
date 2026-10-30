# Phase J.2 question coverage and adaptive reachability audit

Baseline commit: `a69da54a808c56c6a4a991859efd3f4f80dabd53`

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
| Original J.0 corpus | 37 | 42/52 | 80.8% |
| Original plus J.2 journeys | 56 | 52/52 | 100% |

These are constructed regression journeys, not a model of user frequency. Six adaptive slots remain a real competition: broad or mixed profiles can leave relevant questions unasked even when they are eligible.

## Ten J.0-unobserved questions

| Question | Domain | Classification | Valid selector witness | Domain rejected in J.2 journeys |
| --- | --- | --- | --- | ---: |
| `r-positions` | play-position | reachable-and-observed-by-new-valid-journey | activity-flexibility-without-authority, primal-pursuit-only, primal-evasion-only, high-uncertainty-low-evidence | 6/19 |
| `r-discipline-give` | discipline-protocol | reachable-and-observed-by-new-valid-journey | structured-discipline-giver, structured-praise-receiver, pet-owner-guidance | 15/19 |
| `r-hum-give` | psychological-play | reachable-and-observed-by-new-valid-journey | bounded-humiliation-giver, bounded-humiliation-receiver, objectification-giving-frame | 11/19 |
| `r-hum-receive` | psychological-play | reachable-and-observed-by-new-valid-journey | bounded-humiliation-giver, bounded-humiliation-receiver, objectification-receiving-frame | 11/19 |
| `r-praise-direction` | psychological-play | reachable-and-observed-by-new-valid-journey | bounded-humiliation-receiver, structured-praise-receiver | 11/19 |
| `r-praise-context` | psychological-play | reachable-and-observed-by-new-valid-journey | structured-praise-receiver | 11/19 |
| `r-material-sense` | fetish-material | reachable-and-observed-by-new-valid-journey | material-sensory-focus | 14/19 |
| `r-objectification-frame` | fetish-material | reachable-and-observed-by-new-valid-journey | objectification-giving-frame, objectification-receiving-frame | 14/19 |
| `r-objectification-focus` | fetish-material | reachable-and-observed-by-new-valid-journey | objectification-giving-frame, objectification-receiving-frame | 14/19 |
| `r-objectification-direction` | fetish-material | reachable-and-observed-by-new-valid-journey | objectification-giving-frame, objectification-receiving-frame | 14/19 |

Every witness listed above was produced by repeatedly calling `selectNextDiscoveryQuestion`; no adaptive question was injected. A non-selected question is classified as potentially starved or inconclusive, not declared unreachable.

## New deterministic journeys

### activity-flexibility-without-authority

Flexible activity positions with exploration, while rejecting broader authority.

- Adaptive order: `r-top`=strong, `r-lead`=some, `r-bottom`=strong, `r-sensation`=some, `r-receiving-focus`=some, `r-positions`=strong
- Eligible candidates: role:bottom-479ad21a, role:sensation-top-be81d99c, role:service-bottom-509ee821, role:top-d5cdfcf7, role:vers-1a60a8ce
- Suggested Role Set: role:vers-1a60a8ce, role:sensation-top-be81d99c, role:service-bottom-509ee821
- Suggested primary: role:vers-1a60a8ce

### structured-discipline-giver

Agreed structure and consequence-giving with explicit authority and responsibility.

- Adaptive order: `r-authority-style`=strong, `r-top`=some, `r-lifestyle-power`=some, `r-discipline-give`=strong, `r-owner`=some, `r-lead`=strong
- Eligible candidates: role:disciplinarian-3e223583, role:dominant-4cfaa6ab, role:gentle-dom-6a520856, role:handler-53cae329, role:owner-4b1b8aa3, role:pleasure-dom-f0f5f5c7, role:service-dom-2506f7b2, role:service-top-1030da11, role:trainer-9f085ee9
- Suggested Role Set: role:dominant-4cfaa6ab, role:disciplinarian-3e223583, role:service-top-1030da11, role:handler-53cae329, role:pleasure-dom-f0f5f5c7
- Suggested primary: role:dominant-4cfaa6ab

### bounded-humiliation-giver

Carefully bounded psychological intensity from the giving side without receptive interest.

- Adaptive order: `r-hum-give`=strong, `r-story-lead`=some, `r-story-enter`=some, `r-lead`=some, `r-top`=some, `r-hum-receive`=no
- Eligible candidates: role:top-d5cdfcf7
- Suggested Role Set: role:top-d5cdfcf7
- Suggested primary: role:top-d5cdfcf7

### bounded-humiliation-receiver

Carefully bounded psychological intensity from the receiving side without giving interest.

- Adaptive order: `r-story-enter`=some, `r-hum-receive`=strong, `r-praise-direction`=some, `r-bottom`=some, `r-hum-give`=no, `r-surrender`=some
- Eligible candidates: role:service-bottom-509ee821, role:submissive-70cf87f8
- Suggested Role Set: role:submissive-70cf87f8, role:service-bottom-509ee821
- Suggested primary: role:submissive-70cf87f8

### warm-praise-giver

Giving warm recognition and care without broader authority.

- Adaptive order: `r-service-give`=some, `r-top`=some, `r-service-direct`=some, `r-service-position`=curious, `r-care-give`=strong, `r-care-receive`=some
- Eligible candidates: role:caregiver-b45607f2, role:handler-53cae329, role:protector-84edb6a5, role:service-switch-c5501773, role:service-top-1030da11
- Suggested Role Set: role:service-top-1030da11, role:caregiver-b45607f2, role:handler-53cae329, role:service-switch-c5501773, role:protector-84edb6a5
- Suggested primary: role:service-top-1030da11

### structured-praise-receiver

Receiving recognition tied to agreed goals and structure.

- Adaptive order: `r-bottom`=some, `r-praise-context`=some, `r-discipline-give`=some, `r-protocol`=some, `r-structure-style`=some, `r-praise-direction`=some
- Eligible candidates: role:disciplinarian-3e223583, role:service-bottom-509ee821
- Suggested Role Set: role:disciplinarian-3e223583, role:service-bottom-509ee821
- Suggested primary: role:disciplinarian-3e223583

### material-sensory-focus

Material sensation is central while technical collecting and unrelated intensity are not.

- Adaptive order: `r-pain-receive`=some, `r-sensation`=strong, `r-material-sense`=strong, `r-receiving-focus`=some, `r-bottom`=some, `r-material-craft`=no
- Eligible candidates: role:bottom-479ad21a, role:masochist-a8bcaeab, role:service-bottom-509ee821
- Suggested Role Set: role:masochist-a8bcaeab, role:service-bottom-509ee821, role:bottom-479ad21a
- Suggested primary: role:masochist-a8bcaeab

### objectification-giving-frame

A bounded objectification frame from the giving side, distinct from humiliation.

- Adaptive order: `r-exhibit`=some, `r-objectification-frame`=strong, `r-hum-give`=no, `r-objectification-focus`=strong, `r-objectification-direction`=strong, `r-story-lead`=some
- Eligible candidates: role:exhibitionist-a68c66d6
- Suggested Role Set: role:exhibitionist-a68c66d6
- Suggested primary: role:exhibitionist-a68c66d6

### objectification-receiving-frame

A bounded objectified role from the receiving side with symbolic display interest.

- Adaptive order: `r-exhibit`=some, `r-hum-receive`=no, `r-objectification-focus`=strong, `r-objectification-frame`=strong, `r-objectification-direction`=some, `r-story-enter`=some
- Eligible candidates: role:exhibitionist-a68c66d6
- Suggested Role Set: role:exhibitionist-a68c66d6
- Suggested primary: role:exhibitionist-a68c66d6

### rope-giver-craft

Technical rope tying without receiving-rope interest.

- Adaptive order: `r-rope-give`=strong, `r-top`=some, `r-rope-motivation`=strong, `r-lead`=some, `r-rope-receive`=no, `r-rope-both`=no
- Eligible candidates: role:bondage-top-843060ea, role:rigger-5d2f2d93, role:rope-top-9af55bf6
- Suggested Role Set: role:rigger-5d2f2d93, role:bondage-top-843060ea
- Suggested primary: role:rigger-5d2f2d93

### rope-receiver-sensation

Receiving rope for bodily sensation without tying interest or submission.

- Adaptive order: `r-rope-give`=no, `r-pain-receive`=some, `r-receiving-focus`=some, `r-bottom`=strong, `r-sensation`=some, `r-pain-give`=some
- Eligible candidates: role:bottom-479ad21a, role:masochist-a8bcaeab, role:service-bottom-509ee821
- Suggested Role Set: role:bottom-479ad21a, role:masochist-a8bcaeab, role:service-bottom-509ee821
- Suggested primary: role:bottom-479ad21a

### pet-expression-receiver

Adult pet expression and receiving care without ownership interest.

- Adaptive order: `r-pet`=strong, `r-care-receive`=some, `r-story-enter`=some, `r-brat`=some, `r-story-lead`=some, `r-tamer`=some
- Eligible candidates: role:pet-8f0d1b30
- Suggested Role Set: role:pet-8f0d1b30
- Suggested primary: role:pet-8f0d1b30

### pet-owner-guidance

Guidance and care in adult pet play with explicit bounded ownership interest.

- Adaptive order: `r-care-give`=some, `r-owner`=strong, `r-authority-style`=some, `r-protector`=strong, `r-lead`=some, `r-discipline-give`=some
- Eligible candidates: role:caregiver-b45607f2, role:dominant-4cfaa6ab, role:gentle-dom-6a520856, role:handler-53cae329, role:owner-4b1b8aa3, role:protector-84edb6a5, role:trainer-9f085ee9
- Suggested Role Set: role:owner-4b1b8aa3, role:dominant-4cfaa6ab, role:caregiver-b45607f2, role:handler-53cae329
- Suggested primary: role:owner-4b1b8aa3

### primal-pursuit-only

Pursuit and containment without evasion interest.

- Adaptive order: `r-primal-give`=strong, `r-top`=some, `r-primal-receive`=no, `r-positions`=some, `r-lead`=some, `r-authority-style`=some
- Eligible candidates: role:primal-hunter-af2866bb, role:primal-predator-a89f810a, role:primal-switch-705db664, role:top-d5cdfcf7
- Suggested Role Set: role:primal-predator-a89f810a, role:top-d5cdfcf7, role:primal-switch-705db664
- Suggested primary: role:primal-predator-a89f810a

### primal-evasion-only

Evasion and being pursued without pursuit interest.

- Adaptive order: `r-primal-give`=no, `r-bottom`=some, `r-positions`=some, `r-receiving-focus`=some, `r-sensation`=some, `r-pain-receive`=some
- Eligible candidates: role:bottom-479ad21a, role:service-bottom-509ee821
- Suggested Role Set: role:bottom-479ad21a, role:service-bottom-509ee821
- Suggested primary: role:bottom-479ad21a

### sensation-without-sadism

Sensory contrast without interest in giving or receiving pain.

- Adaptive order: none
- Eligible candidates: none
- Suggested Role Set: empty (valid)
- Suggested primary: none

### observer-not-performer

Consensual observation without exhibition or performance interest.

- Adaptive order: `r-voyeur`=strong, `r-exhibit`=no, `r-community`=some, `r-exploration-context`=some, `r-sensation`=some, `r-brat`=some
- Eligible candidates: role:voyeur-4af03138
- Suggested Role Set: role:voyeur-4af03138
- Suggested primary: role:voyeur-4af03138

### high-uncertainty-low-evidence

Uncertain and prefer-not responses exercise non-scoring paths.

- Adaptive order: `r-community`=prefer-not, `r-exploration-context`=prefer-not, `r-sensation`=prefer-not, `r-positions`=prefer-not, `r-voyeur`=prefer-not, `r-pet`=prefer-not
- Eligible candidates: none
- Suggested Role Set: empty (valid)
- Suggested primary: none

### broad-mixed-interests

Several plausible themes compete for the six adaptive slots.

- Adaptive order: `r-pain-receive`=some, `r-care-receive`=some, `r-rope-receive`=some, `r-primal-receive`=some, `r-pet`=some, `r-primal-give`=some
- Eligible candidates: role:brat-tamer-e2e114dd, role:masochist-a8bcaeab, role:pet-8f0d1b30, role:primal-hunter-af2866bb, role:primal-predator-a89f810a, role:primal-prey-544c0478, role:rope-bottom-f8a5d024, role:rope-bunny-5cad7d0c, role:sensation-top-be81d99c, role:service-submissive-8cbb9bd3, role:service-top-1030da11, role:top-d5cdfcf7
- Suggested Role Set: role:rope-bottom-f8a5d024, role:brat-tamer-e2e114dd, role:pet-8f0d1b30, role:top-d5cdfcf7, role:masochist-a8bcaeab
- Suggested primary: role:rope-bottom-f8a5d024


## Interpretation

The added corpus exercises directional authority/activity, yielding/bottoming, rope, primal, service, pet/owner, sensation, visibility, praise, material, objectification, uncertainty, and mixed evidence. It is intentionally small and semantic. Coverage gains show test reachability, not population representativeness or a mandate to ask more questions.
