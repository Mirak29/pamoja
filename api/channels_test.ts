import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { Follow, Profile, Project, ProjectMember, User } from '/api/schema.ts'
import { createSession } from '/api/session.ts'
import server from '/api/server.ts'
import { request } from '/api/testing.ts'

// Channel messages saved with their image (PAM-428, §6.8, §17.3)
const restore = makeRestorePoint()

let lastGithubId = 0
const dev = async (login: string) => {
  const at = now()
  const userId = User.insert({
    githubId: ++lastGithubId,
    githubUsername: login,
    avatarUrl: '',
    source: 'github',
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
  const cookie = `session=${await createSession(userId, 'demo')}`
  const call = async (path: string, body?: unknown) => {
    const res = await request(path, { body, cookie })
    return { status: res.status, json: await res.json().catch(() => null) }
  }
  const upload = async () => {
    const bytes = new Uint8Array(33)
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
    bytes.set([0x49, 0x48, 0x44, 0x52], 12)
    new DataView(bytes.buffer).setUint32(16, 1200)
    new DataView(bytes.buffer).setUint32(20, 800)
    const body = new FormData()
    body.append('file', new File([bytes], 'capture.png'))
    const res = await server.fetch(
      new Request('http://localhost/api/media/upload', {
        method: 'POST',
        body,
        headers: { Cookie: cookie },
      }),
    )
    return (await res.json()).id as number
  }
  // The image as a reader of the channel asks for it
  const see = async (key: string) =>
    (await server.fetch(
      new Request(`http://localhost/api/media?key=${key}`, {
        headers: { Cookie: cookie },
      }),
    )).status
  return { userId, call, upload, see }
}

// Abdou owns the project, Fatou contributes, Awa follows, Yao is a stranger
const team = async () => {
  const [abdou, fatou, awa, yao] = await Promise.all(
    ['abdou', 'fatou', 'awa', 'yao'].map(dev),
  )
  const projectId = Project.insert({
    ownerId: abdou.userId,
    name: 'OpenPay Africa',
    slug: 'openpay-africa',
    description: '',
    visibility: 'public',
    status: 'beta',
    source: 'demo',
    createdAt: now(),
    updatedAt: now(),
  })
  for (
    const [who, role] of [[abdou, 'owner'], [fatou, 'contributor']] as const
  ) {
    ProjectMember.insert({
      projectId,
      userId: who.userId,
      role,
      joinedAt: now(),
    })
  }
  Follow.insert({
    followerId: awa.userId,
    targetType: 'project',
    targetId: projectId,
    createdAt: now(),
  })
  return { abdou, fatou, awa, yao }
}

const message = (channel: string, body: string, media?: number[]) => ({
  project: 'openpay-africa',
  channel,
  body,
  media,
})

Deno.test('channels: a message with its image, read by the channel readers', async () => {
  restore()
  const { abdou, fatou, awa, yao } = await team()
  const shot = await fatou.upload()
  const sent = await fatou.call(
    '/api/project/message/create',
    message('general', 'La CI passe, voici le rapport.', [shot]),
  )
  assertEquals(sent.status, 200)
  assertEquals(sent.json.media.map((m: { id: number }) => m.id), [shot])
  const key = sent.json.media[0].key
  const [seen] =
    (await abdou.call('/api/project/messages?project=openpay-africa'))
      .json
  assertEquals([seen.author, seen.channel, seen.media.length], [
    'fatou',
    'general',
    1,
  ])
  assertEquals(await abdou.see(key), 200)
  // #général is for the members: a follower or a stranger sees nothing
  assertEquals(
    (await awa.call('/api/project/messages?project=openpay-africa')).json,
    [],
  )
  assertEquals(await awa.see(key), 404)
  assertEquals(await yao.see(key), 404)
})

Deno.test('channels: #annonces is written by the leads, read by followers', async () => {
  restore()
  const { abdou, fatou, awa, yao } = await team()
  const refused = await fatou.call(
    '/api/project/message/create',
    message('announcements', 'Release v0.4'),
  )
  assertEquals(refused.status, 403)
  const shot = await abdou.upload()
  const sent = await abdou.call(
    '/api/project/message/create',
    message('announcements', 'Release v0.4', [shot]),
  )
  assertEquals(sent.status, 200)
  const read = (await awa.call('/api/project/messages?project=openpay-africa'))
    .json
  assertEquals(read.map((m: { body: string }) => m.body), ['Release v0.4'])
  assertEquals(await awa.see(sent.json.media[0].key), 200)
  assertEquals(
    (await yao.call('/api/project/message/create', message('general', 'Salut')))
      .status,
    403,
  )
})

Deno.test('channels: members answer in a thread, readers give a +1 (PAM-406)', async () => {
  restore()
  const { abdou, fatou, awa, yao } = await team()
  const news = (await abdou.call(
    '/api/project/message/create',
    message('announcements', 'Release v0.4'),
  )).json
  const reply = (body: string, parent: number, channel = 'announcements') => ({
    ...message(channel, body),
    parent,
  })
  // A member answers an announcement she cannot post; a follower reads it
  const answer = await fatou.call(
    '/api/project/message/create',
    reply('Bravo !', news.id),
  )
  assertEquals([answer.status, answer.json.parent], [200, news.id])
  assertEquals(
    (await awa.call('/api/project/message/create', reply('Merci', news.id)))
      .status,
    403,
  )
  // A thread stays in its channel, and never goes one level deeper
  for (
    const input of [
      reply('Ailleurs', news.id, 'general'),
      reply('Plus bas', answer.json.id),
    ]
  ) {
    assertEquals(
      (await fatou.call('/api/project/message/create', input)).status,
      403,
    )
  }
  const read = (await awa.call('/api/project/messages?project=openpay-africa'))
    .json
  assertEquals(
    read.map((m: { body: string; parent: number }) => [m.body, m.parent]),
    [['Release v0.4', 0], ['Bravo !', news.id]],
  )

  // A +1 once per developer, taken back, by the readers of the channel
  const like = (who: typeof awa, on: boolean) =>
    who.call('/api/project/message/like', { message: news.id, on })
  assertEquals((await like(awa, true)).json, { likes: 1, liked: true })
  assertEquals((await like(awa, true)).json, { likes: 1, liked: true })
  assertEquals((await like(fatou, true)).json, { likes: 2, liked: true })
  assertEquals((await like(awa, false)).json, { likes: 1, liked: false })
  assertEquals((await like(yao, true)).status, 404)
  const [seen] =
    (await fatou.call('/api/project/messages?project=openpay-africa')).json
  assertEquals([seen.likes, seen.liked], [1, true])
})

Deno.test('channels: checked before anything is saved', async () => {
  restore()
  const { abdou, fatou } = await team()
  const theirs = await fatou.upload()
  const refused = [
    message('tracking', 'Une alerte'),
    message('general', '   '),
    message('general', 'Deux images', [
      await abdou.upload(),
      await abdou.upload(),
    ]),
    message('general', 'Pas la mienne', [theirs]),
  ]
  for (const input of refused) {
    assertEquals(
      (await abdou.call('/api/project/message/create', input)).status,
      400,
    )
  }
  assertEquals(
    (await abdou.call('/api/project/message/create', {
      ...message('general', 'Ailleurs'),
      project: 'nope',
    })).status,
    404,
  )
  assertEquals(
    (await abdou.call('/api/project/messages?project=openpay-africa')).json,
    [],
  )
})

Deno.test('channels: what each one read, kept per channel (PAM-412)', async () => {
  restore()
  const { abdou, awa, yao } = await team()
  const states = async (who: typeof abdou) =>
    (await who.call('/api/project/channels?project=openpay-africa')).json as {
      channel: string
      lastReadAt: number
      notify: string
    }[]
  // Never opened: nothing read; #suivi speaks only of my PRs by default
  assertEquals(
    (await states(abdou)).map((s) => [s.channel, s.lastReadAt, s.notify]),
    [
      ['general', 0, 'all'],
      ['help', 0, 'all'],
      ['announcements', 0, 'all'],
      ['tracking', 0, 'mine'],
    ],
  )
  const read = { project: 'openpay-africa', channel: 'general' }
  assertEquals(
    (await abdou.call('/api/project/channel/read', read)).status,
    204,
  )
  const [general] = await states(abdou)
  assertEquals(general.lastReadAt > 0, true)
  // A follower reads #suivi and #annonces only; a stranger nothing
  assertEquals((await states(awa)).map((s) => s.channel), [
    'tracking',
    'announcements',
  ])
  assertEquals((await awa.call('/api/project/channel/read', read)).status, 403)
  assertEquals(await states(yao), [])
})

Deno.test('channels: what reaches me from a channel', async () => {
  restore()
  const { abdou } = await team()
  const notify = (channel: string, value: string) =>
    abdou.call('/api/project/channel/notify', {
      project: 'openpay-africa',
      channel,
      notify: value,
    })
  assertEquals((await notify('general', 'none')).status, 204)
  assertEquals((await notify('tracking', 'all')).status, 204)
  // « Only my PRs » is for #suivi
  assertEquals((await notify('help', 'mine')).status, 400)
  assertEquals((await notify('help', 'loud')).status, 400)
  // Reading keeps the setting
  await abdou.call('/api/project/channel/read', {
    project: 'openpay-africa',
    channel: 'general',
  })
  const saved =
    (await abdou.call('/api/project/channels?project=openpay-africa'))
      .json as { channel: string; notify: string }[]
  assertEquals(saved.map((s) => [s.channel, s.notify]), [
    ['general', 'none'],
    ['help', 'all'],
    ['announcements', 'all'],
    ['tracking', 'all'],
  ])
})
