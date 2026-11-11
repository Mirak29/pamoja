import { computed, effect, signal } from '@preact/signals'
import { batchedLists, replaceTop, upsert } from '/web/lib/batches.ts'
import { url } from '@01edu/signal-router'
import { CircleAlert, MessageSquare } from '/web/assets/icons.tsx'
import type { ReportReason } from '/api/vocabulary.ts'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { t } from '/web/lib/language.ts'
import { onEvent, onReconnect, onSignal, whenShown } from '/web/lib/realtime.ts'
import { currentUser } from '/web/lib/session.ts'
import { notify } from '/web/ui/toast.tsx'

// Direct messages (§10.6): the conversations of the developer and the one
// open on the page, read from the server and followed live by their
// entries. The text of a message stays between the two.

type Batch = ApiOutput['GET/api/conversations']
export type Conversation = Batch['items'][number]
type ApiThread = ApiOutput['GET/api/conversation']
/** A message; `pending` while it is on its way, shown before the server
 * answers */
export type Message = ApiThread['messages'][number] & { pending?: boolean }
export type Thread = Omit<ApiThread, 'messages'> & {
  messages: Message[]
  /** Opened on a message found by the search, not on the latest ones */
  jumpedTo?: number
}
export type SearchResult = ApiOutput['GET/api/conversations/search'][number]
export type Media = Message['attachments'][number]

export const conversations = signal<Conversation[]>([])
export const conversationsLoaded = signal(false)
/** The conversation open on the page */
export const thread = signal<Thread | null>(null)

/*
 * The list comes by batches of 20, the latest first (§12.7): the first at
 * once and after each change, the older ones as one scrolls. The counter of
 * the menu comes from the server, which counts beyond the batches read.
 */

/**
 * Messages not read yet, requests included, muted ones aside, as the server
 * counts them (up to 99): the counter of the menu
 */
export const unreadMessages = signal(0)

// The latest first, as the server sorts them
const byLatest = (a: Conversation, b: Conversation) =>
  b.updatedAt - a.updatedAt || (a.id < b.id ? 1 : -1)

const idOf = (c: Conversation) => c.id
const orderOf = (c: Conversation) => c.updatedAt

const keepOnline = (fresh: Conversation[]) => {
  const next = new Set(online.peek())
  for (const c of fresh) {
    c.online ? next.add(c.with.login) : next.delete(c.with.login)
  }
  online.value = next
}

const failed = () =>
  notify({
    title: 'Message non envoyé',
    body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })

/** « dans 40 s », « dans 3 min », « dans 5 h »: when to try again */
export const waitLabel = (seconds: number) =>
  seconds < 60
    ? t`dans ${seconds} s`
    : seconds < 3600
    ? t`dans ${Math.ceil(seconds / 60)} min`
    : t`dans ${Math.ceil(seconds / 3600)} h`

/**
 * A limit of the server (§10.6): told, with when to try again; the text
 * written stays in its field. False for any other error.
 */
export const tellLimit = (err: unknown) => {
  const data = (err as { data?: { retryAfter?: number } }).data
  if (!(err instanceof Error) || !data?.retryAfter) return false
  const wait = waitLabel(data.retryAfter)
  notify({
    title: /requests/.test(err.message)
      ? 'Trop de demandes de message'
      : /reports/.test(err.message)
      ? 'Trop de signalements'
      : 'Tu écris trop vite',
    body: /requests/.test(err.message)
      ? t`Tu as écrit à beaucoup de développeurs que tu ne connais pas. Réessaie ${wait}.`
      : t`Réessaie ${wait}. Ton texte est gardé.`,
    icon: CircleAlert,
    tone: 'warning',
  })
  return true
}

// The public id of the open conversation (PAM-125), null on the list or a
// new conversation (/messages/new/<githubId>)
const openId = () => {
  const [section, id] = url.relativePath.slice(1).split('/')
  return section === 'messages' && id && id !== 'new' ? id : null
}

