import type { Access, CollectionConfig, Config, Field, FieldHook, Plugin, PayloadRequest } from 'payload'
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
  cartConfirmFreeEndpoint,
  cartPackagingEndpoint,
  discountValidateEndpoint,
} from './endpoints.ts'
import { PackagingTiers } from './globals/packaging-tiers.ts'
import { StoreSettings } from './globals/store-settings.ts'
import { Reviews } from './collections/reviews.ts'
import { registerPackagingLineType } from './lib/packaging.ts'
import { ordersCollectionOverride } from './collections/orders.ts'
import { stripeWebhooks } from './payments/stripe-webhooks.ts'
import { slugify } from './lib/slug.ts'

export { slugify } from './lib/slug.ts'
export { StoreSettings } from './globals/store-settings.ts'
export { DEFAULT_STORE_SETTINGS, resolveStoreSettings } from './lib/store-settings.ts'
export type { StoreSettings as StoreSettingsType, PromoBannerConfig, TrustBadgeItem, PluginFeatureFlags } from './lib/store-settings.ts'
export { Reviews } from './collections/reviews.ts'

/**
 * plugin-shop — catalog, carts, orders, pricing, inventory, discounts.
 * Shop core rides on @payloadcms/plugin-ecommerce (see docs/buildmyrig-plan/04-collections/spike-ecommerce-decision.md).
 */
export interface ShopPluginOptions {
  /** Enable or disable the plugin. @default true */
  enabled?: boolean
  /** Order number prefix. @default 'BMR' */
  orderNumberPrefix?: string
  /** Custom UI component path for managing terms directly within an attribute type */
  attributeTermsComponent?: string
  /** Custom UI component path for dynamic category specifications form on products */
  productSpecsComponent?: string
  /** Custom UI component path for catalog telemetry ribbon and facet filters before products list */
  productsListHeaderComponent?: string
  /** Custom UI component path for orders fulfillment telemetry ribbon and facet filters before orders list */
  ordersListHeaderComponent?: string
  /** Custom UI component path for the product "Builder Rules" edit tab */
  builderRulesTabComponent?: string
  /** Custom UI component path for the sidebar Google SERP preview on product edit */
  serpPreviewComponent?: string
  /** Custom UI component path for the product slug field (live title→slug autogen) */
  slugFieldComponent?: string
}

const checkRole =
  (roles: string[]) =>
  ({ req }: { req: PayloadRequest }): boolean => {
    const user = req.user as { collection?: string; roles?: string[] } | null | undefined
    return Boolean(
      user &&
        (user.collection === undefined || user.collection === 'users') &&
        Array.isArray(user.roles) &&
        user.roles.some((r) => roles.includes(r)),
    )
  }

const roleAccess = (roles: string[]): Access => checkRole(roles) as unknown as Access

