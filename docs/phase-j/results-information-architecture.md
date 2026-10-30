# Phase J.4 Results information architecture

## Target reading sequence

### 1. Personal overview

The page first states how many role suggestions the existing optimizer produced, surfaces answer themes only when they come from supporting scored traits, and explains the distribution of existing confidence classifications. Suggestions without a scored confidence label are counted separately without assuming why. It also states that unanswered areas remain unknown and that results do not determine identity, readiness, boundaries, compatibility, or consent.

The normalized dimension meters remain available under progressive disclosure as supporting detail rather than the main takeaway.

### 2. Suggested Role Set

The immutable assessment-generated set appears in its exact production order. Each suggestion presents:

- its reviewed definition, when available;
- the existing evidence explanation;
- existing evidence themes, when present;
- the existing confidence explanation or direct-confirmation limitation;
- an existing `notImplied` distinction, when present;
- the actual suggested-primary status, if the optimizer produced one;
- a role-detail link, with related-role wording only when reviewed relationship metadata exists.

No suggestion is added for layout completeness.

### 3. Your Role Set

The existing role-card gallery is explicitly named “Your Role Set.” It explains whether the current set still matches the suggestion or has been edited. The existing editor remains the only place that mutates this set. An empty set remains valid, and manual roles retain the existing “No assessment score or confidence” treatment.

### 4. Deeper interpretation

Role Discovery, Reflection, wants and boundaries, and Full Reflection are available from a compact in-page navigation landmark. Full Reflection opens the existing Share dialog directly in its existing Full Reflection mode; generation, disclosure defaults, and sharing behavior are unchanged.

## Interaction rationale

- Native `details` retains keyboard and state semantics for evidence and answer-theme detail.
- Anchor links use stable section IDs and preserve ordinary browser navigation.
- Full Reflection uses a real button because it opens a modal dialog.
- Essential interpretation is visible without hover or expansion; detailed evidence remains progressive.
- The role-set builder stays collapsed and retains its existing accessible disclosure implementation.

## Explicit states

- Zero suggestions: a respectful empty state links to the role library and does not describe the assessment as failed.
- One suggestion: singular, non-assigning overview language.
- No suggested primary: an explicit note; the UI does not infer a primary from list position.
- Low-confidence suggestion: the existing low-confidence explanation identifies limited evidence.
- Edited or empty personal set: visibly distinct from the immutable suggestion.
- Directly confirmed vocabulary without a scored role result: no invented percentage or confidence.
- Historical results: remain in the existing conservative read-only view; J.4 does not reconstruct missing evidence.
