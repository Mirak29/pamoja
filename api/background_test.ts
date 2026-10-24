import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { every, later } from '/api/lib/background.ts'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

Deno.test('background: a failed task is logged, never thrown', async () => {
  let ran = 0
  later('test-error', () => {
    ran++
    throw new Error('GitHub is down')
  })
  later('test-error', () => Promise.reject(new Error('database is locked')))
  // An uncaught error would fail this test: Deno stops on it
  await wait(20)
  assertEquals(ran, 1)
})

Deno.test('background: one run at a time, and the next one after a failure', async () => {
  let runs = 0
  let overlapping = false
  let busy = false
  const timer = every('test-error', 5, async () => {
    runs++
    if (busy) overlapping = true
    busy = true
    await wait(12)
    busy = false
    if (runs === 1) throw new Error('first run fails')
  })
  await wait(60)
  clearInterval(timer)
  // Let the last run end before the test does
  await wait(20)
  assertEquals(overlapping, false)
  assertEquals(runs >= 2, true)
})
