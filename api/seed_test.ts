import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { parseGithubIds, seed } from '/api/seed.ts'
import server from '/api/server.ts'
import { communities } from '/web/fixtures/communities.ts'
import { people } from '/web/fixtures/people.ts'
import { projects } from '/web/fixtures/projects.ts'

const restore = makeRestorePoint()

const count = (query: string) => (db.prepare(query).get() as { n: number }).n

Deno.test('seed: the developers, communities and projects of the fixtures', () => {
  restore()
  const counts = seed()
  assertEquals(counts, {
    developers: Object.keys(people).length,
    communities: communities.length,
    projects: Object.keys(projects).length,
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
  const { url } = await (await server.fetch(
    new Request('http://localhost/api/auth/github'),
  )).json()
  const params = new URL(url, 'http://localhost/').searchParams
  const res = await server.fetch(
    new Request('http://localhost/api/auth/github/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: params.get('code'),
        state: params.get('state'),
      }),
    }),
  )
  const user = await res.json()
  assertEquals(user.created, false)
  assertEquals(user.headline, people.abdou.headline)
  assertEquals(
    count('SELECT count(*) n FROM user'),
    Object.keys(people).length,
  )
})
