# Phase J.0 protected semantic baseline

Baseline commit: `6d642c7dcaaa9abf01ffc55ca57a7e7228f214b4`

This document records behavior that Phase J.0 measures but does not change. Code is authoritative if this document and a future implementation ever diverge.

## Discovery scoring

Source: `src/engine/discoveryScoring.ts`, `src/data/questions.ts`.

- Every scored answer supplies its own trait effects. Effects are clamped to 0–1.
- A trait score is the arithmetic mean of its observed answer effects. Its evidence value is the number of contributing answers.
- `unknown`, `prefer-not`, invalid question/answer pairs, and answers marked `noScore` do not contribute.
- Unanswered traits remain absent. They are not treated as negative evidence.

Enforcement includes `src/tests/scoring.test.ts`, `src/tests/engineInvariants.test.ts`, calibration personas, and the full assessment-persona sanity suite.

## Role alignment, evidence breadth, ranking, and confidence

Source: `src/engine/roleMatching.ts`, `src/engine/confidence.ts`.

- Core score is the observed weighted mean of core traits.
- Differentiator score is the observed weighted mean of differentiating traits, with a neutral 0.5 fallback.
- Contrary score is the observed weighted mean of contrary traits, with a zero fallback.
- Ungated raw alignment is clamped from `core × 0.78 + differentiator × 0.22 − contrary × 0.25`.
- An unmet explicit evidence requirement caps raw alignment at 0.49.
- Evidence breadth is `core coverage × 0.78 + differentiator coverage × 0.22`.
- Evidence strength is `coverage × 0.70 + min(1, relevant answers / 6) × 0.30`.
- Evidence-adjusted ranking is `0.35 + (raw alignment − 0.35) × evidence strength`, clamped to 0–1. With no relevant answers it is zero.
- Alignment is `strong` at raw score ≥0.72, `explore` at ≥0.50, `some` below 0.50 with evidence, and `insufficient` with no evidence.
- Confidence is `high` with at least six relevant answers and 0.70 coverage; `moderate` with at least three and 0.40 coverage; otherwise `low`.
- Result ordering is ranked score, raw score, relevant-answer count, then stable scored-role ID.

These concepts are intentionally separate: raw alignment describes thematic resemblance; ranked score adjusts for evidence; confidence describes information quantity; evidence breadth describes covered role themes.

## Adaptive Discovery

Source: `src/engine/adaptiveQuestioning.ts`, `src/data/questions.ts`.

- The first 20 questions are the fixed broad bank.
- Discovery has a hard maximum of 26 answered questions, allowing at most six adaptive follow-ups.
- Adaptive candidates exclude answered questions and broadly rejected domains.
- Plausible roles have at least one relevant answer and raw alignment ≥0.38; at most the first six are compared.
- Question information value weights plausible-role separation 0.40, unresolved same-family direction 0.25, differentiator coverage 0.18, confidence-gain potential 0.12, and independent evidence 0.05.
- Final adaptive rank weights information value 0.80 and current role relevance 0.20, then uses question ID as the deterministic tie-break.

Enforcement includes `src/tests/adaptiveInformationValue.test.ts`, `src/calibration/adaptiveValidation.ts`, and assessment persona journeys.

## Refine

Source: `src/engine/refinementRouting.ts`, `src/engine/refinementEvidence.ts`, `src/data/refinement.ts`.

- Refine is optional vocabulary clarification. It does not modify Discovery trait scores, role alignment, or confidence.
- The presentation selector is capped at six questions.
- Semantic evidence eligibility is uncapped so a legitimately answered eligible question remains valid if later routing priorities move it outside the displayed top six.
- Dependencies invalidate stale descendant answers when a parent answer changes.
- Injected, unanswered, ineligible, rejected, or dependency-invalid evidence does not qualify a role.
- Authority, submission, ownership, activity position, rope, brat, primal, pet, and related intersections retain their explicit semantic gates.

Enforcement includes `src/tests/refinementEvidence.test.ts`, `src/tests/assessmentNavigation.test.tsx`, and decision-path calibration personas.

## Role-library eligibility and decision pathways

Source: `src/taxonomy/roleLibrary.ts`, `src/engine/roleProfileOptimizer.ts`, `src/data/role-library/role-library.source.json`.

- The library contains inferred, direct-interest, hybrid, explicit-selection, and exploration modes.
- Decision pathways are inferred, direct-interest, hybrid, explicit-confirmation, and manual-only.
- Inferred candidates require `strong` or `explore` alignment, non-low confidence, and no unmet evidence requirement. Exact-vocabulary confirmation can reject a label; confirmation cannot bypass target-specific Discovery eligibility.
- Hybrid and explicit-confirmation candidates require both qualifying semantic routing and supported Refine evidence.
- Manual-only/exploration vocabulary is selectable by the user but cannot enter automatic recommendations.
- Family membership organizes exploration and optimizer representation. It does not create scoring evidence or recommendation eligibility.

