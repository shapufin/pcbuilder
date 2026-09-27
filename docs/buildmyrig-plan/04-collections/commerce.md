# 04 · Collections — Commerce (Carts, Orders, Shipments, Addresses, Customers)

When `@payloadcms/plugin-ecommerce` is the base, these come from the plugin (collections customizable via its factory functions, https://payloadcms.com/docs/ecommerce/advanced). Shapes below are the contract `plugin-shop` relies on — valid for both the plugin and our fallback.

## Carts

| Field | Type | Notes |
| --- | --- | --- |
| customer | rel → customers (nullable) | null = guest (cart id in localStorage) |
| lineItems | array: { variant rel, quantity, lineType ('standard' | 'configured-build'), configuredBuild rel (nullable), subItems array } | lineType 'configured-build' = composite item registered by the builder plugin |
| discountCode | rel → discountCodes (nullable) | |
| currency | text | |
| status | active / ordered / abandoned | abandoned after 14 days of inactivity |

Guest + user carts supported by the plugin; on login, plugin-shop's `afterLogin` hook merges guest cart (id from localStorage) into user cart, deduplicating variants. Access: customer reads own cart via `isDocumentOwner`, public create (guest), admin read all.

## Orders

| Field | Type | Notes |
| --- | --- | --- |
| orderNumber | text unique (BMR-2026-000001) | |
| customer | rel → customers | |
| email | text | guest checkout |
| status | select: pending → paid → fulfilled → shipped → delivered | cancelled / refunded terminal states |
| lineItems | array: { variant rel, quantity, lineType, configuredBuild rel, subItems: [{ component rel, quantity }] } | subItems power per-component fulfillment picking |
| billingAddress / shippingAddress | rel → addresses | |
| subtotal / discountTotal / shippingTotal / taxTotal / total | number | ALL computed server-side at checkout & webhook |
| currency | text | |
| discountCode | rel → discountCodes | |
| transactions | rel → transactions | |
| history | array: { status, at, by } | audit |

Access: owner read (customer or email match), staff read, manager/admin write, **public write = none** (order created only by server checkout handler). Versions off. Hooks: `afterChange` (status=paid) → decrement inventory, release reservations, send confirmation email, analytics `purchase`; (shipped) → shipping email; (refunded) → Stripe refund reconciliation.

## Transactions

| Field | Type | Notes |
| --- | --- | --- |
| order | rel → orders | |
| provider | text ("stripe") | |
| providerRef | text unique | Stripe session/payment intent id (idempotency key) |
| amount / currency | number / text | |
| status | select: pending / succeeded / failed / refunded | |
| raw | json | last webhook event (debug) |

## Shipments

| Field | Type | Notes |
| --- | --- | --- |
| order | rel → orders | |
| carrier / trackingNumber / trackingUrl | text | |
| items | array of { subItemIndex, quantity } | partial shipments possible |
| shippedAt / deliveredAt | date | |
| address | rel → addresses | |

Access: staff write, owner read. Hook: trackingUrl change → email with tracking link.

## Addresses

| Field | Type | Notes |
| --- | --- | --- |
| customer | rel → customers | |
| name / company / line1 / line2 / city / postalCode / country / phone | text fields | postalCode indexed |
| isDefaultShipping / isDefaultBilling | checkbox | |

Access: `isDocumentOwner` (https://payloadcms.com/docs/ecommerce/advanced shows this factory access pattern), public create (guest checkout stores address on order instead).

## Customers

| Field | Type | Notes |
| --- | --- | --- |
| user | rel → users (unique) | 1:1 with Payload auth user (assumption A3) |
| phone | text | |
| notes | textarea (staff-only) | |
| savedBuilds | virtual via configuredBuilds query | not stored |

Access: self read/write basics, staff read, admin write.
