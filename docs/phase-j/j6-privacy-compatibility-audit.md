# Phase J.6 privacy and compatibility audit

## Data lifecycle

| Data class | Default location | Persistence/transmission rule |
| --- | --- | --- |
| Assessment answers and navigation | React memory in `AssessmentContext` | Not persisted by default; reload may erase them. Completion sends only an increment request. |
| Suggested/Current Role Set | React memory | Current set is stored only when the user explicitly saves an assessment; public sharing serializes approved result content, not raw answers. |
| Result snapshot | In-memory structured object | May enter Revisit, Quick Share, encrypted disclosure, or encrypted saved assessment according to each format's schema. |
| Full Reflection | Generated locally on demand | Only selected sections enter prose; no background upload or persistence. |
| Public Card / Quick Share | Local artifacts or explicit same-origin hosted share | May include approved historical result sections; raw assessment answers are prohibited. |
| Private Restore | Local client-encrypted file/link material | May contain raw answer maps only inside authenticated ciphertext; explicit preview and confirmation precede hydration. |
| Saved assessment | Client-encrypted same-origin hosted ciphertext | Explicit save only; IndexedDB keeps the local non-exportable vault key and management capability. |
| Consent/Viewer-Locked Capsule | Client-encrypted ciphertext | Recipient public material may be shared; recipient private keys stay local and non-exportable. |
| Hosted object | Netlify Function/Blobs, same origin | Opaque IDs, bounded contracts, no public enumeration, owner delete capability. |

## Compatibility findings

- Compatible Private Restore atomically replaces answers, navigation, Current Role Set, completion flags, and historical snapshot only after explicit confirmation.
- A revision mismatch exposes the embedded historical result read-only instead of rescoring old answers with a new engine.
- Revisit uses deterministic `v1.lzss`; Chromium, Firefox, and WebKit produced identical 9,001-byte compressed payloads and identical digests for the full fixture.
- Secret Capsule, Viewer-Locked, Reveal Request, Revisit, Public Card, Quick Share, and Private Restore remain distinct schemas and routes.
- Shared Disclosure accepts only implemented selected sections. Reveal Request import enters review state and cannot automatically encrypt, copy, download, or disclose.
- Fragment-bearing routes remove valid captured fragments; no payload is placed in metadata. Private routes are noindex/nofollow.
- J.4 and J.5 add no persistence, network request, disclosure field, schema, or raw-answer path.

## Boundary verification

- Full unit suite passed Capsule schema, encryption, canonicalization, hostile-input, hydration, historical-only, hosted contract, local-vault, and privacy-default tests.
- Browser suites passed Secret Capsule, Viewer-Locked lifecycle, Private Restore confirmation, Reveal Request partial disclosure, hosted save/share/delete, deterministic Revisit, and production preview.
- Production boundary scanned 1,155 files with zero prohibited private material, source URL fields, provenance keys, or source-branded filenames.
- Public-surface, self-containment, and secrets scans passed across 310 manifest files.

No privacy-contract broadening or backward-compatibility defect was reproduced.
