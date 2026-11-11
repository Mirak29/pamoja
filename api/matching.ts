import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry } from '/api/entries.ts'
import { entries } from '/api/entry-types.ts'
import { DAILY_MATCHES, NEWCOMER_BELOW, WAVE_SIZE } from '/api/help-rules.ts'
import { createNotification } from '/api/notifications.ts'
import { skillNamesOf } from '/api/skills.ts'
import { matchingFiltersOf } from '/api/user.ts'

// The matching (§7.3): deterministic, read in SQL, explainable. Each
// developer gets a score out of 100 and the reasons behind it, shown in
// « Pourquoi ce match ? ». The 10 points of semantic proximity wait for the
// embeddings (PAM-311).

const DAY = 24 * 3600
const ACTIVE_WITHIN = 14 * DAY

// What backs a skill, in percent: proven on Pamoja, read from GitHub, or
// declared. Whole numbers: no rounding error in the sum
export const sourceWeight: Record<string, number> = {
  platform_activity: 100,
  github: 85,
  declared: 70,
}

// The intents that say a developer accepts a type of help (§6.1)
const intentsOf = (category: string) =>
  category === 'code_review'
    ? ['Faire des reviews', 'Aider des développeurs']
    : category === 'mentorship'
    ? ['Mentorer', 'Aider des développeurs']
    : ['Aider des développeurs']

export type Reason =
  | { kind: 'skills'; points: number; skills: string[]; of: number }
  | { kind: 'type'; points: number; category: string }
  | { kind: 'confirmed'; points: number; count: number; review: boolean }
  | {
    kind: 'availability'
    points: number
    available: boolean
    active: boolean
  }
  | { kind: 'affinity'; points: number; community: string }
  | { kind: 'affinity'; points: number; follows: true }
  | { kind: 'newcomer'; points: 0 }

export type Candidate = {
  userId: number
  login: string
  score: number
  reasons: Reason[]
  newcomer: boolean
  instant: boolean
}

export type Need = {
  authorId: number
  category: string
  skills: number[]
  projectId: number | null
}

/*
 * What the matching reads, for a list of developers given as JSON
 */

const listSkillHolders = sql<
  { userId: number; skillId: number; source: string },
  string
>`
  SELECT userId, skillId, source FROM userSkill
  WHERE skillId IN (SELECT value FROM json_each(?))
`.all

type ProfileRow = {
  userId: number
  login: string
  availability: string
  matchingMode: string
  matchingFilters: string | null
}

const listProfiles = sql<ProfileRow, string>`
  SELECT profile.userId, githubUsername AS login, availability, matchingMode,
    matchingFilters
  FROM profile JOIN user ON user.userId = profile.userId
  WHERE profile.userId IN (SELECT value FROM json_each(?))
`.all

const listIntents = sql<{ userId: number; intent: string }, string>`
  SELECT userId, intent FROM userIntent
  WHERE userId IN (SELECT value FROM json_each(?))
`.all

// Confirmed helps, all of them and those on one of the skills asked
const listConfirmed = sql<
  { userId: number; total: number; onSkills: number; reviews: number },
  { users: string; skills: string }
>`
  SELECT entry.userId, count(*) AS total,
    count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM entrySkills, json_each(entrySkills.skills) AS s
      WHERE entrySkills.entryId = entry.id
        AND json_extract(s.value, '$.skillId') IN
          (SELECT value FROM json_each(:skills))
    )) AS onSkills,
    count(*) FILTER (WHERE entry.type = ${entries.REVIEW_HELP_CONFIRMED})
      AS reviews
  FROM entry
  WHERE entry.type IN (${entries.REVIEW_HELP_CONFIRMED}, ${entries.HELP_CONFIRMED})
    AND entry.userId IN (SELECT value FROM json_each(:users))
    -- A proof the anti-abuse rules set aside does not count (§8.4)
    AND EXISTS (
      SELECT 1 FROM entryEligible
      WHERE entryEligible.entryId = entry.id AND eligible = 1
    )
  GROUP BY entry.userId
`.all

const listActive = sql<{ userId: number }, { users: string; since: number }>`
  SELECT DISTINCT userId FROM entry
  WHERE userId IN (SELECT value FROM json_each(:users))
    AND createdAt >= :since
`.all

