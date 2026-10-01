import type { Block } from 'payload'

export const ContactFormBlock: Block = {
  slug: 'contactForm',
  interfaceName: 'ContactFormBlock',
  admin: { group: 'Content' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Send us a message' },
    {
      name: 'intro',
      type: 'textarea',
      defaultValue:
        'Questions about a build or an order? Write to us — we reply within one working day, Monday to Friday.',
    },
  ],
}
