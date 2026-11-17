// Videos are never uploaded: they are embedded by their link (§17.3), from
// YouTube, Loom or Vimeo only. The page builds the player address from the
// id read here, never from the link itself. Shared by the server and the web.

export type Provider = 'YouTube' | 'Loom' | 'Vimeo'

type Video = { provider: Provider; id: string; embedUrl: string }

const youtube = (id: string): Video => ({
  provider: 'YouTube',
  id,
  embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
})

/** The provider and the id of a video link; undefined for another link */
export const videoOf = (link: string): Video | undefined => {
  let url: URL
  try {
    url = new URL(link.trim())
  } catch {
    return
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return
  const host = url.hostname.replace(/^(www|m)\./, '')
  const [first, second] = url.pathname.split('/').filter(Boolean)
  const valid = (id: string | undefined, pattern: RegExp) =>
    id && pattern.test(id) ? id : undefined
  if (host === 'youtube.com') {
    const id = first === 'watch'
      ? url.searchParams.get('v') ?? undefined
      : first === 'shorts' || first === 'embed' || first === 'live'
      ? second
      : undefined
    const ok = valid(id, /^[\w-]{11}$/)
    return ok ? youtube(ok) : undefined
  }
  if (host === 'youtu.be') {
    const ok = valid(first, /^[\w-]{11}$/)
    return ok ? youtube(ok) : undefined
  }
  if (host === 'loom.com' && (first === 'share' || first === 'embed')) {
    const ok = valid(second, /^[0-9a-f]{32}$/)
    return ok
      ? {
        provider: 'Loom',
        id: ok,
        embedUrl: `https://www.loom.com/embed/${ok}`,
      }
      : undefined
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const ok = valid(first === 'video' ? second : first, /^\d{6,12}$/)
    return ok
      ? {
        provider: 'Vimeo',
        id: ok,
        embedUrl: `https://player.vimeo.com/video/${ok}`,
      }
      : undefined
  }
}

/** The players a page may frame (frame-src of the pages, §16) */
export const VIDEO_FRAMES = [
  'https://www.youtube-nocookie.com',
  'https://www.loom.com',
  'https://player.vimeo.com',
]
