import { sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { mediaOf, setMediaOf } from '/api/media.ts'
import { videoOf } from '/api/video-links.ts'

// The gallery of a project page: 8 screenshots at most, uploaded like every
// image (§17.3), set by the owner and the maintainers (§6.3)

export const GALLERY_MAX = 8

const getProject = sql<{ projectId: number }, string>`
  SELECT projectId FROM project WHERE slug = ?
`.get

const getRole = sql<{ role: string }, { projectId: number; userId: number }>`
  SELECT role FROM projectMember
  WHERE projectId = :projectId AND userId = :userId
`.get

/** The screenshots of a project, in their order */
export const galleryOf = (projectId: number) =>
  mediaOf('project_gallery', [projectId]).get(projectId) ?? []

// The project of the slug, if the developer is its owner or a maintainer
const editable = (me: number, slug: string) => {
  const project = getProject(slug)
  if (!project) throw new respond.NotFoundError({ message: 'No such project' })
  const role = getRole({ projectId: project.projectId, userId: me })?.role
  if (role !== 'owner' && role !== 'maintainer') {
    throw new respond.ForbiddenError({
      message: 'Only the owner and the maintainers set the gallery',
    })
  }
  return project
}

const writeVideo = sql<undefined, { projectId: number; url: string | null }>`
  UPDATE project SET demoVideoUrl = :url WHERE projectId = :projectId
`.run

/** Sets the demo video of a project by its link, or removes it with '' */
export const setDemoVideo = (me: number, slug: string, link: string) => {
  const project = editable(me, slug)
  const url = link.trim()
  if (url && !videoOf(url)) {
    throw new respond.BadRequestError({
      message: 'A YouTube, Loom or Vimeo link',
    })
  }
  writeVideo({ projectId: project.projectId, url: url || null })
  return { url }
}

/**
 * Sets the gallery of a project to these uploads, in this order: new ones
 * join it, those left out are deleted
 */
export const setGallery = (me: number, slug: string, ids: number[]) => {
  const project = editable(me, slug)
  if (ids.length > GALLERY_MAX) {
    throw new respond.BadRequestError({
      message: `${GALLERY_MAX} screenshots at most`,
    })
  }
  setMediaOf(me, 'project_gallery', project.projectId, ids)
  return galleryOf(project.projectId)
}
