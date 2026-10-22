import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import { Profile, Project, User } from '/api/schema.ts'
import { request } from '/api/testing.ts'

const restore = makeRestorePoint()

let githubId = 0
const dev = (login: string) => {
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
  return userId
}

const project = (ownerId: number, slug: string, members: number[] = []) => {
  const projectId = Project.insert({
    ownerId,
    name: `Projet ${slug}`,
    slug,
    description: '',
    visibility: 'public',
    status: 'beta',
    source: 'demo',
    createdAt: now(),
    updatedAt: now(),
  })
  for (const [i, userId] of [ownerId, ...members].entries()) {
    db.exec(`INSERT INTO projectMember (projectId, userId, role, joinedAt)
      VALUES (${projectId}, ${userId}, '${i ? 'contributor' : 'owner'}', 0)`)
  }
  Entry.insert.PROJECT_CREATED({ userId: ownerId, projectId, source: 'demo' })
  return projectId
}

const decided = (eligible = 1) => ({
  eligible,
  exclusionReason: eligible ? '' : 'pair_limit',
  rulesVersion: 1,
})

const skills = [{ skillId: 1, slug: 'go', name: 'Go' }]

const review = (
  helperId: number,
  requesterId: number,
  projectId: number,
  eligible = 1,
) =>
  Entry.insert.REVIEW_HELP_CONFIRMED({
    userId: helperId,
    projectId: maybe(projectId),
    helpRequestId: maybe(null),
    pullRequestId: maybe(null),
    requesterId,
    skills,
    helpCategory: 'code_review',
    repository: 'abdou/openpay',
    prNumber: 81,
    url: 'https://github.com/abdou/openpay/pull/81',
    githubReviewId: 1,
    reviewState: 'approved',
    ...decided(eligible),
    source: 'github',
  })

const helped = (helperId: number, requesterId: number, helpCategory: string) =>
  Entry.insert.HELP_CONFIRMED({
    userId: helperId,
    projectId: maybe(null),
    helpRequestId: maybe(null),
    requesterId,
    skills,
    helpCategory,
    ...decided(),
    source: 'platform',
  })

const merged = (authorId: number, projectId: number, isOwner: number) =>
  Entry.insert.PR_MERGED({
    userId: authorId,
    projectId,
    pullRequestId: maybe(null),
    repository: 'x/y',
    prNumber: 12,
    url: 'https://github.com/x/y/pull/12',
    authorGithubId: 1,
    authorIsOwner: isOwner,
    ...decided(),
    source: 'github',
  })

type Proof = Record<string, unknown>
const proofs = async (login: string) =>
  await (await request(`/api/user/proofs?username=${login}`)).json() as Proof[]

const pick = (list: Proof[], ...keys: string[]) =>
  list.map((p) => Object.fromEntries(keys.map((k) => [k, p[k]])))

Deno.test('proofs: each reputation entry lands in its dimension (§8.1)', async () => {
  restore()
  const moussa = dev('moussa')
  const abdou = dev('abdou')
  const openpay = project(abdou, 'openpay')
  review(moussa, abdou, openpay)
  // Excluded by the pair limit: visible in the activity, not a proof
  review(moussa, abdou, openpay, 0)
  helped(moussa, abdou, 'mentorship')
  helped(moussa, abdou, 'debugging')
  merged(moussa, openpay, 0)
  const list = await proofs('moussa')
  assertEquals(
    pick(list, 'kind', 'dimension', 'by', 'source').sort((a, b) =>
      String(a.dimension).localeCompare(String(b.dimension))
    ),
    [
      { kind: 'help', dimension: 'help', by: 'abdou', source: 'platform' },
      { kind: 'help', dimension: 'mentor', by: 'abdou', source: 'platform' },
      // A PR merged in someone else's project: for its owner
      { kind: 'merged', dimension: 'oss', by: 'abdou', source: 'github' },
      { kind: 'review', dimension: 'review', by: 'abdou', source: 'github' },
    ],
  )
  const proof = list.find((p) => p.kind === 'review')!
  assertEquals(
    pick(
      [proof],
      'project',
      'projectName',
      'prNumber',
      'url',
      'skills',
      'byName',
    ),
    [{
      project: 'openpay',
      projectName: 'Projet openpay',
      prNumber: 81,
      url: 'https://github.com/abdou/openpay/pull/81',
      skills: ['Go'],
      byName: 'abdou',
    }],
  )
})

Deno.test('proofs: building needs a second active member', async () => {
  restore()
  const abdou = dev('abdou')
  const moussa = dev('moussa')
  // Alone on his project: not yet a proof of building
  project(abdou, 'solo')
  const openpay = project(abdou, 'openpay', [moussa])
  merged(abdou, openpay, 1)
  assertEquals(
    pick(await proofs('abdou'), 'kind', 'dimension', 'project', 'by'),
    [
      { kind: 'merged', dimension: 'build', project: 'openpay', by: '' },
      { kind: 'created', dimension: 'build', project: 'openpay', by: '' },
    ],
  )
  assertEquals((await request('/api/user/proofs?username=nobody')).status, 404)
})
