import { signal } from '@preact/signals'
import { type Login, people, type Person } from '/web/fixtures/people.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'
import { saveMe } from '/web/lib/session.ts'

// Personalization of a profile (§9.2), what POST/api/user/profile/update
// will store. Theme and accent ids are those of docs/identite/tokens.json.

export const profileThemes = [
  ['minimal', 'Minimal'],
  ['terminal', 'Terminal'],
  ['cyber', 'Cyber'],
  ['clair', 'Clair'],
  ['sombre', 'Sombre'],
] as const

export const profileAccents = [
  ['indigo', 'Indigo'],
  ['vert', 'Vert'],
  ['ambre', 'Ambre'],
  ['corail', 'Corail'],
] as const

export const profileCovers = [
  ['fil', 'Le fil'],
  ['grille', 'Grille'],
  ['plaques', 'Plaques'],
  ['uni', 'Uni'],
  // A photo uploaded by the developer (§9.2, §17.3)
  ['photo', 'Photo'],
] as const

export const profileSections = [
  ['building', 'En train de construire'],
  ['contributions', 'Contributions'],
  ['reputation', 'Réputation'],
  ['badges', 'Badges'],
  ['activity', 'Activité'],
  ['communities', 'Communautés'],
  ['map', 'Collaboration Map'],
  ['graph', 'Collaboration Graph'],
] as const

export type ProfileTheme = typeof profileThemes[number][0]
export type ProfileAccent = typeof profileAccents[number][0]
export type ProfileCover = typeof profileCovers[number][0]
export type ProfileSection = typeof profileSections[number][0]

export type ProfileSettings = {
  theme: ProfileTheme
  accent: ProfileAccent
  cover: ProfileCover
  order: ProfileSection[]
  /** Projects shown in "En train de construire"; empty shows them all */
  featured: ProjectSlug[]
}

const defaults: ProfileSettings = {
  theme: 'minimal',
  accent: 'indigo',
  cover: 'fil',
  order: profileSections.map(([key]) => key),
  featured: [],
}

const saved: Partial<Record<Login, ProfileSettings>> = {}

// Session changes until the profile routes exist (PAM-301)
export const profileChanged = signal(0)

export const settingsOf = (login: Login): ProfileSettings =>
  saved[login] ?? defaults

/**
 * The appearance read from the server (GET/api/user, PAM-302) takes the place
 * of what the page had, so a profile shows its own theme, accent and order.
 */
export const adoptSettings = (
  login: string,
  settings: {
    theme: string
    accent: string
    order: string[]
    featured: string[]
  },
) => {
  const key = login as Login
  saved[key] = {
    ...(saved[key] ?? defaults),
    theme: settings.theme as ProfileTheme,
    accent: settings.accent as ProfileAccent,
    order: completeOrder(settings.order),
    featured: settings.featured as ProjectSlug[],
  }
  profileChanged.value++
}

/**
 * The order of the sections a profile shows: the one saved, then every
 * section it does not name, in the default order. A profile never ordered
 * has none saved (`[]`), and one saved before a section existed lacks it:
 * neither may show fewer sections than it has.
 */
export const completeOrder = (order: string[]): ProfileSection[] => {
  // The sections it names that exist, each once
  const named = [...new Set(order)].filter((key): key is ProfileSection =>
    defaults.order.includes(key as ProfileSection)
  )
  return [...named, ...defaults.order.filter((key) => !named.includes(key))]
}

export type ProfileDraft =
  & ProfileSettings
  & Pick<Person, 'headline' | 'bio' | 'website' | 'skills'>

/** POST/api/user/profile/update and POST/api/user/skills/update */
export const saveProfile = (login: Login, draft: ProfileDraft) => {
  const { headline, bio, website, skills, ...settings } = draft
  const person: Person = people[login]
  person.headline = headline.trim() || person.headline
  person.bio = bio.trim()
  person.website = website?.trim() || undefined
  if (skills.length) person.skills = skills
  saved[login] = settings
  profileChanged.value++
  // The appearance persists on the server (PAM-302); the cover photo has its
  // own route (POST/api/user/cover)
  saveMe({
    profile: {
      headline,
      bio,
      website: website ?? '',
      theme: settings.theme,
      accent: settings.accent,
      sectionOrder: settings.order,
      featured: settings.featured,
    },
    skills: { skills, domains: person.domains ?? [] },
  })
}
