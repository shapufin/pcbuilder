'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Layers,
  Tag,
  Ticket,
  Star,
  Truck,
  Percent,
  Sliders,
  Image as ImageIcon,
  Timer,
  FileText,
  Package,
  CreditCard,
} from 'lucide-react'
import { MetricCard, FilterPills, AlertBanner, Button } from '../ui'
import { CreateDocDrawerButton } from './CreateDocDrawerButton'

export interface HeaderQueryResult {
  totalDocs?: number
  docs?: Record<string, unknown>[]
}

export interface ListHeaderQuery {
  key: string
  /** Relative REST URL (may be a function for dynamic params, e.g. expiry windows) */
  url: string | (() => string)
}

export interface ListHeaderMetric {
  label: string
  value: string | number
  subtext?: string
  trend?: { direction: 'up' | 'down' | 'neutral'; label: string }
  icon?: React.ComponentType<{ className?: string; size?: number }>
}

export interface ListHeaderFacet {
  id: string
  label: string
  /** `where[...]` query fragment appended to the list URL; '' = all */
  where?: string
  /** query key whose totalDocs feeds the pill count */
  countQuery?: string
}

export interface ListHeaderConfig {
  badge: string
  scope: string
  title: string
  subtitle: string
  /** Optional POST endpoint fired once before the metric queries — used to
   *  warm server-side reconciliation (e.g. the reservation expiry sweep). */
  warmup?: string
  queries: ListHeaderQuery[]
  resolve: (results: Record<string, HeaderQueryResult | null>) => ListHeaderMetric[]
  alert?: {
    severity: 'warning' | 'critical' | 'info' | 'success'
    title: string
    description: string
    action?: { label: string; href: string; external?: boolean }
  }
  facets: ListHeaderFacet[]
  actions?: { label: string; href: string; external?: boolean }[]
  createLabel?: string
}

const total = (r: HeaderQueryResult | null | undefined): number =>
  typeof r?.totalDocs === 'number' ? r.totalDocs : 0

const docs = (r: HeaderQueryResult | null | undefined): Record<string, unknown>[] =>
  Array.isArray(r?.docs) ? r.docs : []

const api = (slug: string, where = '', limit = 0) =>
  `/api/${slug}?limit=${limit}&depth=0${where ? `&${where}` : ''}`

const trend = (label: string): ListHeaderMetric['trend'] => ({ direction: 'neutral', label })
const up = (label: string): ListHeaderMetric['trend'] => ({ direction: 'up', label })

/** Facets shared by versioned collections (drafts enabled). */
const STATUS_FACETS: ListHeaderFacet[] = [
  { id: 'all', label: 'All', countQuery: 'total' },
  { id: 'published', label: 'Published', where: 'where[_status][equals]=published', countQuery: 'published' },
  { id: 'draft', label: 'Drafts', where: 'where[_status][equals]=draft', countQuery: 'drafts' },
]

