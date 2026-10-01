import { describe, expect, it } from 'vitest'
import { contactFormHtml, newsletterWelcomeHtml } from './templates.ts'

/**
 * Entry 23: newsletter welcome (inline send in the newsletter route moves to
 * the shared sender + this template) and contact-form staff email
 * (07-ux-plan.md: /contact form → Resend). Both carry user input → every
 * interpolation goes through escapeHtml.
 */
describe('newsletter + contact templates (entry 23)', () => {
  it('#172 welcome keeps the subscribe copy; contact escapes name/email/message', () => {
    const welcome = newsletterWelcomeHtml()
    expect(welcome).toContain('Thanks for subscribing')
    expect(welcome.toLowerCase()).toContain('unsubscribe')

    const contact = contactFormHtml({
      name: '<script>alert(1)</script>',
      email: 'a&b@example.com',
      message: 'Hi <img src=x onerror=alert(1)>',
    })
    expect(contact).not.toContain('<script>')
    expect(contact).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(contact).toContain('a&amp;b@example.com')
    expect(contact).not.toContain('<img')
    expect(contact).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
