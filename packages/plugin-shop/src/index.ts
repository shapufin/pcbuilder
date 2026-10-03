import type { Access, CollectionConfig, Config, Plugin, PayloadRequest } from 'payload'
import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import { stripeAdapter } from '@payloadcms/plugin-ecommerce/payments/stripe'
import { Media } from './collections/media.ts'
import { Categories } from './collections/categories.ts'
import { Brands } from './collections/brands.ts'
import { AttributeTypes } from './collections/attribute-types.ts'
import { AttributeValues } from './collections/attribute-values.ts'
import { Prices } from './collections/prices.ts'
import { DiscountCodes } from './collections/discount-codes.ts'
import { ShippingBands } from './collections/shipping-bands.ts'
import { TaxRates } from './collections/tax-rates.ts'
import { InventoryReservations } from './collections/inventory-reservations.ts'
import { maskInventoryRead, staffReadOnly } from './lib/inventory-access.ts'
import { staffOrOwnAddressRead, transactionsAccess } from './lib/access.ts'
import { snapshotCartCheckoutState } from './lib/transaction-snapshot.ts'
import { wrapWithReservations } from './lib/reservations.ts'
import {
  cartItemMatcher,
  cartTotalsFields,
  extendItemsFields,
  wrapCartBeforeChange,
  type CartBeforeChangeHook,
} from './lib/line-item-hooks.ts'
import {
  cartAddBuildEndpoint,
  cartValidateBuildsEndpoint,
  cartApplyDiscountEndpoint,
  cartShippingCountryEndpoint,
  discountValidateEndpoint,
} from './endpoints.ts'
import { ordersCollectionOverride } from './collections/orders.ts'
import { stripeWebhooks } from './payments/stripe-webhooks.ts'

/**
 * plugin-shop — catalog, carts, orders, pricing, inventory, discounts.
 * Shop core rides on @payloadcms/plugin-ecommerce (see docs/buildmyrig-plan/04-collections/spike-ecommerce-decision.md).
 */
export interface ShopPluginOptions {
  /** Enable or disable the plugin. @default true */
  enabled?: boolean
  /** Order number prefix. @default 'BMR' */
  orderNumberPrefix?: string
}

const checkRole =
  (roles: string[]) =>
  ({ req }: { req: PayloadRequest }): boolean =>
    Boolean(req.user && (req.user as { collection?: string; roles?: string[] }).collection === 'users' &&
      (req.user as { roles?: string[] }).roles?.some((r) => roles.includes(r)))

const roleAccess = (roles: string[]): Access => checkRole(roles) as unknown as Access

