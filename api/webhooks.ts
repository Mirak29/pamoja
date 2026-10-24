import { respond } from '@01edu/api/response'
import { db, sql } from '@01edu/db'
import { now } from '@01edu/time'
import { GITHUB_WEBHOOK_SECRET } from '/api/lib/env.ts'
import { every, later } from '/api/lib/background.ts'
import { hmacKey } from '/api/lib/sign.ts'
import { errorMessage, log } from '/api/lib/log.ts'

// GitHub webhooks (§5.5). The route only checks the signature, keeps the
// delivery and answers 202: GitHub waits 10 seconds at most. A worker then
// processes it. WebhookDelivery is the queue: it survives restarts, and
// « received » and « processed » are two distinct statuses.

export type Delivery = {
  deliveryId: number
  githubDeliveryId: string
  event: string
  repositoryId: number | null
  attempts: number
}

/**
 * Applies one event to SQLite and inserts its entries. It runs inside the
 * transaction of the delivery, so it is synchronous: no call to GitHub. It
 * must be idempotent (update by githubId, entries once per delivery): a
 * replayed delivery changes nothing more.
 */
export type Handler = (
  payload: Record<string, unknown>,
  delivery: Delivery,
) => void

const handlers = new Map<string, Handler>([
  // Sent by GitHub when the webhook is set up: nothing to apply
  ['ping', () => {}],
])

/** The events of PAM-205 register their handler here */
export const registerHandler = (event: string, handler: Handler) =>
  handlers.set(event, handler)

/*
 * Reception
 */

const key = GITHUB_WEBHOOK_SECRET
  ? await hmacKey(GITHUB_WEBHOOK_SECRET, ['verify'])
  : undefined

/** X-Hub-Signature-256 of the raw body, compared in constant time */
export const verifySignature = async (body: string, header: string | null) => {
  if (!key || !header?.startsWith('sha256=')) return false
  const hex = header.slice('sha256='.length)
  if (!/^[0-9a-f]{64}$/.test(hex)) return false
  return await crypto.subtle.verify(
    'HMAC',
    key,
    Uint8Array.fromHex(hex),
    new TextEncoder().encode(body),
  )
}

const getRepositoryId = sql<{ repositoryId: number }, number>`
  SELECT repositoryId FROM repository WHERE githubId = ?
`.get

const insertDelivery = sql<undefined, Record<string, string | number | null>>`
  INSERT OR IGNORE INTO webhookDelivery (githubDeliveryId, event,
    repositoryId, payload, status, attempts, receivedAt)
  VALUES (:githubDeliveryId, :event, :repositoryId, :payload, 'received', 0,
    :receivedAt)
`.run

/** POST/api/github/webhook: check, keep, answer 202, process later */
export const receiveWebhook = async (req: Request) => {
  // Without `input`, the router leaves the body unread: this is the raw one
  const body = await req.text()
  if (!await verifySignature(body, req.headers.get('X-Hub-Signature-256'))) {
    log.warn('github-webhook-refused', {
      delivery: req.headers.get('X-GitHub-Delivery'),
    })
    throw new respond.UnauthorizedError({ message: 'Invalid signature' })
  }
  const githubDeliveryId = req.headers.get('X-GitHub-Delivery')
  const event = req.headers.get('X-GitHub-Event')
  if (!githubDeliveryId || !event) {
    throw new respond.BadRequestError({ message: 'Missing GitHub headers' })
  }
  let payload: { repository?: { id?: number } }
  try {
    payload = JSON.parse(body)
  } catch {
    throw new respond.BadRequestError({ message: 'Invalid JSON' })
  }
  const githubRepoId = payload.repository?.id
  // A delivery already known is not inserted again: GitHub redelivers
  insertDelivery({
    githubDeliveryId,
    event,
    repositoryId: githubRepoId
      ? getRepositoryId(githubRepoId)?.repositoryId ?? null
      : null,
    payload: body,
    receivedAt: now(),
  })
  later('github-webhook-worker-error', processDeliveries)
  return new Response(null, { status: 202 })
}

/*
 * The worker
 */

export const MAX_ATTEMPTS = 5
// Stuck in processing that long: the server stopped meanwhile
const STALE = 2 * 60

/** Seconds to wait before attempt n + 1: 10 s, 20 s, 40 s, 80 s */
export const retryDelay = (attempts: number) => 10 * 2 ** (attempts - 1)

const listReady =
  sql<Delivery & { processingStartedAt: number | null }, number>`
  SELECT deliveryId, githubDeliveryId, event, repositoryId, attempts,
    processingStartedAt
  FROM webhookDelivery
  WHERE status = 'received'
    OR (status = 'processing' AND processingStartedAt < ?)
  ORDER BY receivedAt
  LIMIT 50
`.all

const claim = sql<undefined, Record<string, number>>`
  UPDATE webhookDelivery
  SET status = 'processing', processingStartedAt = :at
  WHERE deliveryId = :deliveryId
    AND (status = 'received' OR (status = 'processing' AND processingStartedAt < :stale))
`

const getPayload = sql<{ payload: string }, number>`
  SELECT payload FROM webhookDelivery WHERE deliveryId = ?
`.get

const markDone = sql<undefined, Record<string, number>>`
  UPDATE webhookDelivery SET status = 'done', processedAt = :at,
    lastError = NULL
  WHERE deliveryId = :deliveryId
`.run

const markFailed = sql<undefined, Record<string, string | number>>`
  UPDATE webhookDelivery
  SET status = :status, attempts = :attempts, lastError = :lastError
  WHERE deliveryId = :deliveryId
`.run

// One delivery: the handler and the status change in one transaction, so a
// crash leaves it whole or untouched
const apply = db.transaction((delivery: Delivery) => {
  const { payload } = getPayload(delivery.deliveryId)!
  handlers.get(delivery.event)?.(JSON.parse(payload), delivery)
  markDone({ deliveryId: delivery.deliveryId, at: now() })
})

let running = false

/** Processes the deliveries ready now; one pass at a time */
export const processDeliveries = () => {
  if (running) return
  running = true
  try {
    const at = now()
    for (const delivery of listReady(at - STALE)) {
      // A failed attempt waits its delay before the next one
      if (
        delivery.attempts &&
        (delivery.processingStartedAt ?? 0) + retryDelay(delivery.attempts) > at
      ) continue
      const claimed = claim.run({
        deliveryId: delivery.deliveryId,
        at,
        stale: at - STALE,
      })
      if (!claimed) continue
      try {
        apply(delivery)
      } catch (err) {
        const attempts = delivery.attempts + 1
        const failed = attempts >= MAX_ATTEMPTS
        const lastError = errorMessage(err)
        markFailed({
          deliveryId: delivery.deliveryId,
          status: failed ? 'failed' : 'received',
          attempts,
          lastError,
        })
        const details = {
          delivery: delivery.githubDeliveryId,
          event: delivery.event,
          attempts,
          lastError,
        }
        failed
          ? log.error('github-webhook-failed', details)
          : log.warn('github-webhook-retry', details)
      }
    }
  } finally {
    running = false
  }
}

/** Started by the server: picks up what a restart left, then every 5 s */
export const startWorker = () =>
  every('github-webhook-worker-error', 5_000, processDeliveries)
