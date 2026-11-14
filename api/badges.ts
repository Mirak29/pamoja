import { sql } from '@01edu/db'
import { now } from '@01edu/time'
// The entry tables exist before the queries below are prepared
import { Entry } from '/api/entries.ts'
import { entries } from '/api/entry-types.ts'
import { createNotification } from '/api/notifications.ts'

// The badges (§8.2) and their anti-abuse rules (§8.4), computed from the
// eligible proofs only (§8.3): entry → evaluator → BadgeProgress → profile.
// Levels: 0 none, 1 Bronze, 2 Silver, 3 Gold, 4 Platinum. Gold and Platinum
// also ask for diversity: a badge cannot be earned with the same few people.

export type BadgeKey =
  | 'trusted_reviewer'
  | 'first_responder'
  | 'mentor'
  | 'open_source'
  | 'builder'
  | 'maintainer'
  | 'cross_border'
  | 'community_pillar'

// Thresholds of Bronze, Silver, Gold and Platinum: initial values (§8.2)
export const BADGES: Record<BadgeKey, number[]> = {
  trusted_reviewer: [3, 10, 20, 50],
  first_responder: [3, 10, 25, 50],
  mentor: [2, 5, 15, 30],
  open_source: [3, 10, 25, 50],
  builder: [1, 3, 5, 10],
  maintainer: [1, 3, 6, 12],
  cross_border: [2, 3, 5, 8],
  community_pillar: [5, 15, 40, 100],
}

// Diversity asked for Gold and Platinum (§8.4)
const GOLD = 0
const PLATINUM = 1
const DIVERSITY = {
  trustedReviewer: { requesters: [3, 6], projects: [2, 4] },
  requesters: [3, 6],
  openSourceProjects: [3, 5],
  builderContributors: [3, 5],
  maintainerContributors: [2, 4],
  crossBorderPeople: [2, 3],
  pillarAskers: [5, 10],
}

/**
 * What a badge counts at each level: the count, and what still counts for
 * Gold and Platinum once their diversity is asked
 */
type Measure = { count: number; gold: number; platinum: number }

const confirmed = `${entries.REVIEW_HELP_CONFIRMED}, ${entries.HELP_CONFIRMED}`

// Eligible proofs only: the anti-abuse rules decided it at the time (§8.3)
const eligible = `EXISTS (SELECT 1 FROM entryEligible
  WHERE entryEligible.entryId = entry.id AND eligible = 1)`

const getHelps = sql<
  { count: number; requesters: number; projects: number },
  { userId: number; types: string; categories: string }
>`
  SELECT count(*) AS count,
    count(DISTINCT requester.requesterId) AS requesters,
    count(DISTINCT entry.projectId) AS projects
  FROM entry
  JOIN entryRequesterId AS requester ON requester.entryId = entry.id
  LEFT JOIN entryHelpCategory AS category ON category.entryId = entry.id
  WHERE entry.userId = :userId
    AND entry.type IN (SELECT value FROM json_each(:types))
    AND (:categories = '[]' OR category.helpCategory IN
      (SELECT value FROM json_each(:categories)))
    AND ${eligible}
`.get

const getMerged = sql<{ count: number; projects: number }, number>`
  SELECT count(*) AS count, count(DISTINCT entry.projectId) AS projects
  FROM entry
  JOIN entryAuthorIsOwner AS owner ON owner.entryId = entry.id
  WHERE entry.userId = ? AND entry.type = ${entries.PR_MERGED}
    AND owner.authorIsOwner = 0 AND ${eligible}
`.get

// Projects of the developer with a release, and their contributors other
// than the owner: the authors of their merged PRs
const listBuilt = sql<{ projectId: number; contributors: number }, number>`
  SELECT project.projectId,
    (SELECT count(DISTINCT author.authorGithubId) FROM entry
      JOIN entryAuthorGithubId AS author ON author.entryId = entry.id
      JOIN entryAuthorIsOwner AS isOwner ON isOwner.entryId = entry.id
      WHERE entry.projectId = project.projectId
        AND entry.type = ${entries.PR_MERGED} AND isOwner.authorIsOwner = 0
    ) AS contributors
  FROM project
  WHERE project.ownerId = ?
    AND EXISTS (SELECT 1 FROM entry
      WHERE entry.projectId = project.projectId
        AND entry.type = ${entries.RELEASE_PUBLISHED} AND ${eligible})
`.all

// Activity of the projects the developer owns or maintains, by month, with
// who else was active (a Pamoja user, or a GitHub author)
const listActivity = sql<
  { month: string; actor: string | null },
  number
