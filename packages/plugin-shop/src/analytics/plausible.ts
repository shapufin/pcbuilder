/**
 * Server-side Plausible event sender (12-integrations-ops.md — entry 23).
 * Same contract as emails/resend.ts: without NEXT_PUBLIC_PLAUSIBLE_DOMAIN
 * every send is a logged dry-run so local dev and CI stay side-effect free;
 * real failures log + throw so the caller decides policy (the order hook
 * swallows them — analytics must never break settlement).
 */

import type { EmailLogger } from '../emails/resend.ts'

export type PlausibleEvent = {
  name: string
  url: string
  props?: Record<string, string | number | boolean>
  revenue?: { currency: string; amount: number }
}

export type PlausibleResult = { sent: true } | { sent: false; dryRun: true }

export const sendPlausibleEvent = async (
  event: PlausibleEvent,
  logger: EmailLogger,
): Promise<PlausibleResult> => {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  if (!domain) {
    logger.info(`[plausible] dry-run: "${event.name}" -> ${event.url}`)
    return { sent: false, dryRun: true }
  }

  let response: Response
  try {
    response = await fetch('https://plausible.io/api/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BuildMyRig-Server/1.0',
      },
      body: JSON.stringify({
        name: event.name,
        domain,
        url: event.url,
        ...(event.props ? { props: event.props } : {}),
        ...(event.revenue ? { revenue: event.revenue } : {}),
      }),
      // Bounded wait — runs inside payment settlement; a hung connection must
      // not stall the order write (same policy as sendResendEmail).
      signal: AbortSignal.timeout(5_000),
    })
  } catch (error) {
    logger.error(`[plausible] send failed: ${String(error)}`)
    throw error
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    const error = new Error(`plausible ${response.status}: ${detail}`)
    logger.error(`[plausible] send failed: ${error.message}`)
    throw error
  }

  logger.info(`[plausible] sent: "${event.name}" -> ${event.url}`)
  return { sent: true }
}
