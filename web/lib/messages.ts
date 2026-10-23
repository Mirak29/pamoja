import { computed, effect, signal } from '@preact/signals'
import { url } from '@01edu/signal-router'
import { CircleAlert, MessageSquare } from '/web/assets/icons.tsx'
import type { ReportReason } from '/api/vocabulary.ts'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { t } from '/web/lib/language.ts'
import { onEvent, onReconnect } from '/web/lib/realtime.ts'
import { currentUser } from '/web/lib/session.ts'
import { notify } from '/web/ui/toast.tsx'

// Direct messages (§10.6): the conversations of the developer and the one
// open on the page, read from the server and followed live by their
// entries. The text of a message stays between the two.

export type Conversation = ApiOutput['GET/api/conversations'][number]
export type Thread = ApiOutput['GET/api/conversation'] & {
  /** Opened on a message found by the search, not on the latest ones */
  jumpedTo?: number
}
export type Message = Thread['messages'][number]
export type SearchResult = ApiOutput['GET/api/conversations/search'][number]

export const conversations = signal<Conversation[]>([])
export const conversationsLoaded = signal(false)
/** The conversation open on the page */
export const thread = signal<Thread | null>(null)

/** Messages not read yet, requests included, muted ones aside: the counter
 * of the menu */
export const unreadMessages = computed(() =>
  conversations.value.reduce(
    (count, c) => count + (c.muted ? 0 : c.unread),
    0,
  )
)

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

const openId = () => {
  const [section, id] = url.relativePath.slice(1).split('/')
  return section === 'messages' && id ? Number(id) : null
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

export const loadConversations = () =>
  api['GET/api/conversations'].fetch().then((list) => {
    announce(conversations.peek(), list)
    conversations.value = list
    conversationsLoaded.value = true
  }, () => {})

const markRead = (id: number) => {
  conversations.value = conversations.peek().map((c) =>
    c.id === id ? { ...c, unread: 0 } : c
  )
  api['POST/api/conversation/read'].fetch({ id }).catch(() => {})
}

/**
 * Reads a conversation, its last 50 messages; the older ones already shown
 * stay. Read once open.
 */
export const openConversation = async (id: number) => {
  const fresh = await api['GET/api/conversation'].fetch({
    id: String(id),
    before: '',
  })
  const shown = thread.peek()
  const same = shown?.id === id && !shown.jumpedTo
  const older = same
    ? shown!.messages.filter((m) => m.id < (fresh.messages[0]?.id ?? 0))
    : []
  thread.value = {
    ...fresh,
    // The « Nouveaux messages » line stays where it was while it is open
    readUpTo: same ? shown!.readUpTo : fresh.readUpTo,
    messages: [...older, ...fresh.messages],
    more: older.length ? shown!.more : fresh.more,
  }
  fresh.incoming || markRead(id)
  return thread.peek()
}

/** Opens a conversation on a message found by the search */
export const openAt = async (id: number, messageId: number) => {
  const page = await api['GET/api/conversation'].fetch({
    id: String(id),
    before: String(messageId + 1),
  })
  thread.value = { ...page, jumpedTo: messageId }
}

export const loadOlder = async () => {
  const shown = thread.peek()
  if (!shown?.more || !shown.messages.length) return
  const page = await api['GET/api/conversation'].fetch({
    id: String(shown.id),
    before: String(shown.messages[0].id),
  })
  thread.value = {
    ...shown,
    messages: [...page.messages, ...shown.messages],
    more: page.more,
  }
}

/** Sends a message, maybe an answer to another one */
export const sendMessage = async (id: number, body: string, replyTo = 0) => {
  try {
    await api['POST/api/conversation/message'].fetch({
      id,
      body,
      replyTo: replyTo || null,
    })
  } catch (err) {
    if (tellLimit(err)) return false
    err instanceof Error && /Waiting|cannot write/.test(err.message)
      ? await openConversation(id)
      : failed()
    return false
  }
  await Promise.all([openConversation(id), loadConversations()])
  return true
}

/** Writes to a developer from their profile; the conversation, or nothing */
export const startConversation = async (login: string, body: string) => {
  try {
    const { id } = await api['POST/api/conversation/start'].fetch({
      username: login,
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

export const answerRequest = async (id: number, accept: boolean) => {
  await api[
    accept ? 'POST/api/conversation/accept' : 'POST/api/conversation/decline'
  ].fetch({ id })
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

const refresh = async (id: number) => {
  await Promise.all([openConversation(id), loadConversations()])
}

/** Edits a message of the developer; false when it failed */
export const editMessage = async (
  conversationId: number,
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

export const deleteMessage = async (conversationId: number, id: number) => {
  await api['POST/api/conversation/message/delete'].fetch({ id }).catch(failed)
  await refresh(conversationId)
}

export const react = async (
  conversationId: number,
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
export const markUnread = async (conversationId: number, from: number) => {
  await api['POST/api/conversation/unread'].fetch({ id: conversationId, from })
  thread.value = null
  await loadConversations()
}

export const setMuted = async (conversationId: number, muted: boolean) => {
  await api['POST/api/conversation/mute'].fetch({ id: conversationId, muted })
  await refresh(conversationId)
}

export const setArchived = async (
  conversationId: number,
  archived: boolean,
) => {
  await api['POST/api/conversation/archive'].fetch({
    id: conversationId,
    archived,
  })
  await loadConversations()
}

/** The messages that hold a text, in the developer's conversations */
export const searchMessages = (q: string) =>
  api['GET/api/conversations/search'].fetch({ q })

/** The conversation with a developer, if there is one */
export const conversationWith = (login: string) =>
  conversations.value.find((c) =>
    c.with.login.toLowerCase() === login.toLowerCase()
  )

// Read once the developer is known, again for each new one
let loadedFor: number | undefined
effect(() => {
  const user = currentUser.value
  if (!user) {
    loadedFor = undefined
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
onEvent([
  'DIRECT_MESSAGE_CREATED',
  'DIRECT_MESSAGE_UPDATED',
  'CONVERSATION_UPDATED',
], reload)
onReconnect(reload)
