# 14 · Migration & Seed Plan

## `payload migrate` files

Payload 3 + Drizzle: `payload migrate:create` generates SQL; committed under `apps/web/src/migrations/`. Expected migration sequence:

| # | Migration | Contents |
| --- | --- | --- |
| 0 | `initial_schema` | Payload core (users, media, sessions) |
| 1 | `shop_core` | products, variants, prices, inventory, categories, brands, attributeTypes, attributeValues |
| 2 | `commerce` | carts, orders, transactions, shipments, addresses, customers, discountCodes (+ indexes from 13-performance-seo.md) |
| 3 | `builder_core` | componentCategories, components, buildTemplates, configuredBuilds |
| 4 | `builder_rules` | compatibilityRules, derivedPowerRules |
| 5 | `platform` | pages, redirects (seo fields via plugin) |
| 6 | `search` | tsvector column + GIN index on products (raw SQL block inside migration) |

Rules: forward-only; column drops split across two releases (soft-deprecate → drop); every migration runs in CI against a scratch Postgres before merge. `payload migrate` runs in the production deploy step ([12-integrations-ops.md](12-integrations-ops.md)).

## Seed scope (`packages/payload/src/seed` + `payload run seed`)

| Dataset | Scope |
| --- | --- |
| ComponentCategories | all 10: cpu, motherboard, ram, gpu, storage, psu, case, cooling, os, case-fan |
| Components | **≥ 30 across 8+ categories**: 4 CPU (AM5 ×2, LGA1700 ×1, LGA1851 ×1), 4 motherboards (ATX/mATX × sockets), 4 RAM (DDR4/DDR5 speeds), 4 GPU (varied TDP + length), 4 storage (NVMe/SATA), 4 PSU (450–1000W), 3 case (ATX/mATX/ITX), 3 cooling (socket support varied) — each with typed specs + specsJson + price + inventory |
| CompatibilityRules | **≥ 40**: socket match (cpu↔motherboard, bidirectional), ramType match, ramSpeed warnings, PSU wattage via DerivedPowerRule + per-class gte rules, case form-factor (contains), GPU length vs case max (lte), cooler socket support (contains), mutually exclusive pair (ITX/ATX), circular pair fixtures, rule-on-missing-spec fixture, warns-only rules |
| DerivedPowerRules | 1 (overhead 1.3, base 100) |
| BuildTemplates | **3**: "Starter Gaming" (budget), "Creator Pro" (editing), "Endurance Workstation" — full slots + images |
| Products | **20** ordinary products (peripherals, accessories, monitors) with categories, brands, attributes |
| Catalog | spec: 8 categories, 6 brands, 10 attributeTypes + ~35 attributeValues — **actual (entry 41): 11 categories, 7 brands, 6 attributeTypes / 22 values** (socket, ram-type, form-factor, capacity, wattage, refresh-rate). The extra types in the spec sketch (pcie-version, gpu-length, storage-interface, cooler-sockets…) were never needed by the rule engine — its specs live on `components`; only the six above back catalog facets. |
| Pages | homepage (7 blocks), about, contact, faq, terms, privacy |
| Users | 1 admin, 1 manager, 1 staff, 1 customer |
| Media | placeholder images (generated, token-branded) |

Seed script flags (aspirational — as of audit entry 28 none are implemented): `PAYLOAD_SEED=true` (dev/preview auto-seed), `--drop` (truncate + reseed), idempotent upserts (safe on preview branch DBs). Current reality: `seed.ts` guards re-runs by skipping when any user exists; reseed = delete the dev DB and restart `pnpm dev`. `pages-seed.ts` IS idempotent by slug (skips existing). **Actual seeded counts (entry 41, plan item C6 — verified on a scratch DB)**: **10 slot categories** (incl. `case-fan`), **3 templates** (Vanguard Gaming PC / Compact Creator ITX / Endurance Workstation), **20 ordinary products**, **4 users** (admin/manager/staff/customer), **2 placeholder media** (64×64 flat token-coloured PNGs — real uploads, not artwork; attached as every product's gallery), **33 components**, 42 rules, 53 products total, and **product `attributeValues` populated** (27 products / 35 rows: socket, ram-type, form-factor, capacity, wattage, refresh-rate). The data lives in `seed-data.ts` (extracted from `seed.ts`) with invariant tests (`seed-data.test.ts`, #264–268) so a bad template slot / attribute reference fails a test instead of a mid-seed crash. Caveat: an existing dev DB keeps its old data (the users-exist guard) — verify counts on a fresh DB (`DATABASE_URI=file:./scratch.db pnpm seed`).
