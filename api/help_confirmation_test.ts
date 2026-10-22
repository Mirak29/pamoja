import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { entries } from '/api/entry-types.ts'
import { HelpRequest, Profile, User } from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import { skillIdsOf } from '/api/skills.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()

const call = async (path: string, cookie: string, body?: unknown) => {
  const res = await request(path, { body, cookie: `session=${cookie}` })
  return { status: res.status, json: await res.json().catch(() => null) }
}

let githubId = 0
const dev = async (login: string) => {
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
    theme: 'minimal',
    accent: 'indigo',
    availability: 'available',
    matchingMode: 'instant',
    createdAt: at,
    updatedAt: at,
  })
  return { userId, session: await createSession(userId, 'demo') }
}

/** A help Moussa delivered to Abdou, without a PR, or reviewed on a PR */
const answered = (
  authorId: number,
  helperId: number,
  onPullRequest = false,
) => {
  const at = now()
  let pullRequestId: number | null = null
  if (onPullRequest) {
    db.exec(`INSERT INTO project (ownerId, name, slug, description, visibility,
      status, source, createdAt, updatedAt)
      VALUES (${authorId}, 'OpenPay Africa', 'openpay', '', 'public', 'beta',
      'demo', 0, 0)`)
    db.exec(`INSERT INTO repository (projectId, githubId, owner, name, fullName,
      defaultBranch, syncMode, source)
      VALUES (1, 777, 'abdou', 'openpay', 'abdou/openpay', 'main', 'live',
      'github')`)
    db.exec(`INSERT INTO pullRequest (repositoryId, githubId, number, title,
      state, authorGithubId, additions, deletions, source, createdAt, updatedAt)
      VALUES (1, 8081, 81, 'PR 81', 'open', 1, 0, 0, 'github', 0, 0)`)
    pullRequestId = 1
  }
  const id = HelpRequest.insert({
    authorId,
    pullRequestId,
    category: onPullRequest ? 'code_review' : 'debugging',
    title: 'Le verrou SQLite',
    description: '',
    skills: skillIdsOf(['Go', 'SQLite']),
    status: onPullRequest ? 'review_submitted' : 'delivered',
    acceptedBy: helperId,
    acceptedAt: at - 3600,
    deliveredAt: at,
    expiresAt: at + 7 * 86_400,
    source: 'platform',
    createdAt: at - 7200,
    updatedAt: at,
  })
  if (onPullRequest) {
    db.exec(
      `INSERT INTO review (pullRequestId, githubReviewId, reviewerGithubId,
      reviewerUserId, state, commentCount, submittedAt, helpRequestId, source)
      VALUES (1, 991, 2, ${helperId}, 'approved', 1, ${at}, ${id}, 'github')`,
    )
  }
  return id
}

// The frozen fields of the last proof of a type
const proofOf = (type: 'REVIEW_HELP_CONFIRMED' | 'HELP_CONFIRMED') => {
  const field = (table: string, column: string) =>
    `(SELECT ${column} FROM ${table} WHERE entryId = entry.id) AS ${column}`
  return db.prepare(
    `SELECT entry.userId, entry.helpRequestId,
      ${field('entryRequesterId', 'requesterId')},
      ${field('entrySkills', 'skills')},
      ${field('entryHelpCategory', 'helpCategory')},
      ${field('entryEligible', 'eligible')},
      ${field('entryExclusionReason', 'exclusionReason')},
      ${field('entryRulesVersion', 'rulesVersion')},
      ${field('entrySource', 'source')},
      ${field('entryRepository', 'repository')},
      ${field('entryPrNumber', 'prNumber')},
      ${field('entryGithubReviewId', 'githubReviewId')},
      ${field('entryReviewState', 'reviewState')}
     FROM entry WHERE type = ? ORDER BY id DESC LIMIT 1`,
  ).get(entries[type]) as Record<string, unknown>
}

Deno.test('confirmation: a delivered help becomes a proof on the platform', async () => {
  restore()
  const abdou = await dev('abdou')
  const moussa = await dev('moussa')
  const id = answered(abdou.userId, moussa.userId)
  // Only the requester confirms
  assertEquals(
    (await call('/api/help/confirm', moussa.session, { id })).status,
    403,
  )
  const res = await call('/api/help/confirm', abdou.session, { id })
  assertEquals(res.json.status, 'completed')
  const proof = proofOf('HELP_CONFIRMED')
  assertEquals(proof.userId, moussa.userId)
  assertEquals(proof.requesterId, abdou.userId)
  assertEquals(
    JSON.parse(proof.skills as string).map((s: { name: string }) => s.name),
    ['Go', 'SQLite'],
  )
  assertEquals(
    [proof.helpCategory, proof.eligible, proof.exclusionReason],
    ['debugging', 1, ''],
  )
  assertEquals([proof.rulesVersion, proof.source], [1, 'platform'])
  // The skills are now proven on Pamoja, the helper is told
  assertEquals(
    db.prepare(
      "SELECT count(*) AS n FROM userSkill WHERE userId = ? AND source = 'platform_activity'",
    ).get(moussa.userId),
    { n: 2 },
  )
  assertEquals(
    db.prepare('SELECT type FROM notification WHERE userId = ?').all(
      moussa.userId,
    ),
    [{ type: 'help_confirmed' }],
  )
  // One confirmation per request
  assertEquals(
    (await call('/api/help/confirm', abdou.session, { id })).status,
    409,
  )
})

Deno.test('confirmation: a review seen on GitHub gives a proof « vérifiée par GitHub »', async () => {
  restore()
  const abdou = await dev('abdou')
  const moussa = await dev('moussa')
  const id = answered(abdou.userId, moussa.userId, true)
  await call('/api/help/confirm', abdou.session, { id })
  const proof = proofOf('REVIEW_HELP_CONFIRMED')
  assertEquals(
    [proof.repository, proof.prNumber, proof.githubReviewId, proof.reviewState],
    ['abdou/openpay', 81, 991, 'approved'],
  )
  assertEquals([proof.source, proof.eligible], ['github', 1])
})

Deno.test('confirmation: at most 2 counted per pair over 30 days', async () => {
  restore()
  const abdou = await dev('abdou')
  const moussa = await dev('moussa')
  for (let i = 0; i < 3; i++) {
    const id = answered(abdou.userId, moussa.userId)
    await call('/api/help/confirm', abdou.session, { id })
  }
  const decisions = db.prepare(
    `SELECT eligible.eligible, reason.exclusionReason FROM entry
     JOIN entryEligible AS eligible ON eligible.entryId = entry.id
     JOIN entryExclusionReason AS reason ON reason.entryId = entry.id
     WHERE entry.type = ? ORDER BY entry.id`,
  ).all(entries.HELP_CONFIRMED)
  assertEquals(decisions, [
    { eligible: 1, exclusionReason: '' },
    { eligible: 1, exclusionReason: '' },
    { eligible: 0, exclusionReason: 'pair_limit' },
  ])
  // Another requester still counts
  const fatou = await dev('fatou')
  const id = answered(fatou.userId, moussa.userId)
  await call('/api/help/confirm', fatou.session, { id })
  assertEquals(proofOf('HELP_CONFIRMED').eligible, 1)
})
