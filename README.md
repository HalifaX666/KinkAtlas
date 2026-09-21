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

Assessment answers and results stay in browser memory for the current session. KinkAtlas does not persist them in cookies, `localStorage`, `sessionStorage`, or IndexedDB, and it has no questionnaire-data backend. Refreshing or closing the tab clears the assessment session. When someone chooses to view a completed assessment, the browser sends an empty same-origin increment request; the server persists only the aggregate completion integer, with no answers, results, roles, readiness information, boundaries, negotiation preferences, or user/device identifiers.

Exports and shares are created locally only when the user requests them. Anything copied, downloaded, or shared can remain outside KinkAtlas after the session ends.

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
