import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { entries, Entry } from '/api/entries.ts'
import { refreshListeners } from '/api/events.ts'
import { Project, ProjectMember } from '/api/schema.ts'
import server from '/api/server.ts'

const restore = makeRestorePoint()

const request = (path: string, headers: Record<string, string> = {}) =>
  server.fetch(new Request(`http://localhost${path}`, { headers }))

// The simulated login of the test env (§5.3)
const login = async () => {
  const { url } = await (await request('/api/auth/github')).json()
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
  const cookie = res.headers.get('Set-Cookie')?.match(/session=([^;]*)/)?.[1]
  return { userId: user.userId as number, cookie: `session=${cookie}` }
}

const addProject = (ownerId: number, slug: string) =>
  Project.insert({
    ownerId,
    name: slug,
    slug,
    description: 'Projet de test',
    visibility: 'public',
    status: 'active',
    source: 'demo',
    createdAt: now(),
    updatedAt: now(),
  })

const join = (projectId: number, userId: number) =>
  ProjectMember.insert({ projectId, userId, role: 'owner', joinedAt: now() })

// Reads the stream as messages; stops after `wait` ms without a new one
const open = async (cookie: string) => {
  const res = await request('/api/events', {
    Accept: 'text/event-stream',
    Cookie: cookie,
  })
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  // A read that timed out is still waiting: the next call takes it over,
  // so no message is lost
  let pending: ReturnType<typeof reader.read> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    res,
    next: async (wait = 50) => {
      pending ??= reader.read()
      const timeout = new Promise<undefined>((resolve) =>
        timer = setTimeout(resolve, wait)
      )
      const chunk = await Promise.race([pending, timeout])
      clearTimeout(timer)
      if (!chunk) return
      pending = undefined
      return chunk.done ? undefined : decoder.decode(chunk.value)
    },
    close: () => reader.cancel(),
  }
}

const taskUpdated = (userId: number, projectId: number) =>
  Entry.insert.PROJECT_UPDATED({ userId, projectId, source: 'platform' })

Deno.test('events: a session and the event-stream type are required', async () => {
  restore()
  assertEquals((await request('/api/events')).status, 401)
  const { cookie } = await login()
  const plain = await request('/api/events', { Cookie: cookie })
  assertEquals(plain.status, 400)
})

Deno.test('events: an ack first, then the entries of my projects', async () => {
  restore()
  const { userId, cookie } = await login()
  const mine = addProject(userId, 'mine')
  const other = addProject(userId, 'other')
  join(mine, userId)
  const stream = await open(cookie)
  assertEquals(stream.res.headers.get('Content-Type'), 'text/event-stream')
  assertEquals(await stream.next(), 'event: ack\ndata: \n\n')

  taskUpdated(userId, other)
  assertEquals(await stream.next(), undefined)
  const entryId = taskUpdated(userId, mine)
  const message = await stream.next()
  const [, type, id] = JSON.parse(message!.slice('data: '.length))
  assertEquals([type, id], [entries.PROJECT_UPDATED, entryId])
  await stream.close()
})

Deno.test('events: joining a project opens its entries at once', async () => {
  restore()
  const { userId, cookie } = await login()
  const projectId = addProject(userId, 'later')
  const stream = await open(cookie)
  await stream.next()
  taskUpdated(userId, projectId)
  assertEquals(await stream.next(), undefined)

  join(projectId, userId)
  refreshListeners(userId)
  taskUpdated(userId, projectId)
  assertEquals((await stream.next())?.startsWith('data: '), true)
  await stream.close()
})

Deno.test('events: a closed connection leaves no listener', async () => {
  restore()
  const { cookie } = await login()
  const before = Entry.insertListeners.size
  const stream = await open(cookie)
  await stream.next()
  assertEquals(Entry.insertListeners.size, before + 1)
  await stream.close()
  assertEquals(Entry.insertListeners.size, before)
})
