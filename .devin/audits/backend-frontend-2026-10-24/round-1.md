# Backend-for-frontend audit — round 1 (2026-10-24)

Scope: 7 custom Next routes + 16 plugin endpoints + cart/settlement hooks +
server-component data fetching. Framework REST = lighter pass.
Baseline HEAD: `bd98d2a` (main). Branch: `audit/backend-frontend-2026-10-24`.
Baseline: 968 tests green; typecheck 6/6; lint 0 errors (11 pre-existing warnings).

## Resolved

| # | Finding | Sev | Fix | Commit |
|---|---------|-----|-----|--------|
| 1 | `capQuantitiesToStock` per-line findByID N+1 (≤2N queries/cart write) | HIGH | batched `id in` finds; absent id = old 404 drop; hiccup keeps lines | 6f6c465 |
| 2 | bands+rates re-queried every cart write | MED | TTL+hook-invalidated cache (`pricing-config.ts`) | 6f6c465 |
| 7 | `collectBuildIssues` sequential | LOW | `Promise.all`, order preserved | 6f6c465 |
| 1b| `resolveConfiguredBuildStockUnits` per-component findByID; deleted component threw → wedged settlement | HIGH(new) | one batched find; missing docs skipped | 96385f4 |
| 3 | template popularity read-modify-write (lost increments) | MED | atomic `$inc` via `db.updateOne` | 64f64e0 |
| 8 | `normalizeSlots` per-slug find | LOW | resolved via builder index — zero queries | 64f64e0 |
| 9 | import lookups 10k/5k caps silent | LOW | `totalDocs > docs.length` → warn (HELD_QUERY_LIMIT pattern) | 64f64e0 |
| 4 | reviews verified-buyer scanned only last 10 orders | MED | server-side `items.product` where, limit 1 | 0c40f57 |
| 5 | PDP refetched product + component (already populated at depth 2) | MED | `resolveComponentSpecs` reads populated rel | 8b4b333 |
| 6 | facet registries re-fetched per dynamic request | MED | 5-min TTL cache + `invalidateFacetRegistries` | 9df16fd |
| — | clientIp/limiter + cart-gate duplicated (5 copies) | LOW | `rateLimitedResponse`/`clientIpFromHeaders` in lib + `authorizeCart` | (C7) |
| — | Italian comments in configure page | LOW | translated | (C7) |

## No-change / disproved

- Shop index `limit:0` product count — already minimal shape (depth 0, select).
- Settlement per-line CAS + per-unit decrement — deliberate fencing design.
- XFF trust, in-memory limiters, 30 s index TTL — documented deviations.

## Deferred backlog

- PDP reviews `limit:50` no pagination; search `contains` LIKE scan;
  share-GET unrate-limited (96-bit id makes enumeration impractical).

## Verify-live note

`items.product` where on orders relies on the dotted-array-subfield path
(gotcha #39 mechanics) — worth one live probe of a verified-buyer review.

## Scorecard

| | Round 1 |
|---|---|
| Findings | 13 (1 HIGH, 1 HIGH-new, 5 MED, 6 LOW) |
| Fixed | 12 (1 no-change justified) |
| False positives | 0 |
| Tests | 968 → **987** (+19) |
| Gates | tc 6/6, lint 0 err |
