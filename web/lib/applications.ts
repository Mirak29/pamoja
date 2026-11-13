import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import { Login, me } from '/web/fixtures/people.ts'
import {
  applications,
  applicationsChanged,
  apply,
} from '/web/fixtures/applications.ts'
import {
  type Notification,
  notifications,
  notificationsChanged,
} from '/web/fixtures/notifications.ts'
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
  const application = apply({
    project: project.slug as ProjectSlug,
    login: me.login as Login,
    ...draft,
  })
  return api['POST/api/project/join'].fetch({
    slug: project.slug,
    areas: draft.areas,
    availability: draft.availability,
    message: draft.message,
  }).catch((error) => {
    const index = applications.indexOf(application)
    if (index !== -1) applications.splice(index, 1)
    for (let i = notifications.length - 1; i >= 0; i--) {
      if (notifications[i].application === application.id) {
        notifications.splice(i, 1)
      }
    }
    applicationsChanged.value++
    notificationsChanged.value++
    failed('Candidature non envoyée')
    throw error
  })
}

/** Accept or refuse a candidature from its notification (§6.6) */
export const decideJoinRequest = (
  joinRequestId: number,
  accept: boolean,
  notification: Notification,
) => {
  return api['POST/api/project/join-request/decide']
    .fetch({ joinRequestId, accept })
    .then((result) => {
      notification.accepted = accept ? 1 : 0
      readOne(notification)
      notificationsChanged.value++
      return result
    })
    .catch((error) => {
      failed('Décision non enregistrée')
      throw error
    })
}
