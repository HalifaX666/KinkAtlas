# Phase I portability and sharing security model

This document describes the guarantees and limits of KinkAtlas portability features. It is a threat model, not a promise that copied or disclosed information can be controlled after another person sees it.

## Product decision table

| Mode | Link alone opens? | Encrypted? | Recipient-bound? | Contains raw answers? | Restores assessment? |
|---|---:|---:|---:|---:|---:|
| Public Card | Not applicable; the image is public by design | No | No | No | No |
| Revisit Link | Yes | No | No | No | No |
| Secret Capsule | No; the separate secret is also required | Yes | No | No | No |
| Viewer-Locked Capsule | No; the matching browser key is required | Yes | Yes, to a browser key—not a human identity | No | No |
| Private Restore | No; the file and separate secret are required | Yes | No | Yes | Yes |

QR is an optional local presentation of supported existing links, not a separate privacy mode. KinkAtlas generates QR codes in the browser without sending their content to a QR service. Viewer Requests currently fit the conservative single-code limit. Even the smallest current Secret and Viewer-Locked Capsule links do not, so those modes stay on their existing copy and file transports. Revisit QR is deferred because realistic links can be too dense for dependable mobile scanning, and Private Restore remains file-first. KinkAtlas does not include a camera scanner or multipart QR.

## Consolidated threat model

| Mode | Protected asset and access | Local state | Server and history visibility | Loss, expiry, and revocation | Identity and forwarding limits |
|---|---|---|---|---|---|
| Public Card | The selected card content is intentionally readable by anyone who receives the image | None after export | Generation is local; a destination chosen by the user may receive the image | No expiry or revocation; deleting the local image does not delete copies | No sender or recipient authentication; it can be copied, forwarded, or captured |
| Revisit Link | A historical `ResultSnapshot`; possession of the complete bearer link grants access | None | The payload stays in the URL fragment and is not sent in an HTTP request; browser history and bookmarks may retain it | No expiry or revocation; losing the link loses access, and deleting one copy does not remove others | No sender or recipient authentication; it can be copied, forwarded, or captured |
| Secret Capsule | A selected, read-only disclosure; both encrypted artifact and separate secret are required | None after creation | The encrypted fragment is captured locally and removed from the address bar; history can retain only a deliberately copied complete link | No expiry or revocation; loss of either part prevents recovery by KinkAtlas | Not recipient-bound and no identity authentication; decrypted content can be copied or captured |
| Viewer Request | A public request ID, public key, Four-Word Keyprint, comparison code, and full fingerprint | The matching non-exportable private key and optional label stay in IndexedDB | A request fragment is captured locally and removed; request material is public and can be copied | Deleting or losing the local key removes this browser profile's capability; no remote recovery or revocation | Keyprints reduce substitution risk but are not identity proof |
| Viewer-Locked Capsule | A selected, read-only disclosure; the matching Viewer Request private key is required | Recipient private key in IndexedDB | The encrypted fragment is captured locally and removed from the address bar | No expiry or remote revocation; key deletion blocks future opening in that browser but does not erase opened copies | Bound to a browser key, not a verified person; sender is not authenticated; content can be copied or captured |
| Private Restore | Full authorized assessment restore state, including raw answer maps | File and separate secret held by the user | File-first flow; no restore payload is placed in a URL or sent to KinkAtlas | No expiry or revocation; KinkAtlas cannot recover a lost file or secret | Intended for same-user portability, not casual sharing; no identity authentication |

All modes run in the same site origin. Non-exportable keys cannot be directly exported through the Web Crypto API, but malicious JavaScript running with KinkAtlas's origin could potentially invoke them. The production Content Security Policy permits scripts only from the site itself; the application has no analytics, telemetry, remote runtime scripts, CDN cryptography, or network-loaded compression code. These controls reduce risk but do not make the origin immune to a compromised first-party dependency or cross-site scripting defect.

## Data-minimization matrix

