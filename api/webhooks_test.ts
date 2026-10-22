import { assert, assertEquals } from 'jsr:@std/assert@^1.0.13'
import { db, makeRestorePoint } from '@01edu/db'
import server from '/api/server.ts'
import {
  MAX_ATTEMPTS,
  processDeliveries,
  registerHandler,
  retryDelay,
} from '/api/webhooks.ts'

// .env-test holds this secret: GitHub signs with the one of the app (§5.5)
const SECRET = 'test-webhook-secret'
const restore = makeRestorePoint()

const sign = async (body: string, secret = SECRET) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body),
  )
  return `sha256=${new Uint8Array(mac).toHex()}`
}

let deliveries = 0
const deliver = async (
  event: string,
  payload: unknown,
  { id = `delivery-${++deliveries}`, signature }: {
    id?: string
    signature?: string | null
  } = {},
) => {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-GitHub-Event': event,
    'X-GitHub-Delivery': id,
  }
  const sig = signature === undefined ? await sign(body) : signature
  if (sig) headers['X-Hub-Signature-256'] = sig
  const res = await fetchServer(body, headers)
  await res.body?.cancel()
  return { status: res.status, id }
}

// The raw body reaches the route as GitHub sends it, with its headers
const fetchServer = (body: string, headers: Record<string, string>) =>
  server.fetch(
    new Request('http://localhost/api/github/webhook', {
      method: 'POST',
      headers,
      body,
    }),
  )

const rows = () =>
  db.prepare(
    `SELECT githubDeliveryId id, event, status, attempts, lastError
    FROM webhookDelivery ORDER BY deliveryId`,
  ).all() as {
    id: string
    event: string
    status: string
    attempts: number
    lastError: string | null
  }[]

// Waits for the microtask the route queues, then lets the worker run
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

Deno.test('webhooks: a signed delivery is kept and answered 202', async () => {
  restore()
  const { status } = await deliver('ping', {
    zen: 'Keep it logically awesome.',
  })
  assertEquals(status, 202)
  await settle()
  assertEquals(rows().map((r) => [r.event, r.status]), [['ping', 'done']])
})

Deno.test('webhooks: a wrong or missing signature is refused', async () => {
  restore()
  const body = { zen: 'Speak like a human.' }
  assertEquals(
    (await deliver('ping', body, { signature: await sign('{}') })).status,
    401,
  )
  assertEquals(
    (await deliver('ping', body, {
      signature: await sign(JSON.stringify(body), 'another-secret'),
    })).status,
    401,
  )
  assertEquals((await deliver('ping', body, { signature: null })).status, 401)
  assertEquals(rows(), [])
})

Deno.test('webhooks: a redelivery is not kept twice', async () => {
  restore()
  await deliver('ping', {}, { id: 'same' })
  await deliver('ping', {}, { id: 'same' })
  await settle()
  assertEquals(rows().length, 1)
})

Deno.test('webhooks: an event without handler is done, ignored', async () => {
  restore()
  await deliver('star', { action: 'created' })
  await settle()
  assertEquals(rows()[0].status, 'done')
})

Deno.test('webhooks: a failure is retried later, then failed', async () => {
  restore()
  registerHandler('test_fails', () => {
    throw Error('GitHub sent something odd')
  })
  await deliver('test_fails', {})
  await settle()
  assertEquals(rows()[0], {
    id: rows()[0].id,
    event: 'test_fails',
    status: 'received',
    attempts: 1,
    lastError: 'GitHub sent something odd',
  })

  // Too early: the delay grows with the attempts
  processDeliveries()
  assertEquals(rows()[0].attempts, 1)

  for (let attempt = 2; attempt <= MAX_ATTEMPTS; attempt++) {
    db.exec(`UPDATE webhookDelivery
      SET processingStartedAt = processingStartedAt - ${
      retryDelay(attempt - 1)
    }`)
    processDeliveries()
    assertEquals(rows()[0].attempts, attempt)
  }
  assertEquals(rows()[0].status, 'failed')
  assertEquals([retryDelay(1), retryDelay(2), retryDelay(4)], [10, 20, 80])
})

Deno.test('webhooks: a failed handler leaves nothing behind', async () => {
  restore()
  registerHandler('test_half', () => {
    db.exec(`INSERT INTO skill (slug, name, category)
      VALUES ('half', 'Half', 'technology')`)
    throw Error('stopped in the middle')
  })
  await deliver('test_half', {})
  await settle()
  assertEquals(
    db.prepare(`SELECT count(*) n FROM skill WHERE slug = 'half'`).get(),
    { n: 0 },
  )
})

Deno.test('webhooks: a delivery stuck in processing is picked up again', () => {
  restore()
  let applied = 0
  registerHandler('test_stuck', () => applied++)
  db.exec(`INSERT INTO webhookDelivery (githubDeliveryId, event, payload,
      status, attempts, receivedAt, processingStartedAt)
    VALUES ('stuck', 'test_stuck', '{}', 'processing', 0, 0, 0)`)
  processDeliveries()
  assertEquals(applied, 1)
  assertEquals(rows()[0].status, 'done')
  assert(rows()[0].lastError === null)
})
