import { buildConfig } from 'payload'
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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUri = process.env.DATABASE_URI || 'file:./payload.db'
const isPostgres = databaseUri.startsWith('postgres')

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
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
  secret: process.env.PAYLOAD_SECRET || 'YOUR_SECRET_HERE',
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
        // Dev convenience: auto-apply schema changes (new collection fields)
        // to the local SQLite file. Postgres uses migrations instead.
        push: true,
      }),
  plugins: [
    // Phase 1+: shop + builder plugins. Skeletons are config-identity no-ops for now.
    shopPlugin({ enabled: true }),
    pcBuilderPlugin({ enabled: true }),
    // Phase 3 → entry 19 (Step B): SEO fields, category top-block zone and the
    // site-settings global now live in @buildmyrig/plugin-pages.
    pagesPlugin({ enabled: true }),
  ],
})
