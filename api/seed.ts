import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import { evaluateBadges } from '/api/badges.ts'
import { RULES_VERSION } from '/api/reputation.ts'
import { addProvenSkill, listSkillRows } from '/api/help-lifecycle.ts'
import {
  Community,
  CommunityMember,
  Follow,
  Milestone,
  Profile,
  Project,
  ProjectMember,
  ProjectNeed,
  User,
  UserIntent,
} from '/api/schema.ts'
import { setDeclaredSkills, skillIdsOf } from '/api/skills.ts'
import { countryCodeOf, helpCategories, keyOf } from '/api/vocabulary.ts'
import { communities } from '/web/fixtures/communities.ts'
import { people, type Person } from '/web/fixtures/people.ts'
import {
  type Project as ProjectFixture,
  type ProjectRole,
  projects,
  type ProjectSlug,
} from '/web/fixtures/projects.ts'

// The demo data (§14, §18.1): the developers, communities and projects of
// the web fixtures, so the screens show the same world once they read the
// API. Every root row and every entry is `source = demo`. Reputation proofs
// and the final story of the demo come with PAM-901.

const source = 'demo'

// Fixture dates are milliseconds relative to now; the database keeps seconds
const seconds = (ms: number) => ms / 1000

const roles: Record<ProjectRole, string> = {
  Propriétaire: 'owner',
  Mainteneur: 'maintainer',
  Contributeur: 'contributor',
  Reviewer: 'reviewer',
  Observateur: 'observer',
}

const communityTypes = {
  Technologie: 'technology',
  Pays: 'country',
  Domaine: 'domain',
} as const

const stages = {
  Idée: 'idea',
  Prototype: 'prototype',
  Bêta: 'beta',
  Production: 'production',
} as const

const milestoneStates = {
  done: 'done',
  active: 'active',
  planned: 'planned',
} as const

// The library dates an entry when it is inserted: the seed tells its story
// in the past
const backdate = sql<undefined, { id: number; at: number }>`
  UPDATE entryInternal SET createdAt = :at WHERE id = :id
`.run

// The skill rows a proof freezes, the technology first when a name is
// also a domain, as production resolves them (§8.3)
const skillRowsOf = (names: string[]) =>
  listSkillRows(JSON.stringify(skillIdsOf(names)))

// owner/name of the GitHub repo of a project fixture
const repoFullNameOf = (project: ProjectFixture) =>
  `${project.repoOwner ?? project.owner}/${project.repo ?? project.slug}`

// Moussa's confirmed reviews for the demo (§18.1): source = demo, across four
// requesters and two projects, so Trusted Reviewer is Silver (10 to 19
// reviews) and has Gold's diversity (3 requesters, 2 projects) already; the
// real review of the demo makes it 15 / 20 toward Gold (§8.2, §8.4, §18.2).
// The dates are spread so no requester–helper pair breaks the anti-abuse cap
// of two confirmations per 30 days (§8.4).
type SeedReview = {
  requester: string
  project: string
  pr: number
  skills: string[]
  state: 'approved' | 'changes_requested' | 'commented'
  daysAgo: number
}

