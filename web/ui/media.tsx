import { useEffect, useState } from 'preact/hooks'
import { A, navigate, url } from '@01edu/signal-router'
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ImagePlus,
  Trash2,
} from '/web/assets/icons.tsx'
import { t } from '/web/lib/language.ts'
import { type Media, mediaUrl, uploadMedia } from '/web/lib/messages.ts'
import { Button } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { notify } from '/web/ui/toast.tsx'

/*
 * Images everywhere (§17.3): picked from the computer, dropped or pasted,
 * resized in the browser and uploaded at once, then shown in a grid that
 * opens a viewer. Used by posts, help requests, the project gallery and the
 * profile cover; each content attaches its uploads when it is saved.
 *
 * @example
 * const picker = useMediaPicker(4)
 * <MediaPicker picker={picker} />
 * save({ media: picker.ids })
 * <MediaGrid id='post-12' items={post.media} label='Images du post' />
 */

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type Item = {
  /** Key of the item in the page, before and after its upload */
  local: string
  /** The local file while it uploads, then the file on the server */
  preview: string
  media?: Media
}

const fromMedia = (media: Media): Item => ({
  local: `m${media.id}`,
  preview: mediaUrl(media.key),
  media,
})

const warn = (title: string, body: string) =>
  notify({ title, body, icon: CircleAlert, tone: 'warning' })

/** The images of a form: added, uploaded, reordered, removed */
export const useMediaPicker = (max: number, initial: Media[] = []) => {
  const [items, setItems] = useState<Item[]>(() => initial.map(fromMedia))
  const add = (files: File[]) => {
    const images = files.filter((file) => IMAGE_TYPES.includes(file.type))
    if (images.length < files.length) {
      warn('Format non accepté', 'Ajoute des images JPEG, PNG ou WebP.')
    }
    const room = max - items.length
    if (images.length > room) {
      warn(
        t`${max} images au plus`,
        'Les suivantes ne sont pas ajoutées.',
      )
    }
    for (const file of images.slice(0, Math.max(0, room))) {
      const local = crypto.randomUUID()
      const preview = URL.createObjectURL(file)
      setItems((list) => [...list, { local, preview }])
      uploadMedia(file).then((media) => {
        URL.revokeObjectURL(preview)
        setItems((list) =>
          media
            ? list.map((item) => item.local === local ? fromMedia(media) : item)
            : list.filter((item) => item.local !== local)
        )
      })
    }
  }
  return {
    items,
    max,
    add,
    remove: (local: string) =>
      setItems((list) => list.filter((item) => item.local !== local)),
    move: (i: number, by: number) =>
      setItems((list) => {
        const next = [...list]
        ;[next[i], next[i + by]] = [next[i + by], next[i]]
        return next
      }),
    /** Back to these images, when the form opens again */
    reset: (media: Media[] = []) => setItems(media.map(fromMedia)),
    uploading: items.some((item) => !item.media),
    full: items.length >= max,
    /** What the form sends: the uploads, in their order */
    ids: items.flatMap((item) => item.media ? [item.media.id] : []),
    media: items.flatMap((item) => item.media ? [item.media] : []),
    /** A screenshot pasted in a text field, like on Discord */
    onPaste: (event: ClipboardEvent) => {
      const files = [...event.clipboardData?.files ?? []]
      if (!files.length) return
      event.preventDefault()
      add(files)
    },
  }
}

export type MediaPickerState = ReturnType<typeof useMediaPicker>

const tile =
  'aspect-[4/3] min-w-0 overflow-hidden rounded-md border border-figure-edge bg-surface-000 shadow-tile'

/**
 * The images of a form, each with its order and removal, and the zone that
 * adds more: a click opens the files of the computer, a drop adds them.
 */
