import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import { me, toggleFollowing } from '/web/fixtures/people.ts'
import { type Project, toggleFollow } from '/web/fixtures/projects.ts'

// Following persisted on the server (PAM-503): the page shows the change at
// once, then it is saved; a failure puts it back and says so. A real follow
// feeds the live feed, since POST_CREATED reaches the followers the server
// reads from the database (§10.1, §13.2).

const failed = () =>
  notify({
    title: 'Abonnement non enregistré',
    body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })

/** Follow or unfollow a developer */
export const followUser = (login: string) => {
  toggleFollowing(login)
  api['POST/api/follow/toggle'].fetch({ targetType: 'user', target: login })
    .catch(() => {
      toggleFollowing(login)
      failed()
    })
}

/** Follow or unfollow a project */
export const followProject = (project: Project) => {
  toggleFollow(project, me.login)
  api['POST/api/follow/toggle']
    .fetch({ targetType: 'project', target: project.slug })
    .catch(() => {
      toggleFollow(project, me.login)
      failed()
    })
}
