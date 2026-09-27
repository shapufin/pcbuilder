# 03 · Full ERD

Mermaid `erDiagram` covering shop (§3) and PC-builder (§4) domains. Slug-named entities = Payload collections.

```mermaid
erDiagram
    %% ---- Catalog ----
    CATEGORIES ||--o{ CATEGORIES : "parent/child"
    CATEGORIES ||--o{ PRODUCTS : "categorizes"
    BRANDS ||--o{ PRODUCTS : "makes"
    ATTRIBUTE_TYPES ||--o{ ATTRIBUTE_VALUES : "has values"
    PRODUCTS ||--o{ PRODUCT_VARIANTS : "has"
    ATTRIBUTE_VALUES ||--o{ PRODUCT_VARIANTS : "variant options"
    PRODUCTS ||--o{ PRICES : "priced by (variant-level too)"
    PRODUCT_VARIANTS ||--o{ PRICES : "priced by"
    INVENTORY ||--|| PRODUCT_VARIANTS : "tracks stock of"

    %% ---- Commerce ----
    CUSTOMERS ||--o{ CARTS : "owns (guest: null)"
    CUSTOMERS ||--o{ ORDERS : "places"
    CUSTOMERS ||--o{ ADDRESSES : "has"
    CARTS ||--o{ CART_LINE_ITEMS : "contains"
    CART_LINE_ITEMS }o--|| PRODUCT_VARIANTS : "references"
    CART_LINE_ITEMS }o--o| CONFIGURED_BUILDS : "composite item of"
    ORDERS ||--o{ ORDER_LINE_ITEMS : "contains"
    ORDER_LINE_ITEMS ||--o{ ORDER_SUB_ITEMS : "per-component fulfillment"
    ORDER_LINE_ITEMS }o--|| PRODUCT_VARIANTS : "references"
    ORDERS ||--o{ TRANSACTIONS : "paid by"
    ORDERS }o--o{ DISCOUNT_CODES : "discounted by"
    ORDERS ||--o{ SHIPMENTS : "fulfilled in"
    SHIPMENTS }o--|| ADDRESSES : "ships to"
    ORDERS }o--|| ADDRESSES : "billing address"
    DISCOUNT_CODES }o--o{ PRODUCT_VARIANTS : "applies to (optional)"

    %% ---- PC Builder ----
    COMPONENT_CATEGORIES ||--o{ COMPONENTS : "slot type of"
    PRODUCTS ||--|| PRODUCT_VARIANTS : "component binds to variant"
    COMPONENTS }o--|| PRODUCT_VARIANTS : "is sold as"
    COMPONENTS ||--o{ PRICES : "inherited via variant"
    INVENTORY ||--|| COMPONENTS : "via variant"
    COMPONENT_CATEGORIES ||--o{ BUILD_TEMPLATES : "templates have slots"
    BUILD_TEMPLATES ||--o{ TEMPLATE_SLOTS : "has"
    TEMPLATE_SLOTS }o--o| COMPONENTS : "preselected"
    CUSTOMERS ||--o{ CONFIGURED_BUILDS : "owns (guest: null)"
    CONFIGURED_BUILDS ||--o{ BUILD_SLOTS : "has"
    BUILD_SLOTS }o--|| COMPONENTS : "chosen"
    BUILD_SLOTS }o--|| COMPONENT_CATEGORIES : "slot type"
    COMPONENTS }o--o{ ATTRIBUTE_VALUES : "specs as values (cosmetic)"
    CONFIGURED_BUILDS }o--o| CONFIGURED_BUILDS : "shared public view"

    %% ---- Rules ----
    COMPONENTS ||--o{ COMPATIBILITY_RULES : "subject (component)"
    COMPONENT_CATEGORIES ||--o{ COMPATIBILITY_RULES : "subject (category)"
    COMPONENTS ||--o{ COMPATIBILITY_RULES : "target (component)"
    COMPONENT_CATEGORIES ||--o{ COMPATIBILITY_RULES : "target (category)"
    COMPONENT_CATEGORIES ||--|| DERIVED_POWER_RULES : "power requirement per"
    CONFIGURED_BUILDS ||--o{ VALIDATION_SNAPSHOTS : "validated at save"

    %% ---- Platform ----
    MEDIA ||--o{ PRODUCTS : "gallery of"
    PAGES ||--o{ PAGE_BLOCKS : "layout composed of"
    PAGE_BLOCKS }o--o{ PRODUCT_VARIANTS : "ProductGrid filter rel"
    PAGE_BLOCKS }o--o| BUILD_TEMPLATES : "TemplatesCarousel rel"
    USERS ||--o| CUSTOMERS : "auth user links (1:1)"
    USERS ||--o{ REVIEWS : "wrote (Phase 2)"
    PRODUCTS ||--o{ REVIEWS : "reviewed (Phase 2)"
```

Notes

- `USERS` is Payload's auth collection; `CUSTOMERS` is a 1:1 extension doc (shop data) referencing a user. Assumption A3.
- Multi-entity-priced `PRICES` (product-level, variant-level, component-inherited) resolved via a single resolution hook; see [04-collections/pricing-inventory.md](04-collections/pricing-inventory.md).
- `VALIDATION_SNAPSHOTS` is a sub-structure on ConfiguredBuild, not a separate collection (drawn as one for clarity).
- Rule bidirectionality (CPU↔motherboard) is two rule docs or a `bidirectional` flag on one doc — see [04-collections/compatibility.md](04-collections/compatibility.md).
