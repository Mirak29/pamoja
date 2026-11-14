import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import { inOrder, readingStarts } from '/web/lib/in-order.ts'
import {
  adoptFollowing,
  isFollowing,
  me,
  setFollowing,
} from '/web/fixtures/people.ts'
import {
  adoptProjectFollows,
  type Project,
  projects,
  setProjectFollow,
} from '/web/fixtures/projects.ts'

// Following persisted on the server (PAM-503). The page asks for the state
// it shows the opposite of, never for a toggle: a retry, or a second tab
// that saw an older state, cannot undo a follow. It shows the change at
// once, then takes the state the server confirms; a failure puts it back.
// The writes about one developer or project leave in order, and only the
// last decides what the page shows (in-order.ts); an answer that comes once
// another developer signed in is dropped. A real follow feeds the live
// feed: POST_CREATED reaches the followers the server reads (§10.1, §13.2).

const failed = () =>
  notify({
    title: 'Abonnement non enregistré',
    body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })

const userKey = (login: string) => `follow:user:${login}`
const projectKey = (slug: string) => `follow:project:${slug}`

/** What the developer follows, read at every session: the page starts there */
export const loadFollows = () => {
  const who = me.login
  // A follow clicked while the reading runs is newer than what it reads
  const writtenSince = readingStarts()
  return api['GET/api/follows'].fetch().then((follows) => {
    if (me.login !== who) return
    // Each developer: the page's own state if clicked meanwhile, else the
    // server's
    const everyone = new Set([...follows.users, ...(me.follows ?? [])])
    adoptFollowing(
      [...everyone].filter((login) =>
        writtenSince(userKey(login))
          ? isFollowing(login)
          : follows.users.includes(login)
      ),
    )
    const followed = (Object.values(projects) as Project[])
      .filter((project) =>
        writtenSince(projectKey(project.slug))
          ? project.followers.includes(me.login)
          : follows.projects.includes(project.slug)
      )
      .map((project) => project.slug)
    adoptProjectFollows(me.login, followed)
  }, () => {})
}

/** Follow a developer, or stop following them */
export const followUser = (login: string) => {
  const who = me.login
  const follow = !isFollowing(login)
  setFollowing(login, follow)
  const { answer, current } = inOrder(
    userKey(login),
    () =>
      api['POST/api/follow'].fetch({
        targetType: 'user',
        target: login,
        follow,
      }),
  )
  answer.then(
    (saved) => {
      if (me.login === who && current()) setFollowing(login, saved.following)
    },
    () => {
      if (me.login !== who || !current()) return
      setFollowing(login, !follow)
      failed()
    },
  )
}

/** Follow a project, or stop following it */
export const followProject = (project: Project) => {
  const who = me.login
  const follow = !project.followers.includes(who)
  setProjectFollow(project, who, follow)
  const { answer, current } = inOrder(
    projectKey(project.slug),
    () =>
      api['POST/api/follow'].fetch({
        targetType: 'project',
        target: project.slug,
        follow,
      }),
  )
  answer.then(
    (saved) => {
      if (me.login === who && current()) {
        setProjectFollow(project, who, saved.following)
      }
    },
    () => {
      if (me.login !== who || !current()) return
      setProjectFollow(project, who, !follow)
      failed()
    },
  )
}
