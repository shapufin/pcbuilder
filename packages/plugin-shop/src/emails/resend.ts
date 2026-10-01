/**
 * Minimal transactional sender over the Resend HTTP API — same contract as
 * apps/web/src/app/api/newsletter/route.ts (direct fetch, no SDK dep):
 * without RESEND_API_KEY + EMAIL_FROM every send is a logged dry-run so local
 * dev and CI stay side-effect free (12-integrations-ops.md).
 */

export type EmailResult = { sent: true; id: string | null } | { sent: false; dryRun: true }

export type EmailLogger = {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

export const sendResendEmail = async (
  { to, subject, html }: { to: string; subject: string; html: string },
  logger: EmailLogger,
): Promise<EmailResult> => {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    logger.info(`[email] dry-run: "${subject}" -> ${to}`)
    return { sent: false, dryRun: true }
  }

  let response: Response
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
      // Bounded wait: the order hook runs inside payment settlement and staff
      // updates — a hung connection must not stall them for the undici default
      // (~300 s). The timeout error is caught+logged by the caller like any
      // other send failure (review finding #2).
      signal: AbortSignal.timeout(5_000),
    })
  } catch (error) {
    logger.error(`[email] send failed: ${String(error)}`)
    throw error
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    const error = new Error(`resend ${response.status}: ${detail}`)
    logger.error(`[email] send failed: ${error.message}`)
    throw error
  }

  const body = (await response.json().catch(() => ({}))) as { id?: string }
  logger.info(`[email] sent: "${subject}" -> ${to} (${body.id ?? 'unknown id'})`)
  return { sent: true, id: body.id ?? null }
}