const listSharedCommunities = sql<
  { userId: number; name: string },
  { users: string; authorId: number }
>`
  SELECT member.userId, community.name FROM communityMember AS member
  JOIN communityMember AS author ON author.communityId = member.communityId
    AND author.userId = :authorId
  JOIN community ON community.communityId = member.communityId
  WHERE member.userId IN (SELECT value FROM json_each(:users))
`.all

const listFollowers = sql<
  { userId: number },
  { users: string; projectId: number }
>`
  SELECT followerId AS userId FROM follow
  WHERE targetType = 'project' AND targetId = :projectId
    AND followerId IN (SELECT value FROM json_each(:users))
`.all

const getProjectSlug = sql<{ slug: string }, number>`
  SELECT slug FROM project WHERE projectId = ?
`.get

const listAuthorCommunities = sql<{ slug: string }, number>`
  SELECT community.slug FROM communityMember
  JOIN community ON community.communityId = communityMember.communityId
  WHERE communityMember.userId = ?
`.all

// What the filters of a developer compare with: the skills asked, the
// project and the communities of the author
type Asked = { skills: string[]; project?: string; communities: string[] }

// A developer keeps only the requests on one of the skills, projects and
// communities they chose; an empty filter keeps everything (§7.4)
const kept = (
  filters: ReturnType<typeof matchingFiltersOf>,
  asked: Asked,
) =>
  (!filters.onlySkills.length ||
    asked.skills.some((skill) => filters.onlySkills.includes(skill))) &&
  (!filters.onlyProjects.length ||
    (!!asked.project && filters.onlyProjects.includes(asked.project))) &&
  (!filters.onlyCommunities.length ||
    asked.communities.some((slug) => filters.onlyCommunities.includes(slug)))

const json = <T>(value: string | null, fallback: T): T =>
  value ? JSON.parse(value) as T : fallback

/**
 * Every developer who has at least one of the skills asked, best first, with
 * the reasons of their score. Excluded: the requester, a matching set to Off,
 * a request outside the skills, projects or communities the developer kept,
 * a score under the minimum they chose, and `exclude`.
 */
export const rank = (
  need: Need,
  exclude: Set<number> = new Set(),
  at = now(),
): Candidate[] => {
  if (!need.skills.length) return []
  const required = JSON.stringify(need.skills)
  // The best source of each skill asked, per developer
  const weights = new Map<number, Map<number, number>>()
  for (const { userId, skillId, source } of listSkillHolders(required)) {
    if (userId === need.authorId || exclude.has(userId)) continue
    const mine = weights.get(userId) ?? new Map<number, number>()
    mine.set(
      skillId,
      Math.max(mine.get(skillId) ?? 0, sourceWeight[source] ?? 0),
    )
    weights.set(userId, mine)
  }
  if (!weights.size) return []
  const users = JSON.stringify([...weights.keys()])
  const intents = new Map<number, string[]>()
  for (const { userId, intent } of listIntents(users)) {
    intents.set(userId, [...intents.get(userId) ?? [], intent])
  }
  const confirmed = new Map(
    listConfirmed({ users, skills: required }).map((c) => [c.userId, c]),
  )
  const active = new Set(
    listActive({ users, since: at - ACTIVE_WITHIN }).map((r) => r.userId),
  )
  const communities = new Map(
    listSharedCommunities({ users, authorId: need.authorId })
      .map((r) => [r.userId, r.name]),
  )
  const followers = new Set(
    need.projectId
      ? listFollowers({ users, projectId: need.projectId }).map((r) => r.userId)
      : [],
  )
  const asked: Asked = {
    skills: skillNamesOf(need.skills),
    project: need.projectId ? getProjectSlug(need.projectId)?.slug : undefined,
    communities: listAuthorCommunities(need.authorId).map((r) => r.slug),
  }

  const ranked: Candidate[] = []
  for (const profile of listProfiles(users)) {
    if (profile.matchingMode === 'off') continue
    const filters = matchingFiltersOf(profile.matchingFilters)
    if (!kept(filters, asked)) continue
    const held = weights.get(profile.userId)!
    const reasons: Reason[] = []
    const skillWeight = [...held.values()].reduce((sum, w) => sum + w, 0)
    reasons.push({
      kind: 'skills',
      points: Math.round(45 * skillWeight / (100 * need.skills.length)),
      skills: skillNamesOf([...held.keys()]),
      of: need.skills.length,
    })
    if (
      filters.helpTypes.includes(need.category) ||
      intentsOf(need.category).some((i) =>
        intents.get(profile.userId)?.includes(i)
      )
    ) {
      reasons.push({ kind: 'type', points: 15, category: need.category })
    }
    const mine = confirmed.get(profile.userId)
    if (mine?.onSkills) {
      reasons.push({
        kind: 'confirmed',
        points: Math.min(15, Math.round(mine.onSkills / 14 * 15)),
        count: mine.onSkills,
        review: need.category === 'code_review',
      })
    }
    const available = profile.availability === 'available'
    const isActive = active.has(profile.userId)
    reasons.push({
      kind: 'availability',
      points: (available ? 7 : 2) + (isActive ? 3 : 0),
      available,
      active: isActive,
    })
    const community = communities.get(profile.userId)
    if (community) reasons.push({ kind: 'affinity', points: 5, community })
    else if (followers.has(profile.userId)) {
      reasons.push({ kind: 'affinity', points: 5, follows: true })
    }
    const score = Math.min(100, reasons.reduce((sum, r) => sum + r.points, 0))
    if (score < filters.minScore) continue
    ranked.push({
      userId: profile.userId,
      login: profile.login,
      score,
      reasons,
      newcomer: (mine?.total ?? 0) < NEWCOMER_BELOW &&
        held.size * 2 >= need.skills.length,
      instant: profile.matchingMode === 'instant',
    })
  }
  return ranked.sort((a, b) =>
    b.score - a.score || a.login.localeCompare(b.login)
  )
}

