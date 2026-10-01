import { embedUrlFrom } from '@buildmyrig/lib'

export function VideoEmbed({
  block,
}: {
  block: { provider?: 'youtube' | 'vimeo' | null; url?: string; poster?: { url?: string | null } | null; title?: string | null }
}) {
  const embed = block.url ? embedUrlFrom(block.provider ?? 'youtube', block.url) : null
  if (!embed) return null
  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-surface)' }}>
        <iframe
          src={embed}
          title={block.title ?? 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    </section>
  )
}
