import Link from 'next/link'
import { NexusRigLazy } from '../client/NexusRigLazy'

type Cta = { label?: string; url?: string; style?: string }

/**
 * Extracted part → shop category (plan §26: extract navigates to the
 * category, no add-to-cart). Slugs match the seeded shop categories.
 */
const RIG_CATEGORY_LINKS = {
  gpu: 'gpus',
  cpu: 'cpu',
  cooling: 'cooling',
  ram: 'ram',
} as const

/**
 * Entry 71 — nexusHero renderer: eyebrow/heading+gradient/body/dual CTA +
 * hint; the rig visualizer mounts client-side via next/dynamic (ssr:false)
 * so three.js never ships in the entry bundle.
 */
export function NexusHero({
  block,
}: {
  block: {
    eyebrow?: string
    heading?: string
    gradientText?: string
    body?: string
    ctas?: Cta[]
    showRigVisualizer?: boolean
    hint?: string
  }
}) {
  const heading = block.heading ?? ''
  const gradient = block.gradientText?.trim()
  let headingNode: React.ReactNode = heading
  if (gradient && heading.includes(gradient)) {
    const [before, after] = heading.split(gradient)
    headingNode = (
      <>
        {before}
        <span className="nx-hero__gradient">{gradient}</span>
        {after}
      </>
    )
  }

  const ctas = (block.ctas ?? []).filter((c): c is Cta & { label: string; url: string } =>
    Boolean(c?.label && c?.url),
  )

  return (
    <section className="page">
      <div className="nx-hero">
        <div className="nx-hero__copy">
          {block.eyebrow && <p className="nx-hero__eyebrow">{block.eyebrow}</p>}
          <h1 className="nx-hero__heading">{headingNode}</h1>
          {block.body && <p className="nx-hero__body">{block.body}</p>}
          {ctas.length > 0 && (
            <div className="nx-hero__ctas">
              {ctas.map((c, i) => (
                <Link
                  key={`${c.url}-${i}`}
                  href={c.url}
                  className={c.style === 'ghost' ? 'nx-btn nx-btn--ghost' : 'nx-btn nx-btn--primary'}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          )}
          {block.hint && <p className="nx-hero__hint">{block.hint}</p>}
        </div>
        {/* role="group" (not "img"): the visualizer's label/theme/reset
            buttons must stay in the a11y tree — role="img" would mark
            focusable descendants presentational. */}
        {block.showRigVisualizer !== false && (
          <div
            className="nx-hero__visual"
            role="group"
            aria-label="Interactive 3D rig visualizer — extract parts to browse their categories"
          >
            <NexusRigLazy categoryLinks={RIG_CATEGORY_LINKS} />
            <div className="nx-hero__scanline" aria-hidden />
          </div>
        )}
      </div>
    </section>
  )
}
