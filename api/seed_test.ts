import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { parseGithubIds, seed } from '/api/seed.ts'
import { proofsOf } from '/api/proofs.ts'
import { badgesOf } from '/api/badges.ts'
import { loginFlow } from '/api/testing.ts'
import { communities } from '/web/fixtures/communities.ts'
import { people } from '/web/fixtures/people.ts'
import { projects } from '/web/fixtures/projects.ts'

const userIdOf = (login: string) =>
  (db.prepare('SELECT userId FROM user WHERE githubUsername = ?')
    .get(login) as { userId: number }).userId

const restore = makeRestorePoint()

const count = (query: string) => (db.prepare(query).get() as { n: number }).n

Deno.test('seed: the developers, communities and projects of the fixtures', () => {
  restore()
  const counts = seed()
  assertEquals(counts, {
    developers: Object.keys(people).length,
    communities: communities.length,
    projects: Object.keys(projects).length,
    reviews: 14,
  })
  assertEquals(count('SELECT count(*) n FROM profile'), counts.developers)
  assert(count('SELECT count(*) n FROM projectMember') >= counts.projects)
  assert(count('SELECT count(*) n FROM communityMember') > 0)
  assert(count(`SELECT count(*) n FROM follow WHERE targetType = 'user'`) > 0)
})

Deno.test('seed: everything is demo data', () => {
  restore()
  seed()
  for (const table of ['user', 'project', 'community']) {
    assertEquals(
      count(`SELECT count(*) n FROM ${table} WHERE source != 'demo'`),
      0,
    )
  }
  assertEquals(
    count(`SELECT count(*) n FROM entry
      LEFT JOIN entrySource ON entrySource.entryId = entry.id
      WHERE entrySource.source IS NOT 'demo'`),
    0,
  )
})

Deno.test('seed: Moussa has 14 confirmed reviews, Silver (PAM-901)', () => {
  restore()
  seed()
  const moussa = userIdOf('moussa')
  const reviews = proofsOf(moussa).filter((p) => p.dimension === 'review')
  // 14 reviews, from at least 3 requesters across 2 projects (§8.4, §18.1)
  assertEquals(reviews.length, 14)
  assert(new Set(reviews.map((r) => r.by)).size >= 3)
  assertEquals(new Set(reviews.map((r) => r.project)).size, 2)
  // Seeded reviews are demo data, never « vérifié par GitHub » (§8.3, §14)
  assert(reviews.every((r) => r.source === 'demo'))
  // Trusted Reviewer is Silver: 10 ≤ 14 < 20 (§8.2)
  const badges = badgesOf(moussa)
  assertEquals(badges.find((b) => b.badge === 'trusted_reviewer')?.level, 2)
  // The requesters spanned three countries: Cross-border Builder too (§8.2)
  assert((badges.find((b) => b.badge === 'cross_border')?.level ?? 0) >= 2)
})

Deno.test('seed: the story is in the past', () => {
  restore()
  seed()
  const newest = (db.prepare(
    `SELECT max(createdAt) at FROM entry WHERE type = 5`,
  ).get() as { at: number }).at
  assert(newest < now() - 3600)
})

Deno.test('seed: only listed developers are real GitHub accounts', () => {
  restore()
  seed(parseGithubIds('abdou:84472218, moussa: , fake:-3'))
  const ids = db.prepare(
    'SELECT githubUsername login, githubId FROM user ORDER BY userId',
  ).all() as { login: string; githubId: number }[]
  assertEquals(ids.find((u) => u.login === 'abdou')?.githubId, 84472218)
  assert(ids.filter((u) => u.login !== 'abdou').every((u) => u.githubId < 0))
})

Deno.test('seed: a real login opens the seeded profile', async () => {
  restore()
  // The simulated GitHub account of the test env has the id 0 (§5.3)
  seed(new Map([['abdou', 0]]))
  const { res } = await loginFlow()
  const user = await res.json()
  assertEquals(user.created, false)
  assertEquals(user.headline, people.abdou.headline)
  assertEquals(
    count('SELECT count(*) n FROM user'),
    Object.keys(people).length,
  )
})