>`
  SELECT strftime('%Y-%m', entry.createdAt, 'unixepoch') AS month,
    coalesce(CAST(entry.userId AS TEXT), 'gh' || author.authorGithubId) AS actor
  FROM entry
  JOIN projectMember AS member ON member.projectId = entry.projectId
  LEFT JOIN entryAuthorGithubId AS author ON author.entryId = entry.id
  WHERE member.userId = ? AND member.role IN ('owner', 'maintainer')
    AND entry.type IN (${entries.PR_OPENED}, ${entries.PR_MERGED},
      ${entries.RELEASE_PUBLISHED}, ${entries.COMMITS_PUSHED},
      ${entries.ISSUE_UPDATED})
`.all

// The other side of each eligible confirmed help, with their country
const listCollaborators = sql<
  { other: number; country: string | null },
  { userId: number }
>`
  SELECT requester.requesterId AS other, profile.country FROM entry
  JOIN entryRequesterId AS requester ON requester.entryId = entry.id
  LEFT JOIN profile ON profile.userId = requester.requesterId
  WHERE entry.userId = :userId AND entry.type IN (${confirmed}) AND ${eligible}
  UNION
  SELECT entry.userId AS other, profile.country FROM entry
  JOIN entryRequesterId AS requester ON requester.entryId = entry.id
  LEFT JOIN profile ON profile.userId = entry.userId
  WHERE requester.requesterId = :userId AND entry.type IN (${confirmed})
    AND ${eligible}
`.all

const getCountry = sql<{ country: string | null }, number>`
  SELECT country FROM profile WHERE userId = ?
`.get

const getAnswers = sql<{ count: number; askers: number }, number>`
  SELECT count(*) AS count, count(DISTINCT asker.askerId) AS askers
  FROM entry
  JOIN entryAskerId AS asker ON asker.entryId = entry.id
  WHERE entry.userId = ? AND entry.type = ${entries.ANSWER_ACCEPTED}
    AND ${eligible}
`.get

const ifOk = (count: number, gold: boolean, platinum: boolean): Measure => ({
  count,
  gold: gold ? count : 0,
  platinum: platinum ? count : 0,
})