export const LIST_HEADER_REGISTRY: Record<string, ListHeaderConfig> = {
  categories: {
    badge: 'Catalog Taxonomy',
    scope: 'Store · Categories',
    title: 'Category Taxonomy & Merchandising',
    subtitle: 'Storefront navigation taxonomy, product grouping, and parent/child merchandising hierarchy.',
    queries: [
      { key: 'total', url: api('categories') },
      { key: 'topLevel', url: api('categories', 'where[parent][exists]=false') },
      { key: 'published', url: api('categories', 'where[_status][equals]=published') },
      { key: 'mapped', url: api('products', 'where[category][exists]=true') },
    ],
    resolve: (r) => [
      { label: 'TOTAL CATEGORIES', value: total(r.total), subtext: 'taxonomy entries', trend: trend('catalog'), icon: Layers },
      { label: 'TOP-LEVEL', value: total(r.topLevel), subtext: 'root navigation nodes', trend: trend('roots'), icon: Tag },
      { label: 'PUBLISHED', value: total(r.published), subtext: 'live on storefront', trend: up('live'), icon: Tag },
      { label: 'PRODUCTS MAPPED', value: total(r.mapped), subtext: 'products with a category', trend: trend('coverage'), icon: Package },
    ],
    alert: {
      severity: 'info',
      title: 'Taxonomy Drives Storefront Filters',
      description: 'Category structure feeds the storefront mega menu and catalog facets. Re-parenting a category rewrites its descendant paths on the next render.',
      action: { label: 'Mega Menu', href: '/admin/globals/mega-menu' },
    },
    facets: [
      { id: 'all', label: 'All Categories', countQuery: 'total' },
      { id: 'top', label: 'Top-Level', where: 'where[parent][exists]=false', countQuery: 'topLevel' },
      { id: 'published', label: 'Published', where: 'where[_status][equals]=published', countQuery: 'published' },
      { id: 'draft', label: 'Drafts', where: 'where[_status][equals]=draft' },
    ],
    actions: [{ label: 'Mega Menu ↗', href: '/admin/globals/mega-menu' }],
    createLabel: 'Add Category',
  },

  brands: {
    badge: 'Catalog Taxonomy',
    scope: 'Store · Brands',
    title: 'Brand Registry & Manufacturer Taxonomy',
    subtitle: 'Manufacturer directory powering product attribution, builder brands, and catalog facet filters.',
    queries: [
      { key: 'total', url: api('brands') },
      { key: 'tagged', url: api('products', 'where[brand][exists]=true') },
      { key: 'withLogo', url: api('brands', 'where[logo][exists]=true') },
      { key: 'withUrl', url: api('brands', 'where[url][exists]=true') },
    ],
    resolve: (r) => [
      { label: 'TOTAL BRANDS', value: total(r.total), subtext: 'manufacturer entries', trend: trend('registry'), icon: Tag },
      { label: 'PRODUCTS TAGGED', value: total(r.tagged), subtext: 'products attributed', trend: up('coverage'), icon: Package },
      { label: 'WITH LOGO', value: total(r.withLogo), subtext: 'brand marks uploaded', trend: up('assets'), icon: Star },
      { label: 'WITH URL', value: total(r.withUrl), subtext: 'manufacturer links set', trend: trend('links'), icon: Layers },
    ],
    alert: {
      severity: 'info',
      title: 'Brand Facets Feed Catalog Filtering',
      description: 'Brands appear as storefront filter facets and builder compatibility hints. Renaming a brand updates every attributed product listing.',
    },
    // brands is not versioned — _status filters would 400.
    facets: [
      { id: 'all', label: 'All Brands', countQuery: 'total' },
      { id: 'logo', label: 'With Logo', where: 'where[logo][exists]=true', countQuery: 'withLogo' },
      { id: 'nologo', label: 'Missing Logo', where: 'where[logo][exists]=false' },
    ],
    actions: [{ label: 'Products ↗', href: '/admin/collections/products' }],
    createLabel: 'Add Brand',
  },

  'discount-codes': {
    badge: 'Promotions',
    scope: 'Store · Discounts',
    title: 'Discount Codes & Promotion Engine',
    subtitle: 'Percentage, fixed-amount and free-shipping codes with usage caps, validity windows and redemption telemetry.',
    queries: [
      { key: 'total', url: api('discount-codes') },
      { key: 'active', url: api('discount-codes', 'where[enabled][equals]=true') },
      { key: 'redeemed', url: api('discount-codes', 'where[usedCount][greater_than]=0') },
      { key: 'freeShip', url: api('discount-codes', 'where[type][equals]=freeShipping') },
    ],
    resolve: (r) => [
      { label: 'TOTAL CODES', value: total(r.total), subtext: 'promotion entries', trend: trend('promo'), icon: Ticket },
      { label: 'ACTIVE', value: total(r.active), subtext: 'redeemable right now', trend: up('live'), icon: Ticket },
      { label: 'REDEEMED', value: total(r.redeemed), subtext: 'codes used ≥ 1×', trend: up('usage'), icon: CreditCard },
      { label: 'FREE-SHIPPING', value: total(r.freeShip), subtext: 'shipping-type codes', trend: trend('logistics'), icon: Truck },
    ],
    alert: {
      severity: 'warning',
      title: 'Discount Validation Runs Server-Side',
      description: 'Every checkout re-validates code state, window and subtotal floor server-side — client totals are never trusted. Disabling a code takes effect on the next checkout attempt.',
      action: { label: 'Orders', href: '/admin/collections/orders' },
    },
    facets: [
      { id: 'all', label: 'All Codes', countQuery: 'total' },
      { id: 'active', label: 'Active', where: 'where[enabled][equals]=true', countQuery: 'active' },
      { id: 'redeemed', label: 'Redeemed', where: 'where[usedCount][greater_than]=0', countQuery: 'redeemed' },
      { id: 'disabled', label: 'Disabled', where: 'where[enabled][equals]=false' },
    ],
    actions: [{ label: 'Orders ↗', href: '/admin/collections/orders' }],
    createLabel: 'Add Code',
  },

  reviews: {
    badge: 'UGC Moderation',
    scope: 'Store · Reviews',
    title: 'Product Reviews & Moderation Queue',
    subtitle: 'Customer review pipeline — pending moderation, verified-purchase flags, helpfulness telemetry.',
    queries: [
      { key: 'total', url: api('reviews') },
      { key: 'pending', url: api('reviews', 'where[status][equals]=pending') },
      { key: 'approved', url: api('reviews', 'where[status][equals]=approved') },
      { key: 'recent', url: api('reviews', '', 100) },
    ],
    resolve: (r) => {
      const ratings = docs(r.recent)
        .map((d) => d.rating)
        .filter((v): v is number => typeof v === 'number')
      const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—'
      return [
        { label: 'TOTAL REVIEWS', value: total(r.total), subtext: 'all submissions', trend: trend('ugc'), icon: Star },
        { label: 'PENDING MODERATION', value: total(r.pending), subtext: 'awaiting review', trend: up('queue'), icon: Timer },
        { label: 'APPROVED', value: total(r.approved), subtext: 'live on storefront', trend: up('live'), icon: Star },
        { label: 'AVG RATING', value: avg, subtext: 'last 100 reviews', trend: trend('sentiment'), icon: Star },
      ]
    },
    alert: {
      severity: 'warning',
      title: 'Moderation Queue Requires Attention',
      description: 'Pending reviews stay invisible on the storefront until approved. Verified-purchase flags are set from order data at submission time.',
      action: { label: 'Pending Queue', href: '/admin/collections/reviews?where[status][equals]=pending' },
    },
    facets: [
      { id: 'all', label: 'All Reviews', countQuery: 'total' },
      { id: 'pending', label: 'Pending', where: 'where[status][equals]=pending', countQuery: 'pending' },
      { id: 'approved', label: 'Approved', where: 'where[status][equals]=approved', countQuery: 'approved' },
      { id: 'rejected', label: 'Rejected', where: 'where[status][equals]=rejected' },
    ],
    actions: [{ label: 'Products ↗', href: '/admin/collections/products' }],
    createLabel: 'Add Review',
  },

  'shipping-bands': {
    badge: 'Fulfillment',
    scope: 'Store · Shipping',
    title: 'Shipping Bands & Fulfillment Pricing',
    subtitle: 'Subtotal-banded shipping rates with free-shipping tiers — evaluated server-side at checkout.',
    queries: [
      { key: 'total', url: api('shipping-bands') },
      { key: 'enabled', url: api('shipping-bands', 'where[enabled][equals]=true') },
      { key: 'free', url: api('shipping-bands', 'where[price][equals]=0') },
      { key: 'capped', url: api('shipping-bands', 'where[maxSubtotal][exists]=true') },
    ],
    resolve: (r) => [
      { label: 'SHIPPING BANDS', value: total(r.total), subtext: 'pricing tiers', trend: trend('tiers'), icon: Truck },
      { label: 'ENABLED', value: total(r.enabled), subtext: 'evaluated at checkout', trend: up('live'), icon: Truck },
      { label: 'FREE TIERS', value: total(r.free), subtext: 'zero-cost shipping', trend: up('free'), icon: Tag },
      { label: 'CAPPED BANDS', value: total(r.capped), subtext: 'upper subtotal bounds', trend: trend('bounds'), icon: Sliders },
    ],
    alert: {
      severity: 'info',
      title: 'Bands Are Evaluated Server-Side',
      description: 'Checkout picks the first enabled band matching the post-discount subtotal. Gaps between bands fall through to the next tier — keep ranges contiguous.',
    },
    facets: [
      { id: 'all', label: 'All Bands', countQuery: 'total' },
      { id: 'enabled', label: 'Enabled', where: 'where[enabled][equals]=true', countQuery: 'enabled' },
      { id: 'free', label: 'Free Tiers', where: 'where[price][equals]=0', countQuery: 'free' },
      { id: 'disabled', label: 'Disabled', where: 'where[enabled][equals]=false' },
    ],
    actions: [{ label: 'Orders ↗', href: '/admin/collections/orders' }],
    createLabel: 'Add Band',
  },

  'tax-rates': {
    badge: 'Compliance',
    scope: 'Store · Tax',
    title: 'Tax Rates & VAT Compliance',
    subtitle: 'Country-keyed VAT rates with default fallback — applied server-side during order settlement.',
    queries: [
      { key: 'total', url: api('tax-rates') },
      { key: 'enabled', url: api('tax-rates', 'where[enabled][equals]=true') },
      { key: 'default', url: api('tax-rates', 'where[isDefault][equals]=true') },
      { key: 'all', url: api('tax-rates', '', 100) },
    ],
    resolve: (r) => {
      const countries = new Set(
        docs(r.all)
          .map((d) => d.country)
          .filter((c): c is string => typeof c === 'string' && c !== '' && c !== 'default'),
      )
      const def = docs(r.all).find((d) => d.isDefault === true)
      return [
        { label: 'TOTAL RATES', value: total(r.total), subtext: 'rate entries', trend: trend('matrix'), icon: Percent },
        { label: 'ENABLED', value: total(r.enabled), subtext: 'applied at checkout', trend: up('live'), icon: Percent },
        { label: 'COUNTRIES', value: countries.size, subtext: 'distinct jurisdictions', trend: trend('coverage'), icon: Tag },
        { label: 'DEFAULT RATE', value: def && typeof def.rate === 'number' ? `${def.rate}%` : '—', subtext: 'fallback when country unknown', trend: trend('fallback'), icon: Percent },
      ]
    },
    alert: {
      severity: 'info',
      title: 'Default Rate Is the Safety Net',
      description: 'Orders shipping to unmapped countries fall back to the isDefault rate. Exactly one default rate should exist — duplicates resolve unpredictably.',
    },
    facets: [
      { id: 'all', label: 'All Rates', countQuery: 'total' },
      { id: 'enabled', label: 'Enabled', where: 'where[enabled][equals]=true', countQuery: 'enabled' },
      { id: 'default', label: 'Default', where: 'where[isDefault][equals]=true', countQuery: 'default' },
      { id: 'disabled', label: 'Disabled', where: 'where[enabled][equals]=false' },
    ],
    actions: [{ label: 'Orders ↗', href: '/admin/collections/orders' }],
    createLabel: 'Add Rate',
  },

  'attribute-types': {
    badge: 'Facets',
    scope: 'Store · Attributes',
    title: 'Product Attribute Types & Facet Schema',
    subtitle: 'Typed attribute registry feeding storefront filter facets — enum and numeric types with display units.',
    queries: [
      { key: 'total', url: api('attribute-types') },
      { key: 'terms', url: api('attribute-values') },
      { key: 'enum', url: api('attribute-types', 'where[valueType][equals]=enum') },
      { key: 'numeric', url: api('attribute-types', 'where[valueType][equals]=number') },
    ],
    resolve: (r) => [
      { label: 'ATTRIBUTE TYPES', value: total(r.total), subtext: 'facet definitions', trend: trend('schema'), icon: Sliders },
      { label: 'TOTAL TERMS', value: total(r.terms), subtext: 'values across all types', trend: up('terms'), icon: Tag },
      { label: 'ENUM TYPES', value: total(r.enum), subtext: 'multi-select facets', trend: trend('enum'), icon: Sliders },
      { label: 'NUMERIC TYPES', value: total(r.numeric), subtext: 'unit-bearing specs', trend: trend('numeric'), icon: Percent },
    ],
    alert: {
      severity: 'info',
      title: 'Terms Are Managed Per-Type',
      description: 'Attribute values are edited inside each type via the unified terms manager — the hidden attribute-values collection stays machine-facing only.',
      action: { label: 'Products', href: '/admin/collections/products' },
    },
    facets: [
      { id: 'all', label: 'All Types', countQuery: 'total' },
      { id: 'enum', label: 'Enum', where: 'where[valueType][equals]=enum', countQuery: 'enum' },
      { id: 'numeric', label: 'Numeric', where: 'where[valueType][equals]=number', countQuery: 'numeric' },
    ],
    actions: [{ label: 'Products ↗', href: '/admin/collections/products' }],
    createLabel: 'Add Type',
  },

  media: {
    badge: 'Assets',
    scope: 'Content · Media',
    title: 'Media Library & Asset Storage',
    subtitle: 'Uploads pipeline — image renditions (thumb/card/gallery/hero), alt text coverage, storage telemetry.',
    queries: [
      { key: 'total', url: api('media') },
      { key: 'images', url: api('media', 'where[mimeType][contains]=image') },
      { key: 'recent', url: api('media', '', 100) },
    ],
    resolve: (r) => {
      const bytes = docs(r.recent).reduce(
        (acc, d) => acc + (typeof d.filesize === 'number' ? d.filesize : 0),
        0,
      )
      const mb = bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '—'
      const imageCount = total(r.images)
      return [
        { label: 'TOTAL FILES', value: total(r.total), subtext: 'uploaded assets', trend: trend('library'), icon: ImageIcon },
        { label: 'IMAGES', value: imageCount, subtext: 'rendition-ready', trend: up('renditions'), icon: ImageIcon },
        { label: 'OTHER FILES', value: Math.max(total(r.total) - imageCount, 0), subtext: 'non-image assets', trend: trend('files'), icon: FileText },
        { label: 'STORAGE (RECENT 100)', value: mb, subtext: 'filesize of latest batch', trend: trend('size'), icon: Layers },
      ]
    },
    alert: {
      severity: 'info',
      title: 'Renditions Are Generated On Upload',
      description: 'thumb/card/gallery/hero sizes are generated automatically. Alt text is required — it feeds storefront accessibility and SEO blocks.',
    },
    facets: [
      { id: 'all', label: 'All Files', countQuery: 'total' },
      { id: 'images', label: 'Images', where: 'where[mimeType][contains]=image', countQuery: 'images' },
      { id: 'other', label: 'Other', where: 'where[mimeType][not_contains]=image' },
    ],
    createLabel: 'Upload',
  },

  'inventory-reservations': {
    badge: 'Inventory',
    scope: 'Store · Holds',
    title: 'Inventory Reservations & Payment Holds',
    subtitle: '30-minute stock holds keyed to Stripe PaymentIntents — held → converted/released lifecycle.',
    // Reconcile expired holds before counting — the lifecycle sweeper is
    // lazy (runs on payment initiation), so this triggers it on page view.
    warmup: '/api/inventory-reservations/sweep',
    queries: [
      { key: 'total', url: api('inventory-reservations') },
      { key: 'held', url: api('inventory-reservations', 'where[status][equals]=held') },
      { key: 'converted', url: api('inventory-reservations', 'where[status][equals]=converted') },
      { key: 'expired', url: () => api('inventory-reservations', `where[status][equals]=held&where[expiresAt][less_than]=${encodeURIComponent(new Date().toISOString())}`) },
    ],
    resolve: (r) => [
      { label: 'TOTAL HOLDS', value: total(r.total), subtext: 'reservation records', trend: trend('holds'), icon: Timer },
      { label: 'HELD', value: total(r.held), subtext: 'stock reserved now', trend: up('active'), icon: Timer },
      { label: 'CONVERTED', value: total(r.converted), subtext: 'settled into orders', trend: up('settled'), icon: CreditCard },
      { label: 'EXPIRED HELD', value: total(r.expired), subtext: 'awaiting sweeper release', trend: trend('stale'), icon: Timer },
    ],
    alert: {
      severity: 'warning',
      title: 'Held Units Block Checkout Stock',
      description: 'Held reservations decrement available stock for the 30-minute window. Expired holds are swept to released by the reconciler — release never restocks superseded holds.',
      action: { label: 'Orders', href: '/admin/collections/orders' },
    },
    facets: [
      { id: 'all', label: 'All Holds', countQuery: 'total' },
      { id: 'held', label: 'Held', where: 'where[status][equals]=held', countQuery: 'held' },
      { id: 'converted', label: 'Converted', where: 'where[status][equals]=converted', countQuery: 'converted' },
      { id: 'released', label: 'Released', where: 'where[status][equals]=released' },
    ],
    actions: [{ label: 'Orders ↗', href: '/admin/collections/orders' }],
  },

  pages: {
    badge: 'Content',
    scope: 'Content · Pages',
    title: 'CMS Pages & Section Composition',
    subtitle: 'Page tree with block-section composer, SEO metadata, and draft/publish workflow.',
    queries: [
      { key: 'total', url: api('pages') },
      { key: 'published', url: api('pages', 'where[_status][equals]=published') },
      { key: 'drafts', url: api('pages', 'where[_status][equals]=draft') },
      { key: 'home', url: api('pages', 'where[isHomepage][equals]=true') },
    ],
    resolve: (r) => [
      { label: 'TOTAL PAGES', value: total(r.total), subtext: 'site content tree', trend: trend('cms'), icon: FileText },
      { label: 'PUBLISHED', value: total(r.published), subtext: 'live on storefront', trend: up('live'), icon: FileText },
      { label: 'DRAFTS', value: total(r.drafts), subtext: 'work in progress', trend: trend('wip'), icon: FileText },
      { label: 'HOMEPAGE', value: total(r.home), subtext: 'isHomepage flagged', trend: trend('root'), icon: Tag },
    ],
    alert: {
      severity: 'info',
      title: 'Drafts Require Publish To Ship',
      description: 'Versioned pages keep a draft until published. Homepage edits revalidate the root layout on save — no deploy needed.',
      action: { label: 'Site Settings', href: '/admin/globals/site-settings' },
    },
    facets: STATUS_FACETS,
    actions: [{ label: 'Site Settings ↗', href: '/admin/globals/site-settings' }],
    createLabel: 'Add Page',
  },

  variants: {
    badge: 'Inventory',
    scope: 'Store · Variants',
    title: 'Product Variants & Option Stock',
    subtitle: 'Per-option SKUs with dedicated inventory — builder line items resolve to variant records.',
    queries: [
      { key: 'total', url: api('variants') },
      { key: 'inStock', url: api('variants', 'where[inventory][greater_than]=0') },
      { key: 'out', url: api('variants', 'where[inventory][less_than]=1') },
      { key: 'unlinked', url: api('variants', 'where[product][exists]=false') },
    ],
    resolve: (r) => [
      { label: 'TOTAL VARIANTS', value: total(r.total), subtext: 'option SKUs', trend: trend('variants'), icon: Package },
      { label: 'IN STOCK', value: total(r.inStock), subtext: 'fulfillable now', trend: up('stock'), icon: Package },
      { label: 'OUT OF STOCK', value: total(r.out), subtext: 'inventory ≤ 0', trend: trend('empty'), icon: Timer },
      { label: 'UNLINKED', value: total(r.unlinked), subtext: 'orphaned product refs', trend: trend('orphans'), icon: Timer },
    ],
    alert: {
      severity: 'info',
      title: 'Variant Stock Gates Builder Checkout',
      description: 'Configured-build line items resolve to variants — zero-stock variants block checkout lines. Inventory edits are staff read-only on the storefront side.',
      action: { label: 'Products', href: '/admin/collections/products' },
    },
    facets: [
      { id: 'all', label: 'All Variants', countQuery: 'total' },
      { id: 'in', label: 'In Stock', where: 'where[inventory][greater_than]=0', countQuery: 'inStock' },
      { id: 'out', label: 'Out of Stock', where: 'where[inventory][less_than]=1', countQuery: 'out' },
      { id: 'unlinked', label: 'Unlinked', where: 'where[product][exists]=false', countQuery: 'unlinked' },
    ],
    actions: [{ label: 'Products ↗', href: '/admin/collections/products' }],
  },

  transactions: {
    badge: 'Payments',
    scope: 'Store · Transactions',
    title: 'Payment Transactions & Settlement Ledger',
    subtitle: 'Stripe settlement records — lifecycle states, charge-time snapshots, discount-usage CAS markers.',
    queries: [
      { key: 'total', url: api('transactions') },
      { key: 'succeeded', url: api('transactions', 'where[status][equals]=succeeded') },
      { key: 'refunded', url: api('transactions', 'where[status][equals]=refunded') },
      { key: 'failed', url: api('transactions', 'where[status][equals]=failed') },
    ],
    resolve: (r) => [
      { label: 'TRANSACTIONS', value: total(r.total), subtext: 'ledger entries', trend: trend('ledger'), icon: CreditCard },
      { label: 'SUCCEEDED', value: total(r.succeeded), subtext: 'settled charges', trend: up('settled'), icon: CreditCard },
      { label: 'REFUNDED', value: total(r.refunded), subtext: 'returned payments', trend: trend('returns'), icon: CreditCard },
      { label: 'FAILED', value: total(r.failed), subtext: 'declined / errored', trend: trend('errors'), icon: Timer },
    ],
    alert: {
      severity: 'info',
      title: 'Ledger Is Settlement-Owned',
      description: 'Transactions are written by webhook/settlement code — snapshot fields record charge-time cart state. Manual edits risk ledger divergence.',
      action: { label: 'Orders', href: '/admin/collections/orders' },
    },
    facets: [
      { id: 'all', label: 'All Transactions', countQuery: 'total' },
      { id: 'succeeded', label: 'Succeeded', where: 'where[status][equals]=succeeded', countQuery: 'succeeded' },
      { id: 'refunded', label: 'Refunded', where: 'where[status][equals]=refunded', countQuery: 'refunded' },
      { id: 'failed', label: 'Failed', where: 'where[status][equals]=failed', countQuery: 'failed' },
    ],
    actions: [{ label: 'Orders ↗', href: '/admin/collections/orders' }],
  },
}

