import { useEffect, useState } from 'preact/hooks'
import { A, navigate, url } from '@01edu/signal-router'
import { CircleAlert, ImagePlus } from '/web/assets/icons.tsx'
import { isMe } from '/web/fixtures/people.ts'
import { type Project, projectsChanged } from '/web/fixtures/projects.ts'
import { api } from '/web/lib/api.ts'
import { t } from '/web/lib/language.ts'
import { mediaUrl } from '/web/lib/messages.ts'
import { Button } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { MediaPicker, MediaViewer, useMediaPicker } from '/web/ui/media.tsx'
import { notify } from '/web/ui/toast.tsx'

// The screenshots of a project page (PAM-425, §6.3, §17.3): shown to all,
// opened in a viewer, set by the owner and the maintainers

export const GALLERY_MAX = 8

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
          params={{ dialog: 'capture', media: String(i) }}
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
  return (
    <MediaViewer
      id='capture'
      items={project.shots ?? []}
      label={t`Captures de ${project.name}`}
    />
  )
}

/**
 * The screenshots as their owner sets them: added by a click or a drop,
 * reordered, removed, then saved at once. An upload left out is deleted by
 * the server after 24 h.
 */
export const ManageScreenshots = ({ project }: { project: Project }) => {
  projectsChanged.value
  const open = url.params.dialog === 'captures'
  const picker = useMediaPicker(GALLERY_MAX, project.shots)
  const [saving, setSaving] = useState(false)
  // A fresh copy of the gallery each time the dialog opens
  useEffect(() => {
    open && picker.reset(project.shots)
  }, [open])
  if (!open || !canEditGallery(project)) return null
  const save = async () => {
    setSaving(true)
    try {
      project.shots = await api['POST/api/project/gallery'].fetch({
        project: project.slug,
        media: picker.ids,
      })
      projectsChanged.value++
      notify({ title: 'Captures enregistrées', body: project.name })
      navigate({ params: { dialog: null } })
    } catch {
      notify({
        title: 'Captures non enregistrées',
        body: 'Réessaie dans un instant.',
        icon: CircleAlert,
        tone: 'warning',
      })
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog id='captures' title='Captures du projet' width={720}>
      <div class='flex flex-col gap-4 p-[22px]'>
        <span class='text-[13px] text-ink-muted'>
          La première est mise en avant. Les images sont réduites et leurs
          métadonnées retirées avant l’envoi.
        </span>
        <MediaPicker
          picker={picker}
          featured
          hint='Écrans, démo, version mobile : glissées ici ou choisies sur ton ordinateur.'
        />
        <div class='flex justify-end gap-2.5'>
          <Button
            variant='secondary'
            onClick={() => navigate({ params: { dialog: null } })}
          >
            Annuler
          </Button>
          <Button onClick={save} disabled={saving || picker.uploading}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
