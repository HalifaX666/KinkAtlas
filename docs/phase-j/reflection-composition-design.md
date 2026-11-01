# Phase J.5 deterministic reflection composition design

## Architecture

`buildFullReflectionNarrative` in `src/engine/shareResults.ts` is the adapter between existing product data and the narrative layer. It normalizes only the sections enabled by `ShareOptions`, then calls `composeFullReflection` in `src/engine/reflectionNarrative.ts`.

The narrative layer has no access to assessment answers, routing, scoring functions, recommendation construction, storage, networking, or UI state outside the normalized input.

## Staged pipeline

1. **Collect permitted evidence:** the adapter reads the existing current Role Set, role results, evaluated readiness, blind spots, explicit boundaries, and explicit negotiation choices.
2. **Normalize typed facts:** user-facing labels and reviewed definitions become `ReflectionRoleFact`, `ReflectionReadinessFact`, `ReflectionBlindSpotFact`, `ReflectionBoundaryFact`, and `ReflectionNegotiationFact` records.
3. **Select themes:** supporting role signals are counted by reviewed label. The three most informative stable themes are selected by frequency, then original evidence order.
4. **Plan sections:** claims are assigned to What stood out, Interests and dynamics, Roles and vocabulary, Nuance and uncertainty, Reflection and readiness, Potential blind spots, Wants & boundaries, Conversation preferences, and What to take from this.
5. **Attach provenance:** every claim receives a stable ID, evidence category, source type, and source identifiers.
6. **Control density:** sparse profiles omit unsupported sections. Large readiness bands are summarized. The five strongest blind-spot cues retain detail; additional cues retain a count and representative titles.
7. **Realize prose:** stable structural branches choose singular/plural and evidence-appropriate sentences. There is no synonym roulette or uncontrolled phrase replacement.
8. **Remove duplicate claims:** exact normalized claim text is emitted once.
9. **Render:** sections and claims are joined in deterministic order as plain text for the existing preview/copy UI.

## Determinism

The engine uses no runtime randomness, timestamp, locale-dependent sort, external model, network response, or user identity. Stable input order is preserved. Repeated generation for identical data and options is byte-identical.

Structural variation depends only on non-sensitive facts already selected for output:

- zero, one, or several current roles;
- assessment-supported versus manually added role source;
- supporting signal recurrence;
- existing confidence labels;
- readiness band counts;
- blind-spot severity and input order;
- selected boundary and negotiation content.

Variation changes sentence shape, not claim strength.

## Redundancy controls

- Metric definitions no longer precede every report.
- Role metrics are compact annotations beside the relevant reviewed definition.
- Confidence uncertainty appears once, only when lower-confidence roles exist.
- Manual-role source and lack of assessment metrics are stated in the opening rather than repeated on each manual role line.
- The identity/readiness/consent boundary appears in one closing section.
- Empty role sets omit role and interests sections instead of receiving filler.
- Large lists are summarized without converting missing evidence into a claim.

Exact negotiation choices remain a structured list when they are specific. This is intentional: paraphrasing them could change what the person selected.

## Relationship and role-set boundaries

The engine explains each role with its reviewed definition and the scored supporting traits available for that role. It does not infer role relationships from shared families or similar names.

The adapter receives the current editable Role Set, not a complete before/after edit history. It can distinguish assessment-supported entries from manually added entries and preserve current order. It cannot safely infer why a suggested role was removed, so it makes no rejection claim.

Suggested Role Set construction, optimizer order, primary selection, and Role Discovery remain outside this engine.

## Disclosure and privacy

Only selected sections are normalized. Provenance stays in memory and is discarded after rendering. The copied output contains no raw Discovery or Refine answers, internal scores, IDs, or provenance metadata. No persistence, analytics, telemetry, upload, or background action was added.

## Historical and Capsule compatibility

Full Reflection prose is generated on demand and is not a field in `ResultSnapshot`, `SharePackage`, Private Restore, Secret Capsule, Viewer-Locked Capsule, Revisit, or hosted-result schemas. J.5 therefore requires no format migration or snapshot rewrite.

Existing historical and hosted views continue to render stored structured fields. Previously copied or disclosed prose cannot be altered. A restored live assessment can generate a new reflection using the current presentation engine, just as it could before J.5; the underlying restored evidence and historical snapshot are not rescored or rewritten by the narrative layer.

## Failure and omission policy

- Missing evidence produces an explicit unknown or no section.
- Unsupported themes are omitted.
- Missing role confidence remains unscored.
- A disabled disclosure section contributes nothing.
- The planner does not fill a minimum paragraph count.
- No error is swallowed and no fallback invents personal meaning.
