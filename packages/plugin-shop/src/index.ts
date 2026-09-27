import type { Access, CollectionConfig, Config, Plugin, PayloadRequest } from 'payload'
import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import { Media } from './collections/media.ts'
import { Categories } from './collections/categories.ts'
import { Brands } from './collections/brands.ts'
import { AttributeTypes } from './collections/attribute-types.ts'
import { AttributeValues } from './collections/attribute-values.ts'
import { Prices } from './collections/prices.ts'
import { DiscountCodes } from './collections/discount-codes.ts'

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
      orders: true,
      addresses: true,
      carts: true,
      // Payments (Stripe adapter) land in the checkout task later in Phase 1.
      payments: { paymentMethods: [] },
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

