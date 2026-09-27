# 04 · Collections — PC Builder (ComponentCategory, Component, BuildTemplate, ConfiguredBuild)

Owned by `packages/plugin-pc-builder`. Rule collections live in [compatibility.md](compatibility.md).

## ComponentCategory (slot types)

| Field | Type | Notes |
| --- | --- | --- |
| slug | text unique indexed | `cpu`, `motherboard`, `ram`, `gpu`, `storage`, `psu`, `case`, `cooling`, `os`, `case-fan` |
| name | text | |
| icon | text (token name from packages/ui icon set) | no raw hex/emoji |
| sortOrder | number | step order |
| required | checkbox (default true) | required slots cannot be skipped |
| maxSelectable | number (default 1) | e.g. storage = 2, case-fan = 6 |
| helperText | text | shown in builder step |

Access: public read, admin/manager write. Hook: sortOrder change → reindex builder step cache.

## Component

A purchasable part. **Relationship choice (A1): a Component references a ProductVariant (rel), not a Product.** Justification: price, SKU, and inventory all resolve at variant granularity in the ecommerce plugin; keeping the component → variant rel lets `plugin-shop` treat a component as just another sellable line without importing builder code. Display/marketing data lives on the parent Product (component.title mirrors product.title via a sync hook to keep builder lists cheap).

| Field | Type | Notes |
| --- | --- | --- |
| name | text (synced from product) | |
| productVariant | rel → productVariants (unique) | price/stock/SKU source (A1) |
| category | rel → componentCategories (indexed) | slot type |
| brand | rel → brands (indexed) | |
| images | upload rel → media | |
| description / marketingCopy | textarea / richtext | |
| **typed specs (rule-critical)** | see below | read by rule engine |
| specsJson | json | cosmetic; whitelisted keys filterable |
| compatTags | array of text | free tags shown on cards ("pairs with AM5 boards") |
| isOsLicense | checkbox | OS slot special-casing |

**Typed specs (rule engine reads ONLY these; everything in specsJson is cosmetic display/filtering):**

| Field | Type | Applies to |
| --- | --- | --- |
| socket | select: AM5 / LGA1700 / LGA1851 (indexed) | cpu, motherboard |
| ramType | select: DDR4 / DDR5 (indexed) | ram, motherboard |
| ramSpeedMhz | number | ram |
| tdpWatts | number (indexed) | cpu, gpu, other |
| psuWatts | number | psu |
| moboFormFactor | select: ATX / mATX / ITX (indexed) | motherboard |
| caseSupportedFormFactors | array: ATX/mATX/ITX | case |
| gpuLengthMm | number | gpu |
| caseGpuMaxLengthMm | number | case |
| coolerSocketSupport | array: AM5/LGA1700/LGA1851 | cooling |
| storageInterface | select: NVMe / SATA (indexed) | storage, motherboard (nvme count flag) |
| pcieVersion | select: 3.0/4.0/5.0 | gpu, motherboard (warning-level) |

Access: public read, admin/manager write. Hooks: `afterChange` → rebuild server spec index + bump client rule index version (cache tag `builder-index`).

## BuildTemplate (pre-built PCs)

| Field | Type | Notes |
| --- | --- | --- |
| name / slug | text unique | |
| description / heroCopy | richtext | |
| images | upload rel → media | hero layout |
| tags | array of select: gaming / editing / workstation / streaming | landing filters |
| slots | array: { category rel → componentCategories, component rel → components (nullable) } | preselected or empty |
| basePrice | number (computed from slots, read-only field override allowed) | |
| popularity | number (incremented on "start from template") | |

Access: public read, manager write. Drafts on.

## ConfiguredBuild

| Field | Type | Notes |
| --- | --- | --- |
| user | rel → users (nullable) | guest = null (A4: share URL works for guests) |
| shareId | text unique indexed (nanoid) | `/build/[shareId]` read-only view |
| slots | array: { category rel → componentCategories, components: array rel → components } | maxSelectable > 1 slots |
| priceSnapshot | number | display-only, recomputed server-side at checkout |
| validationSnapshot | json: { errors: [...], warnings: [...], rulesVersion } | engine output at save time |
| status | select: draft / addedToCart / ordered | |
| name | text | "My 4K gaming rig" |

Access: owner read/write (user match) + share read via shareId lookup (public read hook checks shareId param server-side), admin read. Hooks: `beforeChange` → run server rule engine, store validationSnapshot + recompute priceSnapshot from current DB prices; `afterChange` → invalidate share page cache tag.
