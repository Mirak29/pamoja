import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { Project, Repository, User } from '/api/schema.ts'
import { LIVE_CHECK_EVERY, POLL_EVERY, refreshAll } from '/api/sync.ts'

// A repo is read when it is due, whatever the server did meanwhile: a
// restart does not put it off (§5.4, §5.6)
const restore = makeRestorePoint()

// GitHub answers « nothing new » (304) and says who was read
let read: string[] = []
const realFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.hostname !== 'api.github.com') return realFetch(input, init)
  const repo = url.pathname.match(/^\/repos\/[^/]+\/([^/]+)/)?.[1]
  repo && !read.includes(repo) && read.push(repo)
  return Promise.resolve(new Response(null, { status: 304 }))
}

const repository = (
  name: string,
  syncMode: 'poll' | 'live',
  lastSyncedAt: number | null,
) => {
  const at = now()
  const ownerId = (db.prepare('SELECT userId FROM user LIMIT 1').get() as
    | { userId: number }
    | undefined)?.userId ?? User.insert({
      githubId: 1,
      githubUsername: 'abdou',
      avatarUrl: '',
      source: 'github',
      createdAt: at,
      updatedAt: at,
    })
  const projectId = Project.insert({
    ownerId,
    name,
    slug: name,
    description: '',
    visibility: 'public',
    status: 'beta',
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  const repositoryId = Repository.insert({
    projectId,
    githubId: projectId,
    owner: 'abdou',
    name,
    fullName: `abdou/${name}`,
    defaultBranch: 'main',
    syncMode,
    source: 'github',
  })
  db.prepare('UPDATE repository SET lastSyncedAt = ? WHERE repositoryId = ?')
    .run(lastSyncedAt, repositoryId)
}

Deno.test('sync: the repos due are read, the others wait', async () => {
  restore()
  read = []
  const at = now()
  repository('never-read', 'poll', null)
  repository('polled-late', 'poll', at - POLL_EVERY - 60)
  repository('polled-recently', 'poll', at - 60)
  repository('live-late', 'live', at - LIVE_CHECK_EVERY - 60)
  repository('live-recently', 'live', at - POLL_EVERY - 60)
  await refreshAll(at)
  // The longest unread first
  assertEquals(read, ['never-read', 'live-late', 'polled-late'])
  // Read now: nothing is due a minute later
  read = []
  await refreshAll(now() + 60)
  assertEquals(read, [])
})
