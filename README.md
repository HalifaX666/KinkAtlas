# KinkAtlas

KinkAtlas is a private-by-default self-reflection tool for adults exploring kink roles, interests, readiness, wants, boundaries, and negotiation preferences. It offers vocabulary and prompts for reflection; it does not assign identity, establish consent, judge compatibility, or certify safety.

The assessment is deterministic and rules-based. Generative AI does not analyze answers or generate results.

## How results work

KinkAtlas keeps several questions separate:

- **Role alignment** describes how closely observed answers resemble a role's themes.
- **Confidence** describes how much relevant information was available, not how certain KinkAtlas is about someone's identity.
- **Evidence breadth** describes how much of a role's weighted themes had usable answer evidence, not match strength.
- **Reflection** considers knowledge and attitudes independently from role alignment. It cannot establish real-world readiness.
- **Wants and boundaries** guide activity suggestions but never lower role alignment or change role ordering.

The role library contains reviewed, non-prescriptive descriptions and structured relationship and family metadata. Some terms are available only for manual exploration when KinkAtlas cannot responsibly assess or recommend them. A suggested role set may contain fewer than five roles, or none.

## Adult-only scope and limitations

KinkAtlas is intended only for adults. Its content assumes communication and freely given, informed, specific, reversible consent among adults.

Role language is contextual and changes across people and communities. There is no universal kink taxonomy, and KinkAtlas is not a definitive dictionary or an authority on what a role must mean. Results are starting points for personal reflection and conversation, not clinical advice, a diagnosis, proof of experience, a safety assessment, or permission to act.

## Privacy

Assessment answers and results remain in browser memory by default. KinkAtlas does not remotely save an assessment unless the user explicitly chooses Save or Share, so refreshing or closing can clear unsaved work. Save my assessment encrypts the complete assessment in the browser before storage. Link & QR hosts only historical cards and approved result content, never raw answers, and both open the same shared result. Browser-local storage holds only the information needed to reopen or manage saves and shares. The anonymous completion counter remains separate and stores only an aggregate integer.

Saves and shares are created only after an explicit user action. New hosted items can be deleted with a browser-held management capability, but deletion cannot recall screenshots, downloads, or copies someone already made.

KinkAtlas keeps its portability modes distinct: Public Cards are public images; a Revisit Link is an unencrypted bearer link to a read-only historical result; Secret Capsules need an encrypted artifact plus a separate secret; Viewer-Locked Capsules need the matching browser key; and Private Restore is an encrypted full-session backup that intentionally includes answer maps. Revisit Links and Capsules have no remote expiry or revocation. Historical snapshots render the saved result and are not silently rescored.

An optional Reveal Request lets a recipient ask for the currently supported Shared Disclosure sections: Current Role Set and role definitions. The request is public metadata tied to a Viewer Request browser key; it contains no results, raw answers, private key, or local label. The sender can share all, some, or none through a separate explicit Viewer-Locked response. KinkAtlas provides no request inbox, status, notification, automatic disclosure, or consent implication.

Supported Viewer Request links can also be shown as a standard QR code generated entirely in the browser. QR is only another way to move the exact link: it adds no encryption, identity proof, consent, expiry, or revocation. The current Secret and Viewer-Locked Capsule formats exceed the conservative single-code limit, so they remain on the existing copy and file transports; Revisit and Private Restore QR are also deliberately not supported. KinkAtlas does not provide a camera scanner or use a QR server.

Legacy encrypted Capsule formats remain supported for backward compatibility through their direct routes and codecs. They are not part of the normal Results or Share interface. Removing local keys can permanently remove access to recipient-bound historical artifacts; no Capsule authenticates real-world identity, prevents recipients from copying visible content, or implies consent.

Viewer Request private keys are non-exportable browser `CryptoKey` objects. This prevents straightforward key export, but it does not make a key untouchable: malicious JavaScript running under KinkAtlas's same origin could potentially invoke it. The production policy therefore permits scripts only from the site's own origin, uses no analytics or remote runtime scripts, and keeps the public-surface and production-boundary checks in CI. KinkAtlas does not provide remote key backup, recovery, expiry, or revocation.

Viewer Requests show a Four-Word Keyprint derived from the first 44 bits of the existing public-key fingerprint. It is easier to compare through another trusted channel, but it does not verify a person, recover a deleted private key, or participate in encryption or decryption. The existing comparison code and full fingerprint remain available. KinkAtlas uses the versioned BIP-0039 English vocabulary only as an ordered Keyprint vocabulary—not as a wallet mnemonic or recovery phrase. See [docs/keyprint-vocabulary-provenance.md](docs/keyprint-vocabulary-provenance.md) for pinned source, license, hashes, derivation, and language caveats.

See [docs/portability-security.md](docs/portability-security.md) for the complete Phase I mode comparison, threat model, data-minimization matrix, format policy, and browser/network limits.

The Contact form is separate from the assessment. It submits only the fields entered into that form to the same Netlify site through Netlify Forms. Assessment answers, results, readiness information, boundaries, and role selections are never attached automatically. Netlify processes and stores submitted contact messages according to the site's Netlify configuration.

## Development

Use Node.js 22 and install the locked dependencies:

```bash
npm ci
npm run dev
```

Common verification commands are:

```bash
npm run typecheck
npm test
npm run role-library:check
npm run calibrate
npm run build
npm run production-boundary
npm run test:e2e:smoke
```

Install the Chromium browser used by the smoke suite once per development environment:

```bash
npx playwright install chromium
```

When intentionally changing the neutral role-library source data, regenerate and verify the checked-in runtime output:

```bash
npm run role-library:generate
npm run role-library:check
```

See [docs/taxonomy.md](docs/taxonomy.md) for role-library methodology and contribution guidance.

## Deployment

`npm run build` creates the production site in `dist`. The included `netlify.toml` configures that build, SPA routing, and security headers for Netlify.

For the production domain, set this environment variable in Netlify:

```text
VITE_SITE_URL=https://kinkatlas.ca
```

The post-build metadata step uses that value for canonical URLs, social metadata, `sitemap.xml`, and the sitemap entry in `robots.txt`. The domain is not hardcoded into application behavior.

The Contact page uses a same-origin Netlify Forms submission. After the first production deployment detects the `contact` form, configure a Netlify Forms email notification to `kinkatlas@proton.me` and test the complete form flow. No Contact function or external email API is required.

## Licensing

KinkAtlas software source code is licensed under the [MIT License](LICENSE). The MIT License applies to software code only. KinkAtlas-authored role-library definitions and data, editorial and documentation content, branding, images, and visual assets are excluded from the MIT License and remain copyright © 2026 D. All rights reserved unless a specific file states otherwise. See [CONTENT-LICENSE.md](CONTENT-LICENSE.md) for details.

## Developer

Created and maintained by D.
