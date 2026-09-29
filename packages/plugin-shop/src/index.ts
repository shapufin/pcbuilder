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
import {
  cartItemMatcher,
  extendItemsFields,
  validateBuildsAtCheckout,
  wrapCartBeforeChange,
  type CartBeforeChangeHook,
} from './lib/line-item-hooks.ts'
import { cartAddBuildEndpoint, cartValidateBuildsEndpoint } from './endpoints.ts'
import { isStaff } from './lib/access.ts'
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
                    ...defaultCollection.fields,
                  ],
                },
              ],
            },
          ],
        }),
      },
      inventory: true,
      orders: {
        // Phase 2e: composite 'configured-build' lines are re-validated at
        // checkout (resolveLine throws → order creation aborts).
        ordersCollectionOverride: ({ defaultCollection }: { defaultCollection: CollectionConfig }) =>
          ({
            ...defaultCollection,
            fields: extendItemsFields(defaultCollection.fields),
            // Entry 15 (04-collections/commerce.md): owner read = customer id
            // OR customerEmail match (guest orders later claimed/linked by
            // email) + staff read. The plugin default (isAdmin OR
            // isDocumentOwner) only matched the customer id. Non-staff users
            // only ever get a where scoped to their OWN id/email, so this
            // cannot widen access to other customers' orders.
            access: {
              ...defaultCollection.access,
              read: (({ req }: { req: PayloadRequest }) => {
                if (!req.user) return false
                if (isStaff(req.user as { roles?: string[] | null } | null)) return true
                const user = req.user as { id: number | string; email?: string | null }
                return user.email
                  ? {
                      or: [
                        { customer: { equals: user.id } },
                        { customerEmail: { equals: user.email } },
                      ],
                    }
                  : { customer: { equals: user.id } }
              }) as Access,
            },
            hooks: {
              ...defaultCollection.hooks,
              beforeChange: [...(defaultCollection.hooks?.beforeChange ?? []), validateBuildsAtCheckout],
            },
          }) as CollectionConfig,
      },
      addresses: true,
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
            fields: extendItemsFields(defaultCollection.fields),
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
              stripeAdapter({
                publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
                secretKey: process.env.STRIPE_SECRET_KEY,
                webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                // Reliable settlement path (Phase 4): without handlers the
                // endpoint ACKs events without updating orders — see
                // payments/stripe-webhooks.ts (idempotent state-machine CAS).
                webhooks: stripeWebhooks,
              } as never),
            ]
          : [],
      },
    } as never) as Plugin

    return withEcommerce({
      ...incomingConfig,
      collections: [
        ...(incomingConfig.collections || []),
        Media,
        Categories,
        Brands,
        AttributeTypes,
        AttributeValues,
        Prices,
        DiscountCodes,
      ],
    }) as Promise<Config>
  }

export default shopPlugin

