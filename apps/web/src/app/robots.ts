import type { MetadataRoute } from 'next'

const origin = () => process.env.BMR_URL || 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/cart', '/checkout', '/api/'],
      },
    ],
    sitemap: `${origin()}/sitemap.xml`,
  }
}
