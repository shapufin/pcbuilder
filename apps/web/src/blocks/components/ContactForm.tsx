import { ContactFormClient } from './ContactFormClient'

export function ContactForm({
  block,
}: {
  block: { heading?: string | null; intro?: string | null }
}) {
  return (
    <ContactFormClient
      heading={block.heading ?? undefined}
      intro={block.intro ?? undefined}
    />
  )
}
