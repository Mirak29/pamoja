import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { entries } from '/api/entry-types.ts'
import { Profile, Project, User } from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import { request } from '/api/testing.ts'

// Direct messages (§10.6)
const restore = makeRestorePoint()

let githubId = 0
const dev = async (login: string) => {
  const at = now()
  const userId = User.insert({
    githubId: ++githubId,
    githubUsername: login,
    avatarUrl: '',
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  Profile.insert({
    userId,
    displayName: `${login} Name`,
    theme: 'minimal',
    accent: 'indigo',
    availability: 'available',
    matchingMode: 'instant',
    createdAt: at,
    updatedAt: at,
  })
  const session = await createSession(userId, 'demo')
  const call = async (path: string, body?: unknown) => {
    const res = await request(path, { body, cookie: `session=${session}` })
    return { status: res.status, json: await res.json().catch(() => null) }
  }
  const get = (path: string, params: Record<string, number>) =>
    call(`${path}?${new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    )}`)
  return { userId, login, call, get }
}

type Dev = Awaited<ReturnType<typeof dev>>

const write = (from: Dev, to: Dev, body = 'Salut !') =>
  from.call('/api/conversation/start', { username: to.login, body })

const list = async (who: Dev) =>
  (await who.call('/api/conversations')).json as {
    id: number
    status: string
    incoming: boolean
    canWrite: boolean
    blockedByMe: boolean
    unread: number
    last: { excerpt: string; mine: boolean } | null
    with: { login: string }
  }[]

Deno.test('messages: a stranger sends a request, one message, never told of a refusal', async () => {
  restore()
  const kadi = await dev('kadi')
  const sena = await dev('sena')
  const first = await write(kadi, sena, 'Bonjour, une question sur **Kora**')
  assertEquals(first.status, 200)
  const id = first.json.id
  // For Sena: a request, unread, to answer
  assertEquals(
    (await list(sena)).map((c) => [c.status, c.incoming, c.unread]),
    [
      ['pending', true, 1],
    ],
  )
  // Kadi sends that first message only
  assertEquals(
    (await kadi.call('/api/conversation/message', { id, body: 'Relance' }))
      .json.message,
    'Waiting for the request to be accepted',
  )
  assertEquals((await write(kadi, sena, 'Encore')).status, 403)
  // Sena declines: gone from her list; to Kadi it still waits
  assertEquals(
    (await sena.call('/api/conversation/decline', { id })).status,
    204,
  )
  assertEquals(await list(sena), [])
  const kadiSide = await list(kadi)
  assertEquals(
    kadiSide.map((c) => [c.status, c.incoming, c.canWrite, c.last?.mine]),
    [['pending', false, false, true]],
  )
  assertEquals(
    (await sena.get('/api/conversation', { id })).status,
    404,
  )
})

Deno.test('messages: accepted, both write, unread until read', async () => {
  restore()
  const kadi = await dev('kadi')
  const sena = await dev('sena')
  const { id } = (await write(kadi, sena)).json
  assertEquals(
    (await sena.call('/api/conversation/accept', { id })).status,
    204,
  )
  assertEquals(
    (await sena.call('/api/conversation/accept', { id })).status,
    409,
  )
  await sena.call('/api/conversation/message', { id, body: 'Avec plaisir' })
  await sena.call('/api/conversation/message', { id, body: 'Dis-moi' })
  assertEquals((await list(kadi))[0].unread, 2)
  // Writing again in the same conversation, from the profile
  assertEquals((await write(kadi, sena, 'Merci')).json.id, id)
  assertEquals((await list(kadi))[0].unread, 0)
  assertEquals((await list(sena))[0].unread, 1)
  await sena.call('/api/conversation/read', { id })
  assertEquals((await list(sena))[0].unread, 0)
  const thread = (await sena.get('/api/conversation', { id })).json
  assertEquals(
    thread.messages.map((m: { author: string; mine: boolean }) => [
      m.author,
      m.mine,
    ]),
    [['kadi', false], ['sena', true], ['sena', true], ['kadi', false]],
  )
})

Deno.test('messages: answering a request accepts it; worked together, no request', async () => {
  restore()
  const kadi = await dev('kadi')
  const sena = await dev('sena')
  const { id } = (await write(kadi, sena)).json
  await sena.call('/api/conversation/message', { id, body: 'Oui ?' })
  assertEquals((await list(kadi))[0].status, 'accepted')
  // A project in common: open at once
  const yaw = await dev('yaw')
  const at = now()
  const projectId = Project.insert({
    ownerId: yaw.userId,
    name: 'Kora',
    slug: 'kora',
    description: '',
    visibility: 'public',
    status: 'beta',
    source: 'platform',
    createdAt: at,
    updatedAt: at,
  })
  for (
    const [userId, role] of [[yaw.userId, 'owner'], [
      sena.userId,
      'contributor',
    ]]
  ) {
    db.exec(`INSERT INTO projectMember (projectId, userId, role, joinedAt)
      VALUES (${projectId}, ${userId}, '${role}', 0)`)
  }
  await write(yaw, sena)
  assertEquals(
    (await list(sena)).find((c) => c.with.login === 'yaw')!.status,
    'accepted',
  )
})

Deno.test('messages: a block stops both ways, unknown to the blocked one', async () => {
  restore()
  const kadi = await dev('kadi')
  const sena = await dev('sena')
  const { id } = (await write(kadi, sena)).json
  await sena.call('/api/conversation/accept', { id })
  assertEquals(
    (await sena.call('/api/user/block', { username: 'kadi', blocked: true }))
      .json,
    { login: 'kadi', blocked: true },
  )
  const refused = await kadi.call('/api/conversation/message', {
    id,
    body: 'x',
  })
  assertEquals([refused.status, refused.json.message], [
    403,
    'You cannot write to this developer',
  ])
  assertEquals((await list(kadi))[0].blockedByMe, false)
  assertEquals((await list(sena))[0].blockedByMe, true)
  assertEquals(
    (await sena.call('/api/conversation/message', { id, body: 'x' })).status,
    403,
  )
  await sena.call('/api/user/block', { username: 'kadi', blocked: false })
  assertEquals(
    (await kadi.call('/api/conversation/message', { id, body: 'Pardon' }))
      .status,
    200,
  )
})

Deno.test('messages: only the two read it; limits; reports; no text in entries', async () => {
  restore()
  const kadi = await dev('kadi')
  const sena = await dev('sena')
  const yao = await dev('yao')
  const { id } = (await write(kadi, sena, 'Le **secret**')).json
  // A third developer sees nothing of it
  assertEquals((await yao.get('/api/conversation', { id })).status, 404)
  assertEquals(
    (await yao.call('/api/conversation/message', { id, body: 'x' })).status,
    404,
  )
  // Sizes and targets
  assertEquals((await write(kadi, sena, 'x'.repeat(2001))).status, 400)
  assertEquals((await write(kadi, sena, '   ')).status, 400)
  assertEquals((await write(kadi, kadi)).status, 400)
  assertEquals(
    (await kadi.call('/api/conversation/start', {
      username: 'nobody',
      body: 'x',
    })).status,
    404,
  )
  // Reports: by the reader, of a message received, once
  const messageId = (await sena.get('/api/conversation', { id })).json
    .messages[0].id
  const report = (who: Dev) =>
    who.call('/api/conversation/report', {
      message: messageId,
      reason: 'spam',
    })
  assertEquals((await report(yao)).status, 404)
  assertEquals((await report(kadi)).status, 400)
  assertEquals((await report(sena)).status, 204)
  assertEquals((await report(sena)).status, 204)
  assertEquals(
    db.prepare(
      "SELECT count(*) AS n FROM report WHERE targetType = 'direct_message'",
    ).get(),
    { n: 1 },
  )
  // The entry carries the conversation, never the text
  const data = db.prepare('SELECT data FROM entry WHERE type = ?').all(
    entries.DIRECT_MESSAGE_CREATED,
  ) as { data: string }[]
  assertEquals(data.length, 1)
  assertEquals(data[0].data.includes('secret'), false)
})

Deno.test('messages: 50 at a time, the older ones on demand', async () => {
  restore()
  const kadi = await dev('kadi')
  const sena = await dev('sena')
  const { id } = (await write(kadi, sena, 'm1')).json
  await sena.call('/api/conversation/accept', { id })
  for (let i = 2; i <= 55; i++) {
    await kadi.call('/api/conversation/message', { id, body: `m${i}` })
  }
  const page = (await sena.get('/api/conversation', { id })).json
  assertEquals([page.messages.length, page.more], [50, true])
  assertEquals(page.messages[0].body, 'm6')
  const older = (await sena.get('/api/conversation', {
    id,
    before: page.messages[0].id,
  })).json
  assertEquals(
    [older.messages.map((m: { body: string }) => m.body), older.more],
    [['m1', 'm2', 'm3', 'm4', 'm5'], false],
  )
})

Deno.test('messages: the list shows a message as plain text', async () => {
  const { excerpt } = await import('/api/messages.ts')
  assertEquals(
    excerpt(
      'Salut, j’ai vu **Dakar Transit** et [la PR](https://x.y/1).\n- `go test` passe\n```go\nfmt.Println()\n```',
    ),
    'Salut, j’ai vu Dakar Transit et la PR. go test passe [code]',
  )
  assertEquals(excerpt('x'.repeat(200)).length, 119)
})
