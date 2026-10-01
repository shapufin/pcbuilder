/**
 * Order lifecycle email templates (order-confirmation / shipping-notification,
 * 12-integrations-ops.md). Plain inline-styled HTML like the newsletter route
 * — no react-email toolchain inside the plugin packages (swap-compatible: the
 * sender only takes { subject, html }).
 *
 * EVERY interpolated value passes escapeHtml — order fields carry customer
 * input (names, addresses) and product titles.
 */

export type OrderEmailLine = { name: string; quantity: number }

export type OrderEmailInput = {
  orderId: number | string
  total: string
  lines: OrderEmailLine[]
  email?: string | null
  address?: string | null
}

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** Cents → grouped euro string ('129900' → '€1,299.00'). */
export const formatEur = (cents: number | null | undefined): string => {
  const value = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0
  const [whole, fraction] = (value / 100).toFixed(2).split('.')
  const grouped = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `€${grouped}.${fraction ?? '00'}`
}

const shell = (title: string, body: string): string => `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;padding:24px">
      <h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(title)}</h1>
      ${body}
      <p style="margin-top:24px;font-size:12px;color:#71717a">BuildMyRig — custom PCs, built to order.</p>
    </div>
  </body>
</html>`

const linesSection = (lines: OrderEmailLine[]): string =>
  lines.length === 0
    ? ''
    : `<ul style="margin:8px 0;padding-left:18px">${lines
        .map(
          (line) =>
            `<li>${escapeHtml(line.name)} &times; ${escapeHtml(String(line.quantity))}</li>`,
        )
        .join('')}</ul>`

const totalsSection = (total: string, email?: string | null, address?: string | null): string =>
  `<p style="margin:8px 0"><strong>Total:</strong> ${escapeHtml(total)}</p>` +
  (email ? `<p style="margin:8px 0"><strong>Email:</strong> ${escapeHtml(email)}</p>` : '') +
  (address ? `<p style="margin:8px 0"><strong>Shipping to:</strong> ${escapeHtml(address)}</p>` : '')

export const orderConfirmationHtml = (input: OrderEmailInput): string =>
  shell(
    `Order #${input.orderId} confirmed`,
    `<p style="margin:8px 0">Thanks for your order — payment received. We start building as soon as it clears.</p>
     ${linesSection(input.lines)}
     ${totalsSection(input.total, input.email, input.address)}
     <p style="margin:8px 0;font-size:12px;color:#71717a">You'll get another email when your build ships.</p>`,
  )

export const orderShippedHtml = (input: OrderEmailInput): string =>
  shell(
    `Order #${input.orderId} has shipped`,
    `<p style="margin:8px 0">Good news — your build is on its way.</p>
     ${linesSection(input.lines)}
     ${totalsSection(input.total, input.email, input.address)}`,
  )

/** Newsletter welcome (entry 23) — replaces the inline <p> in the newsletter route. */
export const newsletterWelcomeHtml = (): string =>
  shell(
    'Welcome to BuildMyRig',
    `<p style="margin:8px 0">Thanks for subscribing! You will get build deals and restock alerts — unsubscribe anytime.</p>
     <p style="margin:8px 0;font-size:12px;color:#71717a">If you didn't sign up you can ignore this email.</p>`,
  )

export type ContactFormInput = { name: string; email: string; message: string }

/** Contact-form staff email (07-ux-plan.md: /contact form → Resend). */
export const contactFormHtml = (input: ContactFormInput): string =>
  shell(
    `New contact message from ${input.name}`,
    `<p style="margin:8px 0"><strong>From:</strong> ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p>
     <p style="margin:8px 0"><strong>Message:</strong></p>
     <p style="margin:8px 0;white-space:pre-wrap">${escapeHtml(input.message)}</p>`,
  )

export type LowStockRow = { title: string; current: number; qty: number; after: number }

export type LowStockInput = {
  orderId: number | string
  threshold: number
  rows: LowStockRow[]
}

/** Low-stock staff alert — one aggregated email per order (emails/low-stock.ts). */
export const lowStockAlertHtml = (input: LowStockInput): string =>
  shell(
    `Low stock: ${input.rows.length} item${input.rows.length === 1 ? '' : 's'} at or below ${input.threshold}`,
    `<p style="margin:8px 0">Order #${escapeHtml(String(input.orderId))} pushed stock to or below ${escapeHtml(String(input.threshold))}:</p>
     <ul style="margin:8px 0;padding-left:18px">${input.rows
       .map(
         (row) =>
           `<li><strong>${escapeHtml(row.title)}</strong>: ${escapeHtml(String(row.current))} → ${escapeHtml(String(row.after))} (${escapeHtml(String(row.qty))} in this order)</li>`,
       )
       .join('')}</ul>
     <p style="margin:8px 0;font-size:12px;color:#71717a">Stock is counted at settlement — restock before the next order drains it.</p>`,
  )
