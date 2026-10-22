import { sql } from '@01edu/db'
import { listHelpActivity } from '/api/help.ts'
import { skillNamesOf, skillsOf } from '/api/skills.ts'

// The profile of a developer as anyone sees it at /@login (§9.1): public,
// like the passport. Never the email, the matching settings or anything
// only the developer sees.

type ProfileRow = {
  userId: number
  login: string
  avatarUrl: string
  displayName: string
  headline: string | null
  bio: string | null
  country: string | null
  city: string | null
  website: string | null
  availability: string
  matchingFilters: string | null
}

const getProfile = sql<ProfileRow, string>`
  SELECT user.userId, githubUsername AS login, avatarUrl, displayName,
    headline, bio, country, city, website, availability, matchingFilters
  FROM user
  JOIN profile ON profile.userId = user.userId
  WHERE githubUsername = ? COLLATE NOCASE
`.get

const listIntents = sql<{ intent: string }, number>`
  SELECT intent FROM userIntent WHERE userId = ? ORDER BY userIntentId
`.all

const listCommunities = sql<{ slug: string }, number>`
  SELECT community.slug FROM communityMember
  JOIN community ON community.communityId = communityMember.communityId
  WHERE communityMember.userId = ?
  ORDER BY communityMember.joinedAt
`.all

// Public projects only: an unlisted one is reached by its link, not from a
// profile
const listProjects = sql<
  {
    slug: string
    name: string
    description: string
    status: string
    skills: string | null
    role: string
    owner: string
  },
  number
>`
  SELECT project.slug, project.name, project.description, project.status,
    project.skills, projectMember.role, owner.githubUsername AS owner
  FROM projectMember
  JOIN project ON project.projectId = projectMember.projectId
  JOIN user AS owner ON owner.userId = project.ownerId
  WHERE projectMember.userId = ? AND project.visibility = 'public'
    AND projectMember.role != 'observer'
  ORDER BY project.createdAt DESC
`.all

const helpTypesOf = (filters: string | null) => {
  try {
    return (JSON.parse(filters ?? '{}') as { helpTypes?: string[] })
      .helpTypes ?? []
  } catch {
    return []
  }
}

/**
 * The public profile of a login; its help activity only for a signed-in
 * visitor, who may open those requests (§7.2)
 */
export const getPublicProfile = (login: string, signedIn: boolean) => {
  const row = getProfile(login)
  if (!row) return
  const { skills, domains } = skillsOf(row.userId)
  return {
    login: row.login,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    headline: row.headline ?? '',
    bio: row.bio ?? '',
    country: row.country ?? '',
    city: row.city ?? '',
    website: row.website ?? '',
    available: row.availability === 'available',
    helpTypes: helpTypesOf(row.matchingFilters),
    skills,
    domains,
    intents: listIntents(row.userId).map((r) => r.intent),
    communities: listCommunities(row.userId).map((r) => r.slug),
    projects: listProjects(row.userId).map((project) => ({
      slug: project.slug,
      name: project.name,
      description: project.description,
      status: project.status,
      stack: skillNamesOf(JSON.parse(project.skills ?? '[]') as number[]),
      role: project.role,
      owner: project.owner,
    })),
    activity: signedIn ? listHelpActivity(row.userId) : [],
  }
}