/** The longest run of consecutive months in a sorted list of YYYY-MM */
const longestRun = (months: string[]) => {
  let best = 0
  let run = 0
  let previous = ''
  for (const month of months) {
    const [y, m] = previous.split('-').map(Number)
    const next = previous &&
      (m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`)
    run = month === next ? run + 1 : 1
    best = Math.max(best, run)
    previous = month
  }
  return best
}

const measures: Record<BadgeKey, (userId: number) => Measure> = {
  trusted_reviewer: (userId) => {
    const h = getHelps({
      userId,
      types: JSON.stringify([entries.REVIEW_HELP_CONFIRMED]),
      categories: '[]',
    })!
    const d = DIVERSITY.trustedReviewer
    return ifOk(
      h.count,
      h.requesters >= d.requesters[GOLD] && h.projects >= d.projects[GOLD],
      h.requesters >= d.requesters[PLATINUM] &&
        h.projects >= d.projects[PLATINUM],
    )
  },
  first_responder: (userId) => {
    const h = getHelps({
      userId,
      types: JSON.stringify([
        entries.REVIEW_HELP_CONFIRMED,
        entries.HELP_CONFIRMED,
      ]),
      categories: '[]',
    })!
    return ifOk(
      h.count,
      h.requesters >= DIVERSITY.requesters[GOLD],
      h.requesters >= DIVERSITY.requesters[PLATINUM],
    )
  },
  mentor: (userId) => {
    const h = getHelps({
      userId,
      types: JSON.stringify([entries.HELP_CONFIRMED]),
      categories: JSON.stringify(['mentorship', 'pair_programming']),
    })!
    return ifOk(
      h.count,
      h.requesters >= DIVERSITY.requesters[GOLD],
      h.requesters >= DIVERSITY.requesters[PLATINUM],
    )
  },
  open_source: (userId) => {
    const m = getMerged(userId)!
    return ifOk(
      m.count,
      m.projects >= DIVERSITY.openSourceProjects[GOLD],
      m.projects >= DIVERSITY.openSourceProjects[PLATINUM],
    )
  },
  builder: (userId) => {
    // At least 2 contributors, the owner included: one other at least
    const built = listBuilt(userId).filter((p) => p.contributors >= 1)
    const d = DIVERSITY.builderContributors
    return {
      count: built.length,
      gold: built.filter((p) => p.contributors >= d[GOLD]).length,
      platinum: built.filter((p) => p.contributors >= d[PLATINUM]).length,
    }
  },
  maintainer: (userId) => {
    const others = new Map<string, Set<string>>()
    for (const { month, actor } of listActivity(userId)) {
      const set = others.get(month) ?? new Set<string>()
      actor && actor !== String(userId) && set.add(actor)
      others.set(month, set)
    }
    const months = [...others.keys()].sort()
    const d = DIVERSITY.maintainerContributors
    // A month counts for Gold when enough others were active in it
    const run = (min: number) =>
      longestRun(months.filter((m) => others.get(m)!.size >= min))
    return { count: run(0), gold: run(d[GOLD]), platinum: run(d[PLATINUM]) }
  },
  cross_border: (userId) => {
    const own = getCountry(userId)?.country
    const people = new Map<string, Set<number>>()
    for (const { other, country } of listCollaborators({ userId })) {
      if (!country || country === own) continue
      people.set(country, (people.get(country) ?? new Set()).add(other))
    }
    const d = DIVERSITY.crossBorderPeople
    const countries = (min: number) =>
      [...people.values()].filter((set) => set.size >= min).length
    return {
      count: countries(1),
      gold: countries(d[GOLD]),
      platinum: countries(d[PLATINUM]),
    }
  },
  community_pillar: (userId) => {
    const a = getAnswers(userId)!
    return ifOk(
      a.count,
      a.askers >= DIVERSITY.pillarAskers[GOLD],
      a.askers >= DIVERSITY.pillarAskers[PLATINUM],
    )
  },
}

/** The level reached: Gold and Platinum count only what passes diversity */
export const levelOf = (thresholds: number[], measure: Measure) => {
  const counted = [measure.count, measure.count, measure.gold, measure.platinum]
  let level = 0
  thresholds.forEach((threshold, i) => {
    if (counted[i] >= threshold && level === i) level = i + 1
  })
  return level
}

const listBadges = sql<
  { badge: string; level: number; count: number },
  number
>`
  SELECT badge, level, count FROM badgeProgress WHERE userId = ?
`.all

const writeProgress = sql<undefined, Record<string, string | number>>`
  INSERT INTO badgeProgress (userId, badge, level, count, updatedAt)
  VALUES (:userId, :badge, :level, :count, :at)
  ON CONFLICT (userId, badge) DO UPDATE SET
    level = excluded.level, count = excluded.count, updatedAt = excluded.updatedAt
`.run

/**
 * Computes the badges of a developer again after one of their proofs. A
 * new level is an entry BADGE_UNLOCKED and a notification; a lower one (a
 * proof withdrawn by moderation, §10.5) is only saved. Synchronous: it runs
 * inside the transaction of the proof.
 */
export const evaluateBadges = (userId: number, at = now()) => {
  const before = new Map(listBadges(userId).map((p) => [p.badge, p.level]))
  for (const badge of Object.keys(BADGES) as BadgeKey[]) {
    const measure = measures[badge](userId)
    const level = levelOf(BADGES[badge], measure)
    const previous = before.get(badge)
    if (previous === undefined && !measure.count) continue
    writeProgress({ userId, badge, level, count: measure.count, at })
    if (level <= (previous ?? 0)) continue
    Entry.insert.BADGE_UNLOCKED({
      userId,
      data: { badge, level },
      source: 'platform',
    })
    createNotification({
      userId,
      type: 'badge_unlocked',
      category: 'system',
      payload: { badge, level },
    })
  }
}

/** Every badge of a developer, with what the next level asks (§8.2) */
export const badgesOf = (userId: number) => {
  const saved = new Map(listBadges(userId).map((b) => [b.badge, b]))
  return (Object.keys(BADGES) as BadgeKey[]).map((badge) => {
    const level = saved.get(badge)?.level ?? 0
    return {
      badge,
      level,
      count: saved.get(badge)?.count ?? 0,
      next: BADGES[badge][level] ?? 0,
    }
  })
}

/** The owners and maintainers of a project: who manages it (§3) */
export const listKeepers = sql<{ userId: number }, number>`
  SELECT userId FROM projectMember
  WHERE projectId = ? AND role IN ('owner', 'maintainer')
`.all

/** After an event of a project: its owners and maintainers (Builder, Maintainer) */
export const evaluateProject = (projectId: number) => {
  for (const { userId } of listKeepers(projectId)) evaluateBadges(userId)
}
