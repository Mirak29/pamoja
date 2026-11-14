import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import { seed } from '/api/seed.ts'
import { userIdOfLogin } from '/api/user.ts'
import { createPost } from '/api/posts.ts'
import { reportContent } from '/api/reports.ts'

const restore = makeRestorePoint()

const hiddenAt = (postId: number) =>
  (db.prepare('SELECT hiddenAt FROM post WHERE postId = ?')
    .get(postId) as { hiddenAt: number | null }).hiddenAt

Deno.test('report: a post hides itself past three reporters (PAM-508)', () => {
  restore()
  seed()
  const abdou = userIdOfLogin('abdou')!
  const [moussa, awa, fatou] = ['moussa', 'awa', 'fatou'].map((login) =>
    userIdOfLogin(login)!
  )
  const post = createPost(abdou, {
    community: '',
    type: 'Discussion',
    title: '',
    body: 'Un post qui sera signalé',
  }).id

  // The author cannot report their own content
  assertThrows(() => reportContent(abdou, 'post', post, 'Spam', ''))

  // The first two reporters do not hide it
  assertEquals(reportContent(moussa, 'post', post, 'Spam', '').hidden, false)
  assertEquals(reportContent(awa, 'post', post, 'Spam', '').hidden, false)
  assertEquals(hiddenAt(post), null)

  // The third distinct reporter hides it (§10.5)
  assertEquals(reportContent(fatou, 'post', post, 'Spam', '').hidden, true)
  assert((hiddenAt(post) ?? 0) > 0)

  // A reporter cannot report the same content twice
  assertThrows(() => reportContent(moussa, 'post', post, 'Spam', ''))
})

Deno.test('report: an unknown post is refused (PAM-508)', () => {
  restore()
  seed()
  const moussa = userIdOfLogin('moussa')!
  assertThrows(() => reportContent(moussa, 'post', 999999, 'Spam', ''))
})
