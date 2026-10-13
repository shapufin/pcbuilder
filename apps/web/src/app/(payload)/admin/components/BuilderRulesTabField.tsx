'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Link } from '@payloadcms/ui'
import { ShieldCheck, Cpu, Zap, Box } from 'lucide-react'

interface LinkedComponent {
  id: string | number
  name?: string
  category?: { slug?: string; name?: string } | string | number | null
  socket?: string | null
  compatTags?: unknown
}

/**
 * Mock-parity "Builder Rules" product-edit tab — shows how this product maps
 * into the PC Builder engine: the linked builder component (products ↔
 * variants ↔ components), its socket, compat tags, and the count of active
 * rule edges that reference it (live `/api/builder/rules/conflicts`).
 * Degrades to guidance text when the product isn't part of the builder catalog.
 * `useDocumentInfo()` is empty inside Payload `ui` fields (no provider mounts
 * over RenderFields), so the doc id is parsed from the edit-view URL instead.
 */
export const BuilderRulesTabField = (): React.JSX.Element => {
  const pathname = usePathname()
  const docId =
    /^\/admin\/collections\/[^/]+\/(?:trash\/)?(.+)$/.exec(pathname)?.[1]
  const id = docId && docId !== 'create' ? docId : undefined
  const [component, setComponent] = useState<LinkedComponent | null>(null)
  const [conflictCount, setConflictCount] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (id == null) return
    let isMounted = true
    ;(async () => {
      // products → variants (by product id) → components (by productVariant)
      const variantsRes = await fetch(
        `/api/variants?where[product][equals]=${encodeURIComponent(String(id))}&limit=50&depth=0`,
        { credentials: 'same-origin' },
      )
      if (!variantsRes.ok) return
      const variants = (await variantsRes.json()) as { docs?: { id: string | number }[] }
      const ids = (variants.docs ?? []).map((v) => v.id)
      if (ids.length === 0) return
      const compRes = await fetch(
        `/api/components?where[productVariant][in]=${ids.join(',')}&limit=1&depth=1`,
        { credentials: 'same-origin' },
      )
      if (!compRes.ok) return
      const comps = (await compRes.json()) as { docs?: LinkedComponent[] }
      const comp = comps.docs?.[0]
      if (!comp) return
      if (isMounted) setComponent(comp)
      const conflictsRes = await fetch(
        `/api/builder/rules/conflicts?componentId=${encodeURIComponent(String(comp.id))}`,
        { credentials: 'same-origin' },
      )
      if (conflictsRes.ok) {
        const json = (await conflictsRes.json()) as { conflicts?: unknown[] }
        if (isMounted) setConflictCount(json.conflicts?.length ?? 0)
      }
    })()
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoaded(true)
      })
    return () => {
      isMounted = false
    }
  }, [id])

  // Unsaved/new products have no id — they can't have builder links yet, so
  // they render the guidance state immediately without waiting on the fetch.
  const ready = loaded || id == null

  const categoryLabel =
    component && typeof component.category === 'object' && component.category !== null
      ? (component.category.name ?? component.category.slug ?? '')
      : ''

  return (
    <div className="bmr-builder-rules">
      <div className="bmr-builder-rules__header">
        <ShieldCheck size={15} aria-hidden="true" />
        <span className="bmr-builder-rules__title">Automated Compatibility Validations</span>
      </div>
      <p className="bmr-builder-rules__desc">
        Deterministic checks the PC Builder Engine applies when this product participates in a
        customer configuration — socket interlocks, GPU clearance vs chassis limits, and PSU
        continuous-wattage headroom.
      </p>

      <div className="bmr-builder-rules__checks">
        <div className="bmr-builder-rules__check">
          <Cpu size={14} aria-hidden="true" />
          <div>
            <div className="bmr-builder-rules__check-title">Socket &amp; Platform Interlock</div>
            <div className="bmr-builder-rules__check-desc">
              CPUs only mount on matching motherboard sockets (AM5 / LGA1700 / LGA1851).
            </div>
          </div>
        </div>
        <div className="bmr-builder-rules__check">
          <Box size={14} aria-hidden="true" />
          <div>
            <div className="bmr-builder-rules__check-title">GPU Length vs Chassis Clearance</div>
            <div className="bmr-builder-rules__check-desc">
              GPU physical length must fit the case max GPU clearance, radiator margin included.
            </div>
          </div>
        </div>
        <div className="bmr-builder-rules__check">
          <Zap size={14} aria-hidden="true" />
          <div>
            <div className="bmr-builder-rules__check-title">PSU Continuous Headroom</div>
            <div className="bmr-builder-rules__check-desc">
              Combined TDP × 1.3 + base load must stay under the PSU continuous rating.
            </div>
          </div>
        </div>
      </div>

      {ready && component ? (
        <div className="bmr-builder-rules__link">
          <span>
            Linked builder component:{' '}
            <strong>{component.name ?? `#${String(component.id)}`}</strong>
            {categoryLabel ? ` (${categoryLabel})` : ''}
            {component.socket ? ` — socket ${component.socket}` : ''}
          </span>
          <span>
            {conflictCount != null
              ? `${conflictCount} active rule edge${conflictCount === 1 ? '' : 's'} evaluated against this component.`
              : 'Rule edges loading…'}
          </span>
          <Link href={`/admin/collections/components/${component.id}`}>Open component →</Link>
        </div>
      ) : ready ? (
        <div className="bmr-builder-rules__link bmr-builder-rules__link--empty">
          This product is not linked to a builder component yet. Create a variant and attach it in
          Components to enrol it in engine validations.
        </div>
      ) : null}
    </div>
  )
}
