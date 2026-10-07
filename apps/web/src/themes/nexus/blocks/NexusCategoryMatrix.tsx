import Link from 'next/link'
import {
  Box,
  CircuitBoard,
  Cpu,
  Fan,
  HardDrive,
  Layers,
  MemoryStick,
  Zap,
} from 'lucide-react'

const ICONS = {
  gpu: CircuitBoard,
  cpu: Cpu,
  cooling: Fan,
  ram: MemoryStick,
  storage: HardDrive,
  power: Zap,
  case: Box,
  motherboard: Layers,
} as const

type Item = {
  category?: { slug?: string; title?: string } | number | null
  icon?: keyof typeof ICONS
  blurb?: string
}

/**
 * Entry 71 — nexusCategoryMatrix renderer: icon cards w/ an animated
 * circuit-trace overlay (CSS dash flow, not SMIL — same effect, no
 * SMIL-deprecation risk) linking to /shop/[categorySlug].
 */
export function NexusCategoryMatrix({
  block,
}: {
  block: { eyebrow?: string; heading?: string; items?: Item[] }
}) {
  const items = (block.items ?? []).filter(
    (i) => i && typeof i.category === 'object' && i.category?.slug,
  )
  return (
    <section className="page">
      <div className="nx-matrix">
        <div className="nx-section-head">
          {block.eyebrow && <p className="nx-section-eyebrow">{block.eyebrow}</p>}
          <h2 className="nx-section-heading">{block.heading}</h2>
        </div>
        <div className="nx-matrix__grid">
          {items.map((item, i) => {
            const cat = item.category as { slug: string; title?: string }
            const Icon = ICONS[item.icon ?? 'gpu'] ?? CircuitBoard
            return (
              <Link key={`${cat.slug}-${i}`} href={`/shop/${cat.slug}`} className="nx-card">
                <svg className="nx-card__trace" viewBox="0 0 200 120" aria-hidden preserveAspectRatio="none">
                  <path d="M0 30 H60 L80 50 H140 L160 70 H200" />
                  <path d="M0 90 H40 L60 70 H110 L130 90 H200" />
                </svg>
                <span className="nx-card__icon">
                  <Icon size={18} aria-hidden />
                </span>
                <h3 className="nx-card__title">{cat.title ?? cat.slug}</h3>
                {item.blurb && <p className="nx-card__blurb">{item.blurb}</p>}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
