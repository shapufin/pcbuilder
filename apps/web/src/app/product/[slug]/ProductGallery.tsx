'use client'

import { useState } from 'react'
import type { MediaPick } from '@/lib/media'

/**
 * PDP gallery — main image + thumbnail strip. A client component only for the
 * thumb-switch interaction; single-image products render the same markup with
 * no thumbs. The first image is eager (LCP), thumbs lazy.
 */
export function ProductGallery({ images }: { images: MediaPick[] }) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]
  if (!current) {
    return <div className="pdp-gallery__placeholder" aria-hidden="true" />
  }

  return (
    <div className="pdp-gallery">
      {/* eslint-disable-next-line @next/next/no-img-element -- media-pipeline sized */}
      <img
        key={current.url}
        className="pdp-gallery__main"
        src={current.url}
        alt={current.alt}
        width={current.width}
        height={current.height}
        fetchPriority="high"
        decoding="async"
      />
      {images.length > 1 ? (
        <div className="pdp-gallery__thumbs" role="group" aria-label="Product images">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              aria-pressed={i === active}
              aria-label={`Image ${i + 1} of ${images.length}`}
              className={`pdp-gallery__thumb${i === active ? ' pdp-gallery__thumb--active' : ''}`}
              onClick={() => setActive(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- media-pipeline sized */}
              <img src={img.url} alt="" width={img.width} height={img.height} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
