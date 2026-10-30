# Phase J.4 Results explanation contract

## Purpose

Results explanations help a person interpret existing assessment output. They do not create evidence, change recommendations, or assign identity.

## Allowed claims

| Presentation | Required evidence | Allowed claim |
| --- | --- | --- |
| Overview suggestion count | Final production optimizer recommendations | The answers point toward zero, one, or several suggestions. |
| Answer theme | Supporting traits on a mapped scored `RoleResult` | The named theme came through in available answers. |
| Suggested role rationale | Existing candidate evidence explanation or scored-role explanation | The reviewed evidence pathway supported exploring the label. |
| Suggested primary | `RoleProfileOptimization.primary` | KinkAtlas selected the role as the suggested primary for the generated set. |
| Alignment | Existing `RoleResult.alignment` | Answers resemble the role’s reviewed themes to the labelled degree. |
| Confidence | Existing `RoleResult.confidence` and confidence explanation | More or less relevant answer evidence was available. |
| Evidence breadth | Existing `RoleResult.coverage` | A proportion of the role’s reviewed theme set had usable answer evidence. |
| Exact vocabulary confirmation | Existing confirmed refinement evidence | The person directly selected that vocabulary. Confirmation alone creates no alignment percentage or confidence. |
| Distinction | Existing `notImplied` text or reviewed relationship metadata | The reviewed distinction or related vocabulary is available to inspect. |
| Manual role | `EditableRoleProfileEntry.source === 'user-selected'` | The person added the role; no assessment score or confidence is attached. |

## Prohibited claims

- Identity certainty, diagnosis, clinical certainty, compatibility, safety, consent, or real-world behavior.
- A new confidence score, composite certainty score, or percentage interpretation.
- A role theme inferred from family membership, role name, visual similarity, or fingerprint similarity alone.
- A related-role distinction without reviewed public metadata.
- Personal endorsement of a role unless it was directly confirmed or manually selected.
- Reconstructed evidence for historical snapshots that do not contain it.

## Uncertainty language

- Confidence is evidence quantity and coverage, not certainty about identity.
- Unanswered areas are unknown, not negative answers.
- Sparse evidence may produce no suggestion without implying no relevant interests.
- A direct confirmation may support vocabulary without producing scored alignment or confidence.
- A set may legitimately have no suggested primary.

## Source boundaries

J.4 explanations consume only existing in-memory assessment results and reviewed public role metadata. They introduce no persistence, analytics, telemetry, network transmission, new share fields, or raw-answer disclosure. Full Reflection continues to use its existing deterministic generator and explicit disclosure controls.