| Mode | Included | Explicitly excluded |
|---|---|---|
| Public Card | User-selected Current Role Set cards and the assessment labels the user chooses to render | Raw answer maps, navigation state, restore state, secrets, private keys |
| Revisit Link | One canonical historical `ResultSnapshot`: displayed dimensions, suggested/current role sets, displayed Role Discovery results, reflection, boundaries, conversation statements, and learning recommendations | Raw answer maps, navigation state, full role graph, hidden optimizer state, resume state, secrets, private keys |
| Secret Capsule | Only sections enabled by the disclosure manifest; currently Current Role Set and role definitions | Raw answers, assessment navigation, restore state, unselected sections, secret |
| Viewer-Locked Capsule | The same selected disclosure payload used by Secret Capsule | Raw answers, assessment navigation, restore state, unselected sections, recipient private key |
| Viewer Request | Request ID, public key, comparison code, full fingerprint, format metadata; the Four-Word Keyprint is derived locally and is not serialized | Optional local label, private key, assessment data, disclosure data |
| Private Restore | Answer maps, assessment navigation, Current Role Set, completion flags, and an optional historical snapshot | Server identifiers, analytics identifiers, account data |

The privacy receipt shown for encrypted disclosures is derived from the validated disclosure manifest, rather than separate presentation state.

## Formats, versions, and upgrade policy

- Capsule envelope, Capsule payload, Viewer Request, comparison-code keyprint, Four-Word Keyprint vocabulary, Private Restore, `ResultSnapshot`, and Revisit transport all have explicit versions or semantic revisions.
- Secret and Viewer-Locked Capsules retain separate cryptographic suites and are not reinterpreted as one another.
- Revisit uses the explicit `v1.lzss` transport and deterministic canonical JSON. It does not use native gzip or randomness.
- Unsupported format versions and algorithms fail closed. Unknown fields and noncanonical encodings are rejected.
- Assessment-engine or role-library revision drift is distinct from a format-version mismatch. Supported historical snapshots render as historical records and are never silently rescored.
- A future format must add an explicit reader or migration. Existing bytes are never implicitly parsed as “latest.”

## Cryptography and randomness

Secret Capsules and Private Restore use PBKDF2-HMAC-SHA-256 and AES-256-GCM with a 128-bit authentication tag. They use a fresh 16-byte salt, 12-byte IV, and 32-byte generated secret. PBKDF2 accepts only the versioned range from 100,000 to 1,000,000 iterations and currently creates artifacts with 600,000 iterations. A wrong secret and altered authenticated content produce the same general unlock failure.

Viewer-Locked Capsules use ECDH P-256, a fresh ephemeral sender key, HKDF-SHA-256 with a fresh 16-byte salt and fixed `KinkAtlas Viewer-Locked Capsule v1` domain-separation value, then AES-256-GCM with a fresh 12-byte IV and 128-bit tag. Authenticated metadata binds the request ID, recipient public key identity, ephemeral public key, suite, compression, salt, and IV. Public points and request-key matches are validated before use.

The Four-Word Keyprint does not change that cryptographic model. It maps the first 44 bits of the existing version-1 SHA-256 public-key fingerprint into four 11-bit indexes using the immutable `bip39-en-v1` vocabulary. The same 44 bits already appear in the hexadecimal comparison code. The words are public comparison metadata only: they are not serialized into Viewer Requests, do not derive keys, do not decrypt Capsules, do not recover private keys, and do not authenticate real-world identity. The full fingerprint remains available for stronger manual comparison. Vocabulary provenance, licensing, exact hashes, language caveats, and bit ordering are documented in [keyprint-vocabulary-provenance.md](keyprint-vocabulary-provenance.md).

Encrypted-mode secrets, request IDs, salts, IVs, and keys use Web Crypto (`crypto.getRandomValues` or `crypto.subtle`) only. `Math.random` is not used for security material. Revisit is deliberately deterministic and contains no random input.

## Resource limits

Parsers reject input before expensive work where practical:

- Capsule fragment: 16 KiB
- Capsule file: 256 KiB
- Ciphertext: 128 KiB
- Shared disclosure after decompression: 128 KiB
- Private Restore after decompression: 256 KiB
- JSON depth: 12
- Array items: 256
- Object fields: 256
- Visible string: 4 KiB
- QR transport text: 624 UTF-8 bytes, ECC M, byte mode, maximum QR version 19, four-module quiet zone
- Object key: 256 bytes
- Current roles and role definitions: 5 each
- Viewer Request ID: 16 random bytes
- Revisit encoded payload: 12,288 characters
- Revisit decoded snapshot: 65,536 bytes

