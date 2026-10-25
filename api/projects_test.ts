import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import {
  Issue,
  Project,
  ProjectMember,
  PullRequest,
  Repository,
} from '/api/schema.ts'
import { login, request } from '/api/testing.ts'

// The projects of a developer and the issues and PRs of a project, by
// batches of 20 (§12.7)
const restore = makeRestorePoint()
const at = now()

const call = async (path: string, cookie: string) => {
  const res = await request(path, { cookie: `session=${cookie}` })
  return { status: res.status, json: await res.json().catch(() => null) }
}

const setup = async (visibility = 'public') => {
  restore()
  const session = await login()
  const me = (await call('/api/user/me', session)).json
  const projectId = Project.insert({
    ownerId: me.userId,
    name: 'Big repo',
    slug: 'big-repo',
    description: '',
    visibility,
    status: 'active',
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  ProjectMember.insert({
    projectId,
    userId: me.userId,
    role: 'owner',
    joinedAt: at,
  })
  const repositoryId = Repository.insert({
    projectId,
    githubId: 1,
    owner: 'abdou',
    name: 'big-repo',
    fullName: 'abdou/big-repo',
    defaultBranch: 'main',
    syncMode: 'poll',
    source: 'github',
    readme: '# Big repo\n\nUn grand dépôt.\n\n```sh\nnpm i\n```\n\n' +
      'x'.repeat(5000),
  })
  // 45 issues, the even ones open, every fifth labelled good first issue
  for (let n = 1; n <= 45; n++) {
    Issue.insert({
      repositoryId,
      githubId: 1000 + n,
      number: n,
      title: `Issue ${n}`,
      state: n % 2 ? 'closed' : 'open',
      labels: n % 5 ? ['bug'] : ['good first issue'],
      authorGithubId: 1,
      authorLogin: 'someone',
      comments: 0,
      source: 'github',
      createdAt: at,
      updatedAt: at,
    })
  }
  // 30 PRs, the first 10 merged, the others open
  for (let n = 101; n <= 130; n++) {
    PullRequest.insert({
      repositoryId,
      githubId: 2000 + n,
      number: n,
      title: `PR ${n}`,
      state: n <= 110 ? 'merged' : 'open',
      authorGithubId: 1,
      authorLogin: 'someone',
      additions: 1,
      deletions: 1,
      branch: `b${n}`,
      source: 'github',
      createdAt: at,
      updatedAt: at,
    })
  }
  return { session }
}

const all = async (path: string, session: string) => {
  const numbers: number[] = []
  let before = ''
  let batches = 0
  do {
    const { json } = await call(
      `${path}&before=${encodeURIComponent(before)}`,
      session,
    )
    numbers.push(...json.items.map((i: { number: number }) => i.number))
    before = json.next
    batches++
  } while (before)
  return { numbers, batches }
}

Deno.test('projects: counts and a first batch, never the whole repo', async () => {
  const { session } = await setup()
  const [project] = (await call('/api/projects', session)).json
  const repo = project.repository
  assertEquals(
    [repo.openIssues, repo.beginnerIssues, repo.openPullRequests],
    [22, 4, 20],
  )
  assertEquals(repo.waitingReview, 20)
  assertEquals(repo.issues.items.length, 20)
  assertEquals(repo.pullRequests.items.length, 20)
  // The summary of the README, not the README
  assertEquals(repo.about, 'Un grand dépôt.\n\n' + 'x'.repeat(583))
})

Deno.test('projects: the issues and PRs of a project by batches', async () => {
  const { session } = await setup()
  const issues = await all('/api/project/issues?slug=big-repo', session)
  // The open ones only, newest first
  assertEquals(issues.batches, 2)
  assertEquals(issues.numbers, [
    44,
    42,
    40,
    38,
    36,
    34,
    32,
    30,
    28,
    26,
    24,
    22,
    20,
    18,
    16,
    14,
    12,
    10,
    8,
    6,
    4,
    2,
  ])
  const pulls = await all('/api/project/pulls?slug=big-repo', session)
  // The open ones first, then the merged ones, newest first, each once
  assertEquals(pulls.batches, 2)
  assertEquals(pulls.numbers.slice(0, 3), [130, 129, 128])
  assertEquals(pulls.numbers.slice(19, 22), [111, 110, 109])
  assertEquals(new Set(pulls.numbers).size, 30)
  assertEquals(
    (await call('/api/project/pulls?slug=nope&before=', session)).status,
    404,
  )
})
