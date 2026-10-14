import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry } from '/api/entries.ts'
import type { GithubUser } from '/api/github-oauth.ts'
import { Profile, User, UserIntent } from '/api/schema.ts'
import { addGithubSkills, setDeclaredSkills, skillsOf } from '/api/skills.ts'
import { type MatchingMode, parseLocation } from '/api/vocabulary.ts'

// A developer is identified by `githubId`, never by the username, which can
// change on GitHub (§14.1)
const getUserIdByGithubId = User.sql<'userId', number>`
  SELECT userId FROM user WHERE githubId = ?
`.get

const clean = (text: string | null | undefined) => text?.trim() || null

const create = db.transaction((github: GithubUser, source: string) => {
  const at = now()
  const userId = User.insert({
    githubId: github.id,
    githubUsername: github.login,
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
    // given null for, so a hidden email stays as it was
    User.update({
      userId,
      githubUsername: github.login,
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
    avatarUrl: string
    displayName: string
    headline: string | null
    bio: string | null
    country: string | null
    city: string | null
    website: string | null
    matchingMode: MatchingMode
  },
  number
>`
  SELECT user.userId, githubUsername, avatarUrl, displayName, headline, bio,
    country, city, website, matchingMode
  FROM user
  JOIN profile ON profile.userId = user.userId
  WHERE user.userId = ?
`.get

const listIntents = UserIntent.sql<'intent', number>`
  SELECT intent FROM userIntent WHERE userId = ? ORDER BY userIntentId
`.all

/** The signed in developer and their profile, prefilled from GitHub */
export const getCurrentUser = (userId: number) => {
  const user = getProfile(userId)
  if (!user) return
  return {
    userId,
    login: user.githubUsername,
    avatarUrl: user.avatarUrl,
    displayName: user.displayName,
    // An empty field is an empty string for the page
    headline: user.headline ?? '',
    bio: user.bio ?? '',
    country: user.country ?? '',
    city: user.city ?? '',
    website: user.website ?? '',
    matchingMode: user.matchingMode,
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
    updatedAt = :updatedAt
  WHERE userId = :userId
`.run

export type ProfileFields = {
  displayName: string
  headline: string
  bio: string
  country: string
  city: string
  website: string
  matchingMode: MatchingMode
}

export const updateProfile = (userId: number, fields: ProfileFields) => {
  const current = getProfile(userId)!
  writeProfile({
    userId,
    displayName: clean(fields.displayName) ?? current.displayName,
    headline: clean(fields.headline),
    bio: clean(fields.bio),
    country: clean(fields.country),
    city: clean(fields.city),
    website: clean(fields.website),
    matchingMode: fields.matchingMode,
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