Compression readers enforce output bounds. Revisit also rejects nonminimal LZSS encodings by canonical decode/re-encode comparison. The current largest deterministic test snapshot leaves a narrow but positive margin under the encoded limit; the limit is retained because all supported real-world fixtures fit and raising it without evidence would increase bearer-link and browser-history exposure.

## Error taxonomy

User-facing messages group failures without exposing cryptographic internals:

- malformed, truncated, corrupt, or noncanonical artifact;
- unsupported version or protection format;
- wrong Secret Capsule or Private Restore secret;
- missing Viewer Request key;
- unavailable local key storage;
- oversized input;
- unavailable browser cryptography or compression capability;
- clipboard failure with selectable text fallback;
- download failure with copy/text alternatives where available.

Equivalent link, text, and file transports converge on the same strict parsers. Parsing rejects unknown/prototype keys, duplicate fields through canonical-form enforcement, invalid UTF-8 and Base64URL, excessive nesting and collections, invalid public points, modified ciphertext, and corrupt compressed streams.

## Browser, network, and accessibility behavior

- `/capsule`, `/restore`, `/viewer-request`, and `/revisit` are `noindex, nofollow`, are excluded from the sitemap and public prerendering, and do not emit canonical links.
- The site sends `Referrer-Policy: no-referrer`. Private payloads use fragments or local files, not paths or queries.
- Secret and Viewer-Locked Capsule fragments are captured and removed from the address bar. Viewer Request fragments are public request material and are also removed. Revisit fragments intentionally remain because the complete URL is the saved result.
- Portability flows do not POST or PUT user content. The unrelated completion counter sends only an empty same-origin increment request.
- QR generation and SVG download are local-only and lazy-loaded. A QR contains the exact existing link: Viewer Request QR is public request material; Secret Capsule QR contains encrypted material but never its secret; Viewer-Locked QR remains bound to the matching browser key. Screenshots and downloaded QR images can be copied indefinitely.
- Long links, secrets, fingerprints, and encrypted text wrap within their containers. Four-Word Keyprints wrap between complete lowercase words and are exposed as ordinary readable text. Native controls, focus management, live status regions, labelled inputs, and keyboard-operable dialogs/disclosures are preserved.

The supported browser matrix is Chromium, Firefox, and WebKit. The local-key feature additionally requires IndexedDB and non-exportable Web Crypto keys in the active browser profile.

## Consent boundary

Sharing a role, kink, preference, boundary, interest, reflection, or readiness result is not consent to an activity. A Four-Word Keyprint or comparison code is not identity proof. Encryption controls access to bytes before opening; it cannot prevent a recipient from copying, forwarding, photographing, or screenshotting visible content.

Scanning or sharing a QR code does not communicate consent. QR inherits the underlying artifact's access rules and adds no remote expiry, revocation, deletion from screenshots, or control after sharing. A Viewer Request QR does not replace Keyprint comparison, and a Viewer-Locked QR does not prove the human recipient's identity.

## Threat-question answers

1. KinkAtlas servers cannot decrypt Secret Capsules because neither artifact plaintext nor secret is sent to them.
2. KinkAtlas servers cannot decrypt Viewer-Locked Capsules because the recipient private key remains in the recipient browser profile.
3. Revisit payloads remain in URL fragments and are not sent in HTTP requests.
4. Anyone with a complete leaked Revisit Link can open it.
5. A leaked Secret Capsule artifact cannot be opened without its secret.
6. A leaked Viewer-Locked Capsule cannot be opened without the matching private key.
7. KinkAtlas cannot recover a deleted Viewer Request private key.
8. Deleting a key does not remotely revoke content already opened or copied.
9. A Four-Word Keyprint or comparison code does not verify human identity.
10. A recipient can screenshot or copy decrypted content.
11. Malicious same-origin JavaScript could potentially invoke a non-exportable key.
12. Raw answers are excluded from every sharing mode except the explicitly created Private Restore backup.
