# Phase J.6 Results integrity audit

## Integrated behavior

The current Results page derives one immutable `suggestedRoleSet` from the production optimizer, initializes `currentRoleSet` once, and renders/shares `visibleRoleSet = currentRoleSet ?? suggestedRoleSet`. The separation is explicit in `src/pages/ResultsPage.tsx` and protected by unit and browser tests.

| Contract | Observed behavior | Evidence |
| --- | --- | --- |
| Exact suggestion | Membership, order, and primary match the production optimizer. | 69/69 J.3 parity; 50/50 recommendation personas; Results IA persona test. |
| Immutable suggestion | Reorder, replace, remove, add, and make-primary actions affect only Current Role Set. | `shareDialog.test.tsx`; browser edited-role-set journey. |
| Current primary | First Current Role Set entry is the user's current primary; changing it reorders presentation/share without reinterpreting assessment scoring. | optimizer edit helpers and browser journey. |
| Export/share source | Cards, selector order, hosted package, and Full Reflection consume Current Role Set. | share dialog regression suite and 25-test Chromium smoke. |
| Manual role | Carries `user-selected` source and no invented alignment, confidence, or evidence breadth. | unit and browser assertions. |
| Empty/sparse states | Empty set is valid; zero/one/no-primary presentations remain coherent. | Results IA tests and sparse full journey. |
| Historical state | Structured snapshot is rendered read-only and is not silently rescored against the current engine. | Revisit and Capsule compatibility tests. |
| Full Reflection shortcut | Opens the existing dialog in `full` mode only; ordinary Share still defaults to Public Card and disclosure defaults remain unchanged. | J.4 focused tests. |

## Explanation boundaries

Role meaning and why-it-matched remain separate. Alignment describes resemblance to reviewed role themes. Confidence describes available relevant evidence. Evidence breadth describes theme coverage, not strength. Manual roles do not receive metrics.

No reviewed Results wording claims fixed identity, psychological certainty, consent, readiness, safety, partner compatibility, or a relationship between roles that the data does not establish. Readiness and boundaries remain separately labeled and do not alter alignment.

## Findings

No resetting, stale export, primary mismatch, or disclosure-default defect was reproduced. J.4 information architecture and J.5 prose compose without changing recommendation output or Current Role Set behavior.
