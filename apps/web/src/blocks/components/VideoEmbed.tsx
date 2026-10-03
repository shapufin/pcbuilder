import { embedUrlFrom } from '@buildmyrig/lib'

export function VideoEmbed({
  block,
}: {
  block: { provider?: 'youtube' | 'vimeo' | null; url?: string; poster?: { url?: string | null } | null; title?: string | null }
}) {
  const embed = block.url ? embedUrlFrom(block.provider ?? 'youtube', block.url) : null
  if (!embed) return null
  return (
    <section className="blk">
      <div className="video-embed__frame">
        <iframe
          src={embed}
          title={block.title ?? 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="video-embed__iframe"
        />
      </div>
    </section>
  )
}