/** Tells of a message that arrived elsewhere than the conversation open */
const announce = (before: Conversation[], after: Conversation[]) => {
  if (!conversationsLoaded.peek()) return
  for (const conversation of after) {
    const previous = before.find((c) => c.id === conversation.id)
    const arrived = conversation.unread > (previous?.unread ?? 0)
    if (!arrived || !conversation.last || conversation.last.mine) continue
    if (conversation.muted) continue
    if (
      openId() === conversation.id && document.visibilityState === 'visible'
    ) {
      continue
    }
    notify({
      title: conversation.incoming
        ? t`${conversation.with.name} veut t’écrire`
        : t`${conversation.with.name} t’a écrit`,
      body: conversation.last.deleted ? undefined : conversation.last.excerpt,
      icon: MessageSquare,
      href: `messages/${conversation.id}`,
    })
  }
}

/** The latest batch, after a change: joined to the older ones already read */
export const loadConversations = () =>
  api['GET/api/conversations'].fetch({ before: '' }).then((batch) => {
    const before = conversations.peek()
    announce(before, batch.items)
    // Their message arrived: they stopped typing
    for (const c of batch.items) {
      const was = before.find((b) => b.id === c.id)?.last?.at
      c.last && !c.last.mine && c.last.at !== was && stopTyping(c.id)
    }
    // A conversation gone from the latest ones is gone on the server: a
    // request declined, a developer blocked
    conversations.value = replaceTop(before, batch.items, {
      idOf,
      order: orderOf,
      next: batch.next,
    }).sort(byLatest)
    keepOnline(batch.items)
    unreadMessages.value = batch.unread
    lists.first('all', { next: batch.next, orders: batch.items.map(orderOf) })
    conversationsLoaded.value = true
  }, () => {})

// The list is one list: the latest batch with the session, the older ones
// as one scrolls
const lists = batchedLists<'all'>(async (_, before) => {
  const batch = await api['GET/api/conversations'].fetch({ before })
  conversations.value = upsert(conversations.peek(), batch.items, idOf)
    .sort(byLatest)
  keepOnline(batch.items)
  return { next: batch.next }
})

/** Cursor of the older batch, empty when every conversation is read */
export const olderConversations = computed(() => lists.cursors.value.all ?? '')

/** The next older batch, as one scrolls the list; once at a time */
export const loadOlderConversations = () =>
  olderConversations.peek() ? lists.load('all') : Promise.resolve()

/*
 * Presence (§10.6, §13.6): in memory on the server, never stored
 */

/** Logins of the correspondents who have Pamoja open */
export const online = signal(new Set<string>())

onSignal('presence', ({ login, online: on }) => {
  const next = new Set(online.peek())
  on ? next.add(login) : next.delete(login)
  online.value = next
})

/** The conversations where the other one is typing, until when */
export const typingIn = signal(new Map<string, number>())
// The server is told at most every 3 s while one types: shown 6 s
const TYPING_SHOWN = 6_000
const TELL_EVERY = 3_000

const stopTyping = (id: string) => {
  if (!typingIn.peek().has(id)) return
  const next = new Map(typingIn.peek())
  next.delete(id)
  typingIn.value = next
}

onSignal('typing', ({ conversationId }) => {
  const until = Date.now() + TYPING_SHOWN
  typingIn.value = new Map(typingIn.peek()).set(conversationId, until)
  setTimeout(() => {
    typingIn.peek().get(conversationId) === until && stopTyping(conversationId)
  }, TYPING_SHOWN)
})

let told = { id: '', at: 0 }

/** Tells the other one the developer is typing; never the text */
export const tellTyping = (id: string) => {
  const at = Date.now()
  if (told.id === id && at - told.at < TELL_EVERY) return
  told = { id, at }
  api['POST/api/conversation/typing'].fetch({ id }).catch(() => {})
}

const markRead = (id: string) => {
  const read = conversations.peek().find((c) => c.id === id)
  // The counter of the server, without what was just read
  if (read && !read.muted) {
    unreadMessages.value = Math.max(0, unreadMessages.peek() - read.unread)
  }
  conversations.value = conversations.peek().map((c) =>
    c.id === id ? { ...c, unread: 0 } : c
  )
  api['POST/api/conversation/read'].fetch({ id }).catch(() => {})
}

/**
 * Reads a conversation, its last 50 messages; the older ones already shown
 * stay. Read once open.
 */
