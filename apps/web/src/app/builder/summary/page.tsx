import type { Metadata } from 'next'
import { SummaryClient } from './SummaryClient'
import '../builder.css'

export const metadata: Metadata = { title: 'Build summary | BuildMyRig' }

export default function BuildSummaryPage() {
  return <SummaryClient />
}
