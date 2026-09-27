# 04 · Collections — Pricing, Inventory, Discounts

## Prices

Single-currency v1: EUR (assumption A5; plugin-ecommerce supports multiple currencies, but v1 avoids FX display complexity — reasoning: one market launch). Schema is multi-currency-ready so no migration later.

| Field | Type | Notes |
| --- | --- | --- |
| amount | number | minor units (cents) |
| currency | text (default "EUR") | ISO 4217 |
| variant | rel → productVariants (nullable) | variant-level price |
| product | rel → products (nullable) | product-level default |
| validFrom / validUntil | date (nullable) | sale windows |

Price resolution hook (`plugin-shop`): given product or variant, resolve variant price → else product price → else error logged. Cached per variant id; invalidated on `afterChange` of prices/variants.

## Inventory

| Field | Type | Notes |
| --- | --- | --- |
| variant | rel → productVariants (unique) | 1:1 |
| quantity | number (default 0) | |
| reservedQuantity | number | cart reservations (checkout window) |
| lowStockThreshold | number (default 5) | emits staff email when crossing |
| allowBackorder | checkbox (default false) | |

Access: public read (published qty only — clients see `inStock` boolean + "low" flag; exact counts staff-only), staff write. Hooks: `afterChange` → emit `shop:stock-changed`; when quantity - reserved ≤ threshold → emit `shop:low-stock` → Resend to staff. Reservation flow: `beforeValidate` on order create → increment reserved; Stripe webhook `checkout.session.completed` → reserved→sold decrement; `session.expired` → release reservation.

## DiscountCodes

| Field | Type | Notes |
| --- | --- | --- |
| code | text unique indexed | case-insensitive (stored lowercase) |
| type | select: percentage / fixed / freeShipping | v1 simple |
| value | number | % or cents |
| maxUses | number (nullable) | usage cap |
| usedCount | number | incremented in webhook |
| minSubtotal | number (nullable) | cents |
| variants | rel → productVariants (array, optional) | scoped to items |
| validFrom / validUntil | date | |
| enabled | checkbox | |

Access: public read → NOT exposed at all (lookup only via `POST /api/discounts/validate`); admin/manager write. Hook: order line `beforeChange` → re-validate code against current totals server-side (never trust client-applied discount). Assumption A6: stacking disabled; one code per order.