export const openConversation = async (id: string) => {
  const fresh = await api['GET/api/conversation'].fetch({ id, before: '' })
  // Answered after the page went to another conversation: that one stays
  if (openId() !== id) return thread.peek()
  const shown = thread.peek()
  const same = shown?.id === id && !shown.jumpedTo
  const older = same
    ? shown!.messages.filter((m) =>
      !m.pending && m.id < (fresh.messages[0]?.id ?? 0)
    )
    : []
  // Still on their way: they stay after what the server has
  const onTheirWay = same
    ? shown!.messages.filter((m) => m.pending && inFlight.has(m.id))
    : []
  thread.value = {
    ...fresh,
    // The « Nouveaux messages » line stays where it was while it is open
    readUpTo: same ? shown!.readUpTo : fresh.readUpTo,
    messages: [...older, ...fresh.messages, ...onTheirWay],
    more: older.length ? shown!.more : fresh.more,
  }
  fresh.incoming || markRead(id)
  return thread.peek()
}

/** Opens a conversation on a message found by the search */
export const openAt = async (id: string, messageId: number) => {
  const page = await api['GET/api/conversation'].fetch({
    id,
    before: String(messageId + 1),
  })
  if (openId() !== id) return
  thread.value = { ...page, jumpedTo: messageId }
}

export const loadOlder = async () => {
  const shown = thread.peek()
  if (!shown?.more || !shown.messages.length) return
  const page = await api['GET/api/conversation'].fetch({
    id: shown.id,
    before: String(shown.messages[0].id),
  })
  // What arrived meanwhile stays: messages sent, answers
  const now = thread.peek()
  if (now?.id !== shown.id) return
  thread.value = {
    ...now,
    messages: [...page.messages, ...now.messages],
    more: page.more,
  }
}

// What the list shows of a message until the server answers: its first words
const firstWords = (body: string) => {
  const text = body.replace(/\s+/g, ' ').trim()
  return text.length > 120 ? `${text.slice(0, 118)}…` : text
}

// Negative: never the id of a message of the server
let pendingId = 0
/** Messages shown while on their way: a reload keeps them at the end */
const inFlight = new Set<number>()
// Messages typed in a row leave one after the other, in their order
let sending: Promise<unknown> = Promise.resolve()

/** Shows a message on its way at once, in the thread and in the list */
const showPending = (
  id: string,
  body: string,
  replyTo: number,
  attachments: Media[],
) => {
  const local = --pendingId
  inFlight.add(local)
  const at = Date.now() / 1000
  const shown = thread.peek()
  if (shown?.id === id) {
    const answered = shown.messages.find((m) => m.id === replyTo)
    thread.value = {
      ...shown,
      messages: [...shown.messages, {
        id: local,
        author: currentUser.peek()?.login ?? '',
        mine: true,
        body,
        at,
        edited: false,
        deleted: false,
        replyTo: answered
          ? {
            id: answered.id,
            author: answered.author,
            excerpt: firstWords(answered.body),
            deleted: answered.deleted,
          }
          : null,
        reactions: [],
        attachments,
        preview: null,
        pending: true,
      }],
    }
  }
  // The latest conversation goes first, as the server sorts them
  const row = conversations.peek().find((c) => c.id === id)
  if (row) {
    conversations.value = [
      {
        ...row,
        updatedAt: at,
        last: { excerpt: firstWords(body), deleted: false, mine: true, at },
      },
      ...conversations.peek().filter((c) => c.id !== id),
    ]
  }
  return local
}

const dropPending = (local: number) => {
  inFlight.delete(local)
  const shown = thread.peek()
  if (!shown) return
  thread.value = {
    ...shown,
    messages: shown.messages.filter((m) => m.id !== local),
  }
}

/**
 * Sends a message, maybe an answer to another one, maybe with files. It is
 * shown at once; the entry of the message then brings back the thread and
 * the list of the server (reload). False when it was not sent, and it is
 * taken back.
 */
