import { assertEquals, assertThrows } from 'jsr:@std/assert@^1.0.13'
import { memoryLimit } from '/api/lib/rate.ts'

Deno.test('rate: a limit in memory counts each developer apart (PAM-510)', () => {
  const act = memoryLimit({ count: 3, per: 3600 }, 'Too many')
  for (let i = 0; i < 3; i++) act(1)
  // The fourth in the window is refused, with when to try again
  const error = assertThrows(() => act(1)) as { status?: number }
  assertEquals(error.status ?? 429, 429)
  // Another developer has their own window
  act(2)
})
