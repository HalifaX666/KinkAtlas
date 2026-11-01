# Phase J.6 system baseline

Audit date: 2026-11-01  
Verified release baseline: `a37da58059f8d303e46fde1b08ed933e35c5a396`

This is an independent read-only reconstruction of the production assessment-to-results path. It does not replace the approved J.0 semantic baseline.

## Architecture map

| Stage | Production source | Output and next consumer |
| --- | --- | --- |
| Discovery content | `src/data/questions.ts` | Twenty broad questions plus up to six adaptive questions emit answer-specific trait effects and qualification evidence. |
| Trait accumulation | `src/engine/discoveryScoring.ts` | `calculateTraitScores()` averages only scored effects; unanswered and `noScore` choices contribute no value or evidence. |
| Adaptive selection | `src/engine/adaptiveQuestioning.ts` | `selectNextDiscoveryQuestion()` uses plausible-role discrimination, evidence need, domain coverage, and deterministic source order; the hard ceiling is 26. |
| Refine routing | `src/engine/refinementRouting.ts` | An uncapped deterministic semantic-eligibility set validates evidence while `selectRefinementQuestions()` caps presentation at six. Dependency changes invalidate descendants. |
| Refine evidence | `src/engine/refinementEvidence.ts` | Direct confirmations/rejections, target support, fallback suppression, and preferred-primary IDs are derived from eligible answers. |
| Scored role matching | `src/engine/roleMatching.ts`, `src/engine/confidence.ts` | Core, differentiating, contrary, qualification, coverage, answer-count, raw alignment, evidence-adjusted ranking, and confidence remain separate. |
| Vocabulary eligibility | `src/engine/roleProfileOptimizer.ts` | `buildRoleProfileCandidates()` applies inferred, hybrid, explicit-confirmation, direct-interest, and exploration-only policy to the 1,107-role library. |
| Suggested Role Set | `src/engine/roleProfileOptimizer.ts` | `optimizeRoleProfile()` selects at most five and `selectPrimaryRoleProfile()` applies existing primary policy. This is immutable assessment output. |
| Current Role Set | `src/context/AssessmentContext.tsx`, `src/pages/ResultsPage.tsx` | Initialized once from the suggestion, then independently reordered, replaced, removed, added to, or cleared in memory. Position zero is the user's current primary. |
| Results explanations | `src/engine/roleExplanation.ts`, `src/pages/ResultsPage.tsx` | Role meaning, assessment evidence, confidence, readiness, blind spots, boundaries, and conversation material remain distinct lenses. |
| Full Reflection | `src/engine/shareResults.ts`, `src/engine/reflectionNarrative.ts` | Explicit disclosure options become typed facts, deterministic claims, internal provenance, and rendered prose. |
| Historical result | `src/capsules/capsuleData.ts` | `ResultSnapshot` freezes displayed structured results; old snapshots are displayed read-only rather than silently rescored. |
| Private Restore | `src/capsules/capsuleData.ts`, `src/context/AssessmentContext.tsx` | Only the encrypted restore format may contain raw assessment maps. Compatible restore atomically replaces in-memory state after confirmation; revision mismatch is historical-only. |
| Public/hosted sharing | `src/sharing/sharePackage.ts`, `src/sharing/hostedStorage.ts` | Explicit actions may share approved historical result content. Raw answers are excluded. Hosted traffic is same-origin. |
| Encrypted sharing | `src/capsules/*`, `src/sharing/consentCapsule.ts` | Secret and recipient-bound envelopes are client-encrypted; public request material and ciphertext remain distinct from private keys and raw answers. |
| Local persistence | `src/sharing/localVault.ts`, `src/capsules/viewerKeyStore.ts` | IndexedDB stores encrypted objects, non-exportable keys, opaque capabilities, and minimal management metadata only after explicit action. |

## Preserved invariants

- Discovery answer choices do not assign one generic intensity to every trait.
- Missing, unknown, neutral, and prefer-not evidence is not negative evidence.
- Alignment, evidence breadth, evidence-adjusted ranking, and confidence are separate concepts.
- Activity leadership is not broader authority; qualification evidence gates authority-sensitive scored roles.
- Refine presentation remains capped at six while valid answered evidence remains semantically eligible outside the visible top six.
- Boundaries do not suppress role alignment. Readiness and blind spots do not alter role selection.
- Suggested Role Set is optimizer output; Current Role Set is the user's editable set; export/share consumes the latter.
- Manual roles receive no invented assessment alignment, confidence, or evidence breadth.
- A valid result may contain zero to five suggestions and may have no suggested primary.
- Results and reflection do not assign identity, establish consent, certify safety/readiness, or infer compatibility.
- Default assessment state is memory-only. Persistence, restore, and sharing require explicit user actions.
- Raw assessment answers are excluded from public cards, Quick Share, Shared Disclosure, Viewer-Locked disclosure, Reveal Requests, and Revisit historical results. Private Restore and the client-encrypted saved-assessment payload are the only authorized raw-answer containers.

## Baseline integrity

J.6 changed no production source, question data, role data, scoring, eligibility, taxonomy, optimizer, Results UI, persistence schema, or cryptographic contract. The ten J.6 reports and their public-manifest entries are the only intended changes.
