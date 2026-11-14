import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import {
  adoptFollowing,
  isFollowing,
  me,
  setFollowing,
} from '/web/fixtures/people.ts'
import {
  adoptProjectFollows,
  type Project,
  setProjectFollow,
} from '/web/fixtures/projects.ts'

// Following persisted on the server (PAM-503). The page asks for the state
// it shows the opposite of, never for a toggle: a retry, or a second tab
// that saw an older state, cannot undo a follow. It shows the change at
// once, then takes the state the server confirms; a failure puts it back.
// A real follow feeds the live feed: POST_CREATED reaches the followers the
// server reads from the database (§10.1, §13.2).

const failed = () =>
  notify({
    title: 'Abonnement non enregistré',
    body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })

/** What the developer follows, read at every session: the page starts there */
export const loadFollows = () =>
  api['GET/api/follows'].fetch().then((follows) => {
    adoptFollowing(follows.users)
    adoptProjectFollows(me.login, follows.projects)
  }, () => {})

/** Follow a developer, or stop following them */
export const followUser = (login: string) => {
  const follow = !isFollowing(login)
  setFollowing(login, follow)
  api['POST/api/follow'].fetch({ targetType: 'user', target: login, follow })
    .then(
      (saved) => setFollowing(login, saved.following),
      () => {
        setFollowing(login, !follow)
        failed()
      },
    )
}

/** Follow a project, or stop following it */
export const followProject = (project: Project) => {
  const follow = !project.followers.includes(me.login)
  setProjectFollow(project, me.login, follow)
  api['POST/api/follow'].fetch({
    targetType: 'project',
    target: project.slug,
    follow,
  }).then(
    (saved) => setProjectFollow(project, me.login, saved.following),
    () => {
      setProjectFollow(project, me.login, !follow)
      failed()
    },
  )
}
