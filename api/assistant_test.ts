import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { now } from '@01edu/time'
import { ASK_PER_DAY, resetAssistant } from '/api/assistant.ts'
import { resetModels } from '/api/llm.ts'
import {
  HelpRequest,
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

// The Assistant (§11): it phrases the list of §10.3, the server keeps only
// what it cites from it, and the list stands without the model
const restore = makeRestorePoint()
const at = now()

// A fake Groq: what it answers, and what it was sent
let reply: (body: { messages: { content: string }[] }) => Response
let sent: { messages: { content: string }[] }[] = []
const realFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.hostname !== 'api.groq.com') return realFetch(input, init)
  const body = JSON.parse(String(init?.body))
  sent.push(body)
  return Promise.resolve(reply(body))
}
const says = (content: string) => () =>
  new Response(
    JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }),
  )

const setup = async ({ key = true } = {}) => {
  restore()
  resetAssistant()
  sent = []
  resetModels()
  // Groq alone: Meta and Gemini are left out without their key
  for (const name of ['META_API_KEY', 'GEMINI_API_KEY']) {
    Deno.env.delete(name)
  }
  key
    ? Deno.env.set('GROQ_API_KEY', 'test-key')
    : Deno.env.delete('GROQ_API_KEY')
  const session = await login()
  const cookie = `session=${session}`
  const me = await (await request('/api/user/me', { cookie })).json()
  const go = (db.prepare("SELECT skillId FROM skill WHERE name = 'Go'")
    .get() as { skillId: number }).skillId
  db.prepare('DELETE FROM userSkill WHERE userId = ?').run(me.userId)
  UserSkill.insert({
    userId: me.userId,
    skillId: go,
    source: 'github',
    createdAt: at,
  })
  const owner = User.insert({
    githubId: 9001,
    githubUsername: 'fatou',
    avatarUrl: '',
    source: 'demo',
    createdAt: at,
    updatedAt: at,
  })
  const projectId = Project.insert({
    ownerId: owner,
    name: 'Payments',
    slug: 'payments',
    description: '',
    visibility: 'public',
    status: 'active',
    source: 'github',
    createdAt: at,
    updatedAt: at,
    skills: [go],
  })
  ProjectMember.insert({
    projectId,
    userId: owner,
    role: 'owner',
    joinedAt: at,
  })
  const needId = ProjectNeed.insert({
    projectId,
    type: 'contribution',
    title: 'Un dev Go',
    skills: [go],
    status: 'open',
    createdAt: at,
    updatedAt: at,
  })
  const ask = async (question: string, page = '') => {
    const res = await request('/api/assistant/ask', {
      body: { question, page },
      cookie,
    })
    return { status: res.status, json: await res.json() }
  }
  const read = async () =>
    await (await request('/api/assistant', { cookie })).json()
  const clear = () => request('/api/assistant/clear', { body: {}, cookie })
  return { ask, read, clear, needId, me, owner, projectId }
}

const titles = (cards: { title: string }[]) => cards.map((c) => c.title)

Deno.test('assistant: without a key, the point alone, kept all the same', async () => {
  const { ask, read } = await setup({ key: false })
  const { json } = await ask('Sur quoi puis-je travailler aujourd’hui ?')
  assertEquals([json.fallback, json.content], [true, ''])
  assertEquals(titles(json.cards), ['Un dev Go'])
  assertEquals(sent, [])
  const { messages, point } = await read()
  assertEquals(
    messages.map((m: { role: string }) => m.role),
    ['user', 'assistant'],
  )
  // Before any question, the panel already shows what fits
  assertEquals(titles(point.cards), ['Un dev Go'])
})

Deno.test('assistant: cards and actions of the context only, no link of the model', async () => {
  const { ask, needId } = await setup()
  reply = says(
    `Commence par [need:${needId}] : ton Go y sert. Tu peux aussi [action:profile]. Détails sur https://evil.example/x`,
  )
  const { json } = await ask('Sur quel projet suis-je le plus utile ?')
  assertEquals(json.fallback, false)
  assertEquals(
    json.content,
    'Commence par « Un dev Go » : ton Go y sert. Tu peux aussi « Compléter mon profil ». Détails sur',
  )
  assertEquals(
    json.cards.map((c: { href: string }) => c.href),
    ['project/payments/team'],
  )
  assertEquals(json.actions, [
    { label: 'Compléter mon profil', href: 'profile/edit' },
  ])
  // In the sentence, each key is a link to what it names
  assertEquals(
    json.parts.filter((p: { href: string }) => p.href),
    [
      { text: 'Un dev Go', href: 'project/payments/team' },
      { text: 'Compléter mon profil', href: 'profile/edit' },
    ],
  )
  // The card leads to the need, and to its project
  assertEquals(json.cards[0].projectHref, 'project/payments')
  // The context travels as data, apart from the question
  assertStringIncludes(sent[0].messages[1].content, '<contexte>')
  assertStringIncludes(sent[0].messages[1].content, `need:${needId}`)
})

Deno.test('assistant: a model that fails, or makes a key up: the point', async () => {
  const { ask } = await setup()
  reply = () => new Response('busy', { status: 503 })
  assertEquals((await ask('Que faire ?')).json.fallback, true)
  reply = says('Prends [issue:invente#1], c’est facile.')
  assertEquals((await ask('Et maintenant ?')).json.fallback, true)
  reply = says('Clique sur [action:invente].')
  assertEquals((await ask('Et après ?')).json.fallback, true)
})

