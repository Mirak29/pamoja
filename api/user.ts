import { db, sql } from '@01edu/db'
import { DEFAULT_MIN_SCORE } from '/api/help-rules.ts'
import { now } from '@01edu/time'
import { Entry } from '/api/entries.ts'
import type { GithubUser } from '/api/github-oauth.ts'
import { Profile, User, UserIntent } from '/api/schema.ts'
import { addGithubSkills, setDeclaredSkills, skillsOf } from '/api/skills.ts'
import { type MatchingMode, parseLocation } from '/api/vocabulary.ts'
import { coverOf } from '/api/media.ts'

// A developer is identified by `githubId`, never by the username, which can
// change on GitHub (§14.1)
const getUserIdByGithubId = sql<{ userId: number; source: string }, number>`
  SELECT userId, source FROM user WHERE githubId = ?
`.get

// A login names one account (QA-26): a GitHub account that takes a login
// another one held (renamed or freed on GitHub) leaves it `login~githubId`,
// until that one logs in again with its new login
const releaseLogin = sql<undefined, { login: string; githubId: number }>`
  UPDATE user SET githubUsername = githubUsername || '~' || abs(githubId)
  WHERE githubUsername = :login COLLATE NOCASE AND githubId != :githubId
`.run

const clean = (text: string | null | undefined) => text?.trim() || null

const create = db.transaction((github: GithubUser, source: string) => {
  const at = now()
  releaseLogin({ login: github.login, githubId: github.id })
  const userId = User.insert({
    githubId: github.id,
    githubUsername: github.login,
    githubLogin: github.login,
    avatarUrl: github.avatar_url,
    email: github.email,
    source,
    createdAt: at,
    updatedAt: at,
  })
  // Prefilled with what GitHub knows, completed by the onboarding (§6.1)
  const { city, country } = parseLocation(github.location)
  Profile.insert({
    userId,
    displayName: clean(github.name) ?? github.login,
    bio: clean(github.bio),
    website: clean(github.blog),
    city,
    country,
    theme: 'minimal',
    accent: 'indigo',
    availability: 'available',
    matchingMode: 'instant',
    createdAt: at,
    updatedAt: at,
  })
  return userId
})

// A later login fills what is still empty, until the developer saves the
// profile once: after that, an emptied field stays empty
const fillProfile = sql<undefined, Record<string, string | number | null>>`
  UPDATE profile SET
    bio = coalesce(bio, :bio),
    website = coalesce(website, :website),
    city = coalesce(city, :city),
    country = coalesce(country, :country)
  WHERE userId = :userId AND updatedAt = createdAt
`.run

/** Finds the developer of this GitHub account, or creates it (§5.3) */
export const findOrCreateGithubUser = (
  github: GithubUser,
  source: 'github' | 'demo',
) => {
  const existing = getUserIdByGithubId(github.id)
  const userId = existing?.userId ?? create(github, source)
  if (existing) {
    // Login and avatar can change on GitHub; `update` keeps a column it is
    // given null for, so a hidden email stays as it was. A demo account
    // reached by a real one (SEED_GITHUB_IDS) keeps its demo login, so the
    // story of the demo stays on it (§14, QA-27)
    const keepsLogin = existing.source === 'demo'
    keepsLogin || releaseLogin({ login: github.login, githubId: github.id })
    User.update({
      userId,
      githubUsername: keepsLogin ? undefined : github.login,
      githubLogin: github.login,
      avatarUrl: github.avatar_url,
      email: github.email,
      updatedAt: now(),
    })
    fillProfile({
      userId,
      bio: clean(github.bio),
      website: clean(github.blog),
      ...parseLocation(github.location),
    })
  }
  addGithubSkills(userId, github.languages)
  return { userId, created: !existing }
}

