import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { createPost, createReply } from '/api/posts.ts'
import { createChannelMessage } from '/api/channels.ts'
import { setBlocked } from '/api/messages.ts'
import { mentionsOf, suggestMentions } from '/api/mentions.ts'

const restore = makeRestorePoint()

// The mentions a developer received, newest first
const mentions = (login: string) =>
  db.prepare(
    `SELECT json_extract(payload, '$.excerpt') AS excerpt FROM notification
     WHERE userId = ? AND type = 'mention' ORDER BY notificationId DESC`,
  ).all(userIdOfLogin(login)!) as { excerpt: string }[]

const post = (me: number, body: string) =>
  createPost(me, { community: '', type: 'Discussion', title: '', body })

Deno.test('mentions: the logins of a text, once each, never inside an email', () => {
  assertEquals(
    mentionsOf('Merci @Moussa et @fatou ! @moussa encore, pas moussa@mail.sn'),
    ['moussa', 'fatou'],
  )
  assertEquals(mentionsOf('@a @b @c @d @e @f @g @h @i @j @k @l').length, 10)
})

Deno.test('mentions: a post tells who it names, not its author nor a stranger', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  post(abdou, 'Une review de @moussa sur la PR #81, merci @abdou et @personne')
  assertEquals(mentions('moussa').length, 1)
  assertEquals(
    mentions('moussa')[0].excerpt.startsWith('Une review de @moussa'),
    true,
  )
  // Never the author, and an unknown login is no one
  assertEquals(mentions('abdou').length, 0)
})

Deno.test('mentions: a reply does not tell twice the author it answers', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const root = post(abdou, 'Qui connaît SQLite ?').id
  createReply(moussa, root, '@abdou regarde le mode WAL, et @fatou aussi')
  // Abdou is told of the reply already, Fatou of the mention
  assertEquals(mentions('abdou').length, 0)
  assertEquals(mentions('fatou').length, 1)
})

Deno.test('mentions: never across a block', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  setBlocked(userIdOfLogin('moussa')!, 'abdou', true)
  post(abdou, 'Merci @moussa')
  assertEquals(mentions('moussa').length, 0)
})

Deno.test('mentions: a channel tells only who can read it', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  // Fatou is a member of OpenPay Africa, Moussa is not
  createChannelMessage(abdou, {
    project: 'openpay-africa',
    channel: 'general',
    body: '@fatou et @moussa, la démo est jeudi',
  })
  assertEquals(mentions('fatou').length, 1)
  assertEquals(mentions('moussa').length, 0)
})

Deno.test('mentions: suggestions by login or name, never oneself', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  assertEquals(suggestMentions(abdou, 'mou').map((s) => s.login), ['moussa'])
  // A word of the name finds them too
  assertEquals(
    suggestMentions(abdou, 'diallo').map((s) => s.login).includes('moussa'),
    true,
  )
  assertEquals(suggestMentions(abdou, 'abd').length, 0)
  // What is typed is text, not a pattern
  assertEquals(suggestMentions(abdou, '%').length, 0)
})
