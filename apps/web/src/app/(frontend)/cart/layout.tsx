import type { Metadata } from 'next'

// Audit 2026-11-18 L6: the page is a client component, so its title lives on
// this segment layout. Transactional pages stay out of search indexes.
export const metadata: Metadata = {
  title: 'Your cart | BuildMyRig',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
