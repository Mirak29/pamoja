import { useEffect, useState } from 'preact/hooks'
import { firstLink, type Preview } from '/api/link-preview.ts'
import { videoOf } from '/api/video-links.ts'
import { api } from '/web/lib/api.ts'
import { memberLink, webHref } from '/web/lib/member-links.ts'
import { A } from '/web/ui/link.tsx'

export const PostLink = ({ body }: { body: string }) => {
  const raw = firstLink(body)
  const href = raw && raw.length <= 2048 ? webHref(raw) : undefined
  const url = href ? new URL(href) : undefined
  const link = url && !url.username && !url.password && !videoOf(url.href)
    ? url.href
    : undefined
  const [preview, setPreview] = useState<Preview | undefined>()
  useEffect(() => {
    let active = true
    setPreview(undefined)
    const timer = setTimeout(() => {
      if (link) {
        api['GET/api/post/link-preview'].fetch({ url: link }).then((value) => {
          if (active) setPreview(value)
        }).catch(() => {})
      }
    }, 400)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [link])
  if (!link || !url) return null
  const shown = preview?.url === link ? preview : undefined
  const content = (
    <>
      <span class='text-[12px] text-ink-muted'>
        {shown?.site || url.hostname}
      </span>
      <strong class='block text-[16px] text-ink'>
        {shown?.title || url.hostname}
      </strong>
      {shown?.description && (
        <span class='line-clamp-3 text-[14px] text-ink-muted'>
          {shown.description}
        </span>
      )}
    </>
  )
  const style =
    'block min-w-0 space-y-1 rounded-lg border border-figure-edge bg-surface-100 p-4 shadow-tile no-underline wrap-anywhere'
  return url.origin === location.origin
    ? (
      <A
        href={url.pathname + url.search + url.hash}
        class={style}
        translate={false}
      >
        {content}
      </A>
    )
    : (
      <a href={link} {...memberLink} class={style} translate={false}>
        {content}
      </a>
    )
}
