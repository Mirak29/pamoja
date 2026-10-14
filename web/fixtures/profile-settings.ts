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
] as const

export const profileSections = [
  ['building', 'En train de construire'],
  ['contributions', 'Contributions réelles'],
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
  // Theme, accent, cover and order stay in the page until PAM-302
  saveMe({
    profile: { headline, bio, website: website ?? '' },
    skills: { skills, domains: person.domains ?? [] },
  })
}
