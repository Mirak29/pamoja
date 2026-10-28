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