Deno.test('assistant: 30 questions a day, then a 429', async () => {
  const { ask } = await setup()
  reply = says('Rien de neuf.')
  for (let i = 0; i < ASK_PER_DAY; i++) {
    assertEquals((await ask(`Question ${i}`)).status, 200)
  }
  assertEquals((await ask('Une de plus')).status, 429)
})

Deno.test('assistant: a provider that fails passes to the next, then rests', async () => {
  const { ask, needId } = await setup()
  Deno.env.set('META_API_KEY', ' test-key ')
  const hosts: string[] = []
  reply = () =>
    new Response(JSON.stringify({
      choices: [{
        message: {
          content:
            `<think>Je cherche.</think>Va sur **Payments** : [ need:${needId} ].`,
        },
      }],
    }))
  const fake = globalThis.fetch
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    hosts.push(url.hostname)
    // Meta is down: Groq answers
    if (url.hostname === 'api.meta.ai') {
      return Promise.resolve(new Response('{}', { status: 400 }))
    }
    return fake(input, init)
  }
  try {
    const { json } = await ask('Par où commencer ?')
    assertEquals(json.content, 'Va sur Payments : « Un dev Go ».')
    await ask('Et ensuite ?')
    // Meta was tried once, then left to rest
    assertEquals(hosts, [
      'api.meta.ai',
      'api.groq.com',
      'api.groq.com',
    ])
  } finally {
    globalThis.fetch = fake
    Deno.env.delete('META_API_KEY')
  }
})

Deno.test('assistant: the conversation is kept, goes with the next question, and is erased', async () => {
  const { ask, read, clear } = await setup()
  reply = says('Première réponse.')
  await ask('Première question')
  reply = says('Deuxième réponse.')
  await ask('Deuxième question')
  // The model got the exchange before the question
  assertEquals(
    sent[1].messages.slice(2).map((m) => m.content),
    ['Première question', 'Première réponse.', 'Deuxième question'],
  )
  assertEquals(
    (await read()).messages.map((m: { content: string }) => m.content),
    [
      'Première question',
      'Première réponse.',
      'Deuxième question',
      'Deuxième réponse.',
    ],
  )
  await clear()
  assertEquals((await read()).messages, [])
})

Deno.test('assistant: what waits comes first, and the project of the page is read', async () => {
  const { ask, read, me, owner, projectId, needId } = await setup()
  HelpRequest.insert({
    authorId: me.userId,
    projectId,
    category: 'code_review',
    title: 'Relire ma PR',
    description: '',
    skills: [],
    status: 'delivered',
    acceptedBy: owner,
    acceptedAt: at,
    expiresAt: at + 7 * 86_400,
    source: 'platform',
    createdAt: at,
    updatedAt: at,
  })
  assertEquals(titles((await read()).point.cards), [
    'Relire ma PR',
    'Un dev Go',
  ])
  reply = says(`Sur ce projet, il y a [pneed:${needId}].`)
  const { json } = await ask(
    'Que puis-je faire sur ce projet ?',
    '/project/payments/issues',
  )
  assertEquals(json.content, 'Sur ce projet, il y a « Un dev Go ».')
  const context = sent[0].messages[1].content
  assertStringIncludes(context, '"currentPage":{"project":{"name":"Payments"')
  assertStringIncludes(context, '"type":"À confirmer"')
})

Deno.test('assistant: where a project stands: who merged what, what is left', async () => {
  const { ask, projectId } = await setup()
  const repositoryId = Repository.insert({
    projectId,
    githubId: 77,
    owner: 'fatou',
    name: 'payments',
    fullName: 'fatou/payments',
    defaultBranch: 'main',
    syncMode: 'poll',
    source: 'github',
  })
  const pull = (number: number, merged: boolean) =>
    PullRequest.insert({
      repositoryId,
      githubId: 500 + number,
      number,
      title: `PR ${number}`,
      state: merged ? 'merged' : 'open',
      authorGithubId: 9001,
      authorLogin: 'fatou',
      additions: 1,
      deletions: 1,
      branch: `b${number}`,
      mergedAt: merged ? at - 3600 : null,
      source: 'github',
      createdAt: at - 7200,
      updatedAt: at,
    })
  pull(7, true)
  pull(8, false)
  Issue.insert({
    repositoryId,
    githubId: 900,
    number: 3,
    title: 'Corriger le webhook',
    state: 'open',
    labels: ['bug'],
    authorGithubId: 1,
    source: 'github',
    createdAt: at,
    updatedAt: at,
  })
  reply = says('Fait : [merged:7]. En cours : [open:8]. Reste : [todo:3].')
  const { json } = await ask('Où en est ce projet ?', '/project/payments')
  assertEquals(
    json.cards.map((c: { type: string; href: string }) => [c.type, c.href]),
    [
      ['PR fusionnée', 'https://github.com/fatou/payments/pull/7'],
      ['PR sans review', 'https://github.com/fatou/payments/pull/8'],
      ['Issue ouverte', 'https://github.com/fatou/payments/issues/3'],
    ],
  )
  const context = sent[0].messages[1].content
  assertStringIncludes(context, '"mergedPullRequests":1')
  assertStringIncludes(context, '"by":"fatou"')
})
