import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Opt-in worker cap for page-data collection — 15 workers OOM on
    // memory-constrained machines (entry-55 build gotcha). Guarded: NaN,
    // negatives and fractions fall back to Next's default worker math.
    cpus: (() => {
      const n = Number(process.env.NEXT_BUILD_CPUS)
      return Number.isInteger(n) && n > 0 ? n : undefined
    })(),
  },
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
