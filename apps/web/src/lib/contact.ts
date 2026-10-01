/**
 * Storefront contact form (entry 23, 07-ux-plan.md: "/contact (form →
 * Resend)"). Same gate stack as the auth endpoints (origin → IP limiter →
 * zod) with deps injected — no payload import (password-reset.ts pattern).
 * Sends through the shared Resend sender: dry-run without keys, and the
 * staff recipient comes from STAFF_ALERT_EMAIL (fallback EMAIL_FROM, none →
 * logged dry-run answer).
 */

import { z } from 'zod'
import { rateLimit } from '@buildmyrig/lib'
import { contactFormHtml } from '@buildmyrig/plugin-shop/emails'
import { clientIp, isAllowedOrigin } from './auth'

export type ContactDeps = {
  sendEmail: (args: {
    to: string
    subject: string
    html: string
  }) => Promise<{ sent?: boolean } | undefined>
  limiter: { check: (key: string) => { ok: boolean; retryAfterMs: number } }
}

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(5000),
})

/** 5 messages/min/IP — contact-form spam (11-access-security.md). */
export const contactLimiter = rateLimit({ windowMs: 60_000, max: 5 })

const defaultAllowedOrigins = (): string[] => {
  const list = ['http://localhost:3000', 'http://127.0.0.1:3000']
  const base = (process.env.BMR_URL ?? '').replace(/\/+$/, '')
  if (base) list.push(base)
  return list
}

export const handleContactSubmission = async (
  deps: ContactDeps,
  input: { body: unknown; headers?: Headers },
): Promise<Response> => {
  const headers = input.headers ?? new Headers()

  if (!isAllowedOrigin(headers.get('origin'), defaultAllowedOrigins())) {
    return Response.json({ error: 'Origin not allowed' }, { status: 403 })
  }

  const rate = deps.limiter.check(clientIp(headers))
  if (!rate.ok) {
    return Response.json(
      { error: 'Too many messages, try again shortly' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

  const parsed = contactSchema.safeParse(input.body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Name, a valid email and a message of 10–5000 characters are required' },
      { status: 400 },
    )
  }

  // Single-line subject: newlines in the name must not split the header.
  const name = parsed.data.name.replace(/\s+/g, ' ').trim()
  const to = process.env.STAFF_ALERT_EMAIL || process.env.EMAIL_FROM || ''
  if (!to) {
    console.info(`[contact] dry-run message from ${name} <${parsed.data.email}>`)
    return Response.json({ ok: true, dryRun: true }, { status: 200 })
  }

  try {
    const result = await deps.sendEmail({
      to,
      subject: `New contact message from ${name}`,
      html: contactFormHtml({ ...parsed.data, name }),
    })
    if (result && result.sent === false) {
      return Response.json({ ok: true, dryRun: true }, { status: 200 })
    }
    return Response.json({ ok: true }, { status: 200 })
  } catch (e) {
    console.error('[contact] send failed:', e instanceof Error ? e.message : e)
    return Response.json({ error: 'Failed to send message' }, { status: 502 })
  }
}
