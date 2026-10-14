import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import type { GithubUser } from '/api/github-oauth.ts'
import { Profile, User } from '/api/schema.ts'

// A developer is identified by `githubId`, never by the username, which can
// change on GitHub (§14.1)
const getUserIdByGithubId = User.sql<'userId', number>`
  SELECT userId FROM user WHERE githubId = ?
`.get

const getMe = sql<
  {
    userId: number
    githubUsername: string
    avatarUrl: string
    displayName: string
  },
  number
>`
  SELECT user.userId, githubUsername, avatarUrl, displayName
  FROM user
  JOIN profile ON profile.userId = user.userId
  WHERE user.userId = ?
`.get

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
  // The onboarding completes the profile (§6.1)
  Profile.insert({
    userId,
    displayName: github.name?.trim() || github.login,
    bio: github.bio?.trim() || null,
    website: github.blog?.trim() || null,
    theme: 'minimal',
    accent: 'indigo',
    availability: 'available',
    matchingMode: 'instant',
    createdAt: at,
    updatedAt: at,
  })
  return userId
})

/** Finds the developer of this GitHub account, or creates it (§5.3) */
export const findOrCreateGithubUser = (
  github: GithubUser,
  source: 'github' | 'demo',
) => {
  const existing = getUserIdByGithubId(github.id)
  if (!existing) return { userId: create(github, source), created: true }
  // Login and avatar can change on GitHub; `update` keeps a column it is
  // given null for, so a hidden email stays as it was
  User.update({
    userId: existing.userId,
    githubUsername: github.login,
    avatarUrl: github.avatar_url,
    email: github.email,
    updatedAt: now(),
  })
  return { userId: existing.userId, created: false }
}

export const getCurrentUser = (userId: number) => {
  const user = getMe(userId)
  return user && {
    userId: user.userId,
    login: user.githubUsername,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}