export const shopPlugin =
  (pluginOptions: ShopPluginOptions = {}): Plugin =>
  (incomingConfig: Config): Config | Promise<Config> => {
    if (pluginOptions.enabled === false) return incomingConfig

    const withEcommerce = ecommercePlugin({
      access: {
        isAdmin: roleAccess(['admin', 'manager']),
        isAuthenticated: ({ req }: { req: PayloadRequest }) => Boolean(req.user),
        isCustomer: ({ req }: { req: PayloadRequest }) =>
          Boolean(req.user && (req.user as { collection?: string }).collection === 'users'),
        isDocumentOwner: ({ req }: { req: PayloadRequest }) => {
          if (!req.user) return false
          return { customer: { equals: req.user.id } }
        },
        adminOnlyFieldAccess: checkRole(['admin']) as never,
        adminOrPublishedStatus: ({ req }: { req: PayloadRequest }) => {
          if (checkRole(['admin', 'manager', 'staff'])({ req })) return true
          return { _status: { equals: 'published' } }
        },
      },
      customers: { slug: 'users' },
      currencies: {
        supportedCurrencies: [{ code: 'EUR', decimals: 2, label: 'Euro', symbol: '€', symbolDisplay: 'symbol' }],
        defaultCurrency: 'EUR',
      },
      products: {
        variants: true,
        productsCollectionOverride: ({ defaultCollection }: { defaultCollection: CollectionConfig }) => ({
          ...defaultCollection,
          admin: {
            ...defaultCollection.admin,
            useAsTitle: 'title',
            defaultColumns: ['title', 'category', 'brand', 'prices'],
          },
          fields: [
            {
              type: 'tabs',
              tabs: [
                {
                  label: 'Catalog',
                  fields: [
                    { name: 'title', type: 'text', required: true },
                    { name: 'slug', type: 'text', unique: true, index: true, required: true, admin: { position: 'sidebar' } },
                    { name: 'category', type: 'relationship', relationTo: 'categories', index: true },
                    { name: 'brand', type: 'relationship', relationTo: 'brands', index: true },
                    { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true },
                    { name: 'description', type: 'textarea' },
                    {
                      name: 'attributeValues',
                      type: 'array',
                      fields: [
                        { name: 'attributeType', type: 'relationship', relationTo: 'attribute-types', required: true },
                        { name: 'value', type: 'relationship', relationTo: 'attribute-values', required: true },
                      ],
                    },
                    { name: 'specsJson', type: 'json', admin: { description: 'Cosmetic specs; display + whitelisted filters' } },
                  ],
                },
                {
                  label: 'Commerce',
                  fields: [
                    // Matrix row 13: raw stock counts are staff+ — public gets
                    // the `inStock` boolean via the product view.
                    ...maskInventoryRead(defaultCollection.fields, staffReadOnly),
                  ],
                },
              ],
            },
          ],
        }),
      },
      // Variants carry the same `inventory` field with no plugin-level access
      // hook — patched here for the same matrix row.
      variants: {
        variantsCollectionOverride: ({ defaultCollection }: { defaultCollection: CollectionConfig }) => ({
          ...defaultCollection,
          fields: maskInventoryRead(defaultCollection.fields, staffReadOnly),
        }),
      },
      inventory: true,
      // Orders override lives in collections/orders.ts (entry 15 owner read,
      // Phase 2e line validation, entry 20 emails + staff status-only write).
      orders: {
        ordersCollectionOverride,
      },
      // Transactions gain an at-most-once marker for discount usage counting
      // (entry 32 review F2): whichever settlement path wins — webhook claim,
      // upstream poll, or repair — counts the code exactly once via a CAS.
      transactions: {
        transactionsCollectionOverride: ({ defaultCollection }: { defaultCollection: CollectionConfig }) => ({
          ...defaultCollection,
          // Matrix row 17: staff+ read; writes (refunds) admin-only.
          access: { ...defaultCollection.access, ...transactionsAccess },
          fields: [
            ...defaultCollection.fields,
            {
              name: 'discountCounted',
              type: 'checkbox',
              defaultValue: false,
              admin: { readOnly: true, description: 'Set once when the cart discount usage was counted' },
            },
            // Entry 44: charge-time snapshots — the cart is mutable while the
            // PaymentIntent is in flight, so settlement reads these, not the cart.
            {
              name: 'discountCodeApplied',
              type: 'relationship',
              relationTo: 'discount-codes' as never,
              admin: { readOnly: true, description: 'Discount code snapshotted at payment initiation' },
            },
            {
              name: 'totalsSnapshot',
              type: 'json',
              admin: { readOnly: true, description: 'Cart totals snapshot {subtotal,discountTotal,shippingTotal,taxTotal,total} at initiation' },
            },
            // Entry 44: settlement resumability — lines already decremented /
            // loop completed. Readers key conversion flags off inventoryComplete.
            {
              name: 'inventoryProgress',
              type: 'number',
              admin: { readOnly: true, description: 'Order-item lines whose stock decrement completed' },
            },
            {
              name: 'inventoryComplete',
              type: 'checkbox',
              admin: { readOnly: true, description: 'Set with status=succeeded once the webhook decrement loop finished' },
            },
            // Entry 44 review: fencing token — the stale-claim window can steal
            // a still-alive worker; the token makes the thief visible so the old
            // worker aborts instead of double-decrementing.
            {
              name: 'settlementToken',
              type: 'text',
              admin: { hidden: true },
            },
          ],
          hooks: {
            ...defaultCollection.hooks,
            beforeChange: [
              ...(defaultCollection.hooks?.beforeChange ?? []),
              snapshotCartCheckoutState,
            ],
          },
        }),
      },
      // Matrix row 19: staff+ read all addresses; customers see only their own.
      addresses: {
        addressesCollectionOverride: ({ defaultCollection }: { defaultCollection: CollectionConfig }) => ({
          ...defaultCollection,
          access: { ...defaultCollection.access, read: staffOrOwnAddressRead },
        }),
      },
      carts: {
        // Phase 2e: items gain lineType/configuredBuild/subItems; subtotal hook
        // chains after the default one and adds server-resolved build prices.
        // Guest carts on (secret + localStorage per 07-ux-plan.md).
        allowGuestCarts: true,
        cartsCollectionOverride: ({ defaultCollection }: { defaultCollection: CollectionConfig }) => {
          const defaultHooks = Array.isArray(defaultCollection.hooks?.beforeChange)
            ? defaultCollection.hooks.beforeChange
            : []
          return {
            ...defaultCollection,
            fields: [...extendItemsFields(defaultCollection.fields), ...cartTotalsFields],
            // Wrap the default hook so product-less composite lines don't crash it.
            hooks: {
              ...defaultCollection.hooks,
              beforeChange: defaultHooks.map((hook, i) =>
                i === 0 ? wrapCartBeforeChange(hook as CartBeforeChangeHook) : hook,
              ),
            },
            // Collection endpoints are matched relative to the collection slug.
            endpoints: [
              ...(Array.isArray(defaultCollection.endpoints) ? defaultCollection.endpoints : []),
              cartAddBuildEndpoint,
              cartValidateBuildsEndpoint,
              cartApplyDiscountEndpoint,
              cartShippingCountryEndpoint,
            ],
          } as CollectionConfig
        },
        cartItemMatcher: cartItemMatcher as never,
      },
      // Stripe payments: endpoints /api/payments/stripe/initiate|confirm-order|webhooks.
      // Inactive until STRIPE_SECRET_KEY is set (keeps local dev working without keys).
      payments: {
        paymentMethods: process.env.STRIPE_SECRET_KEY
          ? [
              wrapWithReservations(
                stripeAdapter({
                  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
                  secretKey: process.env.STRIPE_SECRET_KEY,
                  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                  // Reliable settlement path (Phase 4): without handlers the
                  // endpoint ACKs events without updating orders — see
                  // payments/stripe-webhooks.ts (idempotent state-machine CAS).
                  webhooks: stripeWebhooks,
                } as never) as never,
              ),
            ]
          : [],
      },
    } as never) as Plugin

    return withEcommerce({
      ...incomingConfig,
      // Config-level endpoints are matched from the API root: /api/discounts/validate.
      endpoints: [...(incomingConfig.endpoints ?? []), discountValidateEndpoint],
      collections: [
        ...(incomingConfig.collections || []),
        Media,
        Categories,
        Brands,
        AttributeTypes,
        AttributeValues,
        Prices,
        DiscountCodes,
        ShippingBands,
        TaxRates,
        InventoryReservations,
      ],
    }) as Promise<Config>
  }

export default shopPlugin

