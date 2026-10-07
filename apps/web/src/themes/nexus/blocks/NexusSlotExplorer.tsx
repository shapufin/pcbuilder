import { resolveSlotProducts, type ExplorerSlotKey } from '../lib/slot-explorer.server'
import { NexusSlotExplorerClient } from '../client/NexusSlotExplorerClient'

/**
 * Entry 71 — nexusSlotExplorer renderer: heading + per-slot product
 * resolution (block overrides → first published product per mapped
 * category), then hands a serializable slot list to the client board.
 */
export async function NexusSlotExplorer({
  block,
}: {
  block: {
    eyebrow?: string
    heading?: string
    body?: string
    slots?: { slot?: ExplorerSlotKey; product?: { slug?: string; title?: string } | number | null }[]
  }
}) {
  const slots = await resolveSlotProducts(block.slots)
  return (
    <section className="page">
      <div className="nx-explorer">
        <div className="nx-section-head">
          {block.eyebrow && <p className="nx-section-eyebrow">{block.eyebrow}</p>}
          {block.heading && <h2 className="nx-section-heading">{block.heading}</h2>}
          {block.body && <p className="nx-section-body">{block.body}</p>}
        </div>
        <NexusSlotExplorerClient slots={slots} />
      </div>
    </section>
  )
}
