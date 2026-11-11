import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import {
  Issue,
  Project,
  ProjectMember,
  ProjectNeed,
  PullRequest,
  Repository,
  User,
  UserSkill,
} from '/api/schema.ts'
import { login, request } from '/api/testing.ts'

// « What can I work on? » (§10.3): computed by the server, best match first
const restore = makeRestorePoint()
const at = now()

const skillId = (name: string) =>
  (db.prepare('SELECT skillId FROM skill WHERE name = ?').get(name) as {
    skillId: number
  }).skillId

const project = (ownerId: number, slug: string, skills: number[]) => {
  const projectId = Project.insert({
    ownerId,
    name: slug,
    slug,
    description: '',
    visibility: 'public',
    status: 'active',
    source: 'github',
    createdAt: at,
    updatedAt: at,
    skills,
  })
  ProjectMember.insert({
    projectId,
    userId: ownerId,
    role: 'owner',
    joinedAt: at,
  })
  return projectId
}

const need = (projectId: number, title: string, skills: number[]) =>
  ProjectNeed.insert({
    projectId,
    type: 'contributor',
    title,
    skills,
    status: 'open',
    createdAt: at,
    updatedAt: at,
  })

Deno.test('work: needs and good first issues of the others, best match first', async () => {
  restore()
  const session = await login()
  const me = await (await request('/api/user/me', {
    cookie: `session=${session}`,
  })).json()
  const [go, react, rust] = ['Go', 'React', 'Rust'].map(skillId)
  // Only Go proven on GitHub, and React only declared
  db.prepare('DELETE FROM userSkill WHERE userId = ?').run(me.userId)
  UserSkill.insert({
    userId: me.userId,
    skillId: go,
    source: 'github',
    createdAt: at,
  })
  UserSkill.insert({
    userId: me.userId,
    skillId: react,
    source: 'declared',
    createdAt: at,
  })
  const other = User.insert({
    githubId: 9001,
    githubUsername: 'fatou',
    avatarUrl: '',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  const payments = project(other, 'payments', [go, react])
  need(payments, 'Un dev Go', [go])
  need(payments, 'Une API en Go et React', [go, react])
  need(payments, 'Un dev Rust', [rust])
  // A need of my own project is not something for me to pick up
  need(project(me.userId, 'mine', [go]), 'Mon besoin', [go])
  const repositoryId = Repository.insert({
    projectId: payments,
    githubId: 77,
    owner: 'fatou',
    name: 'payments',
    fullName: 'fatou/payments',
    defaultBranch: 'main',
    syncMode: 'poll',
    source: 'github',
  })
  // #1 already discussed, #3 untouched, #4 a documentation issue
  const issues: [number, string[], number][] = [
    [1, ['good first issue'], 6],
    [2, ['bug'], 0],
    [3, ['good first issue'], 0],
    [4, ['documentation'], 2],
  ]
  for (const [n, labels, comments] of issues) {
    Issue.insert({
      repositoryId,
      githubId: 100 + n,
      number: n,
      title: `Issue ${n}`,
      state: 'open',
      labels,
      authorGithubId: 1,
      comments,
      source: 'github',
      createdAt: at,
      updatedAt: at,
    })
  }

  const work = await (await request('/api/work', {
    cookie: `session=${session}`,
  })).json()
  // Go from GitHub weighs 85, React declared 70: (85 + 70) / 2 = 78
  assertEquals(
    work.needs.map((n: { title: string; score: number }) => [n.title, n.score]),
    [['Un dev Go', 85], ['Une API en Go et React', 78]],
  )
  assertEquals(
    work.issues.map((i: { title: string; href: string; score: number }) => [
      i.title,
      i.score,
      i.href,
    ]),
    [
      ['#4 Issue 4', 78, 'https://github.com/fatou/payments/issues/4'],
      ['#3 Issue 3', 78, 'https://github.com/fatou/payments/issues/3'],
      ['#1 Issue 1', 78, 'https://github.com/fatou/payments/issues/1'],
    ],
  )
  assertEquals(
    work.issues.map((i: { type: string }) => i.type),
    ['documentation', 'good first issue', 'good first issue'],
  )
  assertEquals(work.help, [])
  // No PR merged yet: one thing to begin with, the least crowded issue
  assertEquals(work.newcomer, true)
  assertEquals(work.firstStep.title, '#3 Issue 3')
})

Deno.test('work: no first step once a PR was merged', async () => {
  restore()
  const session = await login()
  const me = await (await request('/api/user/me', {
    cookie: `session=${session}`,
  })).json()
  const githubId = (db.prepare('SELECT githubId FROM user WHERE userId = ?')
    .get(me.userId) as { githubId: number }).githubId
  const projectId = project(me.userId, 'mine', [skillId('Go')])
  const repositoryId = Repository.insert({
    projectId,
    githubId: 78,
    owner: 'me',
    name: 'mine',
    fullName: 'me/mine',
    defaultBranch: 'main',
    syncMode: 'poll',
    source: 'github',
  })
  PullRequest.insert({
    repositoryId,
    githubId: 501,
    number: 1,
    title: 'Ma PR',
    state: 'merged',
    authorGithubId: githubId,
    additions: 1,
    deletions: 1,
    branch: 'fix',
    mergedAt: at,
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  const work = await (await request('/api/work', {
    cookie: `session=${session}`,
  })).json()
  assertEquals([work.newcomer, work.firstStep], [false, undefined])
})
