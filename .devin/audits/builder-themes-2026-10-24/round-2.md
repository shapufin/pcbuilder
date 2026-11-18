# Builder themes / designs — audit round 2

- **Date:** 2026-10-24
- **HEAD:** `0ebee20` on `audit/builder-themes-2026-10-24` (branched from `66d2ff7`)
- **Scope:** the full uncommitted implementation tree (entry 131 + leftover
  127–130 admin edits) — re-audit after round 1, per full-audit workflow v2.
- **Baseline:** 964 unit green → **968** (lib 102, pc-builder 131, pages 51,
  shop 172, web 510, ui 2); typecheck 0, lint 0 errors / 11 warnings (unchanged).

## Findings → fixes

| # | Sev | Finding | Fix commit |
|---|---|---|---|
| F1 | HIGH | `data-chrome='immersive'` set pre-paint, never reconciled on client nav: entering `/builder/configure` via `<Link>`/`router.push` re-stacked the double header (round-1 B2 back); leaving kept the site header/footer hidden site-wide. **Verified live both directions** (2 headers in, 0 headers out) | `d527cab` — pure `syncChrome(pathname, body)` + `<ChromeSync/>` on every `usePathname()` change (#704); re-verified live: 1 header in, header+promo restored out |
| F2 | MEDIUM | `cartState` never reset: after a successful add + edits, `CommissionSheet` offered only "View cart" (no re-add path); summary button mislabeled | `b9fe66b` — derived `cartView` collapses stale `added` → `idle` when the draft ref is gone (#705); consumers migrated |
| F5 | LOW | Rename path resolved `{...existing, name}` before the PATCH landed — a rejected rename was reported as applied | `b9fe66b` — `shouldRename` gate; resolved build reports the persisted name (#706) |
| F6 | LOW | `subItems` emitted `component: ''` for stale selection ids → generic 400 | `b9fe66b` — `buildSubItems` skips missing entries, `buildManifest` contract (#707); `0ebee20` test-type fix |
| F4 | LOW | `ModalShell` comment pointed at `rig-studio.css`; styles live in `kit/modal.css` | `6d3ac10` |
| F7 | LOW | `.tmp-*.mjs` e2e probes + `screenshots/` unignored | `5167056` — `.gitignore` |
| F3 | MEDIUM (accepted) | `ThemeColorStudio` DOM-hack for Payload dirty state | `aa60534` — doctrine note in `04-cms-pages-theme.md`; the form-bound alternative is a proven dead end (round-1c probe), so it is documented, not refactored |

## Disproved (verified before fixing, never patched)

- `powerWarnings` "dropped" from rail/summary — `validateSelections` already
  includes the derived-power issue (`rule-engine.ts:559-568`).
- Nested `<main>` landmarks — layout wraps children in `div#main-content`.
- `component: ''` silent bad data — zod `min(1)` fails closed.

## Round-1 regression check

All resolved round-1 items verified still fixed in code (palette ramp,
warning-source split, focus trap, renderer catalogue, heading semantics,
0px overflow) — none reappeared.

## Scorecard

| | Round 1 | Round 2 |
|---|---|---|
| CRITICAL | 0 | 0 |
| HIGH | 3 (all fixed) | 1 (fixed) |
| MEDIUM | 6 (5 fixed, 1 deferred) | 1 fixed + 1 accepted-risk |
| LOW | 1 deferred | 4 fixed, 1 deferred (F8 label fallback) |
| False positives | 0 | 3 caught at verification, 0 shipped |
| Fix rate | 8/10 | 6/7 |

## Backlog

Round-1 backlog stands (admin gallery, product imagery, category pills,
atelier saved-builds browser) plus F8. Deliberately stopped after the HIGH —
remaining items documented, not fixed.
