import { api } from '/web/lib/api.ts'
import { notifyFailure } from '/web/lib/failure.ts'
import { type Project, updateProject } from '/web/fixtures/projects.ts'

// A project's information and needs persisted on the server (PAM-402, §6.3):
// shown at once, then saved; a failure puts the project back as it was.

export type ProjectInfo =
  & Pick<Project, 'name' | 'description' | 'needs'>
  & { vision: string }

/** Saves the information and the open needs of a project (owner, maintainer) */
export const saveProjectInfo = (
  project: Project,
  info: ProjectInfo,
  journal: string,
) => {
  const before: ProjectInfo = {
    name: project.name,
    description: project.description,
    vision: project.vision ?? '',
    needs: [...project.needs],
  }
  updateProject(project, info, journal)
  return api['POST/api/project/update'].fetch({
    project: project.slug,
    name: info.name,
    description: info.description,
    vision: info.vision,
    needs: info.needs,
  }).then(() => {}, (error) => {
    updateProject(project, before, journal)
    notifyFailure('Réglages non enregistrés', error)
  })
}
