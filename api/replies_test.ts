import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import {
  acceptAnswer,
  createPost,
  createReply,
  readThread,
} from '/api/posts.ts'
import { listNotifications } from '/api/notifications.ts'

const restore = makeRestorePoint()

const question = (me: number, body: string) =>
  createPost(me, { community: '', type: 'Question', title: 'Q', body }).id

Deno.test('replies: a reply hangs under its post and the thread reads it back (PAM-512)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const post = question(abdou, 'Comment régler le verrou SQLite ?')

  const reply = createReply(moussa, post, 'Un seul writer derrière un channel.')
  assertEquals(reply.author, 'moussa')
  assertEquals(reply.type, 'Réponse')

  const thread = readThread(abdou, post)
  assertEquals(thread.rootId, post)
  assertEquals(thread.acceptedReplyId, 0)
  // The root and the reply, the reply pointing at the root
  assertEquals(thread.posts.length, 2)
  const saved = thread.posts.find((p) => p.id === reply.id)!
  assertEquals(saved.parentId, post)

  // An empty reply or an unknown post is refused
  assertThrows(() => createReply(moussa, post, '   '))
  assertThrows(() => createReply(moussa, 999999, 'Bonjour'))
})

Deno.test('accept: only the author accepts, once, and the answerer is told (PAM-512)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const fatou = userIdOfLogin('fatou')!
  const post = question(abdou, 'Quelle pile pour le temps réel ?')
  const reply = createReply(moussa, post, 'SSE + entries, comme Tournament.')

  // A developer who is not the author cannot accept
  assertThrows(() => acceptAnswer(fatou, post, reply.id))
  // The author cannot accept their own answer
  const mine = createReply(abdou, post, 'Je réponds à moi-même')
  assertThrows(() => acceptAnswer(abdou, post, mine.id))

  assertEquals(acceptAnswer(abdou, post, reply.id).accepted, true)
  assertEquals(readThread(abdou, post).acceptedReplyId, reply.id)
  // Accepting twice is refused
  assertThrows(() => acceptAnswer(abdou, post, reply.id))

  // The answerer gets a notification that counts in their reputation
  const inbox = listNotifications(moussa).items
  const notif = inbox.find((n) => n.type === 'answer_accepted')!
  assert(notif, 'the answerer is notified')
  assertEquals(notif.postId, post)
  assertEquals(notif.eligible, 1)
})

Deno.test('accept: a reply must belong to the question (PAM-512)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const one = question(abdou, 'Première question')
  const two = question(abdou, 'Seconde question')
  const reply = createReply(moussa, two, 'Réponse à la seconde')

  // The reply of another question does not count for this one
  assertThrows(() => acceptAnswer(abdou, one, reply.id))
})

Deno.test('thread: a hidden reply leaves with its own replies (PAM-508)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const moussa = userIdOfLogin('moussa')!
  const post = question(abdou, 'Une question')
  const reply = createReply(moussa, post, 'Une réponse')
  const under = createReply(abdou, reply.id, 'Une réponse à la réponse')
  const other = createReply(moussa, post, 'Une autre réponse')
  db.prepare('UPDATE post SET hiddenAt = 1 WHERE postId = ?').run(reply.id)
  // The root and the other reply; nothing points to the hidden one
  assertEquals(
    readThread(abdou, post).posts.map((p) => p.id),
    [post, other.id],
  )
  assert(!readThread(abdou, post).posts.some((p) => p.id === under.id))
})
