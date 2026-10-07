import type { Metadata } from 'next'
import { getThemeAssets } from '@/lib/theme.server'
import { NexusSlotExplorer } from '@/themes/nexus/blocks/NexusSlotExplorer'

export const metadata: Metadata = {
  title: 'Slot Explorer — BuildMyRig',
  description:
    'Interactive motherboard slot explorer — mount components on the board and jump straight to the matching hardware.',
}

// force-dynamic so a Nexus preset swap is testable without ISR waits
// (plan §23/§83).
export const dynamic = 'force-dynamic'

export default async function ExplorerPage() {
  const isNexus = (await getThemeAssets()).pack === 'nexus'

  return (
    <main>
      {isNexus ? (
        <NexusSlotExplorer
          block={{
            eyebrow: 'Interactive rig configurator // Architectural mapping',
            heading: 'Slot explorer',
            body: 'Select any architectural socket to mount hardware. Mounted slots jump straight to the matching product — or open the full builder to wire a complete rig.',
          }}
        />
      ) : (
        <section className="page">
          <h1>Slot explorer</h1>
          <p>The interactive slot explorer ships with the Nexus theme pack.</p>
        </section>
      )}
    </main>
  )
}
