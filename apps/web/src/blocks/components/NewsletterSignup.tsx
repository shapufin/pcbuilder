import { NewsletterSignupClient } from './NewsletterSignupClient'

export function NewsletterSignup({
  block,
}: {
  block: { heading?: string | null; consent?: string | null }
}) {
  return <NewsletterSignupClient heading={block.heading ?? undefined} consent={block.consent ?? undefined} />
}