export const shopPlugin =
  (pluginOptions: ShopPluginOptions = {}): Plugin =>
  (incomingConfig: Config): Config | Promise<Config> => {
    if (pluginOptions.enabled === false) return incomingConfig

    const withEcommerce = ecommercePlugin({
      access: {
        isAdmin: roleAccess(['admin', 'manager']),
        isAuthenticated: ({ req }: { req: PayloadRequest }) => Boolean(req.user),
        isCustomer: ({ req }: { req: PayloadRequest }) => {
          const user = req.user as { collection?: string } | null | undefined
          return Boolean(user && (user.collection === undefined || user.collection === 'users'))
        },
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
        productsCollectionOverride: ({ defaultCollection }: { defaultCollection: CollectionConfig }) => {
          const isInventoryField = (field: Field): boolean =>
            Boolean(field && typeof field === 'object' && 'name' in field && field.name === 'inventory')

          const maskedDefault = maskInventoryRead(defaultCollection.fields, staffReadOnly)
          const ecommerceInventory = maskedDefault.filter(isInventoryField)
          const ecommercePricing = maskedDefault.filter((f) => !isInventoryField(f))

          return {
            ...defaultCollection,
            // Upstream enables drafts.autosave — every open of the create
            // view (incl. the list-page slide-over drawer) persists an empty
            // draft before the user saves, leaking orphan rows. Keep drafts
            // (Save Draft still works) but only write on explicit save.
            versions: {
              ...(typeof defaultCollection.versions === 'object' ? defaultCollection.versions : {}),
              drafts: {
                ...(typeof defaultCollection.versions === 'object' &&
                typeof defaultCollection.versions?.drafts === 'object'
                  ? defaultCollection.versions.drafts
                  : {}),
                autosave: false,
              },
            },
            admin: {
              ...defaultCollection.admin,
              useAsTitle: 'title',
              defaultColumns: ['title', 'category', 'brand', 'sku', 'priceInEUR', '_status', 'updatedAt'],
              listSearchableFields: ['title', 'slug', 'sku', 'mpn', 'description'],
              group: 'Store',
              ...(pluginOptions.productsListHeaderComponent
                ? {
                    components: {
                      ...defaultCollection.admin?.components,
                      beforeList: [
                        ...(Array.isArray(defaultCollection.admin?.components?.beforeList)
                          ? defaultCollection.admin.components.beforeList
                          : []),
                        pluginOptions.productsListHeaderComponent,
                      ],
                    },
                  }
                : {}),
            },
            fields: [
              {
                type: 'tabs',
                tabs: [
                  {
                    label: 'General & Media',
                    fields: [
                      {
                        type: 'row',
                        fields: [
                          {
                            name: 'title',
                            type: 'text',
                            required: true,
                            admin: { width: '60%', placeholder: 'e.g. ASUS ROG Strix GeForce RTX 4080 Super' },
                          },
                          {
                            name: 'slug',
                            type: 'text',
                            unique: true,
                            index: true,
                            required: true,
                            // Server-side fallback: REST/admin creates without a
                            // slug derive one from the title. A manually entered
                            // slug is never overwritten.
                            hooks: {
                              beforeValidate: [
                                (({ value, data }: { value?: unknown; data?: { title?: unknown } }) =>
                                  typeof value === 'string' && value.trim() !== ''
                                    ? value
                                    : slugify(data?.title) || value) as FieldHook,
                              ],
                            },
                            admin: {
                              width: '40%',
                              placeholder: 'e.g. asus-rog-strix-rtx-4080-super',
                              ...(pluginOptions.slugFieldComponent
                                ? { components: { Field: pluginOptions.slugFieldComponent } }
                                : {}),
                            },
                          },
                        ],
                      },
                      {
                        name: 'keyFeatures',
                        type: 'array',
                        label: 'Key Highlights & Selling Points (PDP Bullets)',
                        labels: {
                          singular: 'Highlight Bullet',
                          plural: 'Highlight Bullets',
                        },
                        admin: {
                          description: 'High-impact product bullet points displayed beside the buy box on the product page.',
                        },
                        fields: [
                          {
                            name: 'feature',
                            type: 'text',
                            required: true,
                            admin: { placeholder: 'e.g. 16GB GDDR6X 256-bit memory, 2640 MHz boost clock' },
                          },
                        ],
                      },
                      {
                        name: 'gallery',
                        type: 'upload',
                        relationTo: 'media',
                        hasMany: true,
                        label: 'Product Gallery & Media Assets',
                      },
                      {
                        name: 'description',
                        type: 'textarea',
                        label: 'Product Overview & Specifications',
                        admin: { placeholder: 'Detailed product description, key highlights, performance details...' },
                      },
                      {
                        name: 'crossSells',
                        type: 'relationship',
                        relationTo: 'products',
                        hasMany: true,
                        label: 'Frequently Bought Together / Accessories',
                        admin: { description: 'Recommended upgrades & accessories shown in PDP and Cart' },
                      },
                    ],
                  },
                  {
                    label: 'Pricing & Margin',
                    fields: [
                      ...ecommercePricing,
                      {
                        type: 'row',
                        fields: [
                          {
                            name: 'compareAtPriceInEUR',
                            type: 'number',
                            label: 'Compare-at Price / MSRP (cents)',
                            min: 0,
                            admin: {
                              width: '50%',
                              description: 'Original strike-through MSRP in EUR cents (e.g. 15900 = €159.00). Must be greater than priceInEUR to trigger discount badge.',
                              placeholder: 'e.g. 15900 (€159.00)',
                            },
                          },
                          {
                            name: 'costInEUR',
                            type: 'number',
                            label: 'Cost per Item (cents)',
                            min: 0,
                            access: {
                              read: staffReadOnly,
                              update: staffReadOnly,
                            },
                            admin: {
                              width: '50%',
                              description: 'Internal wholesale purchase cost in EUR cents (e.g. 9500 = €95.00) for margin tracking (Staff & Admin only).',
                              placeholder: 'e.g. 9500 (€95.00)',
                            },
                          },
                        ],
                      },
                    ],
                  },
                  {
                    label: 'Inventory & Logistics',
                    fields: [
                      {
                        type: 'row',
                        fields: [
                          {
                            name: 'sku',
                            type: 'text',
                            label: 'SKU (Stock Keeping Unit)',
                            index: true,
                            admin: {
                              width: '50%',
                              placeholder: 'e.g. GPU-ASUS-4080S-OC',
                              description: 'Warehouse tracking code',
                            },
                          },
                          {
                            name: 'mpn',
                            type: 'text',
                            label: 'Manufacturer Part Number (MPN)',
                            index: true,
                            admin: {
                              width: '50%',
                              placeholder: 'e.g. ROG-STRIX-RTX4080S-O16G',
                              description: 'Official OEM hardware part number',
                            },
                          },
                        ],
                      },
                      ...ecommerceInventory,
                      {
                        type: 'row',
                        fields: [
                          {
                            name: 'trackQuantity',
                            type: 'checkbox',
                            label: 'Track Inventory Stock',
                            defaultValue: true,
                            admin: {
                              width: '50%',
                              description: 'When disabled, product is treated as having unlimited availability.',
                            },
                          },
                          {
                            name: 'allowBackorders',
                            type: 'checkbox',
                            label: 'Allow Backorders / Pre-orders',
                            defaultValue: false,
                            admin: {
                              width: '50%',
                              description: 'Allow customers to purchase when stock level reaches 0.',
                            },
                          },
                        ],
                      },
                      {
                        name: 'weightKg',
                        type: 'number',
                        label: 'Shipping Weight (kg)',
                        min: 0,
                        admin: {
                          width: '50%',
                          placeholder: 'e.g. 1.85',
                          description: 'Physical package weight for shipping band calculation.',
                        },
                      },
                    ],
                  },
                  {
                    label: 'Hardware Specs',
                    fields: [
                      {
                        name: 'attributeValues',
                        type: 'array',
                        label: 'Hardware Attributes (Socket, Form Factor, Memory, etc.)',
                        fields: [
                          { name: 'attributeType', type: 'relationship', relationTo: 'attribute-types', required: true, admin: { width: '50%' } },
                          { name: 'value', type: 'relationship', relationTo: 'attribute-values', required: true, admin: { width: '50%' } },
                        ],
                      },
                      ...(pluginOptions.productSpecsComponent
                        ? [
                            {
                              type: 'ui',
                              name: 'productSpecFieldsForm',
                              admin: {
                                components: {
                                  Field: pluginOptions.productSpecsComponent,
                                },
                              },
                            } as Field,
                          ]
                        : []),
                      {
                        name: 'specsJson',
                        type: 'json',
                        label: 'Raw Cosmetic Specs (JSON)',
                        admin: { description: 'Structured JSON specs displayed in PDP specification table' },
                      },
                    ],
                  },
                  ...(pluginOptions.builderRulesTabComponent
                    ? [
                        {
                          label: 'Builder Rules',
                          fields: [
                            {
                              type: 'ui',
                              name: 'builderRulesTab',
                              admin: {
                                components: {
                                  Field: pluginOptions.builderRulesTabComponent,
                                },
                              },
                            } as Field,
                          ],
                        },
                      ]
                    : []),
                ],
              },
              // --- WordPress-Style Sidebar Meta-Boxes ---
              {
                name: 'category',
                type: 'relationship',
                relationTo: 'categories',
                index: true,
                admin: {
                  position: 'sidebar',
                  description: 'Primary catalog category taxonomy',
                },
              },
              {
                name: 'brand',
                type: 'relationship',
                relationTo: 'brands',
                index: true,
                admin: {
                  position: 'sidebar',
                  description: 'Hardware brand / Manufacturer',
                },
              },
              {
                name: 'badgeType',
                type: 'select',
                label: 'Product Badge Ribbon',
                defaultValue: 'none',
                options: [
                  { label: 'None', value: 'none' },
                  { label: '🔥 HOT', value: 'hot' },
                  { label: '✨ NEW', value: 'new' },
                  { label: '⚡ SALE', value: 'sale' },
                  { label: '⭐ BESTSELLER', value: 'bestseller' },
                  { label: '✏️ Custom Badge Text', value: 'custom' },
                ],
                admin: {
                  position: 'sidebar',
                  description: 'Ribbon badge displayed on catalog cards',
                },
              },
              {
                name: 'customBadgeText',
                type: 'text',
                label: 'Custom Badge Label',
                admin: {
                  position: 'sidebar',
                  condition: (_data: unknown, siblingData?: { badgeType?: string }) =>
                    siblingData?.badgeType === 'custom',
                },
              },
              {
                name: 'warrantyTier',
                type: 'select',
                label: 'Warranty Coverage',
                defaultValue: 'standard',
                options: [
                  { label: 'Standard 2-Year Manufacturer Warranty', value: 'standard' },
                  { label: 'Extended 3-Year Armor Warranty', value: 'extended' },
                  { label: 'Premium 5-Year Enterprise Coverage', value: 'premium' },
                  { label: 'Lifetime Manufacturer Warranty (RAM / Coolers)', value: 'lifetime' },
                ],
                admin: {
                  position: 'sidebar',
                  description: 'Warranty badge shown on PDP',
                },
              },
              {
                name: 'isFeatured',
                type: 'checkbox',
                label: '⭐ Featured Product',
                defaultValue: false,
                admin: {
                  position: 'sidebar',
                  description: 'Highlight on Homepage showcases',
                },
              },
              {
                name: 'isTrending',
                type: 'checkbox',
                label: '🔥 Trending / Staff Pick',
                defaultValue: false,
                admin: {
                  position: 'sidebar',
                  description: 'Display in trending components carousel',
                },
              },
              ...(pluginOptions.serpPreviewComponent
                ? [
                    {
                      type: 'ui',
                      name: 'serpPreview',
                      admin: {
                        position: 'sidebar',
                        components: {
                          Field: pluginOptions.serpPreviewComponent,
                        },
                      },
                    } as Field,
                  ]
                : []),
            ],
          }
        },
      },
      // Variants carry the same `inventory` field with no plugin-level access
      // hook — patched here for the same matrix row.
      variants: {
        variantsCollectionOverride: ({ defaultCollection }: { defaultCollection: CollectionConfig }) => ({
          ...defaultCollection,
          // Same eager-draft fix as products — autosave persisted empty
          // variant rows the moment the create view opened.
          versions: {
            ...(typeof defaultCollection.versions === 'object' ? defaultCollection.versions : {}),
            drafts: {
              ...(typeof defaultCollection.versions === 'object' &&
              typeof defaultCollection.versions?.drafts === 'object'
                ? defaultCollection.versions.drafts
                : {}),
              autosave: false,
            },
          },
          fields: maskInventoryRead(defaultCollection.fields, staffReadOnly),
        }),
      },
      inventory: true,
      // Orders override lives in collections/orders.ts (entry 15 owner read,
      // Phase 2e line validation, entry 20 emails + staff status-only write).
      orders: {
        ordersCollectionOverride: ({ defaultCollection }: { defaultCollection: CollectionConfig }) =>
          ordersCollectionOverride({
            defaultCollection,
            ordersListHeaderComponent: pluginOptions.ordersListHeaderComponent,
          }),
      },
      // Transactions gain an at-most-once marker for discount usage counting
      // (entry 32 review F2): whichever settlement path wins — webhook claim,
      // upstream poll, or repair — counts the code exactly once via a CAS.
      transactions: {
        transactionsCollectionOverride: ({ defaultCollection }: { defaultCollection: CollectionConfig }) => ({
          ...defaultCollection,
          // Matrix row 17: staff+ read; writes (refunds) admin-only.
          access: { ...defaultCollection.access, ...transactionsAccess },
          admin: {
            ...defaultCollection.admin,
            group: 'Store',
          },
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
            // Round D: €0 carts settle via /confirm-free with no payment
            // adapter, so `paymentMethod` (adapter-select, absent in keyless
            // dev) can't mark them — this text field can.
            {
              name: 'paymentProvider',
              type: 'text',
              admin: { readOnly: true, description: "'free' for €0 orders settled without a payment adapter" },
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
          admin: {
            ...defaultCollection.admin,
            group: 'Store',
          },
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
            admin: {
              ...defaultCollection.admin,
              group: 'Store',
            },
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
              cartConfirmFreeEndpoint,
              cartPackagingEndpoint,
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

    // Entry 71 (Nexus): the 'packaging' composite line type must exist before
    // any cart write resolves it — registration is idempotent (Map.set).
    registerPackagingLineType()

    const resolvedAttributeTypes: CollectionConfig = pluginOptions.attributeTermsComponent
      ? {
          ...AttributeTypes,
          fields: [
            ...AttributeTypes.fields,
            {
              name: 'termsManager',
              type: 'ui',
              admin: {
                components: {
                  Field: pluginOptions.attributeTermsComponent,
                },
              },
            } as Field,
          ],
        }
      : AttributeTypes

    return withEcommerce({
      ...incomingConfig,
      // Config-level endpoints are matched from the API root: /api/discounts/validate.
      endpoints: [...(incomingConfig.endpoints ?? []), discountValidateEndpoint],
      globals: [...(incomingConfig.globals ?? []), PackagingTiers, StoreSettings],
      collections: [
        ...(incomingConfig.collections || []),
        Media,
        Categories,
        Brands,
        resolvedAttributeTypes,
        AttributeValues,
        Prices,
        DiscountCodes,
        ShippingBands,
        TaxRates,
        InventoryReservations,
        Reviews,
      ],
    }) as Promise<Config>
  }

export default shopPlugin

