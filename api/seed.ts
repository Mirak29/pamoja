import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry } from '/api/entries.ts'
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
  })()

  return {
    developers: userIds.size,
    communities: communityIds.size,
    projects: Object.keys(projects).length,
  }
}
