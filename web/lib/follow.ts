import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import { readingStarts, setInOrder } from '/web/lib/in-order.ts'
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
// once, then the state the server confirms; the writes about one developer
// or project leave in order and the last one decides (in-order.ts). A real
// follow feeds the live feed: POST_CREATED reaches the followers the server
// reads (§10.1, §13.2).

const failed = () =>
  notify({
    title: 'Abonnement non enregistré',
    body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })

const userKey = (login: string) => `follow:user:${login}`
const projectKey = (slug: string) => `follow:project:${slug}`
const signedIn = () => me.login

// Sets a follow as the page shows it, then as the server saves it
const follow = (
  key: string,
  target: { targetType: 'user' | 'project'; target: string },
  on: boolean,
  show: (on: boolean) => void,
) =>
  setInOrder(key, on, {
    who: signedIn,
    show,
    send: (follow) =>
      api['POST/api/follow'].fetch({ ...target, follow })
        .then((saved) => saved.following),
    failed,
  })

/** What the developer follows, read at every session: the page starts there */
export const loadFollows = () => {
  const who = me.login
  // A follow clicked while the reading runs is newer than what it reads
  const writtenSince = readingStarts()
  return api['GET/api/follows'].fetch().then((follows) => {
    if (me.login !== who) return
    const users = new Set(follows.users)
    const followed = new Set(follows.projects)
    adoptFollowing(
      [...new Set([...users, ...(me.follows ?? [])])].filter((login) =>
        writtenSince(userKey(login)) ? isFollowing(login) : users.has(login)
      ),
    )
    adoptProjectFollows(
      who,
      (Object.values(projects) as Project[])
        .filter((project) =>
          writtenSince(projectKey(project.slug))
            ? project.followers.includes(who)
            : followed.has(project.slug)
        )
        .map((project) => project.slug),
    )
  }, () => {})
}

/** Follow a developer, or stop following them */
export const followUser = (login: string) =>
  follow(
    userKey(login),
    { targetType: 'user', target: login },
    !isFollowing(login),
    (on) => setFollowing(login, on),
  )

/** Follow a project, or stop following it */
export const followProject = (project: Project) =>
  follow(
    projectKey(project.slug),
    { targetType: 'project', target: project.slug },
    !project.followers.includes(me.login),
    (on) => setProjectFollow(project, me.login, on),
  )
