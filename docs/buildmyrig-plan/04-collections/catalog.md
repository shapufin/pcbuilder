# 04 · Collections — Catalog (Categories, Brands, Attributes)

## Categories (hierarchical)

Purpose: shop navigation tree (`gpus`, `storage`, `accessories`, `peripherals`…). Distinct from ComponentCategory (builder slot types).

| Field | Type | Notes |
| --- | --- | --- |
| title | text | |
| slug | text unique indexed | |
| parent | rel → categories (self, nullable) | parent/child |
| breadcrumbs | auto-computed array (beforeChange) | denormalized for queries |
| image | upload rel → media | |
| description | textarea | SEO copy |

Access: public read, admin/manager write. Drafts on. Hook: `afterChange` → revalidate category pages.

## Brands

| Field | Type | Notes |
| --- | --- | --- |
| name | text | |
| slug | text unique indexed | |
| logo | upload rel → media | |
| url | text | optional external site |

Access: public read, manager write.

## AttributeTypes (e.g. "Socket", "Form Factor", "Wattage", "Capacity")

| Field | Type | Notes |
| --- | --- | --- |
| name | text | e.g. "Socket" |
| slug | text unique indexed | e.g. "socket" — filter param name `?socket=AM5` |
| valueType | select: enum/number/range | enum → values list; number → gte/lte filters |
| appliesToCategories | rel → categories (array) | which facets show where |
| unit | text | "MHz", "GB", "W" for display |

## AttributeValues

| Field | Type | Notes |
| --- | --- | --- |
| attributeType | rel → attributeTypes (indexed) | |
| value | text | "AM5", "DDR5", "750" |
| displayLabel | text | optional prettier label |

Access (all catalog collections): public read, manager write, staff read.
Hooks: `beforeChange` on AttributeValues → validate against valueType; `afterChange` on AttributeTypes/Values → bump facet-filter version so listing pages refetch filter counts.

## Faceted filter mapping

`?brand=intel&socket=AM5&price_gte=100&price_lte=500&sort=price_asc&page=2` resolves to:
- brand → products.brand.slug
- socket / ramType / wattage / capacity → products.attributeValues (filtered by appliesToCategories)
- price_gte/price_lte → variant price resolution
- The filter sidebar renders filter **counts** from a cheap aggregate query per category (cached; see [13-performance-seo.md](../13-performance-seo.md)).
