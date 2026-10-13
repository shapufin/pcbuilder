import { buildConfig } from 'payload'
import sharp from 'sharp'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'
import { Users } from './collections/Users.ts'
import { Pages } from './collections/Pages.ts'
import { shopPlugin } from '@buildmyrig/plugin-shop'
import { pcBuilderPlugin } from '@buildmyrig/plugin-pc-builder'
import { pagesPlugin } from '@buildmyrig/plugin-pages'
import { themeRevalidatePlugin } from './lib/theme-revalidate-plugin.ts'
import { listCellElevationPlugin } from './lib/admin-list-cells.ts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUri = process.env.DATABASE_URI || 'file:./payload.db'
const isPostgres = databaseUri.startsWith('postgres')

// Fail fast on a missing/placeholder secret in prod — the literal fallback is a
// dev convenience only; shipping it would let anyone forge session cookies.
const payloadSecret = process.env.PAYLOAD_SECRET || 'YOUR_SECRET_HERE'
if (process.env.NODE_ENV === 'production' && payloadSecret === 'YOUR_SECRET_HERE') {
  throw new Error('PAYLOAD_SECRET must be set in production')
}

export default buildConfig({
  // Enables the media collection's imageSizes (thumb/card/gallery/hero) — the
  // processor must be passed in explicitly or resizing silently no-ops.
  sharp,
  admin: {
    user: Users.slug,
    suppressHydrationWarning: true,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      Nav: './app/(payload)/admin/components/ModernAdminNav#ModernAdminNav',
      graphics: {
        Logo: './app/(payload)/admin/components/AdminLogo#AdminLogo',
        Icon: './app/(payload)/admin/components/AdminIcon#AdminIcon',
      },
      actions: ['./app/(payload)/admin/components/AdminHeaderActions#AdminHeaderActions'],
      views: {
        dashboard: {
          Component: './app/(payload)/admin/components/ModernAdminDashboard#ModernAdminDashboard',
        },
        plugins: {
          type: 'custom',
          path: '/plugins',
          Component: './app/(payload)/admin/components/PluginsManagerView#PluginsManagerView',
        } as never,
        designSystem: {
          type: 'custom',
          path: '/design-system',
          Component: './app/(payload)/admin/components/DesignSystemView#DesignSystemView',
        } as never,
      },
    },
  },
  collections: [Users, Pages],
  editor: lexicalEditor({}),
  // 11-access-security.md checklist #2: cookie-authenticated requests are only
  // trusted from these origins (BMR_URL = production origin). Required for
  // prod: without it, requests lacking Origin/Sec-Fetch-Site are rejected.
  // Origin headers never carry a trailing slash — normalize the env value so
  // `BMR_URL=https://example.com/` can't silently break cookie auth.
  csrf: [
    process.env.BMR_URL?.replace(/\/+$/, ''),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter((o): o is string => Boolean(o)),
  secret: payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: isPostgres
    ? postgresAdapter({
        pool: {
          connectionString: databaseUri,
        },
      })
    : sqliteAdapter({
        client: {
          url: databaseUri,
        },
        busyTimeout: 5000,
        wal: {
          synchronous: 'NORMAL',
          journalSizeLimit: 67108864,
        },
        // Dev convenience: auto-apply schema changes (new collection fields)
        // to the local SQLite file. Postgres uses migrations instead.
        push: true,
      }),
  plugins: [
    // Phase 1+: shop + builder plugins. Skeletons are config-identity no-ops for now.
    shopPlugin({
      enabled: true,
      attributeTermsComponent: './app/(payload)/admin/components/AttributeTermsManager#AttributeTermsManager',
      productSpecsComponent: './app/(payload)/admin/components/ProductSpecFields#ProductSpecFields',
      productsListHeaderComponent: './app/(payload)/admin/components/ProductsListHeader#ProductsListHeader',
      ordersListHeaderComponent: './app/(payload)/admin/components/OrdersListHeader#OrdersListHeader',
      builderRulesTabComponent: './app/(payload)/admin/components/BuilderRulesTabField#BuilderRulesTabField',
      serpPreviewComponent: './app/(payload)/admin/components/SerpPreviewField#SerpPreviewField',
      slugFieldComponent: './app/(payload)/admin/components/SlugField#SlugField',
    }),
    pcBuilderPlugin({
      enabled: true,
      componentsListHeaderComponent: './app/(payload)/admin/components/ComponentsListHeader#ComponentsListHeader',
      buildStatsViewComponent: './app/(payload)/admin/components/BuildStatsView#BuildStatsView',
      ruleManagerViewComponent: './app/(payload)/admin/components/RuleManagerView#RuleManagerView',
      templatesListHeaderComponent: './app/(payload)/admin/components/TemplatesListHeader#TemplatesListHeader',
      configuredBuildsListHeaderComponent: './app/(payload)/admin/components/ConfiguredBuildsListHeader#ConfiguredBuildsListHeader',
      componentCategoriesListHeaderComponent: './app/(payload)/admin/components/ComponentCategoriesListHeader#ComponentCategoriesListHeader',
      builderSettingsHeaderComponent: './app/(payload)/admin/components/BuilderSettingsHeader#BuilderSettingsHeader',
    }),
    // Phase 3 → entry 19 (Step B): SEO fields, category top-block zone and the
    // site-settings global now live in @buildmyrig/plugin-pages.
    pagesPlugin({
      enabled: true,
      siteSettingsHeaderComponent: './app/(payload)/admin/components/SiteSettingsHeader#SiteSettingsHeader',
      themeHeaderComponent: './app/(payload)/admin/components/ThemeHeader#ThemeHeader',
      megaMenuHeaderComponent: './app/(payload)/admin/components/MegaMenuHeader#MegaMenuHeader',
    }),
    // Entry 71: chrome globals (theme/site-settings/mega-menu) revalidate the
    // layout on save — must run after pagesPlugin to see those globals.
    themeRevalidatePlugin(),
    // Entry 111: §5.4 list-table elevation — entity/code-chip/price Cell
    // overrides; runs last so it sees every collection the plugins registered.
    listCellElevationPlugin(),
  ],
})