/**
 * The developers of a wave: the best, and one seat kept for a promising
 * newcomer, well aligned on the skills but with few confirmed helps
 */
export const pickWave = (ranked: Candidate[]) => {
  const newcomer = ranked.find((c) => c.newcomer)
  const rest = ranked.filter((c) => c !== newcomer).slice(
    0,
    newcomer ? WAVE_SIZE - 1 : WAVE_SIZE,
  )
  return newcomer
    ? [...rest, {
      ...newcomer,
      reasons: [...newcomer.reasons, { kind: 'newcomer', points: 0 } as Reason],
    }]
    : rest
}

/*
 * The waves of a request
 */

type RequestRow = {
  helpRequestId: number
  authorId: number
  targetUserId: number | null
  projectId: number | null
  category: string
  title: string
  skills: string
  status: string
  estimatedMinutes: number | null
  project: string | null
}

const getRequest = sql<RequestRow, number>`
  SELECT helpRequestId, authorId, targetUserId, helpRequest.projectId,
    category, title, helpRequest.skills, helpRequest.status, estimatedMinutes,
    project.name AS project
  FROM helpRequest
  LEFT JOIN project ON project.projectId = helpRequest.projectId
  WHERE helpRequestId = ?
`.get

const listMatched = sql<{ userId: number; wave: number }, number>`
  SELECT userId, wave FROM helpMatch WHERE helpRequestId = ?
`.all

// Matching notifications of the last 24 h, per developer (§7.3)
const listCapped = sql<{ userId: number }, { since: number; cap: number }>`
  SELECT userId FROM helpMatch WHERE notifiedAt >= :since
  GROUP BY userId HAVING count(*) >= :cap
`.all

const insertMatch = sql<undefined, Record<string, string | number | null>>`
  INSERT INTO helpMatch (helpRequestId, userId, score, reasons, wave,
    newcomerSlot, notifiedAt, status)
  VALUES (:helpRequestId, :userId, :score, :reasons, :wave, :newcomerSlot,
    :notifiedAt, 'notified')
`.run

const setLastWave = sql<undefined, { helpRequestId: number; at: number }>`
  UPDATE helpRequest SET lastWaveAt = :at WHERE helpRequestId = :helpRequestId
`.run

/**
 * Sends the next wave of an open request: those already matched are not
 * notified again, nor a developer at their 10 notifications of the day. In
 * Instant mode the developer gets a notification at once; in Daily digest,
 * the match waits for the digest (PAM-509). Returns the developers matched.
 */