## Suggested Role Set and primary role

Source: `src/engine/roleProfileOptimizer.ts`.

- Suggested Role Set contains zero to five roles. Fewer than five is valid.
- Candidate base score weights raw alignment 0.28, confidence 0.18, evidence quality 0.20, specificity 0.08, distinctiveness 0.10, representation value 0.08, and profile usefulness 0.08.
- Minimum base score is 0.58 and minimum adjusted score is 0.52.
- Redundancy is a soft penalty based on shared canonical role, reviewed relationship type, and shared families. Novel reviewed-family representation receives a bounded bonus unless redundancy is very high.
- Substantive optimizer values resolve ordering first. Reviewed library order is the final selection tie-break.
- Only `direct-primary` and `competitive` roles may be suggested primary. A directly preferred eligible `direct-primary` role is considered first; otherwise primary compares evidence, relationship centrality, representation, and deterministic role ID.
- `contextual` and `manual-only` roles cannot silently become suggested primary.

Enforcement includes 50 recommendation personas, primary-policy tests, optimizer validation, and scoring-boundary diagnostics.

## Suggested, current, and user-selected roles

- Suggested Role Set is the immutable assessment-produced starting set.
- Your Role Set is an editable in-memory copy initialized from it.
- Reorder, make-primary, replace, remove, and manual add operations affect Your Role Set and its exports, not Discovery ranking or Suggested Role Set.
- User-selected roles have no assessment alignment, confidence, or evidence breadth.

Sources: `src/engine/roleProfileOptimizer.ts`, `src/context/AssessmentContext.tsx`, `src/engine/shareResults.ts`, and Results/share tests.

## Readiness and boundaries independence

Sources: `src/engine/readinessScoring.ts`, `src/engine/activityRecommendations.ts`, `src/engine/roleMatching.ts`.

- Readiness/reflection evaluates knowledge and attitudes separately from role alignment and does not certify real-world safety.
- Critical misconception flags persist independently of averaging.
- Boundaries affect activity guidance only. Hard limits and wants do not suppress or increase identity/vocabulary alignment.
- Negotiation preferences produce communication material, not role scores.

Enforcement includes `src/tests/scoring.test.ts`, `src/tests/boundaryIndependence.test.ts`, `src/tests/assessmentPersonaSanity.test.ts`, and calibration invariants.

## Historical snapshots, default privacy, saving, and sharing

Sources: `src/context/AssessmentContext.tsx`, `src/capsules/capsuleData.ts`, `src/sharing/`, `netlify/functions/hosted-content.mts`, `README.md`, and `docs/portability-security.md`.

- Assessment answers and results remain in browser memory by default. Refreshing or closing can clear unsaved work.
- Historical snapshots render the recorded interpretation and are not silently rescored against a newer engine or role library.
- Private Restore is the only portability format permitted to contain raw assessment state; it is client-encrypted.
- `Save my assessment` is explicit and uploads only client-encrypted assessment ciphertext. The non-exportable vault key and management capability stay in that browser.
- Link & QR / Quick Share is explicit and can host approved historical result content in plaintext, but never raw assessment answers.
- Legacy Capsule formats retain compatibility through their codecs and direct routes; normal Results sharing remains distinct.
- No assessment account, background save, background synchronization, analytics, telemetry, fingerprinting, or automatic disclosure is introduced by the assessment engine.
- The separate completion counter sends only a best-effort same-origin increment and stores only an aggregate integer.

Enforcement includes privacy tests, Phase K sharing tests, session-integrity tests, production-boundary checks, and portability/security tests.

## Historical decisions and source references

The following commits are useful provenance for current behavior; the current code and tests remain authoritative:

- `f952cb1` — adaptive Refine evidence and hybrid recommendation pathways.
- `6bd8ca6` — preserve semantically valid Refine evidence beyond the six-question presentation cap.
- `90b9580` and `ec82d88` — metadata-driven direct-primary preference and formal role-level primary policy.
- `bd75f03` — protect the post-assessment scoring boundary.
- `048cb54` — preserve the memory-only assessment session model.
- `29a3589` — consolidate taxonomy semantics while separating family/relationship metadata from scoring evidence.
- `9799d08` — public role-library and role-identity boundary.
- `3cf4d6d` — explicit saved-results and hosted-sharing privacy boundaries.

## Phase J.0 freeze

Phase J.0 may add deterministic diagnostics, fixtures, and documentation. It must not alter any formula, threshold, cap, routing predicate, eligibility policy, ordering rule, role metadata, result meaning, persistence behavior, or portability format described above.
