import { useEffect, useState } from 'preact/hooks'
import { A, navigate, url } from '@01edu/signal-router'
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ImagePlus,
  Trash2,
} from '/web/assets/icons.tsx'
import { isMe } from '/web/fixtures/people.ts'
import { type Project, projectsChanged } from '/web/fixtures/projects.ts'
import { api } from '/web/lib/api.ts'
import { t } from '/web/lib/language.ts'
import { type Media, mediaUrl, uploadMedia } from '/web/lib/messages.ts'
import { Button } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { notify } from '/web/ui/toast.tsx'

// The screenshots of a project page (PAM-425, §6.3, §17.3): shown to all,
// opened in a viewer, set by the owner and the maintainers

export const GALLERY_MAX = 8
const IMAGES = ['image/jpeg', 'image/png', 'image/webp']

/** The owner and the maintainers set the screenshots, once on the server */
export const canEditGallery = (project: Project) =>
  !!project.shots && (isMe(project.owner) ||
    project.members.some((member) =>
      isMe(member.login) &&
      (member.role === 'Propriétaire' || member.role === 'Mainteneur')
    ))

const tile =
  'aspect-[4/3] min-w-0 overflow-hidden rounded-md border border-figure-edge bg-surface-000 shadow-tile'

/** The screenshots in a grid: each one opens the viewer */
export const Screenshots = ({ project }: { project: Project }) => {
  if (!project.shots) {
    // A demo project the server does not know: its captions as tiles
    return (
      <div class='grid grid-cols-2 gap-3.5 sm:grid-cols-3'>
        {project.gallery.map((caption) => (
          <div
            key={caption}
            title={caption}
            class={`${tile} flex items-end p-2`}
          >
            <span class='rounded-sm border border-line bg-surface-100 px-1.5 py-0.5 font-mono text-[11px] leading-[14px] font-medium text-ink-muted'>
              {caption}
            </span>
          </div>
        ))}
      </div>
    )
  }
  if (!project.shots.length) {
    return canEditGallery(project)
      ? (
        <A
          params={{ dialog: 'captures' }}
          class='flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line-control px-4 py-8 text-center text-ink no-underline hover:border-indigo hover:no-underline'
        >
          <ImagePlus class='size-6 text-indigo' />
          <span class='text-[14px] font-semibold'>Ajouter des captures</span>
          <span class='text-[12px] text-ink-muted'>
            {t`Jusqu’à ${GALLERY_MAX} images : écrans, démo, version mobile.`}
          </span>
        </A>
      )
      : null
  }
  return (
    <div class='grid grid-cols-2 gap-3.5 sm:grid-cols-3'>
      {project.shots.map((shot, i) => (
        <A
          key={shot.id}
          params={{ dialog: 'capture', capture: String(i) }}
          aria-label={t`Agrandir la capture ${i + 1} de ${project.name}`}
          class={`${tile} slab-lift block`}
        >
          <img
            src={mediaUrl(shot.key)}
            alt=''
            loading='lazy'
            class='size-full object-cover'
          />
        </A>
      ))}
    </div>
  )
}

