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
| customerEmail | text | guest checkout (plugin-ecommerce's field name — the account/orders queries match on `customer = user.id` OR `customerEmail = user.email`) |
| status | select: processing → completed (order created `processing` on paid webhook settlement; staff mark `completed` when fulfilled/shipped) | cancelled / refunded terminal states. **Note**: the earlier plan row `pending → paid → fulfilled → shipped → delivered` never existed — corrected at entry 20 to plugin-ecommerce's real `OrderStatus` |
| lineItems | array: { variant rel, quantity, lineType, configuredBuild rel, subItems: [{ component rel, quantity }] } | subItems power per-component fulfillment picking |
| billingAddress / shippingAddress | rel → addresses | |
| subtotal / discountTotal / shippingTotal / taxTotal / total | number | ALL computed server-side at checkout & webhook |
| currency | text | |
| discountCode | rel → discountCodes | |
| transactions | rel → transactions | |
| history | array: { status, at, by } | audit |

Access: owner read (customer or email match — the `customerEmail` clause implemented as an `access.read` override in plugin-shop at entry 15, because the ecommerce plugin's default matched only the customer id and hid guest-email orders from their owner's `/account`), staff read + **status-only update** (entry 20 review: collection `update` admits staff, field access pins every field but `status` to manager+, `restrictStaffStatus` limits staff values to `processing|completed` — `packages/plugin-shop/src/collections/orders.ts`), manager/admin write for everything else, **public write = none** (orders are created only by the server checkout flow: Stripe webhook settlement or plugin-ecommerce's confirm poll — whichever claims the transaction CAS first). Versions off. Hooks — order writes go through `payload.create`/`payload.update`, so `afterChange` fires: **inventory decrement** already lives in the settlement code (`stripe-webhooks.ts`, entry 13 — not a hook); **`orderEmailsAfterChange`** (entry 20, `src/emails/order-emails.ts`): create → confirmation email, `processing → completed` → shipping email (never throws; dry-run without `RESEND_API_KEY`/`EMAIL_FROM`); **analytics**: client-side `track('Purchase')` fires at checkout confirm (entry 14) **plus a server-side `purchase` event on order create** (entry 23, `plugin-shop/src/analytics/order-purchase.ts` — create-only, skips cancelled/refunded, never throws, dry-run without `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`); refund reconciliation lives in the webhook refund handler (entry 13).

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
