import { useEffect, useState } from 'preact/hooks'
import { ExternalLink, Play } from '/web/assets/icons.tsx'
import { videoOf } from '/api/video-links.ts'
import { api } from '/web/lib/api.ts'
import { memberLink, webHref } from '/web/lib/member-links.ts'
import { t, translate } from '/web/lib/language.ts'

/*
 * A video embedded by its link (PAM-410, §17.3): the thumbnail first, the
 * player of the provider at the click, never before (no tracking while the
 * page is only read). YouTube, Loom and Vimeo only; another link stays a
 * link.
 *
 * @example
 * <VideoEmbed url={request.video} />
 */

type Preview = Awaited<
  ReturnType<typeof api['GET/api/video/preview']['fetch']>
>

// One question to the server per link, whatever the number of players
const previews = new Map<string, Promise<Preview | undefined>>()
const previewOf = (url: string) => {
  let found = previews.get(url)
  if (!found) {
    found = api['GET/api/video/preview'].fetch({ url }).catch(() => undefined)
    previews.set(url, found)
  }
  return found
}

/** The first YouTube, Loom or Vimeo link of a text, embedded under it */
export const videoIn = (text: string) =>
  text.match(/https?:\/\/[^\s<>()]+/g)?.find((link) => videoOf(link))

const frame =
  'aspect-video w-full overflow-hidden rounded-lg border border-figure-edge bg-surface-000 shadow-tile'

export const VideoEmbed = (
  { url, label = 'Vidéo' }: { url: string; label?: string },
) => {
  const video = videoOf(url)
  const [preview, setPreview] = useState<Preview | undefined>()
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    setPlaying(false)
    setPreview(undefined)
    video && previewOf(url).then(setPreview)
  }, [url])
  if (!video) {
    // Not an embeddable video: the link itself, opened elsewhere; not even
    // a link unless it is a web address (§16)
    const href = webHref(url)
    if (!href) return null
    return (
      <a
        href={href}
        {...memberLink}
        class='inline-flex items-center gap-2 text-[14px]'
      >
        <ExternalLink class='size-4' />
        {label}
      </a>
    )
  }
  const title = preview?.title || translate(label)
  if (playing) {
    return (
      <iframe
        src={`${video.embedUrl}?autoplay=1`}
        title={title}
        allow='autoplay; encrypted-media; fullscreen; picture-in-picture'
        allowFullScreen
        referrerpolicy='strict-origin-when-cross-origin'
        class={frame}
      />
    )
  }
  return (
    <button
      type='button'
      onClick={() => setPlaying(true)}
      aria-label={t`Lire : ${title}`}
      class={`${frame} relative flex cursor-pointer items-center justify-center`}
    >
      {preview?.thumbnailUrl && (
        <img
          src={`api/video/thumbnail?url=${encodeURIComponent(url)}`}
          alt=''
          loading='lazy'
          class='absolute inset-0 size-full object-cover'
        />
      )}
      <span class='key key-primary relative size-16 rounded-full'>
        <Play class='size-7' />
      </span>
      <span class='absolute right-3 bottom-3 left-3 truncate rounded-sm border border-line bg-surface-100 px-2 py-1 text-left text-[12px] font-medium text-ink'>
        {video.provider} · {title}
      </span>
    </button>
  )
}