const MOUSSA_REVIEWS: SeedReview[] = [
  {
    requester: 'abdou',
    project: 'openpay-africa',
    pr: 42,
    skills: ['Go', 'SQLite'],
    state: 'approved',
    daysAgo: 212,
  },
  {
    requester: 'fatou',
    project: 'openpay-africa',
    pr: 51,
    skills: ['Go', 'Backend'],
    state: 'changes_requested',
    daysAgo: 196,
  },
  {
    requester: 'abdou',
    project: 'openpay-africa',
    pr: 58,
    skills: ['Go', 'SQLite', 'Backend'],
    state: 'approved',
    daysAgo: 160,
  },
  {
    requester: 'fatou',
    project: 'openpay-africa',
    pr: 63,
    skills: ['SQLite', 'Backend'],
    state: 'approved',
    daysAgo: 124,
  },
  {
    requester: 'abdou',
    project: 'openpay-africa',
    pr: 71,
    skills: ['Go', 'PostgreSQL'],
    state: 'approved',
    daysAgo: 108,
  },
  {
    requester: 'fatou',
    project: 'openpay-africa',
    pr: 77,
    skills: ['Go', 'SQLite'],
    state: 'commented',
    daysAgo: 52,
  },
  {
    requester: 'abdou',
    project: 'openpay-africa',
    pr: 84,
    skills: ['Go', 'Backend'],
    state: 'approved',
    daysAgo: 40,
  },
  {
    requester: 'kofi',
    project: 'africommerce',
    pr: 12,
    skills: ['Go', 'Backend'],
    state: 'approved',
    daysAgo: 230,
  },
  {
    requester: 'amina',
    project: 'africommerce',
    pr: 18,
    skills: ['Go', 'SQLite'],
    state: 'approved',
    daysAgo: 204,
  },
  {
    requester: 'kofi',
    project: 'africommerce',
    pr: 23,
    skills: ['Go'],
    state: 'changes_requested',
    daysAgo: 168,
  },
  {
    requester: 'amina',
    project: 'africommerce',
    pr: 29,
    skills: ['Go', 'Backend'],
    state: 'approved',
    daysAgo: 132,
  },
  {
    requester: 'kofi',
    project: 'africommerce',
    pr: 35,
    skills: ['Go', 'SQLite', 'Backend'],
    state: 'approved',
    daysAgo: 100,
  },
  {
    requester: 'amina',
    project: 'africommerce',
    pr: 41,
    skills: ['SQLite', 'Backend'],
    state: 'approved',
    daysAgo: 62,
  },
  {
    requester: 'kofi',
    project: 'africommerce',
    pr: 48,
    skills: ['Go', 'TypeScript'],
    state: 'approved',
    daysAgo: 30,
  },
]

/**
 * Reads `abdou:84472218,moussa:…`: a demo developer that is a real GitHub
 * account in the demo (§18.1). Logging in with that account then opens the
 * seeded profile, found by `githubId` (§5.3).
 */
export const parseGithubIds = (text = '') =>
  new Map(
    text.split(',').map((pair) => pair.split(':').map((part) => part.trim()))
      .filter(([login, id]) => login && Number(id) > 0)
      .map(([login, id]) => [login, Number(id)]),
  )

