# Phase J.6 performance and accessibility audit

## Production build

Vite transformed 1,694 modules and generated 1,107 static role pages.

| Artifact | Raw | Gzip | Loading boundary |
| --- | ---: | ---: | --- |
| Main entry | 350.70 kB | 104.78 kB | Initial application shell and assessment workflow |
| CSS | 86.50 kB | 16.33 kB | Initial styles |
| Results | 61.04 kB | 18.60 kB | Lazy `/results` |
| Informational pages | 64.44 kB | 18.28 kB | Lazy public information routes |
| Capsule data | 53.27 kB | 16.45 kB | Lazy sharing/restore consumers |
| Role identity | 29.74 kB | 11.37 kB | Lazy role surfaces |
| Role library/slugs | 539.78 kB | 98.23 kB | Lazy role-library/role-page path |

The 1,107-role corpus remains outside the initial dependency graph. Results, role library, role pages, sharing, and private portability routes retain meaningful lazy boundaries. The `roleLibrarySlugs` chunk exceeds Vite's 500 kB warning threshold; this is a known deferred warning, not a J.6 regression or initial-load cost.

Full Reflection is synchronous deterministic transformation over at most five current roles and bounded selected result sections. No measured performance failure or long-task regression appeared in unit or browser execution. Long Role Set rendering is structurally capped at five.

## Responsive and zoom evidence

- Chromium Results and role editing passed at mobile/reflow widths, including 320px.
- Hosted QR display was measured at 320, 375, and 430px without overflow.
- Viewer Request lifecycle and QR display passed at 320, 375, and 430px in Chromium, Firefox, and WebKit.
- Browse cards with long and short content remained inside fixed-height layouts in Firefox and WebKit.
- The Results smoke suite exercised zoom-equivalent narrow reflow. The automation environment does not provide a trustworthy browser-UI 200% zoom control, so this is not claimed as a literal OS/browser zoom test.

## Accessibility evidence

- `test:e2e:a11y`: 2/2 passed, covering high-value private/public states and Light theme with no WCAG A/AA axe violations.
- Native/semantic controls, accessible disclosures, modal labels, focus management, and keyboard activation are exercised by component and browser tests.
- Route loading uses `role="status"` with polite live announcement.
- Empty and sparse Results states remain readable and do not fabricate a primary.

## Warnings and limitations

- Pre-existing Vite warning: lazy `roleLibrarySlugs` chunk is 539.78 kB raw.
- Test web servers report the harmless Node `NO_COLOR`/`FORCE_COLOR` warning.
- True hosting-level 404 status for unknown SPA routes remains deferred; React renders a noindex Not Found page after a hosting-level fallback response.