const getProfile = sql<
  {
    userId: number
    githubUsername: string
    githubLogin: string | null
    avatarUrl: string
    displayName: string
    headline: string | null
    bio: string | null
    country: string | null
    city: string | null
    website: string | null
    matchingMode: MatchingMode
    matchingFilters: string | null
    theme: string
    accent: string
    sectionOrder: string | null
    featured: string | null
  },
  number
>`
  SELECT user.userId, githubUsername, githubLogin, avatarUrl, displayName, headline, bio,
    country, city, website, matchingMode, matchingFilters,
    theme, accent, sectionOrder, featured
  FROM user
  JOIN profile ON profile.userId = user.userId
  WHERE user.userId = ?
`.get

const listIntents = UserIntent.sql<'intent', number>`
  SELECT intent FROM userIntent WHERE userId = ? ORDER BY userIntentId
`.all

/**
 * The filters of the matching a developer chose, with their defaults. The
 * last three keep only the requests on one of these skills, projects or
 * communities; empty, everything passes (§7.4)
 */
export const matchingFiltersOf = (stored: string | null) => {
  const filters = stored
    ? JSON.parse(stored) as {
      minScore?: number
      helpTypes?: string[]
      skills?: string[]
      projects?: string[]
      communities?: string[]
    }
    : {}
  return {
    minScore: filters.minScore ?? DEFAULT_MIN_SCORE,
    helpTypes: filters.helpTypes ?? [],
    onlySkills: filters.skills ?? [],
    onlyProjects: filters.projects ?? [],
    onlyCommunities: filters.communities ?? [],
  }
}

const writeMatching = sql<
  undefined,
  { userId: number; matchingMode: string; filters: string; at: number }
>`
  UPDATE profile SET matchingMode = :matchingMode, matchingFilters = :filters,
    updatedAt = :at
  WHERE userId = :userId
`.run

export type MatchingInput = {
  matchingMode: MatchingMode
  minScore: number
  helpTypes: string[]
  onlySkills?: string[] | null
  onlyProjects?: string[] | null
  onlyCommunities?: string[] | null
}

/**
 * How help requests reach the developer: mode, minimum score, types, and
 * the skills, projects and communities they keep (§7.4)
 */
export const updateMatching = (userId: number, input: MatchingInput) =>
  writeMatching({
    userId,
    matchingMode: input.matchingMode,
    filters: JSON.stringify({
      minScore: Math.min(100, Math.max(0, Math.round(input.minScore))),
      helpTypes: [...new Set(input.helpTypes)],
      skills: [...new Set(input.onlySkills ?? [])],
      projects: [...new Set(input.onlyProjects ?? [])],
      communities: [...new Set(input.onlyCommunities ?? [])],
    }),
    at: now(),
  })

/** The signed in developer and their profile, prefilled from GitHub */
export const getCurrentUser = (userId: number) => {
  const user = getProfile(userId)
  if (!user) return
  return {
    userId,
    login: user.githubUsername,
    // The account on GitHub: a demo account keeps its demo login (§14)
    githubLogin: user.githubLogin ?? user.githubUsername,
    avatarUrl: user.avatarUrl,
    displayName: user.displayName,
    // An empty field is an empty string for the page
    headline: user.headline ?? '',
    bio: user.bio ?? '',
    country: user.country ?? '',
    city: user.city ?? '',
    website: user.website ?? '',
    cover: coverOf(userId),
    // Personalization of the profile (§9.2)
    theme: user.theme,
    accent: user.accent,
    sectionOrder: jsonStrings(user.sectionOrder),
    featured: jsonStrings(user.featured),
    matchingMode: user.matchingMode,
    // What the matching reads besides the mode (§7.3, §7.4)
    ...matchingFiltersOf(user.matchingFilters),
    ...skillsOf(userId),
    intents: listIntents(userId).map((row) => row.intent),
  }
}

