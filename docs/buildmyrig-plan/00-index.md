# BuildMyRig — Technical Plan (Index)

Modern e-commerce site for pre-built and custom-configured gaming/creator PCs, built on Payload CMS 3.x + Next.js 15 + PostgreSQL. This folder is the complete technical plan, split into small topic docs so each can be loaded independently (token-efficient AI recall).

## Navigation

| Doc | Deliverable (master prompt §10) |
| --- | --- |
| [01-executive-summary.md](01-executive-summary.md) | 1. Executive summary |
| [02-architecture.md](02-architecture.md) | 2. Architecture diagram (monorepo, plugin boundaries, checkout + configurator data flow) |
| [03-erd.md](03-erd.md) | 3. Full ERD |
| [04-collections/](04-collections/) | 4. Collection-by-collection spec |
| [05-plugin-contracts.md](05-plugin-contracts.md) | 5. Plugin contracts + extension contract |
| [06-rule-engine.md](06-rule-engine.md) | 6. Rule engine spec (≥20 test cases, admin UX) |
| [07-ux-plan.md](07-ux-plan.md) | 7. Screen-by-screen UX plan + design tokens |
| [08-api-surface.md](08-api-surface.md) | 8. API surface + Local API usage map |
| [09-routes.md](09-routes.md) | 9. Page/route table |
| [10-blocks-pages.md](10-blocks-pages.md) | 5. CMS page blocks (§10.4 complement) |
| [11-access-security.md](11-access-security.md) | 7. Access control & security |
| [12-integrations-ops.md](12-integrations-ops.md) | 8. Integrations & ops |
| [13-performance-seo.md](13-performance-seo.md) | 9. Performance & SEO budget |
| [14-migrations-seeds.md](14-migrations-seeds.md) | 10. Migration & seed plan |
| [15-delivery-phases.md](15-delivery-phases.md) | 11. Phase-by-phase delivery plan |
| [16-risks.md](16-risks.md) | 12. Risk register |
| [17-assumptions-backlog.md](17-assumptions-backlog.md) | 13. Assumptions & open questions · 14. Deferred backlog |

## Self-review checklist (all items covered)

- [x] Executive summary ≤10 lines — `01`
- [x] Mermaid architecture: monorepo, plugin boundaries, checkout flow, configurator flow — `02`
- [x] Mermaid `erDiagram` covering §3–§4 collections — `03`
- [x] Collection specs with fields, types, access, hooks — `04/*` (7 files)
- [x] Plugin contracts: exported API, options, extension points; extension contract doc — `05`
- [x] Rule engine: TS interfaces, pseudocode, complexity, ≥20 named test cases (circular rules, missing spec, empty category, mutually exclusive pair) — `06`
- [x] UX plan per screen w/ component trees + design-token starter — `07`
- [x] Custom endpoints (method, path, auth, shapes) + Local API map — `08`
- [x] Route table w/ SSR/ISR/CSR per route — `09`
- [x] Blocks field page builder, 12-block set, `blockToComponent` registry — `10`
- [x] Access control matrix + security checklist + pre-merge gates — `11`
- [x] Stripe, Resend, S3, analytics, CI/CD, env vars, monitoring — `12`
- [x] Perf/SEO budgets, indexes, JSON-LD — `13`
- [x] Migration files + seed scope (30+ components, 8 categories, 40+ rules, 3 templates, 20 products) — `14`
- [x] Phases with dependencies + DoD — `15`
- [x] ≥10 risks with mitigations — `16`
- [x] Assumptions listed for review; no "TBD" anywhere; deferred parking lot — `17`

## Cross-cutting references

- Official plugin API: https://payloadcms.com/docs/plugins/build-your-own
- Ecommerce plugin: https://payloadcms.com/docs/ecommerce/overview · https://payloadcms.com/docs/ecommerce/advanced
- Blocks field: https://payloadcms.com/docs/fields/blocks · https://payloadcms.com/posts/guides/how-to-build-flexible-layouts-with-payload-blocks
- TS helpers: https://payloadcms.com/docs/typescript/overview#type-helpers
