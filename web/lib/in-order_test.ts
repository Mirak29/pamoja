import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { inOrder, readingStarts } from '/web/lib/in-order.ts'

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
  const [a, b] = await Promise.all([first.answer, second.answer])
  assertEquals(received, [true, false])
  assertEquals([a, b], [true, false])
  // Only the last click decides what the page shows
  assertEquals([first.current(), second.current()], [false, true])
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
