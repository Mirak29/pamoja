import { computed, signal } from '@preact/signals'
import { CircleAlert } from '/web/assets/icons.tsx'
import { adoptHelpRequests } from '/web/fixtures/help.ts'
import { adoptUser, me } from '/web/fixtures/people.ts'
import { adoptProjects } from '/web/fixtures/repos.ts'
import { settings } from '/web/fixtures/settings.ts'
import {
  helpCategories,
  type HelpCategory,
  type MatchingMode,
  matchingModes,
} from '/api/vocabulary.ts'
import { notify } from '/web/ui/toast.tsx'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { loadPosts } from '/web/lib/posts.ts'

type User = ApiOutput['GET/api/user/me']

// The signed in developer (§5.3): undefined until the server answered, null
// without a session
export const currentUser = signal<User | null | undefined>(undefined)

export const signedIn = computed(() => !!currentUser.value)

// `me` of the pages becomes this developer before anything renders
const setUser = (user: User) => {
  const first = currentUser.peek()?.userId !== user.userId
  adoptUser(user)
  settings.matching = matchingModes[user.matchingMode]
  // The matching preferences saved on the server (§7.4)
  settings.minScore = user.minScore
  settings.onlySkills = user.onlySkills
  settings.onlyProjects = user.onlyProjects
  settings.onlyCommunities = user.onlyCommunities
  me.helpTypes = user.helpTypes.map((key) =>
    helpCategories[key as HelpCategory] ?? key
  )
  currentUser.value = user
  if (first) {
    loadProjects()
    loadHelpRequests()
    loadPosts()
  }
  return user
}

/** The projects of the developer, imported ones included (§5.4) */
export const loadProjects = () =>
  api['GET/api/projects'].fetch().then(adoptProjects, () => {})

/**
 * The help requests the developer wrote, accepted, or of their projects, and
 * those the matching sent them, with their score (§7.3)
 */
export const loadHelpRequests = () =>
  Promise.all([
    api['GET/api/help'].fetch().then(adoptHelpRequests),
    api['GET/api/help/for-me'].fetch().then((list) => {
      const adopted = adoptHelpRequests(list)
      adopted.forEach((request, i) => request.myScore = list[i].score)
    }),
  ]).catch(() => {})

api['GET/api/user/me'].fetch().then(
  setUser,
  () => currentUser.value = null,
)

// The page asked for before the login, kept during the round trip to GitHub
const BACK_KEY = 'pamoja-login-back'

const remember = (back: string) => {
  try {
    sessionStorage.setItem(BACK_KEY, back)
  } catch {
    // Without storage, the login ends on the home page
  }
}

/** The page to open after the login: a path of this site only, never //host */
export const takeBack = () => {
  let back = ''
  try {
    back = sessionStorage.getItem(BACK_KEY) ?? ''
    sessionStorage.removeItem(BACK_KEY)
  } catch {
    return ''
  }
  return back.startsWith('/') && !back.startsWith('//') ? back.slice(1) : ''
}

/** Sends the browser to GitHub, or to the callback page in dev */
export const startLogin = async (back: string) => {
  remember(back)
  const { url } = await api['GET/api/auth/github'].fetch()
  location.href = new URL(url, document.baseURI).href
}

/** Ends the login with the code GitHub returned; true on the first login */
export const finishLogin = async (code: string, state: string) => {
  const { created, ...user } = await api['POST/api/auth/github/callback']
    .fetch({ code, state })
  setUser(user)
  return created
}

export const signOut = () => {
  currentUser.value = null
  // Signed out at once on this page; the server archives the session
  api['POST/api/auth/logout'].fetch().catch(() => {})
}

type ProfileInput =
  & Parameters<
    typeof api['POST/api/user/profile/update']['fetch']
  >[0]
  & object

/**
 * Saves the profile fields, the declared skills and the intents given. The
 * page shows the change at once; a failure says so.
 */
export const saveMe = (changes: Parameters<typeof save>[0]) =>
  save(changes).catch(() =>
    notify({
      title: 'Profil non enregistré',
      body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
      icon: CircleAlert,
      tone: 'danger',
    })
  )

const save = async (changes: {
  profile?: Partial<ProfileInput>
  skills?: { skills: string[]; domains: string[] }
  intents?: string[]
}) => {
  const user = currentUser.peek()
  if (!user) return
  let saved = user
  if (changes.profile) {
    saved = await api['POST/api/user/profile/update'].fetch({
      displayName: user.displayName,
      headline: user.headline,
      bio: user.bio,
      country: user.country,
      city: user.city,
      website: user.website,
      matchingMode: user.matchingMode,
      ...changes.profile,
    })
  }
  if (changes.skills) {
    saved = await api['POST/api/user/skills/update'].fetch(changes.skills)
  }
  if (changes.intents) {
    saved = await api['POST/api/user/intents/update']
      .fetch({ intents: changes.intents })
  }
  setUser(saved)
}

/**
 * Saves how help requests reach the developer: mode, minimum score, types
 * of help accepted, skills, projects and communities kept (§7.4). The page
 * shows the change at once.
 */
export const saveMatching = (change: {
  matchingMode?: MatchingMode
  minScore?: number
  helpTypes?: string[]
  onlySkills?: string[]
  onlyProjects?: string[]
  onlyCommunities?: string[]
}) => {
  const user = currentUser.peek()
  if (!user) return
  return api['POST/api/notification/preferences'].fetch({
    matchingMode: change.matchingMode ?? user.matchingMode,
    minScore: change.minScore ?? user.minScore,
    helpTypes: change.helpTypes ?? user.helpTypes,
    onlySkills: change.onlySkills ?? user.onlySkills,
    onlyProjects: change.onlyProjects ?? user.onlyProjects,
    onlyCommunities: change.onlyCommunities ?? user.onlyCommunities,
  }).then(setUser, () =>
    notify({
      title: 'Réglages non enregistrés',
      body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
      icon: CircleAlert,
      tone: 'danger',
    }))
}
