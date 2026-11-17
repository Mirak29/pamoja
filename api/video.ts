import { respond } from '@01edu/api/response'
import { type Provider, videoOf } from '/api/video-links.ts'

// The server asks the provider of a video (oEmbed) for its title and its
// thumbnail, kept in memory (§17.3)

const oembed: Record<Provider, (link: string) => string> = {
  YouTube: (link) =>
    `https://www.youtube.com/oembed?format=json&url=${
      encodeURIComponent(link)
    }`,
  Loom: (link) =>
    `https://www.loom.com/v1/oembed?url=${encodeURIComponent(link)}`,
  Vimeo: (link) =>
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(link)}`,
}

// Read once per video: the title and the thumbnail do not change
const seen = new Map<string, { title: string; thumbnailUrl: string }>()

/** What a page shows before the player: provider, title, thumbnail */
export const previewVideo = async (link: string) => {
  const video = videoOf(link)
  if (!video) {
    throw new respond.BadRequestError({
      message: 'A YouTube, Loom or Vimeo link',
    })
  }
  const key = `${video.provider}:${video.id}`
  let found = seen.get(key)
  if (!found) {
    found = { title: '', thumbnailUrl: '' }
    try {
      const res = await fetch(oembed[video.provider](link), {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json() as {
          title?: unknown
          thumbnail_url?: unknown
        }
        found = {
          title: typeof data.title === 'string' ? data.title.slice(0, 200) : '',
          // Only an image of the provider, in https
          thumbnailUrl: typeof data.thumbnail_url === 'string' &&
              data.thumbnail_url.startsWith('https://')
            ? data.thumbnail_url
            : '',
        }
        seen.set(key, found)
      } else await res.body?.cancel()
    } catch {
      // The player still works without a title nor a thumbnail
    }
  }
  // YouTube gives a thumbnail by the id, without asking
  const thumbnailUrl = found.thumbnailUrl ||
    (video.provider === 'YouTube'
      ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
      : '')
  return { ...video, ...found, thumbnailUrl }
}

// Thumbnails served by Pamoja itself: the page contacts no provider before
// the video is played (§17.3). Kept in memory, 200 at most.
const THUMBNAIL_MAX = 1024 * 1024
const thumbnails = new Map<
  string,
  { bytes: Uint8Array<ArrayBuffer>; type: string }
>()

const notFound = () =>
  new respond.NotFoundError({ message: 'No thumbnail for this video' })

/** The thumbnail of a video link, read once from its provider */
export const thumbnailOf = async (link: string) => {
  const { provider, id, thumbnailUrl } = await previewVideo(link)
  const key = `${provider}:${id}`
  let found = thumbnails.get(key)
  if (!found) {
    if (!thumbnailUrl) throw notFound()
    const res = await fetch(thumbnailUrl, {
      signal: AbortSignal.timeout(5000),
    }).catch(() => undefined)
    const type = res?.headers.get('Content-Type') ?? ''
    if (!res?.ok || !/^image\/(jpeg|png|webp)$/.test(type)) {
      await res?.body?.cancel()
      throw notFound()
    }
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.length > THUMBNAIL_MAX) throw notFound()
    found = { bytes, type }
    thumbnails.size >= 200 &&
      thumbnails.delete(thumbnails.keys().next().value!)
    thumbnails.set(key, found)
  }
  return new Response(found.bytes, {
    headers: {
      'Content-Type': found.type,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  })
}