export const sendMessage = async (
  id: string,
  body: string,
  replyTo = 0,
  attachments: Media[] = [],
) => {
  const local = showPending(id, body, replyTo, attachments)
  const sent = sending.then(() =>
    api['POST/api/conversation/message'].fetch({
      id,
      body,
      replyTo: replyTo || null,
      attachments: attachments.length ? attachments.map((a) => a.id) : null,
    })
  )
  sending = sent.catch(() => {})
  try {
    await sent
  } catch (err) {
    dropPending(local)
    // The list showed it as the last message: the server's list comes back
    loadConversations()
    if (tellLimit(err)) return false
    err instanceof Error && /Waiting|cannot write/.test(err.message)
      ? await openConversation(id)
      : failed()
    return false
  }
  // Sent: the next words typed are told at once
  told = { id: '', at: 0 }
  // The message of the server takes its place, even without the live stream
  inFlight.delete(local)
  openConversation(id).catch(() => {})
  return true
}

/**
 * Writes to a developer, known by their GitHub account (PAM-125); the
 * public id of the conversation, or nothing
 */
export const startConversation = async (githubId: number, body: string) => {
  try {
    const { id } = await api['POST/api/conversation/start'].fetch({
      githubId,
      body,
    })
    await loadConversations()
    return id
  } catch (err) {
    if (tellLimit(err)) return
    err instanceof Error && /cannot write|Waiting/.test(err.message)
      ? notify({
        title: 'Message non envoyé',
        body: 'Tu ne peux pas écrire à ce développeur pour l’instant.',
        icon: CircleAlert,
        tone: 'danger',
      })
      : failed()
  }
}

export const answerRequest = async (id: string, accept: boolean) => {
  await api[
    accept ? 'POST/api/conversation/accept' : 'POST/api/conversation/decline'
  ].fetch({ id })
  // Declined, it leaves the list at once, wherever it was
  accept ||
    (conversations.value = conversations.peek().filter((c) => c.id !== id))
  await loadConversations()
  if (accept) await openConversation(id)
  else thread.value = null
}

export const setBlocked = async (login: string, blocked: boolean) => {
  await api['POST/api/user/block'].fetch({ username: login, blocked })
  await loadConversations()
  const shown = thread.peek()
  shown && shown.with.login === login && await openConversation(shown.id)
}

export const reportMessage = (
  message: number,
  reason: ReportReason,
  comment: string,
) => api['POST/api/conversation/report'].fetch({ message, reason, comment })

const refresh = async (id: string) => {
  await Promise.all([openConversation(id), loadConversations()])
}

/** Edits a message of the developer; false when it failed */
export const editMessage = async (
  conversationId: string,
  id: number,
  body: string,
) => {
  try {
    await api['POST/api/conversation/message/edit'].fetch({ id, body })
  } catch (err) {
    tellLimit(err) || failed()
    return false
  }
  await refresh(conversationId)
  return true
}

export const deleteMessage = async (conversationId: string, id: number) => {
  await api['POST/api/conversation/message/delete'].fetch({ id }).catch(failed)
  await refresh(conversationId)
}

export const react = async (
  conversationId: string,
  id: number,
  emoji: (typeof reactions)[number],
) => {
  await api['POST/api/conversation/message/react'].fetch({ id, emoji })
    .catch((err) => tellLimit(err) || failed())
  await openConversation(conversationId)
}

/** The reactions offered (§10.6), as the server knows them */
export const reactions = ['👍', '❤️', '😂', '🎉', '🙏', '👀'] as const

/** Unread again from a message received; the conversation closes */
export const markUnread = async (conversationId: string, from: number) => {
  await api['POST/api/conversation/unread'].fetch({ id: conversationId, from })
  thread.value = null
  await loadConversations()
}

export const setMuted = async (conversationId: string, muted: boolean) => {
  await api['POST/api/conversation/mute'].fetch({ id: conversationId, muted })
  await refresh(conversationId)
}

export const setArchived = async (
  conversationId: string,
  archived: boolean,
) => {
  await api['POST/api/conversation/archive'].fetch({
    id: conversationId,
    archived,
  })
  // The open conversation too, like the mute: its button reads it
  await refresh(conversationId)
}

/** The messages that hold a text, in the developer's conversations */
export const searchMessages = (q: string) =>
  api['GET/api/conversations/search'].fetch({ q })

/*
 * Images and files (§17.3)
 */

/** Where the browser reads a file: the server checks who asks */
export const mediaUrl = (key: string) =>
  // A demo image of the fixtures ships with the pages (web/assets/mocks)
  key.startsWith('mocks/') ? key : `api/media?key=${encodeURIComponent(key)}`

