import { signal } from '@preact/signals'
import { logActivity } from '/web/fixtures/activity.ts'
import { hoursAgo } from '/web/fixtures/clock.ts'
import {
  type Notification,
  notifications,
  notificationsChanged,
  pushNotification,
} from '/web/fixtures/notifications.ts'
import { type Login, people } from '/web/fixtures/people.ts'
import {
  type Project,
  projects,
  type ProjectSlug,
} from '/web/fixtures/projects.ts'
import { t, translate } from '/web/lib/language.ts'

// Requests to join a project (§6.6), what POST/api/project/join and
// POST/api/project/join-request/decide will handle

export type Application = {
  id: string
  project: ProjectSlug
  login: Login
  areas: string[]
  availability: string
  message: string
  at: number
  status: 'pending' | 'accepted' | 'refused'
}

export const applications: Application[] = [
  {
    id: 'a1',
    project: 'openpay-africa',
    login: 'awa',
    areas: ['Frontend', 'Tests'],
    availability: '4 h par semaine',
    message: 'J’aimerais contribuer au projet.',
    at: hoursAgo(1),
    status: 'pending',
  },
]

export const applicationsChanged = signal(0)

const firstName = (login: Login) => people[login].name.split(' ')[0]

/** POST/api/project/join: the owner is notified */
export const apply = (
  draft: Pick<
    Application,
    'project' | 'login' | 'areas' | 'availability' | 'message'
  >,
) => {
  const id = `a${applications.length + 1}`
  const message = draft.message.trim() || 'J’aimerais contribuer au projet.'
  const project = projects[draft.project]
  applications.push({
    ...draft,
    id,
    message,
    at: Date.now(),
    status: 'pending',
  })
  pushNotification({
    to: project.owner,
    category: 'projects',
    kind: 'application',
    title: t`${firstName(draft.login)} veut rejoindre ${project.name}`,
    body: t`${draft.areas.map(translate).join(', ')}, ${
      translate(draft.availability)
    } : « ${message} »`,
    href: `project/${draft.project}/team`,
    application: id,
  })
  applicationsChanged.value++
}

/** POST/api/project/join-request/decide, from the team tab or the notification */
export const decideApplication = (
  application: Application,
  accept: boolean,
) => {
  if (application.status !== 'pending') return
  const project: Project = projects[application.project]
  application.status = accept ? 'accepted' : 'refused'
  const notification = notifications.find((n: Notification) =>
    n.application === application.id
  )
  if (notification) notification.read = true
  if (accept) {
    if (!project.members.some((m) => m.login === application.login)) {
      // Joining on Pamoja is not a GitHub contribution: the count stays
      project.members.push({ login: application.login, role: 'Contributeur' })
    }
    logActivity(
      application.project,
      `${people[application.login].name} rejoint l’équipe`,
    )
  }
  pushNotification({
    to: application.login,
    category: 'projects',
    kind: 'application',
    title: accept
      ? t`Tu rejoins ${project.name}`
      : translate('Candidature non retenue'),
    body: accept
      ? t`${
        firstName(project.owner)
      } a accepté ta candidature. Tu peux écrire dans #général.`
      : t`${project.name} n’a pas retenu ta candidature cette fois.`,
    href: accept
      ? `project/${application.project}/channels/general`
      : `project/${application.project}`,
  })
  applicationsChanged.value++
  notificationsChanged.value++
}