export const MediaPicker = (
  { picker, hint, featured }: {
    picker: MediaPickerState
    /** What the images are for, under « Ajouter des images » */
    hint?: string
    /** The first image is put forward (a gallery) */
    featured?: boolean
  },
) => {
  const [over, setOver] = useState(false)
  const { items, max } = picker
  return (
    <div class='flex flex-col gap-3'>
      {items.length > 0 && (
        <div class='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          {items.map((item, i) => (
            <div key={item.local} class='flex flex-col gap-1.5'>
              <div class={`${tile} relative`}>
                <img
                  src={item.preview}
                  alt={t`Image ${i + 1}`}
                  class={`size-full object-cover ${
                    item.media ? '' : 'animate-skeleton'
                  }`}
                />
                {featured && i === 0 && (
                  <span class='absolute top-1.5 left-1.5 rounded-sm bg-indigo px-1.5 py-0.5 font-mono text-[10px] font-medium text-on-indigo'>
                    Principale
                  </span>
                )}
              </div>
              <div class='flex justify-between gap-1'>
                {max > 1 && (
                  <Button
                    variant='secondary'
                    size={32}
                    square
                    aria-label={t`Avancer l’image ${i + 1}`}
                    disabled={i === 0}
                    onClick={() => picker.move(i, -1)}
                  >
                    <ChevronLeft class='size-4' />
                  </Button>
                )}
                <Button
                  variant='secondary'
                  size={32}
                  square
                  aria-label={t`Retirer l’image ${i + 1}`}
                  onClick={() =>
                    picker.remove(item.local)}
                >
                  <Trash2 class='size-4' />
                </Button>
                {max > 1 && (
                  <Button
                    variant='secondary'
                    size={32}
                    square
                    aria-label={t`Reculer l’image ${i + 1}`}
                    disabled={i === items.length - 1}
                    onClick={() => picker.move(i, 1)}
                  >
                    <ChevronRight class='size-4' />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {!picker.full && (
        <label
          class={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-4 text-center ${
            over
              ? 'border-indigo bg-indigo-soft'
              : 'border-line-control hover:border-indigo'
          }`}
          onDragOver={(event) => {
            event.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setOver(false)
            picker.add([...event.dataTransfer?.files ?? []])
          }}
        >
          <ImagePlus class='size-5 text-indigo' />
          <span class='text-[14px] font-semibold'>
            {max > 1
              ? t`Ajouter des images (${items.length} sur ${max})`
              : 'Choisir une image'}
          </span>
          <span class='text-[12px] text-ink-muted'>
            {hint ??
              'Depuis ton ordinateur, glissées ici ou collées : JPEG, PNG ou WebP.'}
          </span>
          <input
            type='file'
            accept={IMAGE_TYPES.join(',')}
            multiple={max > 1}
            class='sr-only'
            onChange={(event) => {
              picker.add([...event.currentTarget.files ?? []])
              event.currentTarget.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}

// One image takes the width; two side by side; more in a grid
const layouts = ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-2']

/** Images in a grid; each one opens the viewer of this grid */
export const MediaGrid = (
  { id, items, label }: { id: string; items: Media[]; label: string },
) =>
  items.length
    ? (
      <div class={`grid gap-2 ${layouts[Math.min(items.length, 4)]}`}>
        {items.map((media, i) => (
          <A
            key={media.id}
            params={{ dialog: id, media: String(i) }}
            aria-label={t`Agrandir l’image ${i + 1} : ${label}`}
            class={`block overflow-hidden rounded-md border border-figure-edge bg-surface-000 ${
              items.length === 1 ? 'max-h-[420px]' : 'aspect-[4/3]'
            }`}
          >
            <img
              src={mediaUrl(media.key)}
              alt=''
              loading='lazy'
              width={media.width}
              height={media.height}
              class={`size-full ${
                items.length === 1 ? 'object-contain' : 'object-cover'
              }`}
            />
          </A>
        ))}
      </div>
    )
    : null

/**
 * One image at full size, with the previous and the next ones: arrows,
 * the keyboard and thumbnails. Opened with `?dialog=<id>&media=<index>`.
 */
export const MediaViewer = (
  { id, items, label }: { id: string; items: Media[]; label: string },
) => {
  const open = url.params.dialog === id && items.length > 0
  const index = Math.min(
    items.length - 1,
    Math.max(0, Number(url.params.media) || 0),
  )
  const go = (i: number) =>
    navigate({
      params: { media: String((i + items.length) % items.length) },
      replace: true,
    })
  useEffect(() => {
    if (!open || items.length < 2) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') go(index - 1)
      if (event.key === 'ArrowRight') go(index + 1)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, index, items.length])
  if (!open) return null
  const shown = items[index]
  const arrow = 'absolute top-1/2 -translate-y-1/2'
  return (
    <Dialog
      id={id}
      title={items.length > 1
        ? t`${label} · ${index + 1} sur ${items.length}`
        : label}
      width={960}
      clear={['media']}
    >
      <div class='flex flex-col gap-3 p-4'>
        <div class='relative flex items-center justify-center'>
          <img
            src={mediaUrl(shown.key)}
            alt={t`${label}, image ${index + 1}`}
            width={shown.width}
            height={shown.height}
            class='max-h-[70vh] w-auto max-w-full rounded-md border border-figure-edge object-contain'
          />
          {items.length > 1 && (
            <>
              <span class={`${arrow} left-2`}>
                <Button
                  variant='secondary'
                  size={40}
                  square
                  aria-label='Image précédente'
                  onClick={() => go(index - 1)}
                >
                  <ChevronLeft class='size-5' />
                </Button>
              </span>
              <span class={`${arrow} right-2`}>
                <Button
                  variant='secondary'
                  size={40}
                  square
                  aria-label='Image suivante'
                  onClick={() => go(index + 1)}
                >
                  <ChevronRight class='size-5' />
                </Button>
              </span>
            </>
          )}
        </div>
        {items.length > 1 && (
          <div class='flex justify-center gap-2 overflow-x-auto'>
            {items.map((other, i) => (
              <button
                key={other.id}
                type='button'
                aria-label={t`Image ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                class={`h-12 w-16 flex-none cursor-pointer overflow-hidden rounded-sm border-2 ${
                  i === index ? 'border-indigo' : 'border-transparent'
                }`}
              >
                <img
                  src={mediaUrl(other.key)}
                  alt=''
                  class='size-full object-cover'
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}
