import { withPayload } from '@payloadcms/next/withPayload'
import { securityHeaders } from './src/lib/security-headers.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Audit 2026-11-18 M1: don't advertise the stack.
  poweredByHeader: false,
  // Next 16 blocks cross-origin dev resources by default; allow the IP-based
  // URLs we browse with (127.0.0.1, LAN) so /_next HMR + chunks load.
  allowedDevOrigins: ['127.0.0.1', '192.168.0.63'],
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  experimental: {
    // Opt-in worker cap for page-data collection — 15 workers OOM on
    // memory-constrained machines (entry-55 build gotcha). Guarded: NaN,
    // negatives and fractions fall back to Next's default worker math.
    cpus: (() => {
      const n = Number(process.env.NEXT_BUILD_CPUS)
      return Number.isInteger(n) && n > 0 ? n : undefined
    })(),
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'three',
      '@stripe/react-stripe-js',
      '@payloadcms/ui',
    ],
  },
  transpilePackages: [
    '@buildmyrig/lib',
    '@buildmyrig/ui',
    '@buildmyrig/plugin-pages',
    '@buildmyrig/plugin-shop',
    '@buildmyrig/plugin-pc-builder',
  ],
  // Convenience alias (audit minor P5-X1): search lives at /shop/search, but
  // a bare /search is the URL people type and link.
  // Audit 2026-11-18 M1: framing/sniffing/referrer baseline on every route.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders(process.env) }]
  },
  async redirects() {
    return [{ source: '/search', destination: '/shop/search', permanent: true }]
  },
}

export default withPayload(nextConfig)
