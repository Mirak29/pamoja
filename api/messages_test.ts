import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { entries } from '/api/entry-types.ts'
import { cleanMedia, MEDIA_DIR } from '/api/media.ts'
import { previewMessage } from '/api/messages.ts'
import { Media, Profile, Project, User } from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import server from '/api/server.ts'
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
  return { userId, login, call, get, cookie: `session=${session}` }
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
    last:
      | { excerpt: string; deleted: boolean; mine: boolean; at: number }
      | null
    with: { login: string }
    muted: boolean
    archived: boolean
    online: boolean
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
  // Written over time: within the limit of 20 a minute (§10.6)
  for (let i = 2; i <= 55; i++) {
    db.exec(`INSERT INTO directMessage (conversationId, authorId, body,
      createdAt) VALUES (${id}, ${kadi.userId}, 'm${i}', ${now() - 3600 + i})`)
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

Deno.test('messages: limits against spam, kept in the database (§10.6)', async () => {
  restore()
  const kadi = await dev('kadi')
  // 10 requests to strangers a day; the 11th waits
  const strangers = await Promise.all(
    Array.from({ length: 11 }, (_, i) => dev(`stranger${i}`)),
  )
  for (const stranger of strangers.slice(0, 10)) {
    assertEquals((await write(kadi, stranger)).status, 200)
  }
  const refused = await request('/api/conversation/start', {
    body: { username: 'stranger10', body: 'Salut' },
    cookie: kadi.cookie,
  })
  assertEquals(refused.status, 429)
  const body = await refused.json()
  assertEquals(body.message, 'Too many requests')
  assertEquals(body.retryAfter > 23 * 3600, true)
  assertEquals(refused.headers.get('retry-after'), String(body.retryAfter))

  // 20 messages a minute
  const sena = await dev('sena')
  const { id } = (await write(sena, kadi, 'm1')).json
  await kadi.call('/api/conversation/accept', { id })
  for (let i = 2; i <= 20; i++) {
    await sena.call('/api/conversation/message', { id, body: `m${i}` })
  }
  assertEquals(
    (await sena.call('/api/conversation/message', { id, body: 'm21' })).status,
    429,
  )
  // A minute later, it goes again
  db.exec('UPDATE directMessage SET createdAt = createdAt - 61')
  assertEquals(
    (await sena.call('/api/conversation/message', { id, body: 'm21' })).status,
    200,
  )

  // 30 reports a day
  const messages = (await kadi.get('/api/conversation', { id })).json.messages
  for (const message of messages.slice(0, 20)) {
    await kadi.call('/api/conversation/report', {
      message: message.id,
      reason: 'spam',
    })
  }
  for (let i = 1; i <= 10; i++) {
    db.exec(`INSERT INTO report (reporterId, targetType, targetId, reason,
      status, createdAt) VALUES (${kadi.userId}, 'direct_message', ${
      1000 + i
    }, 'spam', 'open', ${now()})`)
  }
  assertEquals(
    (await kadi.call('/api/conversation/report', {
      message: messages[20].id,
      reason: 'spam',
    })).status,
    429,
  )
})

const open = async (who: Dev, id: number) =>
  (await who.get('/api/conversation', { id })).json as {
    readUpTo: number
    muted: boolean
    archived: boolean
    messages: {
      id: number
      body: string
      edited: boolean
      deleted: boolean
      replyTo: { id: number; excerpt: string; deleted: boolean } | null
      reactions: { emoji: string; count: number; mine: boolean }[]
      attachments: { key: string; image: boolean; name: string }[]
      preview: Record<string, string> | null
    }[]
  }

/** Kadi and Sena, in an accepted conversation */
const talking = async () => {
  restore()
  const kadi = await dev('kadi')
  const sena = await dev('sena')
  const { id } = (await write(kadi, sena, 'Premier **message**')).json
  await sena.call('/api/conversation/accept', { id })
  return { kadi, sena, id }
}

Deno.test("messages: edit and delete one's own message (PAM-523)", async () => {
  const { kadi, sena, id } = await talking()
  const [first] = (await open(sena, id)).messages
  // Only its author
  assertEquals(
    (await sena.call('/api/conversation/message/edit', {
      id: first.id,
      body: 'x',
    })).status,
    404,
  )
  await kadi.call('/api/conversation/message/edit', {
    id: first.id,
    body: 'Premier message, corrigé',
  })
  let message = (await open(sena, id)).messages[0]
  assertEquals([message.body, message.edited], [
    'Premier message, corrigé',
    true,
  ])
  await sena.call('/api/conversation/message/react', {
    id: first.id,
    emoji: '👍',
  })
  assertEquals(
    (await kadi.call('/api/conversation/message/delete', { id: first.id }))
      .status,
    204,
  )
  message = (await open(sena, id)).messages[0]
  // Its place stays, never its text nor its reactions
  assertEquals(
    [message.body, message.deleted, message.edited, message.reactions],
    ['', true, false, []],
  )
  const last = (await list(sena))[0].last!
  assertEquals([last.excerpt, last.deleted, last.mine], ['', true, false])
  assertEquals(
    (await kadi.call('/api/conversation/message/edit', {
      id: first.id,
      body: 'x',
    })).status,
    404,
  )
})

Deno.test('messages: reply to a message, react to it (PAM-525)', async () => {
  const { kadi, sena, id } = await talking()
  const [first] = (await open(sena, id)).messages
  await sena.call('/api/conversation/message', {
    id,
    body: 'Je réponds',
    replyTo: first.id,
  })
  const answer = (await open(kadi, id)).messages[1]
  assertEquals(
    answer.replyTo,
    {
      id: first.id,
      author: 'kadi',
      excerpt: 'Premier message',
      deleted: false,
    } as typeof answer.replyTo,
  )
  // A message of another conversation cannot be answered
  const yao = await dev('yao')
  const other = (await write(yao, kadi, 'Autre')).json.id
  const elsewhere = (await open(kadi, other)).messages[0].id
  assertEquals(
    (await sena.call('/api/conversation/message', {
      id,
      body: 'x',
      replyTo: elsewhere,
    })).status,
    400,
  )
  // Reactions: one of the list, toggled, counted
  const react = (who: Dev, emoji: string) =>
    who.call('/api/conversation/message/react', { id: first.id, emoji })
  assertEquals((await react(sena, '🦄')).status, 400)
  await react(sena, '👍')
  await react(kadi, '👍')
  await react(kadi, '🎉')
  assertEquals((await open(kadi, id)).messages[0].reactions, [
    { emoji: '👍', count: 2, mine: true },
    { emoji: '🎉', count: 1, mine: true },
  ])
  await react(kadi, '👍')
  assertEquals((await open(sena, id)).messages[0].reactions, [
    { emoji: '👍', count: 1, mine: true },
    { emoji: '🎉', count: 1, mine: false },
  ])
  // A third developer reacts to nothing here
  assertEquals((await react(yao, '👍')).status, 404)
})

Deno.test('messages: new messages line, unread again, mute, archive (PAM-526)', async () => {
  const { kadi, sena, id } = await talking()
  await sena.call('/api/conversation/read', { id })
  const read = (await open(sena, id)).readUpTo
  await kadi.call('/api/conversation/message', { id, body: 'Nouveau' })
  // Sena's reading tells where the new ones start
  const view = await open(sena, id)
  assertEquals(view.readUpTo, read)
  // Read again: unread from a message received
  await sena.call('/api/conversation/unread', {
    id,
    from: view.messages[0].id,
  })
  assertEquals((await list(sena))[0].unread, 2)
  assertEquals(
    (await sena.call('/api/conversation/unread', {
      id,
      from: 999,
    })).status,
    400,
  )
  // Muted and archived: flags of Sena only
  await sena.call('/api/conversation/mute', { id, muted: true })
  await sena.call('/api/conversation/archive', { id, archived: true })
  const [mine] = await list(sena)
  assertEquals([mine.muted, mine.archived], [true, true])
  assertEquals(
    [(await list(kadi))[0].muted, (await list(kadi))[0].archived],
    [false, false],
  )
  // A new message brings it back from the archives
  await kadi.call('/api/conversation/message', { id, body: 'Tu es là ?' })
  assertEquals((await list(sena))[0].archived, false)
  assertEquals((await list(sena))[0].muted, true)
})

Deno.test("messages: search one's conversations only (PAM-527)", async () => {
  const { kadi, sena, id } = await talking()
  await kadi.call('/api/conversation/message', {
    id,
    body: 'Le bug du **ledger** 100% réglé',
  })
  const yao = await dev('yao')
  const other = (await write(yao, sena, 'Le ledger aussi chez moi')).json.id
  const search = async (who: Dev, q: string) =>
    (await who.get('/api/conversations/search', { q } as never)).json
  const found = await search(kadi, 'ledger')
  assertEquals(found.length, 1)
  assertEquals(found[0].conversationId, id)
  assertEquals(found[0].message.snippet, 'Le bug du ledger 100% réglé')
  // Sena finds both of hers; « % » is a character, not a wildcard
  assertEquals((await search(sena, 'ledger')).length, 2)
  assertEquals((await search(sena, '100%')).length, 1)
  // Wildcards are characters: « %% » is in no message
  assertEquals((await search(sena, '%%')).length, 0)
  assertEquals(
    (await sena.get('/api/conversations/search', { q: 'a' } as never)).status,
    400,
  )
  assertEquals(other > 0, true)
})

// The event stream of a developer, read as text until it is quiet
const stream = async (who: Dev) => {
  const res = await server.fetch(
    new Request('http://localhost/api/events', {
      headers: { Accept: 'text/event-stream', Cookie: who.cookie },
    }),
  )
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let pending: ReturnType<typeof reader.read> | undefined
  const read = async (wait = 50) => {
    let text = ''
    while (true) {
      pending ??= reader.read()
      let timer: ReturnType<typeof setTimeout> | undefined
      const chunk = await Promise.race([
        pending,
        new Promise<undefined>((resolve) => timer = setTimeout(resolve, wait)),
      ])
      clearTimeout(timer)
      if (!chunk || chunk.done) return text
      pending = undefined
      text += decoder.decode(chunk.value)
    }
  }
  return { read, close: () => reader.cancel() }
}

Deno.test('messages: online and typing, in memory, to the other one only (PAM-524)', async () => {
  const { kadi, sena, id } = await talking()
  const online = async (who: Dev) => (await list(who))[0].online
  assertEquals(await online(kadi), false)
  const kadiEvents = await stream(kadi)
  await kadiEvents.read()
  // Sena opens Pamoja: Kadi is told, and sees her online
  const senaEvents = await stream(sena)
  await senaEvents.read()
  assertEquals(
    await kadiEvents.read(),
    'event: presence\ndata: {"login":"sena","online":true}\n\n',
  )
  assertEquals([await online(kadi), await online(sena)], [true, true])
  // Sena types: Kadi is told which conversation, never the text; once
  // every 2 s at most
  assertEquals(
    (await sena.call('/api/conversation/typing', { id })).status,
    204,
  )
  await sena.call('/api/conversation/typing', { id })
  assertEquals(
    await kadiEvents.read(),
    `event: typing\ndata: {"conversationId":${id}}\n\n`,
  )
  assertEquals(await senaEvents.read(), '')
  // A stranger's request: no presence, no typing
  const yao = await dev('yao')
  const request = (await write(yao, sena, 'Bonjour')).json.id
  assertEquals((await list(yao))[0].online, false)
  await sena.call('/api/conversation/typing', { id: request })
  assertEquals(
    (await yao.call('/api/conversation/typing', { id })).status,
    404,
  )
  // A block hides it both ways
  await sena.call('/api/user/block', { username: 'kadi', blocked: true })
  assertEquals([await online(kadi), await online(sena)], [false, false])
  await sena.call('/api/user/block', { username: 'kadi', blocked: false })
  // Sena closes her tab: offline at once for a new reading
  await senaEvents.close()
  assertEquals(await online(kadi), false)
  await kadiEvents.close()
})

/*
 * Images, files and link previews (PAM-409, PAM-528)
 */

// A PNG header is all the server reads: the type, then the size
const png = (width = 800, height = 600, pad = 0) => {
  const bytes = new Uint8Array(33 + pad)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}
const pdf = () => new TextEncoder().encode('%PDF-1.4\n%fake\n')

const uploadFile = async (
  who: Dev,
  bytes: Uint8Array<ArrayBuffer> | null,
  name = 'capture.png',
) => {
  const form = new FormData()
  bytes && form.append('file', new File([bytes], name))
  const res = await server.fetch(
    new Request('http://localhost/api/media/upload', {
      method: 'POST',
      body: form,
      headers: { Cookie: who.cookie },
    }),
  )
  return { status: res.status, json: await res.json().catch(() => null) }
}

const fetchMedia = (who: Dev, key: string) =>
  server.fetch(
    new Request(`http://localhost/api/media?key=${key}`, {
      headers: { Cookie: who.cookie },
    }),
  )

Deno.test('uploads: the type on the bytes, sizes, owner only, 24 h, 20 an hour (PAM-409)', async () => {
  restore()
  const kadi = await dev('kadi')
  const sena = await dev('sena')
  const image = await uploadFile(kadi, png())
  assertEquals(image.status, 200)
  assertEquals(
    [image.json.mime, image.json.image, image.json.width, image.json.height],
    ['image/png', true, 800, 600],
  )
  // A name says nothing: text or a GIF named .png are refused
  const text = new TextEncoder().encode('<script>alert(1)</script>')
  assertEquals((await uploadFile(kadi, text)).status, 415)
  const gif = new TextEncoder().encode('GIF89a\u0001\u0000\u0001\u0000')
  assertEquals((await uploadFile(kadi, gif, 'a.png')).status, 415)
  assertEquals(
    (await uploadFile(kadi, png(800, 600, 2 * 1024 * 1024))).status,
    413,
  )
  assertEquals((await uploadFile(kadi, png(5000, 10))).status, 400)
  assertEquals((await uploadFile(kadi, null)).status, 400)
  // A PDF keeps a clean name, never a path
  const file = await uploadFile(kadi, pdf(), '../../etc/"plan".pdf')
  assertEquals([file.json.image, file.json.name], [false, 'plan.pdf'])
  // Not attached: its owner only
  const own = await fetchMedia(kadi, image.json.key)
  assertEquals(own.status, 200)
  assertEquals(own.headers.get('content-type'), 'image/png')
  assertEquals(own.headers.get('x-content-type-options'), 'nosniff')
  await own.body?.cancel()
  assertEquals((await fetchMedia(sena, image.json.key)).status, 404)
  assertEquals((await fetchMedia(kadi, '../pamoja.db')).status, 404)
  // Never attached after 24 h: gone, file included
  assertEquals(cleanMedia(now() + 25 * 3600), 2)
  assertEquals((await fetchMedia(kadi, image.json.key)).status, 404)
  // 20 an hour
  for (let i = 0; i < 20; i++) {
    Media.insert({
      ownerId: sena.userId,
      storageKey: `${i}`,
      mime: 'image/png',
      width: 1,
      height: 1,
      bytes: 1,
      fileName: null,
      targetType: null,
      targetId: null,
      position: 0,
      hiddenAt: null,
      source: 'platform',
      createdAt: now(),
    })
  }
  assertEquals((await uploadFile(sena, png())).status, 429)
})

Deno.test('messages: images and files, for the two of the conversation only (PAM-528)', async () => {
  const { kadi, sena, id } = await talking()
  const image = (await uploadFile(kadi, png())).json
  const file = (await uploadFile(kadi, pdf(), 'plan.pdf')).json
  // Files alone make a message; nothing at all does not
  const sent = await kadi.call('/api/conversation/message', {
    id,
    body: '',
    attachments: [image.id, file.id],
  })
  assertEquals(sent.status, 200)
  assertEquals(
    (await kadi.call('/api/conversation/message', { id, body: ' ' })).status,
    400,
  )
  const [, message] = (await open(sena, id)).messages
  assertEquals(
    message.attachments.map((a) => [a.image, a.name]),
    [[true, ''], [false, 'plan.pdf']],
  )
  // Both read them; a third one never
  const shown = await fetchMedia(sena, image.key)
  assertEquals(shown.status, 200)
  await shown.body?.cancel()
  const download = await fetchMedia(sena, file.key)
  assertEquals(
    download.headers.get('content-disposition'),
    "attachment; filename*=UTF-8''plan.pdf",
  )
  await download.body?.cancel()
  const yao = await dev('yao')
  assertEquals((await fetchMedia(yao, image.key)).status, 404)
  // An upload is attached once, by its owner, four at most
  const again = (body: string, attachments: number[], who = kadi) =>
    who.call('/api/conversation/message', { id, body, attachments })
  assertEquals((await again('Encore', [image.id])).status, 400)
  const senaImage = (await uploadFile(sena, png())).json
  assertEquals((await again('Le sien', [senaImage.id])).status, 400)
  const five = []
  for (let i = 0; i < 5; i++) five.push((await uploadFile(kadi, png())).json.id)
  assertEquals((await again('Cinq', five)).status, 400)
  // A message of files alone may lose its text
  assertEquals(
    (await kadi.call('/api/conversation/message/edit', {
      id: sent.json.id,
      body: '',
    })).status,
    204,
  )
  // Deleted: the files go with it
  await kadi.call('/api/conversation/message/delete', { id: sent.json.id })
  assertEquals((await fetchMedia(sena, image.key)).status, 404)
  let onDisk = true
  try {
    Deno.statSync(`${MEDIA_DIR}/${image.key}`)
  } catch {
    onDisk = false
  }
  assertEquals(onDisk, false)
})

Deno.test('messages: the preview of the first link, in an accepted conversation (PAM-528)', async () => {
  const { kadi, sena, id } = await talking()
  const page =
    '<title>Kora</title><meta name="description" content="Un ledger">'
  const deps = {
    resolve: () => Promise.resolve(['93.184.216.34']),
    fetch: () =>
      Promise.resolve(
        new Response(page, { headers: { 'Content-Type': 'text/html' } }),
      ),
  }
  const { json } = await kadi.call('/api/conversation/message', {
    id,
    body: 'Regarde https://kora.dev/docs.',
  })
  await previewMessage(json.id, deps)
  const last = async () => (await open(sena, id)).messages.at(-1)!
  assertEquals((await last()).preview, {
    url: 'https://kora.dev/docs',
    title: 'Kora',
    description: 'Un ledger',
    site: 'kora.dev',
  })
  // Edited: the preview goes; the new text has no link
  await kadi.call('/api/conversation/message/edit', {
    id: json.id,
    body: 'Sans lien finalement',
  })
  assertEquals((await last()).preview, null)
  await previewMessage(json.id, deps)
  assertEquals((await last()).preview, null)
  // A request stays text
  const yao = await dev('yao')
  const request = (await write(yao, sena, 'Vu sur https://kora.dev/docs')).json
    .id
  const [first] = (await open(sena, request)).messages
  await previewMessage(first.id, deps)
  assertEquals((await open(sena, request)).messages[0].preview, null)
})
