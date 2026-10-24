import { appHeaders } from '/api/github-app.ts'

// GitHub does not send a failed webhook again by itself (§5.6). In dev, every
// event sent while no tunnel was open is lost: GitHub could not reach the
// server. When a tunnel opens, the deliveries that never arrived are sent
// again, oldest first: the « Redeliver » of the settings of the app, done for
// us. GitHub keeps them 3 days.

export type Delivery = {
  /** Kept as text: the ids are larger than a JavaScript number holds */
  id: string
  guid: string
  delivered_at: string
  redelivery: boolean
  status_code: number
  event: string
  action: string | null
}

const KEPT_FOR = 3 * 24 * 3600 * 1000

/**
 * The deliveries to send again: no attempt of their event arrived, and the
 * last one failed to reach us (no answer, or 5xx from the tunnel). A 4xx came
 * from Pamoja itself, which would refuse it again.
 */
export const missedDeliveries = (list: Delivery[], at = Date.now()) => {
  const attempts = new Map<string, Delivery[]>()
  for (const delivery of list) {
    attempts.set(delivery.guid, [
      ...attempts.get(delivery.guid) ?? [],
      delivery,
    ])
  }
  const missed: Delivery[] = []
  for (const tries of attempts.values()) {
    if (tries.some((d) => d.status_code >= 200 && d.status_code < 300)) continue
    const sorted = tries.sort((a, b) =>
      Date.parse(a.delivered_at) - Date.parse(b.delivered_at)
    )
    const last = sorted.at(-1)!
    if (last.status_code !== 0 && last.status_code < 500) continue
    const first = sorted[0]
    if (at - Date.parse(first.delivered_at) > KEPT_FOR) continue
    missed.push(first)
  }
  return missed.sort((a, b) =>
    Date.parse(a.delivered_at) - Date.parse(b.delivered_at)
  )
}

/** Reads a page of deliveries, the ids as they are written */
export const parseDeliveries = (text: string) =>
  JSON.parse(
    text,
    (key, value, context?: { source?: string }) =>
      key === 'id' && context?.source ? context.source : value,
  ) as Delivery[]

/** The deliveries of the last 3 days, newest first, at most 1 000 */
const listDeliveries = async () => {
  const list: Delivery[] = []
  let url: string | undefined =
    'https://api.github.com/app/hook/deliveries?per_page=100'
  for (let page = 0; url && page < 10; page++) {
    const res: Response = await fetch(url, { headers: await appHeaders() })
    if (!res.ok) {
      await res.body?.cancel()
      throw new Error(`GitHub answered ${res.status} for the deliveries`)
    }
    const deliveries = parseDeliveries(await res.text())
    list.push(...deliveries)
    const oldest = deliveries.at(-1)
    if (!oldest || Date.now() - Date.parse(oldest.delivered_at) > KEPT_FOR) {
      break
    }
    url = res.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/)?.[1]
  }
  return list
}

/**
 * Sends again the webhooks that never arrived, oldest first. Returns how
 * many were sent again, and how many GitHub refused.
 */
export const replayMissed = async () => {
  const missed = missedDeliveries(await listDeliveries())
  let sent = 0
  let refused = 0
  for (const delivery of missed) {
    const res = await fetch(
      `https://api.github.com/app/hook/deliveries/${delivery.id}/attempts`,
      { method: 'POST', headers: await appHeaders() },
    )
    await res.body?.cancel()
    res.ok ? sent++ : refused++
  }
  return { sent, refused }
}