export const seed = (githubIds = new Map<string, number>()) => {
  const at = now()
  const userIds = new Map<string, number>()
  const communityIds = new Map<string, number>()
  const projectIdBySlug = new Map<string, number>()
  const list = Object.values(people) as Person[]

  db.transaction(() => {
    /*
     * Developers. Without a real account, a negative githubId: GitHub ids are
     * positive, so a demo developer never takes the place of a real one.
     */
    list.forEach((person, i) => {
      const userId = User.insert({
        githubId: githubIds.get(person.login) ?? -(i + 1),
        githubUsername: person.login,
        // No photo: the initials until the developer logs in (§17.3)
        avatarUrl: '',
        source,
        createdAt: at,
        updatedAt: at,
      })
      userIds.set(person.login, userId)
      Profile.insert({
        userId,
        displayName: person.name,
        headline: person.headline || null,
        bio: person.bio || null,
        country: countryCodeOf(person.country) ?? (person.country || null),
        city: person.city || null,
        website: person.website ?? null,
        theme: 'minimal',
        accent: 'indigo',
        availability: person.available ? 'available' : 'busy',
        matchingMode: 'instant',
        // The types of help they accept, for the matching (§7.3)
        matchingFilters: {
          helpTypes: person.helpTypes
            .map((label) => keyOf(helpCategories, label))
            .filter(Boolean),
        },
        createdAt: at,
        updatedAt: at,
      })
      setDeclaredSkills(userId, {
        skills: person.skills,
        domains: person.domains ?? [],
      })
      for (const intent of new Set(person.intents)) {
        UserIntent.insert({ userId, intent })
      }
    })

    /*
     * Communities and their members; the moderators are members too
     */
    for (const community of communities) {
      const communityId = Community.insert({
        slug: community.slug,
        name: community.name,
        type: communityTypes[community.type],
        description: community.description,
        countryCode: community.country
          ? countryCodeOf(community.country) ?? null
          : null,
        source,
        createdAt: at,
      })
      communityIds.set(community.slug, communityId)
      const moderators = new Set<string>([
        ...community.moderators ?? [],
        ...community.owner ? [community.owner] : [],
      ])
      const members = new Set<string>([
        ...moderators,
        ...list.filter((p) => p.communities.includes(community.slug))
          .map((p) => p.login),
      ])
      for (const login of members) {
        const userId = userIds.get(login)
        if (!userId) continue
        CommunityMember.insert({
          communityId,
          userId,
          role: moderators.has(login) ? 'moderator' : 'member',
          joinedAt: at,
        })
      }
    }

    /*
     * Projects: members and roles, needs, milestones, followers
     */
    for (const project of Object.values(projects) as ProjectFixture[]) {
      const ownerId = userIds.get(project.owner)!
      const createdAt = seconds(Math.min(
        project.releasedAt,
        ...project.events.map((event) => event.at),
        ...(project.journal ?? []).map((event) => event.at),
      ))
      const projectId = Project.insert({
        ownerId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        vision: project.vision ?? null,
        visibility: 'public',
        status: stages[project.stage],
        source,
        createdAt,
        updatedAt: at,
        // Its stack: what « Sur quoi puis-je travailler ? » matches (§10.3)
        skills: skillIdsOf(project.stack),
      })
      projectIdBySlug.set(project.slug, projectId)
      backdate({
        id: Entry.insert.PROJECT_CREATED({
          userId: ownerId,
          projectId,
          source,
        }),
        at: createdAt,
      })
      for (const { login, role } of project.members) {
        const userId = userIds.get(login)
        if (!userId) continue
        ProjectMember.insert({
          projectId,
          userId,
          role: roles[role],
          joinedAt: createdAt,
        })
        if (userId === ownerId) continue
        backdate({
          id: Entry.insert.PROJECT_MEMBER_JOINED({
            userId,
            projectId,
            source,
          }),
          at: createdAt,
        })
      }
      for (const title of project.needs) {
        ProjectNeed.insert({
          projectId,
          type: 'contribution',
          title,
          skills: [],
          status: 'open',
          createdAt,
          updatedAt: at,
        })
      }
      project.milestones.forEach((milestone, position) =>
        Milestone.insert({
          projectId,
          title: milestone.title,
          description: milestone.description,
          status: milestoneStates[milestone.state],
          position,
          createdAt,
        })
      )
      for (const login of project.followers) {
        const followerId = userIds.get(login)
        followerId && Follow.insert({
          followerId,
          targetType: 'project',
          targetId: projectId,
          createdAt: at,
        })
      }
    }

    /*
     * Developers followed
     */
    for (const person of list) {
      for (const login of person.follows ?? []) {
        const followerId = userIds.get(person.login)!
        const targetId = userIds.get(login)
        targetId && Follow.insert({
          followerId,
          targetType: 'user',
          targetId,
          createdAt: at,
        })
      }
    }

    /*
     * Reputation: Moussa's confirmed reviews (§8, §18.1). Each one freezes
     * what the decision used (§8.3) and is backdated so the badge grew over
     * time. No pull request or help request row is seeded: the proof links to
     * GitHub through its frozen url.
     */
    const moussaId = userIds.get('moussa')
    if (moussaId) {
      // Oldest first: a skill proven again keeps the date of its first proof
      const oldestFirst = [...MOUSSA_REVIEWS].sort((a, b) =>
        b.daysAgo - a.daysAgo
      )
      oldestFirst.forEach((review, i) => {
        const requesterId = userIds.get(review.requester)
        const projectId = projectIdBySlug.get(review.project)
        const project = projects[review.project as ProjectSlug] as
          | ProjectFixture
          | undefined
        if (!requesterId || !projectId || !project) return
        const repository = repoFullNameOf(project)
        const createdAt = at - review.daysAgo * 24 * 60 * 60
        const skills = skillRowsOf(review.skills)
        backdate({
          id: Entry.insert.REVIEW_HELP_CONFIRMED({
            userId: moussaId,
            projectId,
            helpRequestId: maybe(null),
            pullRequestId: maybe(null),
            requesterId,
            skills,
            helpCategory: 'code_review',
            eligible: 1,
            exclusionReason: '',
            rulesVersion: RULES_VERSION,
            repository,
            prNumber: review.pr,
            url: `https://github.com/${repository}/pull/${review.pr}`,
            githubReviewId: 910000 + i,
            reviewState: review.state,
            source,
          }),
          at: createdAt,
        })
        // The skills it proved, as the confirmation writes them
        for (const { skillId } of skills) {
          addProvenSkill({ userId: moussaId, skillId, at: createdAt })
        }
      })
      // Fill the badge progress from these proofs, without announcing an
      // unlock dated now (§8.2)
      evaluateBadges(moussaId, at, false)
    }
  })()

  return {
    developers: userIds.size,
    communities: communityIds.size,
    projects: Object.keys(projects).length,
    reviews: userIds.has('moussa') ? MOUSSA_REVIEWS.length : 0,
  }
}
