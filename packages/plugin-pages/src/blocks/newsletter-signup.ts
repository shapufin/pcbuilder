import type { Block } from 'payload'

export const NewsletterSignupBlock: Block = {
  slug: 'newsletterSignup',
  interfaceName: 'NewsletterSignupBlock',
  admin: { group: 'Content' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Get build deals in your inbox' },
    { name: 'consent', type: 'text', defaultValue: 'No spam — unsubscribe anytime.' },
  ],
}
