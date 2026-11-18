# Full-app audit — round 2 (re-audit + scorecard), 2026-11-18

Base `a4ee58d`, branch `audit/full-app-2026-11-18`. Nothing is committed yet (per `AGENTS.md`, commits need an explicit request). Round-1 findings are in [plan.md](plan.md); IDs below refer to it.

## Scorecard

| Severity | Round 1 | Fixed | Open | New in round 2 | New fixed |
| --- | --- | --- | --- | --- | --- |
| CRITICAL | 1 | 1 | 0 | 0 | 0 |
| HIGH | 4 | 4 | 0 | 0 | 0 |
| MEDIUM | 11 | 7 | 4 | 1 (undefined CSS vars) | 1 |
| LOW | 10 | 6 | 4 | 1 (fixed-px grid floors) | 1 |

- **Fix rate:** 18 of 26 round-1 findings fixed, plus 2 of 2 new ones.
- **False positives:** 4 disproved in round 1 (listed in plan.md), 0 in round 2.
- **Gates:** 993 tests at baseline, 1023 now (+30, #730–#763). Typecheck 6/6. Lint 0 errors / 11 warnings, unchanged from baseline. `workflow:check` passed.

## Resolved, with evidence

| ID | Fix | Regression test | Live / browser evidence |
| --- | --- | --- | --- |
| C1 | Nightly `pruneStaleGuestData` Payload job. IP key is now `x-real-ip`, else the rightmost XFF hop, from one resolver. | #750–753 | Job registered (03:15, `maintenance` queue); the job itself was not live-run |
| H1 | `users.access.admin = canAccessAdminPanel` | #730, #738 | Customer login shows "this user does not have access to the admin panel" |
| H2 | `queryPresets.access`; `restrictLockedDocuments` in `onInit` | #731–733 | Customer gets 403 on locked-docs and presets (read and create); staff get 200 |
| H3 | Nav identity comes from `useAuth()`; links filtered by permissions (`nav-access.ts`) | #754–758 | Admin card shows the real user; staff see only permitted links |
| H4 | Aether ported to the token-driven `ae-u-*` layer (131 tokens); no-Tailwind guard added | #761 | `/aether-lab`: 0 utility elements left unstyled |
| M1 | `security-headers.mjs` + `poweredByHeader: false` | #736–737 | CSP/XFO/nosniff/Referrer-Policy present; `X-Powered-By` gone |
| M2 | Anonymous `/api/discounts/validate` removed (it had no caller) | #739 | 404 |
| M3 | Double opt-in `newsletter-subscribers`; at most 1 mail per address per 15 min | #742–747 | Stored as pending; token not readable; customer gets 403 |
| M4 | `confirm-free` re-prices the cart before the €0 check | #740 | Unit-tested only (needs a discount edited mid-checkout) |
| M5 | Duplicate plugin views deleted; views are now host-provided | #759 | Import map has no references to them |
| R7 | One `clientIp` | #752–753 | — |
| L1 | `roleDenied` returns 403 vs 401; generic import error message | #76, #78, #197 | Customer gets 403 on conflicts |
| L2 | Reviews: real staff-session check; `disableErrors` for a missing product | #748–749 | — |
| L3 | CSRF trusts localhost only outside production; `customerEmail` is validated | #734–735, #741 | — |
| L4 | Rule fallback keeps a value of 0 | #760 | — |
| L6 | Cart and checkout titles + noindex; brand suffix on SEO titles | #762 | Sweep shows the titles |
| L7 | 280px overflow fixed (testimonials, `.ae-lab__card` track, tab rows, 7 `minmax` floors) | — | 0 horizontal overflow on 11 routes at 280px and 1440px |
| new | 20 undefined CSS custom properties now resolve; guard added | #763 | `/aether-lab` padding now applies |

## Round 3 — backlog closed (same day)

| ID | Fix | Test / evidence |
| --- | --- | --- |
| R6 | `blocks/nested.ts` late-bound seam: Columns/Section/rich-text no longer import the renderer/registry | #764; fallow cycles 3 → 0 |
| R5 | `capQuantitiesToStock` split into collect → load → resolve → cap phases | Existing 85 line-item tests green; off the fallow hotspot list |
| R4 | Rule engine `validateSelections`/`evaluate` split into named helpers (`firesFrom`, `pairVerdict`, `categoryExclusions`, `categoryWarnings`, `powerShortfall`) | 104 lib tests green; off the hotspot list |
| R1 | Checkout decisions moved into `lib/checkout.ts` (`cartTotals`, `cartLineTitle`, `buyerCheck`, `errorMessageFrom`, `parseStripeReturn`, `postCartAction`); page 536 → 463 lines, CC 57 → 43 | #765–769 |
| R2 | PDP derivations in `lib/pdp.ts`; ProductPage CC 36 → 32 | #770–774 |
| R3 | `kit/build-summary.ts` (Map lookup replaces O(n²) `find`) | #775–776 |
| M6 | Aether blocks outside the Aether pack get a `display: contents` `[data-block-pack]` scope that re-exposes `--ae-*` | #777–778 |
| M7 | 36 of 40 static inline styles moved to named classes; the 4 SVG gradient stops stay inline (CSS variables are invalid in SVG presentation attributes) | Typecheck/lint clean |
| L5 | Scroll-edge shadows on admin list tables | Computed gradient present |
| L9 | `.fallowrc.jsonc` ignores the gitignored design dumps | fallow warning gone; health 71.2 → 74.7 |
| — | Mega-menu fetch for every pack: kept on purpose (request-cached, ISR layout; serialising it behind the theme read costs more) | no change needed |

Remaining (deliberate): `seed.ts` complexity (dev-only script); `settleClaimedTransaction` and `RigBlueprint` complexity (covered by tests / visual); `ae-u-*` utilities and the numbered `*-x-N` extracted classes should be renamed semantically when those files are next edited.

## Deviations, stated plainly

- **TDD order:** `newsletter.test.ts`, `nav-access.test.ts`, `retention.test.ts`, `pdp.test.ts` (shown red only as a missing module) and `build-summary.test.ts` were written in the same step as their implementations, not proven red against wrong behaviour first. Every other new test was observed failing before its fix.
- **Commits:** the user asked for a commit after round 3; the work is committed in logical commits on `audit/full-app-2026-11-18`.
- **The C1 job was not executed live.** Its selection and deletion logic is unit-tested against a fake that applies the same `where` semantics.