export const sendWave = (helpRequestId: number, at = now()) =>
  db.transaction(() => {
    const request = getRequest(helpRequestId)
    // A collaboration request goes to one person, without matching (§7.6)
    if (!request || request.status !== 'open' || request.targetUserId) return []
    const matched = listMatched(helpRequestId)
    const capped = listCapped({ since: at - DAY, cap: DAILY_MATCHES })
    const exclude = new Set([
      ...matched.map((m) => m.userId),
      ...capped.map((c) => c.userId),
    ])
    const wave = Math.max(0, ...matched.map((m) => m.wave)) + 1
    const chosen = pickWave(
      rank(
        {
          authorId: request.authorId,
          category: request.category,
          skills: json<number[]>(request.skills, []),
          projectId: request.projectId,
        },
        exclude,
        at,
      ),
    )
    // Even an empty wave counts: the next one waits 2 h again
    setLastWave({ helpRequestId, at })
    for (const candidate of chosen) {
      const newcomerSlot = candidate.reasons.some((r) => r.kind === 'newcomer')
      insertMatch({
        helpRequestId,
        userId: candidate.userId,
        score: candidate.score,
        reasons: JSON.stringify(candidate.reasons),
        wave,
        newcomerSlot: newcomerSlot ? 1 : 0,
        notifiedAt: candidate.instant ? at : null,
      })
      if (!candidate.instant) continue
      Entry.insert.HELP_REQUEST_MATCHED({
        userId: candidate.userId,
        helpRequestId,
        source: 'platform',
      })
      createNotification({
        userId: candidate.userId,
        type: 'help_match',
        category: 'for-you',
        actorId: request.authorId,
        // What the toast « Ce projet a besoin de toi » shows (§7.4)
        payload: {
          helpRequestId,
          title: request.title,
          score: candidate.score,
          skills: skillNamesOf(json<number[]>(request.skills, [])),
          minutes: request.estimatedMinutes ?? 0,
          project: request.project ?? '',
        },
      })
    }
    return chosen
  })()

// Every field a reason may have, null when it does not apply; in the order
// the API sends them
const noReason = {
  kind: '',
  points: 0,
  skills: null as string[] | null,
  of: null as number | null,
  category: null as string | null,
  count: null as number | null,
  review: null as boolean | null,
  available: null as boolean | null,
  active: null as boolean | null,
  community: null as string | null,
  follows: null as boolean | null,
}

/** A reason as the API sends it: every field, null when it does not apply */
export const explain = (reasons: Reason[]) =>
  reasons.map((r) => ({ ...noReason, ...r }))

/*
 * What the pages read
 */

type MatchRow = {
  login: string
  score: number
  reasons: string
  wave: number
  newcomerSlot: number
  status: string
  userId: number
}

const listMatches = sql<MatchRow, number>`
  SELECT githubUsername AS login, score, reasons, wave, newcomerSlot, status,
    helpMatch.userId
  FROM helpMatch JOIN user ON user.userId = helpMatch.userId
  WHERE helpRequestId = ? AND wave > 0
  ORDER BY wave, score DESC
`.all

const shown = (row: MatchRow) => ({
  login: row.login,
  score: row.score,
  reasons: explain(JSON.parse(row.reasons) as Reason[]),
  wave: row.wave,
  newcomer: row.newcomerSlot === 1,
  status: row.status,
})

/**
 * The matches of a request: all of them for the requester; for a matched
 * developer, only their own score (§7.3, PAM-219)
 */
export const matchesFor = (
  helpRequestId: number,
  viewer: { userId: number; isAuthor: boolean },
) => {
  const rows = listMatches(helpRequestId)
  return viewer.isAuthor
    ? rows.map(shown)
    : rows.filter((r) => r.userId === viewer.userId).map(shown)
}

/** « Qui sera notifié » while the form is filled: nothing is written */
export const previewWave = (need: Need) =>
  pickWave(rank(need)).map(({ login, score, reasons }) => ({
    login,
    score,
    reasons: explain(reasons),
    newcomer: reasons.some((r) => r.kind === 'newcomer'),
  }))
