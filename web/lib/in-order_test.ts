import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { inOrder, readingStarts, setInOrder } from '/web/lib/in-order.ts'

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

Deno.test('in order: two quick clicks reach the server in their order, the last decides', async () => {
  const received: boolean[] = []
  // The first write is slow: sent at once, the second would pass it
  const save = (follow: boolean, ms: number) => async () => {
    await wait(ms)
    received.push(follow)
    return follow
  }
  const first = inOrder('follow:user:kofi', save(true, 40))
  const second = inOrder('follow:user:kofi', save(false, 0))
  // Only the last click decides what the page shows, when each answer comes
  const decides: boolean[] = []
  const [a, b] = await Promise.all([
    first.answer.then((v) => (decides.push(first.current()), v)),
    second.answer.then((v) => (decides.push(second.current()), v)),
  ])
  assertEquals(received, [true, false])
  assertEquals([a, b], [true, false])
  assertEquals(decides, [false, true])
})

Deno.test('in order: a failed write does not block the next one', async () => {
  const failing = inOrder('follow:user:awa', () => Promise.reject(Error('x')))
  const next = inOrder('follow:user:awa', () => Promise.resolve('ok'))
  await failing.answer.catch(() => {})
  assertEquals(await next.answer, 'ok')
})

Deno.test('in order: what is written while the server is read stays the page’s own', () => {
  const writtenSince = readingStarts()
  assertEquals(writtenSince('follow:project:senegal-maps'), false)
  inOrder('follow:project:senegal-maps', () => Promise.resolve())
  assertEquals(writtenSince('follow:project:senegal-maps'), true)
  // A new reading starts from nothing written
  assertEquals(readingStarts()('follow:project:senegal-maps'), false)
})

Deno.test('in order: on or off at once, then as the server confirms; the newest failure puts it back', async () => {
  let shown: boolean | undefined
  let signedIn = 'abdou'
  let failures = 0
  const options = (answer: () => Promise<boolean>) => ({
    who: () => signedIn,
    show: (on: boolean) => shown = on,
    send: answer,
    failed: () => failures++,
  })
  // Confirmed by the server
  setInOrder('follow:user:yao', true, options(() => Promise.resolve(true)))
  assertEquals(shown, true)
  await wait(5)
  assertEquals([shown, failures], [true, 0])

  // The newest write fails: back to before, and said
  setInOrder('follow:user:yao', false, options(() => Promise.reject(Error())))
  assertEquals(shown, false)
  await wait(5)
  assertEquals([shown, failures], [true, 1])

  // An answer once another developer signed in is not theirs
  setInOrder(
    'follow:user:zeinab',
    true,
    options(() => wait(10).then(() => true)),
  )
  signedIn = 'moussa'
  shown = undefined
  await wait(20)
  assertEquals([shown, failures], [undefined, 1])
})

Deno.test('in order: a key answered is forgotten, a new write starts afresh', async () => {
  const first = inOrder('community:go', () => Promise.resolve(1))
  await first.answer
  await wait(0)
  // Nothing waits on it any more: its last answer still counts
  assertEquals(first.current(), true)
  const next = inOrder('community:go', () => Promise.resolve(2))
  assertEquals([await next.answer, next.current()], [2, true])
})
