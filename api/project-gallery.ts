import { db, sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { mediaOf, setMediaOf } from '/api/media.ts'
import { videoOf } from '/api/video-links.ts'
import { Entry } from '/api/entries.ts'
import { ProjectNeed } from '/api/schema.ts'
import { LIMITS, MAX_NEEDS } from '/api/limits.ts'

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

// The information and the needs of a project, edited by the owner and the
// maintainers from the Réglages tab (PAM-402, §6.3)

const badRequest = (message: string) => new respond.BadRequestError({ message })

const writeInfo = sql<
  undefined,
  {
    projectId: number
    name: string
    description: string
    vision: string
    at: number
  }
>`
  UPDATE project
  SET name = :name, description = :description, vision = :vision, updatedAt = :at
  WHERE projectId = :projectId
`.run

const listOpenNeeds = sql<{ projectNeedId: number; title: string }, number>`
  SELECT projectNeedId, title FROM projectNeed
  WHERE projectId = ? AND status = 'open'
`.all

const deleteNeed = sql<undefined, number>`
  DELETE FROM projectNeed WHERE projectNeedId = ?
`.run

export type ProjectInfo = {
  name: string
  description: string
  vision: string
  needs: string[]
}

/**
 * Saves the information of a project and its open needs: a need kept by its
 * title keeps its skills, one left out is removed, a new one is added. The
 * audience reads the change in direct and the search is reindexed (§13.3)
 */
export const updateProjectInfo = (
  me: number,
  slug: string,
  input: ProjectInfo,
) => {
  const project = editable(me, slug)
  const name = input.name.trim()
  const description = input.description.trim()
  const vision = input.vision.trim()
  if (!name) throw badRequest('A project needs a name')
  if (
    name.length > LIMITS.projectName ||
    description.length > LIMITS.projectDescription ||
    vision.length > LIMITS.projectVision
  ) throw badRequest('Text too long')
  // Trimmed, non-empty, deduplicated, each within the limit
  const needs: string[] = []
  for (const raw of input.needs) {
    const title = raw.trim()
    if (!title || needs.includes(title)) continue
    if (title.length > LIMITS.projectNeed) {
      throw badRequest('A need is too long')
    }
    needs.push(title)
  }
  // The same cap as at import
  if (needs.length > MAX_NEEDS) throw badRequest(`${MAX_NEEDS} needs at most`)

  db.transaction(() => {
    const at = now()
    writeInfo({ projectId: project.projectId, name, description, vision, at })
    const existing = listOpenNeeds(project.projectId)
    const kept = new Set<string>()
    for (const need of existing) {
      if (needs.includes(need.title)) kept.add(need.title)
      else deleteNeed(need.projectNeedId)
    }
    for (const title of needs) {
      if (kept.has(title)) continue
      ProjectNeed.insert({
        projectId: project.projectId,
        type: 'skill',
        title,
        skills: [],
        status: 'open',
        createdAt: at,
        updatedAt: at,
      })
    }
    // The feeds of the audience read the project again, search reindexes it
    Entry.insert.PROJECT_UPDATED({
      userId: me,
      projectId: project.projectId,
      source: 'platform',
    })
  })()
  return { name, description, vision, needs }
}
