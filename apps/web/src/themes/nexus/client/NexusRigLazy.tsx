'use client'

import dynamic from 'next/dynamic'
import type { RigCategoryLinks } from './RigVisualizer'

/**
 * Entry 71 — the three.js RigVisualizer is the heaviest Nexus dependency;
 * next/dynamic(ssr:false) keeps it in a lazy chunk that only downloads when
 * a nexusHero block with showRigVisualizer actually renders.
 */
const RigVisualizer = dynamic(() => import('./RigVisualizer'), {
  ssr: false,
  loading: () => (
    <div className="nx-hero__visual-fallback" aria-hidden>
      Initializing rig renderer…
    </div>
  ),
})

export function NexusRigLazy({ categoryLinks }: { categoryLinks?: RigCategoryLinks }) {
  return <RigVisualizer categoryLinks={categoryLinks} />
}