export interface RegistryListHeaderProps {
  /** Test/override hook — defaults to the slug parsed from the admin pathname */
  collectionSlug?: string
  /** Test/override hook — skips the live fetch */
  stats?: Record<string, HeaderQueryResult | null>
}

const slugFromPath = (pathname: string): string | undefined => {
  const match = /\/admin\/collections\/([^/?#]+)/.exec(pathname)
  return match?.[1]
}

/**
 * Registry-driven §5.x elevated header for the remaining collection lists —
 * badge + scope chip, subtitle, quick actions, operational AlertBanner,
 * 4-card KPI ribbon and facet pill rail. Telemetry comes from cheap
 * `limit=0` REST counts (plus capped `limit=100` doc queries where a
 * derived metric needs them), each with graceful fallback.
 */
export const RegistryListHeader: React.FC<RegistryListHeaderProps> = ({
  collectionSlug: propSlug,
  stats: propStats,
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const slug = propSlug ?? slugFromPath(pathname)
  const entry = slug ? LIST_HEADER_REGISTRY[slug] : undefined

  const [results, setResults] = useState<Record<string, HeaderQueryResult | null> | null>(
    propStats ?? null,
  )
  const [metricsFailed, setMetricsFailed] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [, startTransition] = useTransition()
  // Derive the active facet from the URL — useSearchParams is hydration-safe.
  const searchParams = useSearchParams()
  const search = decodeURIComponent(searchParams.toString())
  const activeFacet =
    entry?.facets.find((f) => f.id !== 'all' && f.where && search.includes(f.where))?.id ??
    'all'

  useEffect(() => {
    if (!entry || propStats) return
    let isMounted = true
    const run = async () => {
      // Optional server-side reconciliation before counting (e.g. the
      // inventory-reservation expiry sweep). Best-effort — a failure here
      // must not block the metric queries below.
      if (entry.warmup) {
        try {
          await fetch(entry.warmup, { method: 'POST', credentials: 'same-origin' })
        } catch {
          /* warmup is best-effort */
        }
      }
      const pairs = await Promise.all(
        entry.queries.map((q) => {
          const url = typeof q.url === 'function' ? q.url() : q.url
          return fetch(url, { credentials: 'same-origin' })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => [q.key, json] as const)
            .catch(() => [q.key, null] as const)
        }),
      )
      if (!isMounted) return
      setResults(Object.fromEntries(pairs))
      // Total failure (every query returned null) → explicit unavailable
      // state instead of a ribbon of misleading zeros.
      setMetricsFailed(pairs.every(([, v]) => v === null))
    }
    void run()
    return () => {
      isMounted = false
    }
  }, [entry, propStats])

  if (!entry || !slug) return null

  const metricsLoading = results === null
  const resolved = results ?? {}
  const metrics = entry.resolve(resolved)

  const handleFacet = (id: string) => {
    const facet = entry.facets.find((f) => f.id === id)
    startTransition(() => {
      router.push(`/admin/collections/${slug}${facet?.where ? `?${facet.where}` : ''}`)
    })
  }

  return (
    <div className="bmr-collection-header">
      <div className="bmr-collection-header__top">
        <div className="bmr-collection-header__title-group">
          <div className="bmr-collection-header__title-wrap">
            <h1 className="bmr-collection-header__title">{entry.title}</h1>
            <span className="bmr-badge bmr-badge--info">{entry.badge}</span>
          </div>
          <p className="bmr-collection-header__subtitle">{entry.subtitle}</p>
          <span className="bmr-global-header__scope">{entry.scope}</span>
        </div>

        <div className="bmr-collection-header__actions">
          {entry.actions?.map((action) =>
            action.external ? (
              <a key={action.href} href={action.href} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" aria-label={action.label}>
                  {action.label}
                </Button>
              </a>
            ) : (
              <Link key={action.href} href={action.href}>
                <Button variant="outline" size="sm" aria-label={action.label}>
                  {action.label}
                </Button>
              </Link>
            ),
          )}
          <CreateDocDrawerButton collectionSlug={slug} label={entry.createLabel ?? 'Create New'} />
        </div>
      </div>

      {entry.alert && !bannerDismissed && (
        <div className="bmr-collection-header__alert-wrap">
          <AlertBanner
            severity={entry.alert.severity}
            title={entry.alert.title}
            description={entry.alert.description}
            action={entry.alert.action}
            onDismiss={() => setBannerDismissed(true)}
          />
        </div>
      )}

      <div className="bmr-collection-header__kpis">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={metricsLoading ? '…' : metricsFailed ? '—' : m.value}
            subtext={metricsLoading ? 'loading' : metricsFailed ? 'unavailable' : m.subtext}
            trend={m.trend}
            icon={m.icon}
          />
        ))}
      </div>

      {entry.facets.length > 0 && (
        <div className="bmr-collection-header__rail">
          <FilterPills
            items={entry.facets.map((f) => ({
              id: f.id,
              label: f.label,
              count: metricsLoading || metricsFailed || !f.countQuery ? undefined : total(resolved[f.countQuery]),
            }))}
            activeId={activeFacet}
            onChange={handleFacet}
          />
        </div>
      )}
    </div>
  )
}

export default RegistryListHeader
