# Phase J.5 reflection evidence contract

## Purpose

Full Reflection may summarize only information already authorized for its selected disclosure sections. It is a deterministic presentation layer, not a scoring, diagnostic, inference, or recommendation system.

## Permitted claim classes

| Claim class | Required source | Example of permitted meaning |
| --- | --- | --- |
| Direct observation | Existing scored `RoleResult`, evaluated readiness result, blind-spot signal, boundary selection, or negotiation selection | A supporting evidence theme appeared in the available answers. |
| Supported interpretation | More than one authorized observation with the same reviewed theme | A theme recurs across assessment-supported roles in the current set. |
| Qualified possibility | Moderate/low confidence, incomplete coverage, or a reviewed area with limited evidence | An area remains open or may be worth further reflection. |
| Explicit personal choice | Current Role Set source/order, manually added role, boundary choice, negotiation choice, or disclosure checkbox | A role was added by the person or a section was chosen for sharing. |
| Unknown | Genuine missing, unscored, unanswered, or unavailable evidence | The available data does not establish why a set is empty or what an unanswered area means. |

## Authorized inputs

- `RoleResult` fields already used by Results: alignment, confidence, evidence breadth, and reviewed supporting/differentiating signals.
- Current editable Role Set: exact order, role source, role ID, label, and reviewed definition.
- Evaluated readiness competencies and existing blind-spot signals.
- Explicit boundary values when the boundaries section is selected.
- Explicit negotiation choices when the negotiation section is selected.
- Disclosure options selected in the existing Share dialog.

Role definitions explain vocabulary. They are not evidence that the person embodies the role. Family membership, role-name similarity, emblem similarity, and unreviewed semantic proximity are never evidence.

## Required provenance

Every planned claim has an internal claim ID, category, and one or more provenance records. Each provenance record names a permitted source and at least one stable source identifier.

Supported provenance sources are:

- `role-result`
- `role-set-choice`
- `readiness`
- `blind-spot`
- `boundary`
- `negotiation`
- `missing-evidence`
- `disclosure`

Provenance is local implementation metadata. It is not copied into user-facing prose, persisted, uploaded, added to hosted shares, or sent as telemetry.

## Confidence and uncertainty rules

- Confidence describes the amount of relevant answer evidence, not identity certainty.
- Evidence breadth describes coverage of reviewed themes, not match strength.
- Moderate or low confidence must use qualified language.
- A missing confidence label remains missing; it is not reconstructed.
- Manual roles have no assessment alignment, confidence, or evidence breadth.
- Unanswered, unknown, and prefer-not responses are not negative evidence.
- An empty Current Role Set may reflect evidence, editing, or both; the narrative must not choose an explanation.
- Opposite-direction interests are not automatically contradictions, and switching is not indecision.

## Readiness, boundaries, and consent

- Role interest never establishes real-world readiness.
- Readiness text uses only evaluated scenario evidence and never certifies safety or partner conduct.
- Boundaries are explicit selections independent of role alignment.
- A role, role match, preference, boundary, or shared report never communicates consent.
- Sharing a reflection never communicates availability or agreement to an activity.
- Unselected sensitive sections contribute no user-facing claims.

## Forbidden inference

The engine must not infer:

- trauma, personal history, psychological motives, attachment, or mental health;
- sexual orientation, gender identity, relationship structure, or past experience;
- compatibility with a person or community;
- safety, technical competence, risk tolerance, or actual readiness from interest;
- consent from a role, preference, score, or previous choice;
- a fixed, true, permanent, or assigned identity;
- a relationship between roles from family membership or label similarity;
- confidence for a manually added role;
- rejection from missing, neutral, unknown, or prefer-not evidence;
- missing historical evidence after restore.

## Disclosure contract

The existing Share options remain authoritative:

- Roles controls whether role content appears.
- Alignment and confidence are disabled when Roles is off.
- Readiness, blind spots, boundaries, and negotiation are sensitive and off by default.
- Raw Discovery, Refine, and readiness answers are not added to Full Reflection.
- The ordinary Share action still defaults to Public Card; the J.4 shortcut may open the existing Full Reflection mode directly.

## Validation

Focused tests require byte-identical repeated output, non-empty provenance for every claim, profile-specific observations, conservative sparse output, manual-role metric exclusion, disclosure isolation, and absence of prohibited psychological claims across difficult production-selector journeys.
