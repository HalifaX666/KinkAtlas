# Phase J.5 Full Reflection language audit

Baseline commit: `55b0ccdeafa4c1ddd07fb0214c4ad29703eab1c3`

## Scope and pipeline

At the J.5 baseline, `ShareResultsDialog` built Full Reflection locally by calling `buildFullReflection` in `src/engine/shareResults.ts`. Its input contained the current editable role set, scored role results, evaluated readiness, explicit boundary selections, and explicit negotiation selections. The default disclosure included roles, alignment, and confidence; readiness, blind spots, boundaries, and negotiation were off until selected.

The function concatenated a title, three metric definitions, optional section headings and bullets, and five closing caveats. It used no randomness, network request, external model, timestamp, identity data, or server-side prose generation.

Full Reflection text was generated on demand. It was not stored in `ResultSnapshot`, hosted `SharePackage`, legacy Capsule formats, or saved-assessment metadata. Historical views rendered structured snapshot fields. Private Restore could retain raw assessment state only inside its existing client-encrypted format; it did not persist a Full Reflection string.

## Representative baseline passages

The committed J.0 fixtures contain the authoritative baseline outputs. Three representative patterns were:

```text
Alignment describes how closely your answers resemble a role’s themes.
Confidence describes how much relevant information was available; it does not determine ranking.
Evidence breadth is the share of a role’s themes with usable answer evidence, not match strength.
```

```text
Your Role Set
• Switch — Strong alignment · High confidence · 100% evidence breadth
• Gentle Dom — Worth exploring · High confidence · 100% evidence breadth
• submissive — Worth exploring · High confidence · 100% evidence breadth
```

```text
Generated privately with KinkAtlas.
Role results describe vocabulary worth exploring, not identity or consent.
Reflection considers knowledge and attitudes, not real-world readiness. Boundaries remain independent of role alignment.
Results do not certify safety or replace education, communication, or consent negotiation.
Sharing a result does not communicate consent, availability, boundaries, or agreement to any activity.
```

These passages were factually conservative, but the same framing appeared for profiles with different evidence.

## Confirmed language problems

1. **Repetitive opening:** every role-based reflection started with the same product explanation and three technical metric definitions.
2. **Artificial formality:** phrases such as “Alignment describes” and “This is not a safety score” read like documentation rather than a reflection.
3. **Repeated evidence:** role metrics appeared in the list and were then explained again through global caveats.
4. **Generic structure:** profiles with one role, several roles, or very different evidence themes used the same paragraph and list sequence.
5. **Limited synthesis:** the output did not identify recurring supporting traits even when scored evidence was available.
6. **Role enumeration without meaning:** default output showed labels and metrics but not reviewed role definitions or why the vocabulary appeared.
7. **Technical tone:** evidence breadth and confidence definitions preceded the actual personal content.
8. **Abrupt transitions:** optional sections were appended without a reading sequence connecting interests, role language, reflection, boundaries, and communication.
9. **No psychological overreach found:** the baseline did not infer trauma, motives, attachment, identity, compatibility, or history. J.5 preserves this strength.
10. **Identity boundary was safe but repetitive:** the same identity and consent caveats appeared in every output rather than once in a concise conclusion.
11. **Readiness remained independent:** the baseline correctly avoided using role interests as readiness or consent evidence. J.5 preserves this boundary.
12. **Sparse output was padded:** an empty set still received metric definitions and five generic closing lines, making the output longer without adding evidence.

## Difficult baseline cases

- **Large readiness result:** all 17 competencies could appear as an undifferentiated list.
- **Many blind spots:** every description was printed at equal narrative weight, even when several stronger critical signals existed.
- **Negotiation unknowns:** sixteen “I don’t know yet” lines could dominate the report.
- **Manual role:** source distinction was correct, but the role had no reviewed meaning beside it.
- **Mixed directions:** the list was safe, but it did not explain the actual evidence themes that allowed several directions to coexist.
- **Removed roles:** the Full Reflection input did not include a complete immutable Suggested Role Set comparison, so it could not safely explain why a role was removed. The baseline correctly made no claim.

## Baseline strengths retained

- Deterministic output.
- Explicit user-controlled disclosure.
- Manual roles never received invented assessment metrics.
- Missing evidence was not scored as rejection.
- Readiness, boundaries, and consent stayed separate from role alignment.
- Raw Discovery and Refine answers were not included in Full Reflection.
- No persisted or server-generated narrative.

Real before-and-after fixture excerpts and the editorial rubric are in [reflection-editorial-review.md](./reflection-editorial-review.md).
