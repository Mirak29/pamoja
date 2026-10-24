import { db, sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { entries, Entry, maybe } from '/api/entries.ts'
import { LIMITS, MAX_ATTACHMENTS } from '/api/limits.ts'
import { later } from '/api/lib/background.ts'
import { APP_ENV } from '/api/lib/env.ts'
import {
  type Fetch,
  fetchPreview,
  firstLink,
  type Preview,
} from '/api/link-preview.ts'
import { attach, mediaOf, removeMediaOf } from '/api/media.ts'
import { type Window, within } from '/api/lib/rate.ts'
import { isOnline, sendTo } from '/api/presence.ts'
import { userIdOfLogin } from '/api/user.ts'

// Direct messages (§10.6): a conversation between two developers. Two who
// worked together write to each other at once; otherwise the first message
// is a request the other accepts or declines. A block stops both ways. The
// text of a message never leaves this module but to its two readers.

const notFound = () =>
  new respond.NotFoundError({ message: 'Conversation not found' })
const forbidden = (message: string) => new respond.ForbiddenError({ message })
const badRequest = (message: string) => new respond.BadRequestError({ message })

// The text a member sends: trimmed, not empty unless files come with it,
// within its size (§16)
const cleanBody = (body: string, withFiles = false) => {
  const text = body.trim()
  if (!text && !withFiles) throw badRequest('A message is required')
  if (text.length > LIMITS.directMessage) throw badRequest('Message too long')
  return text
}

const getMessage = sql<
  {
    conversationId: number
    authorId: number
    createdAt: number
    deletedAt: number | null
  },
  number
>`
  SELECT conversationId, authorId, createdAt, deletedAt FROM directMessage
  WHERE directMessageId = ?
`.get

/*
 * Limits (§10.6, §16): counted in the database, so a restart of the server
 * does not reset them
 */

const DAY = 24 * 3600
export const RATE = {
  // Message requests to strangers: a refused or unanswered one counts
  requests: { count: 10, per: DAY },
  messagesPerMinute: { count: 20, per: 60 },
  messagesPerDay: { count: 1000, per: DAY },
  reports: { count: 30, per: DAY },
  reactions: { count: 60, per: 60 },
  searches: { count: 30, per: 60 },
}

// The reactions offered (§10.6): a short list, like a keyboard row
export const REACTIONS = ['👍', '❤️', '😂', '🎉', '🙏', '👀'] as const

const countRequests = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM conversation
  WHERE startedBy = :me AND status != 'accepted' AND createdAt > :since
`.get

const countMessages = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM directMessage
  WHERE authorId = :me AND createdAt > :since
`.get

const countReactions = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM directMessageReaction
  WHERE userId = :me AND createdAt > :since
`.get

// Searches leave no row: counted in memory, a restart forgets them
const searches = new Map<number, number[]>()
const countSearches = ({ me, since }: { me: number; since: number }) => {
  const times = (searches.get(me) ?? []).filter((at) => at > since)
  searches.set(me, times)
  return { n: times.length, oldest: times[0] ?? null }
}

const countReports = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM report
  WHERE reporterId = :me AND targetType = 'direct_message'
    AND createdAt > :since
`.get

const checkMessages = (me: number) => {
  within(countMessages, RATE.messagesPerMinute, me, 'Too many messages')
  within(countMessages, RATE.messagesPerDay, me, 'Too many messages today')
}

/*
 * Who may write to whom
 */

// A project in common (not as an observer), a collaboration request of one
// to the other, or a help delivered between them. Accepting a request and
// leaving it is not enough (§10.6): the delivery is read in the journal,
// which a withdrawal or a reopening does not erase
const getWorkedTogether = sql<{ yes: number }, { a: number; b: number }>`
  SELECT EXISTS (
    SELECT 1 FROM projectMember AS one
    JOIN projectMember AS other ON other.projectId = one.projectId
    WHERE one.userId = :a AND other.userId = :b
      AND one.role != 'observer' AND other.role != 'observer'
  ) OR EXISTS (
    SELECT 1 FROM helpRequest
    WHERE (authorId = :a AND targetUserId = :b)
       OR (authorId = :b AND targetUserId = :a)
  ) OR EXISTS (
    SELECT 1 FROM entry
    JOIN helpRequest ON helpRequest.helpRequestId = entry.helpRequestId
    WHERE entry.type IN (${entries.HELP_REQUEST_DELIVERED},
        ${entries.REVIEW_SUBMITTED})
      AND ((entry.userId = :a AND helpRequest.authorId = :b)
        OR (entry.userId = :b AND helpRequest.authorId = :a))
  ) AS yes
`.get

const getBlock = sql<
  { byMe: number; byThem: number },
  { me: number; other: number }
>`
  SELECT
    EXISTS (SELECT 1 FROM userBlock WHERE blockerId = :me AND blockedId = :other)
      AS byMe,
    EXISTS (SELECT 1 FROM userBlock WHERE blockerId = :other AND blockedId = :me)
      AS byThem
`.get

const blockOf = (me: number, other: number) => {
  const row = getBlock({ me, other })!
  return { byMe: !!row.byMe, byThem: !!row.byThem }
}

/*
 * Conversations
 */

type ConversationRow = {
  conversationId: number
  startedBy: number
  status: 'pending' | 'accepted' | 'declined'
  createdAt: number
  updatedAt: number
}

const getBetween = sql<ConversationRow, { a: number; b: number }>`
  SELECT conversation.* FROM conversation
  JOIN conversationMember AS one
    ON one.conversationId = conversation.conversationId AND one.userId = :a
  JOIN conversationMember AS other
    ON other.conversationId = conversation.conversationId AND other.userId = :b
`.get

const getMine = sql<
  ConversationRow & { other: number },
  { conversationId: number; userId: number }
>`
  SELECT conversation.*, other.userId AS other FROM conversation
  JOIN conversationMember AS me
    ON me.conversationId = conversation.conversationId AND me.userId = :userId
  JOIN conversationMember AS other
    ON other.conversationId = conversation.conversationId
      AND other.userId != :userId
  WHERE conversation.conversationId = :conversationId
`.get

/** A conversation of the developer, or a 404 */
const mine = (me: number, conversationId: number) => {
  const row = getMine({ conversationId, userId: me })
  if (!row) throw notFound()
  return row
}

const insertConversation = sql<
  undefined,
  { startedBy: number; status: string; at: number }
>`
  INSERT INTO conversation (startedBy, status, createdAt, updatedAt)
  VALUES (:startedBy, :status, :at, :at)
`.run

const insertMember = sql<
  undefined,
  { conversationId: number; userId: number; lastReadAt: number | null }
>`
  INSERT INTO conversationMember (conversationId, userId, lastReadAt)
  VALUES (:conversationId, :userId, :lastReadAt)
`.run

const insertMessage = sql<
  undefined,
  {
    conversationId: number
    authorId: number
    body: string
    at: number
    replyToId: number | null
  }
>`
  INSERT INTO directMessage (conversationId, authorId, body, createdAt,
    replyToId)
  VALUES (:conversationId, :authorId, :body, :at, :replyToId)
`.run

// A new message brings an archived conversation back to both lists
const unarchive = sql<undefined, number>`
  UPDATE conversationMember SET archivedAt = NULL WHERE conversationId = ?
`.run

const touch = sql<undefined, { conversationId: number; at: number }>`
  UPDATE conversation SET updatedAt = :at WHERE conversationId = :conversationId
`.run

const setStatus = sql<
  undefined,
  { conversationId: number; status: string; from: string }
>`
  UPDATE conversation SET status = :status
  WHERE conversationId = :conversationId AND status = :from
`.run

const setRead = sql<
  undefined,
  { conversationId: number; userId: number; at: number }
>`
  UPDATE conversationMember SET lastReadAt = :at
  WHERE conversationId = :conversationId AND userId = :userId
`.run

const countMessagesBy = sql<
  { n: number },
  { conversationId: number; authorId: number }
>`
  SELECT count(*) AS n FROM directMessage
  WHERE conversationId = :conversationId AND authorId = :authorId
`.get

/**
 * What the developer may do in a conversation. The one who started a
 * request sends that first message only, and never learns of a refusal: to
 * them a declined request still waits (§10.6).
 */
const rightsOf = (row: ConversationRow & { other: number }, me: number) => {
  const block = blockOf(me, row.other)
  const mine = row.startedBy === me
  const status = mine && row.status === 'declined' ? 'pending' : row.status
  const waiting = mine && row.status !== 'accepted' &&
    countMessagesBy({ conversationId: row.conversationId, authorId: me })!.n > 0
  return {
    status,
    // A request sent to me, to accept or decline
    incoming: !mine && row.status === 'pending',
    blockedByMe: block.byMe,
    canWrite: !block.byMe && !block.byThem && !waiting &&
      !(!mine && row.status === 'declined'),
  }
}

const post = (
  conversationId: number,
  authorId: number,
  body: string,
  at: number,
  replyToId: number | null = null,
  attachments: number[] = [],
) => {
  insertMessage({ conversationId, authorId, body, at, replyToId })
  const directMessageId = db.lastInsertRowId
  attach(authorId, attachments, 'message', directMessageId)
  touch({ conversationId, at })
  unarchive(conversationId)
  // The author has read up to their own message
  setRead({ conversationId, userId: authorId, at })
  Entry.insert.DIRECT_MESSAGE_CREATED({
    userId: authorId,
    data: { conversationId, directMessageId },
    source: 'platform',
  })
  return directMessageId
}

/**
 * Writes to a developer: in the conversation they already share, or in a
 * new one, open at once if they worked together, a request otherwise
 */
export const startConversation = db.transaction(
  (me: number, login: string, body: string) => {
    const other = userIdOfLogin(login)
    if (!other) {
      throw new respond.NotFoundError({ message: 'No such developer' })
    }
    if (other === me) throw badRequest('Not to yourself')
    const text = cleanBody(body)
    const existing = getBetween({ a: me, b: other })
    if (existing) {
      send(me, existing.conversationId, text)
      return existing.conversationId
    }
    const block = blockOf(me, other)
    if (block.byMe || block.byThem) {
      throw forbidden('You cannot write to this developer')
    }
    checkMessages(me)
    const at = now()
    const together = !!getWorkedTogether({ a: me, b: other })!.yes
    together || within(countRequests, RATE.requests, me, 'Too many requests')
    insertConversation({
      startedBy: me,
      status: together ? 'accepted' : 'pending',
      at,
    })
    const conversationId = db.lastInsertRowId
    insertMember({ conversationId, userId: me, lastReadAt: at })
    insertMember({ conversationId, userId: other, lastReadAt: null })
    post(conversationId, me, text, at)
    return conversationId
  },
)

const send = (
  me: number,
  conversationId: number,
  body: string,
  replyTo = 0,
  attachments: number[] = [],
) => {
  const row = mine(me, conversationId)
  // Files alone make a message too
  const text = cleanBody(body, attachments.length > 0)
  if (attachments.length > MAX_ATTACHMENTS) throw badRequest('Too many files')
  // A reply answers a message of this conversation, still there
  const answered = replyTo ? getMessage(replyTo) : undefined
  if (
    replyTo &&
    (!answered || answered.conversationId !== conversationId ||
      answered.deletedAt)
  ) {
    throw badRequest('No such message to answer')
  }
  const rights = rightsOf(row, me)
  if (!rights.canWrite) {
    throw forbidden(
      rights.status === 'pending' && row.startedBy === me && !rights.blockedByMe
        ? 'Waiting for the request to be accepted'
        : 'You cannot write to this developer',
    )
  }
  // A request stays text: no file from a stranger
  if (attachments.length && row.status !== 'accepted' && !rights.incoming) {
    throw forbidden('Files wait for the request to be accepted')
  }
  checkMessages(me)
  // Answering a request accepts it
  if (rights.incoming) {
    setStatus({ conversationId, status: 'accepted', from: 'pending' })
  }
  return post(conversationId, me, text, now(), replyTo || null, attachments)
}

/** A message in a conversation of the developer, then its link preview */
export const sendMessage = (
  me: number,
  conversationId: number,
  body: string,
  replyTo = 0,
  attachments: number[] = [],
) => {
  const id = db.transaction(send)(
    me,
    conversationId,
    body,
    replyTo,
    attachments,
  )
  previewLater(id)
  return id
}

/*
 * Link previews (§10.6): read by the server after the message is sent
 */

const getForPreview = sql<
  {
    conversationId: number
    authorId: number
    body: string
    deletedAt: number | null
    status: string
  },
  number
>`
  SELECT directMessage.conversationId, directMessage.authorId,
    directMessage.body, directMessage.deletedAt, conversation.status
  FROM directMessage
  JOIN conversation USING (conversationId)
  WHERE directMessageId = ?
`.get

const writePreview = sql<
  undefined,
  { directMessageId: number; body: string; preview: string }
>`
  UPDATE directMessage SET linkPreview = :preview
  WHERE directMessageId = :directMessageId AND body = :body
    AND deletedAt IS NULL
`.run

// The same link in many messages is read once an hour
const previews = new Map<string, { preview?: Preview; at: number }>()
const PREVIEW_KEPT = 3600_000

/**
 * Reads the preview of the first link of a message, in an accepted
 * conversation, and keeps it if the message did not change meanwhile
 */
export const previewMessage = async (
  directMessageId: number,
  deps?: { resolve?: (host: string) => Promise<string[]>; fetch?: Fetch },
) => {
  const message = getForPreview(directMessageId)
  if (!message || message.deletedAt || message.status !== 'accepted') return
  const link = firstLink(message.body)
  if (!link) return
  let cached = previews.get(link)
  if (!cached || Date.now() - cached.at > PREVIEW_KEPT) {
    cached = { preview: await fetchPreview(link, deps), at: Date.now() }
    if (previews.size > 500) previews.clear()
    previews.set(link, cached)
  }
  if (!cached.preview) return
  const written = writePreview({
    directMessageId,
    body: message.body,
    preview: JSON.stringify(cached.preview),
  })
  if (!written) return
  updated(message.conversationId, message.authorId, directMessageId)
}

// Never during the tests, which call previewMessage with a fake network
const previewLater = (directMessageId: number) =>
  APP_ENV === 'test' ||
  later('link-preview-error', () => previewMessage(directMessageId))

const decide = (me: number, conversationId: number, status: string) => {
  const row = mine(me, conversationId)
  if (row.startedBy === me || row.status !== 'pending') {
    throw new respond.ConflictError({ message: 'No request to answer' })
  }
  setStatus({ conversationId, status, from: 'pending' })
  if (status === 'accepted') setRead({ conversationId, userId: me, at: now() })
  Entry.insert.CONVERSATION_UPDATED({
    userId: me,
    data: { conversationId, status },
    source: 'platform',
  })
}

export const acceptConversation = (me: number, conversationId: number) =>
  decide(me, conversationId, 'accepted')

export const declineConversation = (me: number, conversationId: number) =>
  decide(me, conversationId, 'declined')

export const readConversation = (me: number, conversationId: number) => {
  mine(me, conversationId)
  setRead({ conversationId, userId: me, at: now() })
}

/*
 * Reading
 */

type ListRow = ConversationRow & {
  other: number
  login: string
  name: string
  avatarUrl: string
  lastBody: string | null
  lastAuthor: number | null
  lastAt: number | null
  lastDeleted: number | null
  mutedAt: number | null
  archivedAt: number | null
  unread: number
}

const listMine = sql<ListRow, number>`
  SELECT conversation.*, other.userId AS other,
    user.githubUsername AS login, profile.displayName AS name, user.avatarUrl,
    last.body AS lastBody, last.authorId AS lastAuthor,
    last.createdAt AS lastAt, last.deletedAt AS lastDeleted,
    me.mutedAt, me.archivedAt,
    (SELECT count(*) FROM directMessage AS unread
      WHERE unread.conversationId = conversation.conversationId
        AND unread.authorId != me.userId AND unread.deletedAt IS NULL
        AND unread.createdAt > coalesce(me.lastReadAt, 0)) AS unread
  FROM conversationMember AS me
  JOIN conversation ON conversation.conversationId = me.conversationId
  JOIN conversationMember AS other
    ON other.conversationId = me.conversationId AND other.userId != me.userId
  JOIN user ON user.userId = other.userId
  JOIN profile ON profile.userId = other.userId
  LEFT JOIN directMessage AS last ON last.directMessageId = (
    SELECT directMessageId FROM directMessage
    WHERE conversationId = conversation.conversationId
    ORDER BY createdAt DESC, directMessageId DESC LIMIT 1
  )
  WHERE me.userId = ?
  ORDER BY conversation.updatedAt DESC
`.all

// A message as plain text, without the marks of its Markdown
const plain = (body: string) =>
  body
    .replace(/```[\s\S]*?(```|$)/g, ' [code] ')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/(\*\*|__|`)/g, '')
    .replace(/(^|\s)[*_]([^*_\s][^*_]*)[*_](?=\s|$|[.,;:!?])/g, '$1$2')
    .replace(/^\s*(?:[-*+]|\d+[.)]|>|#{1,6})\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()

// What the list shows of a message: its beginning, as plain text
export const excerpt = (body: string) => {
  const text = plain(body)
  return text.length > 120 ? `${text.slice(0, 118)}…` : text
}

/**
 * The conversations of the developer, the latest first. A request they
 * declined is gone from their list; a request someone sent them waits apart.
 */
export const listConversations = (me: number) =>
  listMine(me).flatMap((row) => {
    if (row.startedBy !== me && row.status === 'declined') return []
    const rights = rightsOf(row, me)
    return [{
      id: row.conversationId,
      with: { login: row.login, name: row.name, avatarUrl: row.avatarUrl },
      ...rights,
      updatedAt: row.updatedAt,
      last: row.lastAt === null ? null : {
        excerpt: row.lastDeleted ? '' : excerpt(row.lastBody ?? ''),
        deleted: !!row.lastDeleted,
        mine: row.lastAuthor === me,
        at: row.lastAt,
      },
      unread: row.unread,
      muted: !!row.mutedAt,
      archived: !!row.archivedAt,
      // Seen only in an accepted conversation with no block (§10.6)
      online: row.status === 'accepted' && rights.canWrite &&
        isOnline(row.other),
    }]
  })

// « En train d'écrire… » (§10.6): sent to the other one at once, never
// stored, at most once every 2 s by conversation
const TYPING_EVERY = 2_000
const typingAt = new Map<string, number>()

export const typing = (me: number, conversationId: number) => {
  const row = mine(me, conversationId)
  if (row.status !== 'accepted' || !rightsOf(row, me).canWrite) return
  const key = `${me}:${conversationId}`
  const at = Date.now()
  if (at - (typingAt.get(key) ?? 0) < TYPING_EVERY) return
  typingAt.set(key, at)
  sendTo(row.other, 'typing', { conversationId })
}

const PAGE = 50

type MessageRow = {
  directMessageId: number
  authorId: number
  login: string
  body: string
  createdAt: number
  editedAt: number | null
  deletedAt: number | null
  replyToId: number | null
  replyLogin: string | null
  replyBody: string | null
  replyDeleted: number | null
  linkPreview: string | null
}

const listMessages = sql<
  MessageRow,
  { conversationId: number; before: number; limit: number }
>`
  SELECT directMessage.directMessageId, directMessage.authorId,
    user.githubUsername AS login, directMessage.body,
    directMessage.createdAt, directMessage.editedAt, directMessage.deletedAt,
    directMessage.replyToId, replyAuthor.githubUsername AS replyLogin,
    reply.body AS replyBody, reply.deletedAt AS replyDeleted,
    directMessage.linkPreview
  FROM directMessage
  JOIN user ON user.userId = directMessage.authorId
  LEFT JOIN directMessage AS reply
    ON reply.directMessageId = directMessage.replyToId
  LEFT JOIN user AS replyAuthor ON replyAuthor.userId = reply.authorId
  WHERE directMessage.conversationId = :conversationId
    AND directMessage.directMessageId < :before
  ORDER BY directMessage.directMessageId DESC
  LIMIT :limit
`.all

const listReactions = sql<
  { directMessageId: number; emoji: string; count: number; mine: number },
  { conversationId: number; me: number; from: number; to: number }
>`
  SELECT reaction.directMessageId, emoji, count(*) AS count,
    max(reaction.userId = :me) AS mine
  FROM directMessageReaction AS reaction
  JOIN directMessage
    ON directMessage.directMessageId = reaction.directMessageId
  WHERE directMessage.conversationId = :conversationId
    AND reaction.directMessageId BETWEEN :from AND :to
  GROUP BY reaction.directMessageId, emoji
  ORDER BY min(reaction.directMessageReactionId)
`.all

// The other one of a conversation, and where the developer stands in it
const getPeer = sql<
  {
    login: string
    name: string
    avatarUrl: string
    mutedAt: number | null
    archivedAt: number | null
    lastReadAt: number | null
  },
  { conversationId: number; userId: number }
>`
  SELECT user.githubUsername AS login, profile.displayName AS name,
    user.avatarUrl, me.mutedAt, me.archivedAt, me.lastReadAt
  FROM conversationMember AS me
  JOIN conversationMember AS other
    ON other.conversationId = me.conversationId AND other.userId != me.userId
  JOIN user ON user.userId = other.userId
  JOIN profile ON profile.userId = other.userId
  WHERE me.conversationId = :conversationId AND me.userId = :userId
`.get

const shownMessage = (
  m: MessageRow,
  me: number,
  reactions: Map<number, { emoji: string; count: number; mine: boolean }[]>,
  attachments: ReturnType<typeof mediaOf>,
) => ({
  id: m.directMessageId,
  author: m.login,
  mine: m.authorId === me,
  // A deleted message keeps its place, never its text
  body: m.deletedAt ? '' : m.body,
  at: m.createdAt,
  edited: !!m.editedAt && !m.deletedAt,
  deleted: !!m.deletedAt,
  replyTo: m.replyToId
    ? {
      id: m.replyToId,
      author: m.replyLogin ?? '',
      excerpt: m.replyDeleted ? '' : excerpt(m.replyBody ?? ''),
      deleted: !!m.replyDeleted,
    }
    : null,
  reactions: m.deletedAt ? [] : reactions.get(m.directMessageId) ?? [],
  attachments: m.deletedAt ? [] : attachments.get(m.directMessageId) ?? [],
  preview: !m.deletedAt && m.linkPreview
    ? JSON.parse(m.linkPreview) as Preview
    : null,
})

/**
 * A conversation and its last 50 messages, or 50 before a message (a search
 * result opens with `before` just after the message found)
 */
export const getConversation = (
  me: number,
  conversationId: number,
  before = 0,
) => {
  const row = mine(me, conversationId)
  // A request I declined is closed for me
  if (row.startedBy !== me && row.status === 'declined') throw notFound()
  const page = listMessages({
    conversationId,
    before: before || Number.MAX_SAFE_INTEGER,
    limit: PAGE + 1,
  })
  const other = getPeer({ conversationId, userId: me })!
  const shown = page.slice(0, PAGE)
  const reactions = new Map<
    number,
    { emoji: string; count: number; mine: boolean }[]
  >()
  if (shown.length) {
    for (
      const r of listReactions({
        conversationId,
        me,
        from: shown.at(-1)!.directMessageId,
        to: shown[0].directMessageId,
      })
    ) {
      reactions.set(r.directMessageId, [
        ...reactions.get(r.directMessageId) ?? [],
        { emoji: r.emoji, count: r.count, mine: !!r.mine },
      ])
    }
  }
  const files = mediaOf('message', shown.map((m) => m.directMessageId))
  return {
    id: conversationId,
    with: {
      login: other.login,
      name: other.name,
      avatarUrl: other.avatarUrl,
    },
    ...rightsOf(row, me),
    muted: !!other.mutedAt,
    archived: !!other.archivedAt,
    // Read up to here before this reading: the « Nouveaux messages » line
    readUpTo: other.lastReadAt ?? 0,
    messages: shown.reverse().map((m) => shownMessage(m, me, reactions, files)),
    more: page.length > PAGE,
  }
}

/*
 * Editing, deleting, reacting (§10.6)
 */

const updated = (conversationId: number, me: number, directMessageId: number) =>
  Entry.insert.DIRECT_MESSAGE_UPDATED({
    userId: me,
    data: { conversationId, directMessageId },
    source: 'platform',
  })

/** A message of the developer, in a conversation where both still write */
const ownMessage = (me: number, messageId: number) => {
  const message = getMessage(messageId)
  if (!message || message.authorId !== me || message.deletedAt) {
    throw new respond.NotFoundError({ message: 'Message not found' })
  }
  const row = getMine({ conversationId: message.conversationId, userId: me })!
  const block = blockOf(me, row.other)
  if (block.byMe || block.byThem) {
    throw forbidden('You cannot write to this developer')
  }
  return message
}

const writeEdit = sql<
  undefined,
  { directMessageId: number; body: string; at: number }
>`
  UPDATE directMessage SET body = :body, editedAt = :at, linkPreview = NULL
  WHERE directMessageId = :directMessageId
`.run

const writeDelete = sql<undefined, { directMessageId: number; at: number }>`
  UPDATE directMessage SET body = '', deletedAt = :at, linkPreview = NULL
  WHERE directMessageId = :directMessageId
`.run

const deleteReactions = sql<undefined, number>`
  DELETE FROM directMessageReaction WHERE directMessageId = ?
`.run

/** Edits a message of the developer; it then reads « modifié » */
export const editMessage = db.transaction(
  (me: number, messageId: number, body: string) => {
    const message = ownMessage(me, messageId)
    // A message of files alone may lose its text
    const text = cleanBody(body, mediaOf('message', [messageId]).size > 0)
    checkMessages(me)
    writeEdit({ directMessageId: messageId, body: text, at: now() })
    updated(message.conversationId, me, messageId)
    previewLater(messageId)
  },
)

/** Deletes a message of the developer: its place stays, not its text */
export const deleteMessage = db.transaction((me: number, messageId: number) => {
  const message = ownMessage(me, messageId)
  writeDelete({ directMessageId: messageId, at: now() })
  deleteReactions(messageId)
  removeMediaOf('message', messageId)
  updated(message.conversationId, me, messageId)
})

const insertReaction = sql<
  undefined,
  { messageId: number; me: number; emoji: string; at: number }
>`
  INSERT INTO directMessageReaction (directMessageId, userId, emoji, createdAt)
  VALUES (:messageId, :me, :emoji, :at)
`.run

const removeReaction = sql<
  undefined,
  { messageId: number; me: number; emoji: string }
>`
  DELETE FROM directMessageReaction
  WHERE directMessageId = :messageId AND userId = :me AND emoji = :emoji
`.run

/** Adds or takes back a reaction to a message of the conversation */
export const reactToMessage = db.transaction(
  (me: number, messageId: number, emoji: string) => {
    const message = getMessage(messageId)
    const row = message &&
      getMine({ conversationId: message.conversationId, userId: me })
    if (!message || !row || message.deletedAt) {
      throw new respond.NotFoundError({ message: 'Message not found' })
    }
    if (!(REACTIONS as readonly string[]).includes(emoji)) {
      throw badRequest('Unknown reaction')
    }
    const block = blockOf(me, row.other)
    if (block.byMe || block.byThem || row.status !== 'accepted') {
      throw forbidden('You cannot react here')
    }
    // Taken back when it was there, added otherwise
    if (!removeReaction({ messageId, me, emoji })) {
      within(countReactions, RATE.reactions, me, 'Too many reactions')
      insertReaction({ messageId, me, emoji, at: now() })
    }
    updated(message.conversationId, me, messageId)
  },
)

/*
 * Reading state of a conversation: unread, muted, archived (§10.6)
 */

const setFlag = (column: 'mutedAt' | 'archivedAt') =>
  sql<undefined, { conversationId: number; userId: number; at: number | null }>`
    UPDATE conversationMember SET ${column} = :at
    WHERE conversationId = :conversationId AND userId = :userId
  `.run
const setMuted = setFlag('mutedAt')
const setArchived = setFlag('archivedAt')

/** No toast nor count for this conversation, or back to normal */
export const muteConversation = (
  me: number,
  conversationId: number,
  muted: boolean,
) => {
  mine(me, conversationId)
  setMuted({ conversationId, userId: me, at: muted ? now() : null })
}

/** Out of the main list until a new message comes, or back in it */
export const archiveConversation = (
  me: number,
  conversationId: number,
  archived: boolean,
) => {
  mine(me, conversationId)
  setArchived({ conversationId, userId: me, at: archived ? now() : null })
}

/** Unread again from a message of the other one */
export const markUnread = (
  me: number,
  conversationId: number,
  from: number,
) => {
  mine(me, conversationId)
  const message = getMessage(from)
  if (
    !message || message.conversationId !== conversationId ||
    message.authorId === me
  ) {
    throw badRequest('Not a message received here')
  }
  setRead({ conversationId, userId: me, at: message.createdAt - 0.000001 })
}

/*
 * Search (§10.6)
 */

const findMessages = sql<
  {
    directMessageId: number
    conversationId: number
    authorId: number
    body: string
    createdAt: number
    login: string
    name: string
    avatarUrl: string
  },
  { me: number; pattern: string }
>`
  SELECT directMessage.directMessageId, directMessage.conversationId,
    directMessage.authorId, directMessage.body, directMessage.createdAt,
    other.githubUsername AS login, profile.displayName AS name,
    other.avatarUrl
  FROM directMessage
  JOIN conversation
    ON conversation.conversationId = directMessage.conversationId
  JOIN conversationMember AS me
    ON me.conversationId = directMessage.conversationId AND me.userId = :me
  JOIN conversationMember AS them
    ON them.conversationId = directMessage.conversationId
      AND them.userId != :me
  JOIN user AS other ON other.userId = them.userId
  JOIN profile ON profile.userId = them.userId
  WHERE directMessage.deletedAt IS NULL
    AND directMessage.body LIKE :pattern ESCAPE '!'
    AND NOT (conversation.startedBy != :me AND conversation.status = 'declined')
  ORDER BY directMessage.createdAt DESC
  LIMIT 30
`.all

/** The words found around a match, as plain text */
const around = (body: string, query: string) => {
  const text = plain(body)
  const at = text.toLowerCase().indexOf(query.toLowerCase())
  if (at < 0) return excerpt(body)
  const start = Math.max(0, at - 40)
  const end = Math.min(text.length, at + query.length + 80)
  return `${start ? '…' : ''}${text.slice(start, end)}${
    end < text.length ? '…' : ''
  }`
}

/** The messages of the developer's conversations that hold a text */
export const searchMessages = (me: number, query: string) => {
  const q = query.trim()
  if (q.length < 2) throw badRequest('Two characters at least')
  if (q.length > 100) throw badRequest('Query too long')
  within(countSearches, RATE.searches, me, 'Too many searches')
  searches.set(me, [...searches.get(me) ?? [], now()])
  // `!` escapes the wildcards of LIKE
  const pattern = `%${q.replace(/[!%_]/g, (c) => `!${c}`)}%`
  return findMessages({ me, pattern }).map((m) => ({
    conversationId: m.conversationId,
    with: { login: m.login, name: m.name, avatarUrl: m.avatarUrl },
    message: {
      id: m.directMessageId,
      mine: m.authorId === me,
      at: m.createdAt,
      snippet: around(m.body, q),
    },
  }))
}

/*
 * Blocking and reporting
 */

const insertBlock = sql<undefined, { me: number; other: number; at: number }>`
  INSERT OR IGNORE INTO userBlock (blockerId, blockedId, createdAt)
  VALUES (:me, :other, :at)
`.run

const deleteBlock = sql<undefined, { me: number; other: number }>`
  DELETE FROM userBlock WHERE blockerId = :me AND blockedId = :other
`.run

/** Blocks or unblocks a developer; they are never told (§10.6) */
export const setBlocked = (me: number, login: string, blocked: boolean) => {
  const other = userIdOfLogin(login)
  if (!other) throw new respond.NotFoundError({ message: 'No such developer' })
  if (other === me) throw badRequest('Not yourself')
  blocked ? insertBlock({ me, other, at: now() }) : deleteBlock({ me, other })
  return { login, blocked }
}

const insertReport = sql<
  undefined,
  { me: number; messageId: number; reason: string; comment: string; at: number }
>`
  INSERT OR IGNORE INTO report (reporterId, targetType, targetId, reason,
    comment, status, createdAt)
  VALUES (:me, 'direct_message', :messageId, :reason, :comment, 'open', :at)
`.run

/**
 * Reports a message received, for the moderators of the platform (§10.5).
 * Only a reader of the conversation reports it, and not their own.
 */
export const reportMessage = (
  me: number,
  messageId: number,
  reason: string,
  comment: string,
) => {
  const message = getMessage(messageId)
  if (
    !message || !getMine({ conversationId: message.conversationId, userId: me })
  ) {
    throw new respond.NotFoundError({ message: 'Message not found' })
  }
  if (message.authorId === me) throw badRequest('Not your own message')
  if (comment.length > LIMITS.note) throw badRequest('Comment too long')
  within(countReports, RATE.reports, me, 'Too many reports')
  insertReport({ me, messageId, reason, comment: comment.trim(), at: now() })
  Entry.insert.CONTENT_REPORTED({
    userId: me,
    communityId: maybe(null),
    postId: maybe(null),
    data: { targetType: 'direct_message', targetId: messageId },
    source: 'platform',
  })
}