// `Profile.update` keeps a column given null: here an emptied field is
// emptied (§12.5)
const writeProfile = sql<undefined, Record<string, string | number | null>>`
  UPDATE profile SET
    displayName = :displayName,
    headline = :headline,
    bio = :bio,
    country = :country,
    city = :city,
    website = :website,
    matchingMode = :matchingMode,
    theme = :theme,
    accent = :accent,
    sectionOrder = :sectionOrder,
    featured = :featured,
    updatedAt = :updatedAt
  WHERE userId = :userId
`.run

// Personalization (§9.2): the ids of docs/identite/tokens.json. An unknown
// value is ignored and the current one kept.
export const PROFILE_THEMES = [
  'minimal',
  'terminal',
  'cyber',
  'clair',
  'sombre',
]
export const PROFILE_ACCENTS = ['indigo', 'vert', 'ambre', 'corail']
export const PROFILE_SECTIONS = [
  'building',
  'contributions',
  'reputation',
  'badges',
  'activity',
  'communities',
  'map',
  'graph',
]

// A JSON array of strings stored in a profile column, or an empty list
const jsonStrings = (stored: string | null): string[] => {
  try {
    const value = JSON.parse(stored ?? '[]')
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

export type ProfileFields = {
  displayName: string
  headline: string
  bio: string
  country: string
  city: string
  website: string
  matchingMode: MatchingMode
  theme?: string | null
  accent?: string | null
  sectionOrder?: string[] | null
  featured?: string[] | null
}

export const updateProfile = (userId: number, fields: ProfileFields) => {
  const current = getProfile(userId)!
  const theme = PROFILE_THEMES.includes(fields.theme ?? '')
    ? fields.theme!
    : current.theme
  const accent = PROFILE_ACCENTS.includes(fields.accent ?? '')
    ? fields.accent!
    : current.accent
  const sectionOrder = fields.sectionOrder
    ? JSON.stringify(
      fields.sectionOrder.filter((key) => PROFILE_SECTIONS.includes(key)),
    )
    : current.sectionOrder
  const featured = fields.featured
    ? JSON.stringify([...new Set(fields.featured)])
    : current.featured
  writeProfile({
    userId,
    displayName: clean(fields.displayName) ?? current.displayName,
    headline: clean(fields.headline),
    bio: clean(fields.bio),
    country: clean(fields.country),
    city: clean(fields.city),
    website: clean(fields.website),
    matchingMode: fields.matchingMode,
    theme,
    accent,
    sectionOrder,
    featured,
    updatedAt: now(),
  })
  Entry.insert.PROFILE_UPDATED({ userId, source: 'platform' })
}

export const updateSkills = (
  userId: number,
  names: { skills: string[]; domains: string[] },
) => {
  setDeclaredSkills(userId, names)
  Entry.insert.PROFILE_UPDATED({ userId, source: 'platform' })
}

const deleteIntents = sql<undefined, number>`
  DELETE FROM userIntent WHERE userId = ?
`.run

export const updateIntents = db.transaction(
  (userId: number, intents: string[]) => {
    deleteIntents(userId)
    for (const intent of new Set(intents)) UserIntent.insert({ userId, intent })
    Entry.insert.PROFILE_UPDATED({ userId, source: 'platform' })
  },
)

const getUsername = sql<{ login: string }, number>`
  SELECT coalesce(githubLogin, githubUsername) AS login FROM user
  WHERE userId = ?
`.get

/**
 * The login on GitHub of a developer, for the reads of their repos: a demo
 * account reached by a real one reads the repos of the real one (§14)
 */
export const getLogin = (userId: number) => getUsername(userId)!.login

const getUserIdByLogin = sql<{ userId: number }, string>`
  SELECT userId FROM user WHERE githubUsername = ? COLLATE NOCASE
`.get

/** The developer of a login, undefined if not on Pamoja */
export const userIdOfLogin = (login: string) => getUserIdByLogin(login)?.userId

/** The developer of a GitHub account, undefined if not on Pamoja */
export const userIdOfGithubId = (githubId: number) =>
  getUserIdByGithubId(githubId)?.userId
