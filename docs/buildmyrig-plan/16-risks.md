# 16 · Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| 1 | `@payloadcms/plugin-ecommerce` immaturity (newer plugin; gaps in composite lines, guest-merge, statuses) | Medium | High | Phase 0 timeboxed spike with explicit criteria; Path B fallback collections are fully specced ([04-collections/products.md](04-collections/products.md)) so the switch costs ~1 week, not a redesign |
| 2 | Admin rule manager complexity balloons (spreadsheet + CSV + live conflicts) | Medium | Medium | Scope v1 to grid + CSV + conflicts table; defer drag-drop authoring/graph view to backlog; the underlying data model is unchanged either way |
| 3 | Rule data quality (contradictory rules, dead rules) — customers see broken combos or over-blocking | Medium | High | Engine determinism tests (circular/mutual-exclusion cases #8–#12); rulesVersion on validation snapshots; admin CSV import previews diffs before commit; rule "enabled" flag for quick muting; sample-build smoke tool in admin (backlog item if needed) |
| 4 | Stock sync drift (reserved vs sold; webhook races) | Medium | High | Reservation pattern with timeout (15 min); webhook idempotency by event id; periodic reconciliation job (reserved > timeout → release); integration tests for paid/expired/refund paths |
| 5 | Stripe edge cases (partial refund, dispute, currency mismatch, double webhook) | Medium | High | Adapter isolates Stripe; idempotent handlers; tested refund/dispute flows; alerting on unhandled events |
| 6 | Client index payload too large at scale (rules grow beyond 2k) | Low | Medium | 300KB budget enforced in CI; page splits index per category pair on demand ([06-rule-engine.md](06-rule-engine.md) complexity section) |
| 7 | Builder UX scope creep (3D, accordion mode, guided mode) | High | Medium | 3D explicitly out of v1; guided mode limited to 3–4 questions; accordion = Phase 2 toggle |
| 8 | Performance regression in rule engine as rules accumulate | Low | High | Scale benchmark test (#28) in CI fails build over 20ms; O(components) design holds regardless of rule count |
| 9 | Neon/Vercel serverless connection exhaustion under load | Medium | Medium | Neon pooler, cached reads, LoadTest Phase 4; fallback: connection-limit env tuning |
| 10 | Cart merge conflicts on login (guest + user both have same variant) | Medium | Low | Deterministic merge policy (A10): quantities sum, capped by stock; tested in unit tests |
| 11 | Price display vs charge mismatch (prices changed mid-build) | Medium | High | Server recompute is the single source of truth; summary page shows "prices may have changed — revalidate" banner if snapshot stale; checkout recomputes |
| 12 | Team unfamiliarity with Payload 3 + Drizzle idioms | Medium | Medium | Phase 0 docs reading list; conventions in this plan; plugin template as reference; junior-mid pairing on first plugin work |

Highest-priority watchlist: #1 (decided in week 1), #4 (tested in Phase 1), #3 (mitigated by Phase 2 test suite).