/** One screenshot at full size, with the previous and the next ones */
export const ScreenshotViewer = ({ project }: { project: Project }) => {
  projectsChanged.value
  const shots = project.shots ?? []
  const open = url.params.dialog === 'capture' && shots.length > 0
  const index = Math.min(
    shots.length - 1,
    Math.max(0, Number(url.params.capture) || 0),
  )
  const go = (i: number) =>
    navigate({
      params: { capture: String((i + shots.length) % shots.length) },
      replace: true,
    })
  // Arrows of the keyboard, while the viewer is open
  useEffect(() => {
    if (!open || shots.length < 2) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') go(index - 1)
      if (event.key === 'ArrowRight') go(index + 1)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, index, shots.length])
  if (!open) return null
  const shot = shots[index]
  const arrow = 'absolute top-1/2 -translate-y-1/2'
  return (
    <Dialog
      id='capture'
      title={t`Capture ${index + 1} sur ${shots.length} · ${project.name}`}
      width={960}
      clear={['capture']}
    >
      <div class='flex flex-col gap-3 p-4'>
        <div class='relative flex items-center justify-center'>
          <img
            src={mediaUrl(shot.key)}
            alt={t`Capture ${index + 1} de ${project.name}`}
            width={shot.width}
            height={shot.height}
            class='max-h-[70vh] w-auto max-w-full rounded-md border border-figure-edge object-contain'
          />
          {shots.length > 1 && (
            <>
              <span class={`${arrow} left-2`}>
                <Button
                  variant='secondary'
                  size={40}
                  square
                  aria-label='Capture précédente'
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
                  aria-label='Capture suivante'
                  onClick={() => go(index + 1)}
                >
                  <ChevronRight class='size-5' />
                </Button>
              </span>
            </>
          )}
        </div>
        {shots.length > 1 && (
          <div class='flex justify-center gap-2 overflow-x-auto'>
            {shots.map((other, i) => (
              <button
                key={other.id}
                type='button'
                aria-label={t`Capture ${i + 1}`}
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

const warn = (title: string, body: string) =>
  notify({ title, body, icon: CircleAlert, tone: 'warning' })

/**
 * The screenshots as their owner sets them: added by a click or a drop,
 * reordered, removed, then saved at once. An upload left out is deleted by
 * the server after 24 h.
 */
export const ManageScreenshots = ({ project }: { project: Project }) => {
  projectsChanged.value
  const open = url.params.dialog === 'captures'
  const [list, setList] = useState<Media[]>([])
  const [uploading, setUploading] = useState(0)
  const [saving, setSaving] = useState(false)
  const [over, setOver] = useState(false)
  // A fresh copy of the gallery each time the dialog opens
  useEffect(() => {
    open && setList(project.shots ?? [])
  }, [open])
  if (!open || !canEditGallery(project)) return null

  const add = async (files: File[]) => {
    const room = GALLERY_MAX - list.length - uploading
    const images = files.filter((file) => IMAGES.includes(file.type))
    if (images.length < files.length) {
      warn('Format non accepté', 'Ajoute des images JPEG, PNG ou WebP.')
    }
    if (images.length > room) {
      warn(
        'Galerie pleine',
        t`${GALLERY_MAX} captures au plus : les suivantes ne sont pas ajoutées.`,
      )
    }
    const kept = images.slice(0, Math.max(0, room))
    setUploading((n) => n + kept.length)
    for (const file of kept) {
      const media = await uploadMedia(file)
      setUploading((n) => n - 1)
      media && setList((current) => [...current, media])
    }
  }
  const move = (i: number, by: number) =>
    setList((current) => {
      const next = [...current]
      ;[next[i], next[i + by]] = [next[i + by], next[i]]
      return next
    })
  const save = async () => {
    setSaving(true)
    try {
      project.shots = await api['POST/api/project/gallery'].fetch({
        project: project.slug,
        media: list.map((media) => media.id),
      })
      projectsChanged.value++
      notify({ title: 'Captures enregistrées', body: project.name })
      navigate({ params: { dialog: null } })
    } catch {
      warn('Captures non enregistrées', 'Réessaie dans un instant.')
    } finally {
      setSaving(false)
    }
  }
  const full = list.length + uploading >= GALLERY_MAX
  return (
    <Dialog id='captures' title='Captures du projet' width={720}>
      <div class='flex flex-col gap-4 p-[22px]'>
        <span class='text-[13px] text-ink-muted'>
          {t`${list.length} sur ${GALLERY_MAX}. La première est mise en avant. Les images sont réduites et leurs métadonnées retirées avant l’envoi.`}
        </span>
        <div class='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          {list.map((media, i) => (
            <div key={media.id} class='flex flex-col gap-1.5'>
              <div class={`${tile} relative`}>
                <img
                  src={mediaUrl(media.key)}
                  alt={t`Capture ${i + 1}`}
                  class='size-full object-cover'
                />
                {i === 0 && (
                  <span class='absolute top-1.5 left-1.5 rounded-sm bg-indigo px-1.5 py-0.5 font-mono text-[10px] font-medium text-on-indigo'>
                    Principale
                  </span>
                )}
              </div>
              <div class='flex justify-between gap-1'>
                <Button
                  variant='secondary'
                  size={32}
                  square
                  aria-label={t`Avancer la capture ${i + 1}`}
                  disabled={i === 0}
                  onClick={() =>
                    move(i, -1)}
                >
                  <ChevronLeft class='size-4' />
                </Button>
                <Button
                  variant='secondary'
                  size={32}
                  square
                  aria-label={t`Retirer la capture ${i + 1}`}
                  onClick={() =>
                    setList((current) =>
                      current.filter((_, j) => j !== i)
                    )}
                >
                  <Trash2 class='size-4' />
                </Button>
                <Button
                  variant='secondary'
                  size={32}
                  square
                  aria-label={t`Reculer la capture ${i + 1}`}
                  disabled={i === list.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronRight class='size-4' />
                </Button>
              </div>
            </div>
          ))}
          {Array.from({ length: uploading }, (_, i) => (
            <div
              key={`up-${i}`}
              class={`${tile} animate-skeleton`}
              aria-label='Envoi en cours'
            />
          ))}
        </div>
        {!full && (
          <label
            class={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center ${
              over ? 'border-indigo bg-indigo-soft' : 'border-line-control'
            }`}
            onDragOver={(event) => {
              event.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
              event.preventDefault()
              setOver(false)
              add([...event.dataTransfer?.files ?? []])
            }}
          >
            <ImagePlus class='size-6 text-indigo' />
            <span class='text-[14px] font-semibold'>
              Ajouter des captures
            </span>
            <span class='text-[12px] text-ink-muted'>
              Clique ou dépose des images ici : JPEG, PNG ou WebP.
            </span>
            <input
              type='file'
              accept={IMAGES.join(',')}
              multiple
              class='sr-only'
              onChange={(event) => {
                add([...event.currentTarget.files ?? []])
                event.currentTarget.value = ''
              }}
            />
          </label>
        )}
        <div class='flex justify-end gap-2.5'>
          <Button
            variant='secondary'
            onClick={() => navigate({ params: { dialog: null } })}
          >
            Annuler
          </Button>
          <Button onClick={save} disabled={saving || uploading > 0}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
