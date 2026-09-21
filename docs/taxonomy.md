# Role-library methodology and contribution guide

KinkAtlas uses role vocabulary as an educational and self-reflection aid. A role suggestion means that a term may be worth exploring. It never determines identity, consent, compatibility, experience, readiness, or safety.

## Methodology

The public role library is designed around a few boundaries:

- Descriptions are neutral, concise, non-prescriptive, and written for consenting adults.
- A label does not imply a particular activity, relationship structure, level of experience, or scope of consent.
- Activity position, negotiated authority, interests, readiness, and boundaries remain distinct concepts.
- A role can belong to more than one reviewed family.
- Relationships between roles are explicit reviewed metadata, not conclusions created from spelling similarity.
- Terms that cannot be responsibly assessed remain available for manual exploration instead of receiving invented scores or confidence.
- Definitions help explain vocabulary; they do not create recommendation eligibility or scoring evidence.

Role meanings vary by person, community, and context. A description in KinkAtlas is a practical starting point for reflection and conversation, not a universal or authoritative definition.

## Public data flow

The neutral source dataset is `src/data/role-library/role-library.source.json`. It contains the public fields needed to generate `src/data/role-library/role-library.json`, the compact runtime dataset used by the browser.

The generator validates IDs, references, supported modes, relationships, and families before emitting deterministic JSON. The drift check compares generated values with the checked-in runtime file so an ungenerated source edit fails verification.

Do not edit the runtime file as the source of truth. Make an intentional change in the neutral source dataset, generate the runtime output, and review both the semantic change and the resulting diff.

## Reviewing a role change

Before adding a role or changing its metadata, document why the change is useful and verify all of the following:

1. The concept is meaningfully distinct from an existing label, alias, activity, title, material interest, relationship style, or persona.
2. The proposed label and description are understandable without prescribing how someone must behave.
3. Any assessed pathway has evidence that can distinguish the role from nearby roles.
4. Recommendation eligibility matches the evidence actually available; it is never granted merely because a definition exists.
5. Family membership and role relationships reflect reviewed meaning rather than word similarity.
6. The change preserves the separation of role alignment, reflection, boundaries, and consent.
7. Nearby-role behavior, ordering, explanations, and calibration remain coherent.

If the assessment cannot support a term safely, keep it exploration-only. Do not add arbitrary traits, weights, aliases, or relationships to force coverage.

## Definitions

A reviewed definition should:

- describe how the term is commonly used without claiming a single mandatory meaning;
- distinguish the term from its nearest roles when that distinction matters;
- use adult, consent-aware language where an activity or dynamic could otherwise be misunderstood;
- avoid diagnosing motives, personality, skill, or real-world behavior;
- avoid implying consent, availability, compatibility, or readiness; and
- say when context or individual usage can materially change the meaning.

An unavailable definition must remain explicit. Do not synthesize one from a label, neighboring role, family, or relationship.

## Assessment and recommendation changes

Scoring and recommendation changes require stronger review than editorial definition changes. Confirm that every new or changed pathway has observable evidence, preserves uncertainty and prefer-not-to-answer behavior, and does not infer authority, submission, consent, readiness, or boundaries from unrelated answers.

Alignment, confidence, and evidence breadth have separate meanings and must remain separate in code and user-facing explanations. Manually choosing a role must not fabricate an alignment score or confidence level.

## Families and relationships

Families support organization and exploration. Membership may be many-to-many and must not make a role assessable or recommended by itself.

Relationship edges should be added only after comparing both terms. Choose the narrowest supported relationship type, keep directionality correct, and explain the distinction in a neutral rationale. Aliases should represent genuinely interchangeable vocabulary; a narrower or context-specific role should not be marked as an alias merely because it overlaps a broader term.

## Contribution workflow

For a role-library change:

```bash
npm run role-library:generate
npm run role-library:check
npm run typecheck
npm test
npm run calibrate
npm run build
npm run production-boundary
```

Review the generated diff before accepting it. Confirm that unrelated IDs, labels, modes, eligibility, definitions, relationships, families, and ordering did not change. Behavioral changes should include focused tests and calibration cases that demonstrate the intended distinction without weakening existing consent, readiness, or boundary safeguards.

Contributions should contain no non-public research materials, captured pages, credentials, local machine paths, or personal data.
