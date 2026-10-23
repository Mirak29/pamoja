import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import {
  type Delivery,
  missedDeliveries,
  parseDeliveries,
} from '/api/webhook-replay.ts'

// The webhooks sent while no tunnel was open, sent again when one opens
// (§5.6)

const at = Date.parse('2026-10-23T01:00:00Z')
const delivery = (
  id: string,
  guid: string,
  minutesAgo: number,
  status_code: number,
  redelivery = false,
): Delivery => ({
  id,
  guid,
  delivered_at: new Date(at - minutesAgo * 60_000).toISOString(),
  redelivery,
  status_code,
  event: 'issues',
  action: 'opened',
})

Deno.test('replay: only what never arrived, oldest first', () => {
  const list = [
    // Arrived
    delivery('1', 'a', 5, 202),
    // Failed, then sent again with success
    delivery('2', 'b', 50, 502),
    delivery('3', 'b', 40, 202, true),
    // Failed while the tunnel was closed: sent again, the oldest first
    delivery('4', 'c', 30, 502),
    delivery('5', 'd', 90, 0),
    // Refused by Pamoja itself (a bad signature): would be refused again
    delivery('6', 'e', 20, 401),
    // Older than what GitHub keeps
    delivery('7', 'f', 4 * 24 * 60, 502),
  ]
  assertEquals(
    missedDeliveries(list, at).map((d) => [d.id, d.guid]),
    [['5', 'd'], ['4', 'c']],
  )
})

Deno.test('replay: the ids of GitHub are read as written', () => {
  const [read] = parseDeliveries(
    '[{"id":3849827736008810521,"guid":"ab75e130","delivered_at":"2026-10-23T00:35:39Z","redelivery":false,"status_code":502,"event":"issues","action":"reopened"}]',
  )
  // As a number it would be 3849827736008810500: another delivery
  assertEquals(read.id, '3849827736008810521')
  assertEquals(read.status_code, 502)
})
