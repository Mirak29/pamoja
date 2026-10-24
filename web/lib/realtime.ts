import { effect, signal } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import {
  entries,
  type EntryTypeId,
  type EntryTypeName,
} from '/api/entry-types.ts'
import { signedIn } from '/web/lib/session.ts'

// Realtime (§13.4), written from web/lib/session.ts of Tournament. The
// server says an entry happened; the page fetches the current truth.

export type EntryEvent = { at: number; type: EntryTypeId; id: number }
type Handler = (event: EntryEvent) => void

/** When the acks stopped, 0 while the connection is alive */
export const sourceDisconnectedAt = signal(0)

const handlers = new Set<{ type: EntryTypeId; handler: Handler }>()
const reconnectHandlers = new Set<() => void>()

/**
 * Calls `handler` for each entry of these types sent to this developer; the
 * handler refetches what the entry changed. Returns the unsubscribe.
 *
 * @example
 * onEvent('NOTIFICATION_CREATED', () => notifications.fetch())
 */
export const onEvent = (
  types: EntryTypeName | EntryTypeName[],
  handler: Handler,
) => {
  const added = (Array.isArray(types) ? types : [types])
    .map((name) => ({ type: entries[name], handler }))
  for (const item of added) handlers.add(item)
  return () => {
    for (const item of added) handlers.delete(item)
  }
}

/** `onEvent` for the time a component is shown */
export const useEvent = (
  types: EntryTypeName | EntryTypeName[],
  handler: Handler,
) => useEffect(() => onEvent(types, handler), [String(types)])

// Presence (§13.6) comes as named events, not entries: gone once sent
type Signals = {
  presence: { login: string; online: boolean }
  typing: { conversationId: number }
}
type SignalName = keyof Signals
const signalHandlers = new Set<
  { name: SignalName; handler: (data: never) => void }
>()

/**
 * Calls `handler` for each presence event of this name: who came online or
 * left, who is typing. Returns the unsubscribe.
 */
export const onSignal = <Name extends SignalName>(
  name: Name,
  handler: (data: Signals[Name]) => void,
) => {
  const item = { name, handler }
  signalHandlers.add(item)
  return () => signalHandlers.delete(item)
}

/**
 * Calls `handler` after each reconnection: entries sent meanwhile were
 * missed, so critical data (notifications, current page) is fetched again.
 */
export const onReconnect = (handler: () => void) => {
  reconnectHandlers.add(handler)
  return () => reconnectHandlers.delete(handler)
}

const run = <T>(fn: (arg: T) => void, arg: T) => {
  try {
    fn(arg)
  } catch (err) {
    console.error(err)
  }
}

// The server sends an ack every 15 s: none for 20 s, the connection is lost
const ACK_TIMEOUT = 20_000

let source: EventSource | undefined
let ackTimer: ReturnType<typeof setTimeout> | undefined

const watchAcks = () => {
  clearTimeout(ackTimer)
  ackTimer = setTimeout(() => {
    sourceDisconnectedAt.peek() || (sourceDisconnectedAt.value = Date.now())
  }, ACK_TIMEOUT)
}

// The browser reconnects by itself after a network error: each open after
// the first one is a reconnection
let opened = false
let retry: ReturnType<typeof setTimeout> | undefined

const connect = () => {
  const current = new EventSource(new URL('api/events', document.baseURI))
  source = current
  current.addEventListener('open', () => {
    if (opened) {
      for (const handler of reconnectHandlers) run(handler, undefined)
    }
    opened = true
  })
  current.addEventListener('ack', () => {
    sourceDisconnectedAt.peek() && (sourceDisconnectedAt.value = 0)
    watchAcks()
  })
  current.addEventListener('message', (message) => {
    const [at, type, id] = JSON.parse(message.data) as [
      number,
      EntryTypeId,
      number,
    ]
    for (const item of handlers) {
      item.type === type && run(item.handler, { at, type, id })
    }
  })
  for (const name of ['presence', 'typing'] as const) {
    current.addEventListener(name, (message) => {
      const data = JSON.parse(message.data) as never
      for (const item of signalHandlers) {
        item.name === name && run(item.handler, data)
      }
    })
  }
  // A refused connection (the server restarting, an error answer) is closed
  // for good by the browser: try again in 5 s
  current.addEventListener('error', () => {
    if (current.readyState !== EventSource.CLOSED || source !== current) return
    clearTimeout(retry)
    retry = setTimeout(() => source === current && connect(), 5_000)
  })
  watchAcks()
}

const disconnect = () => {
  source?.close()
  source = undefined
  opened = false
  clearTimeout(retry)
  clearTimeout(ackTimer)
  sourceDisconnectedAt.value = 0
}

// Only with a session: the route needs one, and signing out closes it
effect(() => {
  if (!signedIn.value) disconnect()
  else if (!source) connect()
})