const IMAGES = ['image/jpeg', 'image/png', 'image/webp']
export const ACCEPTED = [...IMAGES, 'application/pdf'].join(',')
const MAX_SIDE = 2000

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86))

/**
 * An image made smaller (2 000 px at most) and encoded again by a canvas:
 * lighter, and without its metadata, the GPS position of a phone photo
 * included (§17.3)
 */
const prepareImage = async (file: File) => {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  // WebP where the browser writes it, otherwise what keeps transparency
  let blob = await toBlob(canvas, 'image/webp')
  if (blob?.type !== 'image/webp') {
    blob = await toBlob(
      canvas,
      file.type === 'image/png' ? 'image/png' : 'image/jpeg',
    )
  }
  if (!blob) throw new Error('Unreadable image')
  return new File([blob], 'image', { type: blob.type })
}

const refused = (title: string, body: string) =>
  notify({ title, body, icon: CircleAlert, tone: 'warning' })

/** Uploads an image or a PDF; undefined, and told, when it is refused */
export const uploadMedia = async (file: File): Promise<Media | undefined> => {
  if (![...IMAGES, 'application/pdf'].includes(file.type)) {
    refused(
      'Format non accepté',
      'Envoie une image JPEG, PNG ou WebP, ou un PDF.',
    )
    return
  }
  let ready = file
  try {
    if (IMAGES.includes(file.type)) ready = await prepareImage(file)
  } catch {
    refused('Image illisible', 'Cette image n’a pas pu être lue.')
    return
  }
  const form = new FormData()
  form.append('file', ready, file.name)
  const res = await fetch(new URL('api/media/upload', document.baseURI), {
    method: 'POST',
    body: form,
  }).catch(() => undefined)
  if (res?.ok) return await res.json() as Media
  const retryAfter = Number(res?.headers.get('Retry-After'))
  if (res?.status === 429) {
    refused(
      'Trop de fichiers envoyés',
      t`Réessaie ${waitLabel(retryAfter || 60)}.`,
    )
  } else if (res?.status === 413) {
    refused(
      'Fichier trop lourd',
      'Une image fait 2 Mo au plus, un PDF 5 Mo.',
    )
  } else if (res?.status === 415) {
    refused(
      'Format non accepté',
      'Envoie une image JPEG, PNG ou WebP, ou un PDF.',
    )
  } else failed()
}

/** « 340 ko », « 1,2 Mo » */
export const sizeLabel = (bytes: number) =>
  bytes < 1024 * 1024
    ? t`${Math.max(1, Math.round(bytes / 1024))} ko`
    : t`${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`

/** The conversation with a developer, among those already read */
export const conversationWith = (login: string) =>
  conversations.value.find((c) =>
    c.with.login.toLowerCase() === login.toLowerCase()
  )

/**
 * The key of the conversation shared with a developer, empty if none: from
 * the batches read, otherwise from the server, which knows the older ones
 */
export const findConversationWith = async (login: string) =>
  conversationWith(login)?.id ??
    (await api['GET/api/conversation/with'].fetch({ login })
      .catch(() => ({ id: '' }))).id

// Read once the developer is known, again for each new one
let loadedFor: number | undefined
effect(() => {
  const user = currentUser.value
  if (!user) {
    loadedFor = undefined
    lists.reset()
    unreadMessages.value = 0
    conversations.value = []
    conversationsLoaded.value = false
    thread.value = null
    return
  }
  if (loadedFor === user.userId) return
  loadedFor = user.userId
  loadConversations()
})

// A message or an answer to a request: the list and the open conversation
// follow without a refresh (§13.3)
const reload = () => {
  if (!currentUser.peek()) return
  loadConversations()
  const id = openId()
  const shown = thread.peek()
  // A conversation opened on a search result stays where it is
  id && shown?.id === id && !shown.jumpedTo &&
    openConversation(id).catch(() => {})
}
// Hidden, the tab reads once when it shows again (§12.7)
const reloadShown = () => whenShown(reload)
onEvent([
  'DIRECT_MESSAGE_CREATED',
  'DIRECT_MESSAGE_UPDATED',
  'CONVERSATION_UPDATED',
], reloadShown)
onReconnect(reloadShown)
