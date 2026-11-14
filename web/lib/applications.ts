import { api, reasonOf } from '/web/lib/api.ts'
import { notifyFailure } from '/web/lib/failure.ts'
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
import { loadNotifications, readOne } from '/web/lib/notifications.ts'

// Joining a project persisted on the server (PAM-403): the page shows the
// change at once, then it is saved; a failure says so. A candidature reaches
// the owner and maintainers, who accept or refuse it from their notification
// (§6.6).

// Why the server refused (api/join.ts, reasonOf): it answered, so « could
// not reach the server » would be wrong
const REFUSALS: Record<string, string> = {
  member: 'Tu fais déjà partie de cette équipe.',
  unknown: 'Ce projet n’existe plus ou n’est pas public.',
  gone: 'Cette candidature n’existe plus.',
  invalid: 'Vérifie tes réponses et réessaie.',
  decided: 'Un autre membre de l’équipe a déjà répondu à cette candidature.',
  refused: 'Le serveur a refusé la demande.',
}

const failed = (title: string, error: unknown) =>
  notifyFailure(title, error, REFUSALS)

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
  }).then(() => 'sent' as const, (error) => {
    // Already sent, from another tab or before a reload: it is pending on
    // the server, as the page shows it
    if (reasonOf(error) === 'pending') return 'pending' as const
    const index = applications.indexOf(application)
    if (index !== -1) applications.splice(index, 1)
    for (let i = notifications.length - 1; i >= 0; i--) {
      if (notifications[i].application === application.id) {
        notifications.splice(i, 1)
      }
    }
    applicationsChanged.value++
    notificationsChanged.value++
    failed('Candidature non envoyée', error)
    throw error
  })
}

/** Accept or refuse a candidature from its notification (§6.6) */
export const decideJoinRequest = (
  notification: Notification,
  accept: boolean,
) => {
  return api['POST/api/project/join-request/decide']
    .fetch({ joinRequestId: Number(notification.application), accept })
    .then((result) => {
      notification.accepted = accept ? 1 : 0
      readOne(notification)
      notificationsChanged.value++
      return result
    })
    .catch((error) => {
      failed('Décision non enregistrée', error)
      // Decided by another manager meanwhile: the list shows the answer
      if (reasonOf(error) === 'decided') loadNotifications()
      throw error
    })
}
