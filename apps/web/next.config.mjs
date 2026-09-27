import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@buildmyrig/lib',
    '@buildmyrig/ui',
    '@buildmyrig/plugin-shop',
    '@buildmyrig/plugin-pc-builder',
  ],
}

export default withPayload(nextConfig)
