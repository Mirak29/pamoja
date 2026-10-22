import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { BADGES, evaluateBadges, levelOf } from '/api/badges.ts'
import { Entry, maybe } from '/api/entries.ts'
import { entries } from '/api/entry-types.ts'
import { Profile, Project, User } from '/api/schema.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()

let githubId = 0
const dev = (login: string, country = 'SN') => {
  const at = now()
  const userId = User.insert({
    githubId: ++githubId,
    githubUsername: login,
    avatarUrl: '',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  Profile.insert({
    userId,
    displayName: login,
    country,
    theme: 'minimal',
    accent: 'indigo',
    availability: 'available',
    matchingMode: 'instant',
    createdAt: at,
    updatedAt: at,
  })
  return userId
}

const project = (ownerId: number, slug: string) =>
  Project.insert({
    ownerId,
    name: slug,
    slug,
    description: '',
    visibility: 'public',
    status: 'beta',
    source: 'demo',
    createdAt: now(),
    updatedAt: now(),
  })

/** A review the requester confirmed: a proof of Code Review for the helper */
const review = (
  helperId: number,
  requesterId: number,
  projectId: number | null,
  eligible = 1,
) =>
  Entry.insert.REVIEW_HELP_CONFIRMED({
    userId: helperId,
    projectId: maybe(projectId),
    helpRequestId: maybe(null),
    pullRequestId: maybe(null),
    requesterId,
    skills: [],
    helpCategory: 'code_review',
    repository: 'abdou/openpay',
    prNumber: 81,
    url: 'https://github.com/abdou/openpay/pull/81',
    githubReviewId: 1,
    reviewState: 'approved',
    eligible,
    exclusionReason: eligible ? '' : 'pair_limit',
    rulesVersion: 1,
    source: 'demo',
  })

const levels = (userId: number) =>
  Object.fromEntries(
    (db.prepare('SELECT badge, level FROM badgeProgress WHERE userId = ?')
      .all(userId) as { badge: string; level: number }[])
      .map((b) => [b.badge, b.level]),
  )

const unlocked = () =>
  (db.prepare('SELECT count(*) AS n FROM entry WHERE type = ?')
    .get(entries.BADGE_UNLOCKED) as { n: number }).n

Deno.test('badges: the level of a count, Gold and Platinum asking for diversity', () => {
  const thresholds = BADGES.trusted_reviewer
  assertEquals(levelOf(thresholds, { count: 2, gold: 2, platinum: 2 }), 0)
  assertEquals(levelOf(thresholds, { count: 3, gold: 3, platinum: 3 }), 1)
  assertEquals(levelOf(thresholds, { count: 25, gold: 25, platinum: 25 }), 3)
  // Enough reviews, not enough people: Silver
  assertEquals(levelOf(thresholds, { count: 60, gold: 0, platinum: 0 }), 2)
  assertEquals(levelOf(thresholds, { count: 60, gold: 60, platinum: 0 }), 3)
})

Deno.test('badges: Trusted Reviewer from eligible proofs, unlocked once', () => {
  restore()
  const moussa = dev('moussa', 'CI')
  const abdou = dev('abdou')
  const openpay = project(abdou, 'openpay')
  for (let i = 0; i < 3; i++) review(moussa, abdou, openpay)
  // An excluded proof does not count
  review(moussa, abdou, openpay, 0)
  evaluateBadges(moussa)
  assertEquals(levels(moussa).trusted_reviewer, 1)
  assertEquals(
    (db.prepare('SELECT count FROM badgeProgress WHERE badge = ?').get(
      'trusted_reviewer',
    ) as { count: number }).count,
    3,
  )
  // Bronze for Trusted Reviewer and First Responder, each said once
  const after = unlocked()
  evaluateBadges(moussa)
  assertEquals(unlocked(), after)
  assertEquals(
    db.prepare(
      "SELECT count(*) AS n FROM notification WHERE type = 'badge_unlocked'",
    ).get(),
    { n: after },
  )
})

Deno.test('badges: Gold needs 3 requesters and 2 projects', () => {
  restore()
  const moussa = dev('moussa', 'CI')
  const abdou = dev('abdou')
  const openpay = project(abdou, 'openpay')
  for (let i = 0; i < 20; i++) review(moussa, abdou, openpay)
  evaluateBadges(moussa)
  // 20 reviews, one requester and one project: Silver only
  assertEquals(levels(moussa).trusted_reviewer, 2)
  const fatou = dev('fatou')
  const kofi = dev('kofi', 'GH')
  review(moussa, fatou, project(fatou, 'transit'))
  review(moussa, kofi, null)
  evaluateBadges(moussa)
  assertEquals(levels(moussa).trusted_reviewer, 3)
})

Deno.test('badges: Cross-border Builder counts the countries of the people helped', () => {
  restore()
  const moussa = dev('moussa', 'CI')
  // Senegal twice, Ghana once, Côte d'Ivoire (his own) does not count
  for (
    const [login, country] of [['abdou', 'SN'], ['awa', 'SN'], ['kofi', 'GH'], [
      'yao',
      'CI',
    ]]
  ) {
    review(moussa, dev(login, country), null)
  }
  evaluateBadges(moussa)
  assertEquals(levels(moussa).cross_border, 1)
  assertEquals(
    (db.prepare("SELECT count FROM badgeProgress WHERE badge = 'cross_border'")
      .get() as { count: number }).count,
    2,
  )
})

Deno.test('badges: the page reads them by login', async () => {
  restore()
  const moussa = dev('moussa', 'CI')
  const abdou = dev('abdou')
  for (let i = 0; i < 3; i++) review(moussa, abdou, null)
  evaluateBadges(moussa)
  const res = await request('/api/user/badges?username=moussa')
  const badges = await res.json() as {
    badge: string
    level: number
    next: number
  }[]
  assertEquals(badges.length, 8)
  assertEquals(
    badges.find((b) => b.badge === 'trusted_reviewer'),
    { badge: 'trusted_reviewer', level: 1, count: 3, next: 10 },
  )
  assertEquals(
    (await request('/api/user/badges?username=nobody')).status,
    404,
  )
})

const merged = (
  authorId: number | null,
  projectId: number,
  authorGithubId: number,
  isOwner: number,
) =>
  Entry.insert.PR_MERGED({
    userId: maybe(authorId),
    projectId,
    pullRequestId: maybe(null),
    repository: 'x/y',
    prNumber: 1,
    url: 'https://github.com/x/y/pull/1',
    authorGithubId,
    authorIsOwner: isOwner,
    eligible: 1,
    exclusionReason: '',
    rulesVersion: 1,
    source: 'demo',
  })

Deno.test('badges: Open Source, Builder and the months of a Maintainer', () => {
  restore()
  const abdou = dev('abdou')
  const moussa = dev('moussa', 'CI')
  const openpay = project(abdou, 'openpay')
  db.exec(`INSERT INTO projectMember (projectId, userId, role, joinedAt)
    VALUES (${openpay}, ${abdou}, 'owner', 0)`)
  // Moussa merges on three projects that are not his: Open Source Bronze
  for (const slug of ['a', 'b', 'c']) merged(moussa, project(abdou, slug), 2, 0)
  // OpenPay has a contributor other than its owner, and a release: Builder
  merged(moussa, openpay, 2, 0)
  Entry.insert.RELEASE_PUBLISHED({
    userId: abdou,
    projectId: openpay,
    repository: 'abdou/openpay',
    url: 'https://github.com/abdou/openpay/releases/v1',
    tag: 'v1',
    eligible: 1,
    exclusionReason: '',
    rulesVersion: 1,
    source: 'demo',
  })
  // Activity on OpenPay three months in a row, then a gap
  const month = (at: string, userId: number | null) => {
    const id = Entry.insert.COMMITS_PUSHED({
      userId: maybe(userId),
      projectId: openpay,
      pullRequestId: maybe(null),
      data: { branch: 'main', count: 1, messages: [] },
      source: 'demo',
    })
    db.prepare('UPDATE entryInternal SET createdAt = ? WHERE id = ?')
      .run(Date.parse(at) / 1000, id)
  }
  for (const at of ['2026-06-10', '2026-07-10', '2026-08-10', '2026-10-10']) {
    month(at, abdou)
  }
  evaluateBadges(moussa)
  evaluateBadges(abdou)
  assertEquals(levels(moussa).open_source, 1)
  assertEquals(levels(abdou).builder, 1)
  // June, July, August in a row; September is missing, October stands alone
  const maintainer = db.prepare(
    "SELECT count FROM badgeProgress WHERE userId = ? AND badge = 'maintainer'",
  ).get(abdou) as { count: number }
  assertEquals(maintainer.count, 3)
})
