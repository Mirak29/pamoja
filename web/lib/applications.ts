import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import { Login, me } from '/web/fixtures/people.ts'
import { apply } from '/web/fixtures/applications.ts'
import type { Notification } from '/web/fixtures/notifications.ts'
import type { Project, ProjectSlug } from '/web/fixtures/projects.ts'
import { readOne } from '/web/lib/notifications.ts'

// Joining a project persisted on the server (PAM-403): the page shows the
// change at once, then it is saved; a failure says so. A candidature reaches
// the owner and maintainers, who accept or refuse it from their notification
// (§6.6).

const failed = (title: string) =>
  notify({
    title,
    body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })

/** Apply to join a project */
export const applyToProject = (
  project: Project,
  draft: { areas: string[]; availability: string; message: string },
) => {
  // Optimistic: the page marks the candidature as sent
  apply({
    project: project.slug as ProjectSlug,
    login: me.login as Login,
    ...draft,
  })
  api['POST/api/project/join'].fetch({
    slug: project.slug,
    areas: draft.areas,
    availability: draft.availability,
    message: draft.message,
  }).catch(() => failed('Candidature non envoyée'))
}

/** Accept or refuse a candidature from its notification (§6.6) */
export const decideJoinRequest = (
  joinRequestId: number,
  accept: boolean,
  notification: Notification,
) => {
  // Read and handled: the buttons leave at once
  readOne(notification)
  api['POST/api/project/join-request/decide']
    .fetch({ joinRequestId, accept })
    .catch(() => failed('Décision non enregistrée'))
}
