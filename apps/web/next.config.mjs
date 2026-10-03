import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@buildmyrig/lib',
    '@buildmyrig/ui',
    '@buildmyrig/plugin-shop',
    '@buildmyrig/plugin-pc-builder',
  ],
  // Convenience alias (audit minor P5-X1): search lives at /shop/search, but
  // a bare /search is the URL people type and link.
  async redirects() {
    return [{ source: '/search', destination: '/shop/search', permanent: true }]
  },
}

export default withPayload(nextConfig)
