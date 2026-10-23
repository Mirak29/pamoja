import { db, sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { Entry, maybe } from '/api/entries.ts'
import { LIMITS } from '/api/limits.ts'
import { userIdOfLogin } from '/api/user.ts'

// Direct messages (§10.6): a conversation between two developers. Two who
// worked together write to each other at once; otherwise the first message
// is a request the other accepts or declines. A block stops both ways. The
// text of a message never leaves this module but to its two readers.

const notFound = () =>
  new respond.NotFoundError({ message: 'Conversation not found' })
const forbidden = (message: string) => new respond.ForbiddenError({ message })
const badRequest = (message: string) => new respond.BadRequestError({ message })

// The text a member sends: trimmed, not empty, within its size (§16)
const cleanBody = (body: string) => {
  const text = body.trim()
  if (!text) throw badRequest('A message is required')
  if (text.length > LIMITS.directMessage) throw badRequest('Message too long')
  return text
}

/*
 * Who may write to whom
 */

// A project in common (not as an observer), or a help request between them
const getWorkedTogether = sql<{ yes: number }, { a: number; b: number }>`
  SELECT EXISTS (
    SELECT 1 FROM projectMember AS one
    JOIN projectMember AS other ON other.projectId = one.projectId
    WHERE one.userId = :a AND other.userId = :b
      AND one.role != 'observer' AND other.role != 'observer'
  ) OR EXISTS (
    SELECT 1 FROM helpRequest
    WHERE (authorId = :a AND (acceptedBy = :b OR targetUserId = :b))
       OR (authorId = :b AND (acceptedBy = :a OR targetUserId = :a))
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
  { conversationId: number; authorId: number; body: string; at: number }
>`
  INSERT INTO directMessage (conversationId, authorId, body, createdAt)
  VALUES (:conversationId, :authorId, :body, :at)
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
) => {
  insertMessage({ conversationId, authorId, body, at })
  const directMessageId = db.lastInsertRowId
  touch({ conversationId, at })
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
    const at = now()
    const together = !!getWorkedTogether({ a: me, b: other })!.yes
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

const send = (me: number, conversationId: number, body: string) => {
  const row = getMine({ conversationId, userId: me })
  if (!row) throw notFound()
  const text = cleanBody(body)
  const rights = rightsOf(row, me)
  if (!rights.canWrite) {
    throw forbidden(
      rights.status === 'pending' && row.startedBy === me && !rights.blockedByMe
        ? 'Waiting for the request to be accepted'
        : 'You cannot write to this developer',
    )
  }
  // Answering a request accepts it
  if (rights.incoming) {
    setStatus({ conversationId, status: 'accepted', from: 'pending' })
  }
  return post(conversationId, me, text, now())
}

/** A message in a conversation of the developer */
export const sendMessage = db.transaction(send)

const decide = (me: number, conversationId: number, status: string) => {
  const row = getMine({ conversationId, userId: me })
  if (!row) throw notFound()
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
  if (!getMine({ conversationId, userId: me })) throw notFound()
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
  unread: number
}

const listMine = sql<ListRow, number>`
  SELECT conversation.*, other.userId AS other,
    user.githubUsername AS login, profile.displayName AS name, user.avatarUrl,
    last.body AS lastBody, last.authorId AS lastAuthor,
    last.createdAt AS lastAt,
    (SELECT count(*) FROM directMessage AS unread
      WHERE unread.conversationId = conversation.conversationId
        AND unread.authorId != me.userId
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

// What the list shows of a message: its beginning, as plain text, without
// the marks of its Markdown
export const excerpt = (body: string) => {
  const text = body
    .replace(/```[\s\S]*?(```|$)/g, ' [code] ')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/(\*\*|__|`)/g, '')
    .replace(/(^|\s)[*_]([^*_\s][^*_]*)[*_](?=\s|$|[.,;:!?])/g, '$1$2')
    .replace(/^\s*(?:[-*+]|\d+[.)]|>|#{1,6})\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
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
      last: row.lastBody === null ? null : {
        excerpt: excerpt(row.lastBody),
        mine: row.lastAuthor === me,
        at: row.lastAt!,
      },
      unread: row.unread,
    }]
  })

const PAGE = 50

const listMessages = sql<
  {
    directMessageId: number
    authorId: number
    login: string
    body: string
    createdAt: number
  },
  { conversationId: number; before: number; limit: number }
>`
  SELECT directMessageId, authorId, user.githubUsername AS login, body,
    directMessage.createdAt
  FROM directMessage
  JOIN user ON user.userId = directMessage.authorId
  WHERE conversationId = :conversationId AND directMessageId < :before
  ORDER BY directMessageId DESC
  LIMIT :limit
`.all

/** A conversation and its last 50 messages, or 50 before a message */
export const getConversation = (
  me: number,
  conversationId: number,
  before = 0,
) => {
  const row = getMine({ conversationId, userId: me })
  if (!row) throw notFound()
  // A request I declined is closed for me
  if (row.startedBy !== me && row.status === 'declined') throw notFound()
  const page = listMessages({
    conversationId,
    before: before || Number.MAX_SAFE_INTEGER,
    limit: PAGE + 1,
  })
  const other = listMine(me).find((r) => r.conversationId === conversationId)!
  return {
    id: conversationId,
    with: {
      login: other.login,
      name: other.name,
      avatarUrl: other.avatarUrl,
    },
    ...rightsOf(row, me),
    messages: page.slice(0, PAGE).reverse().map((m) => ({
      id: m.directMessageId,
      author: m.login,
      mine: m.authorId === me,
      body: m.body,
      at: m.createdAt,
    })),
    more: page.length > PAGE,
  }
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

const getMessage = sql<
  { conversationId: number; authorId: number },
  number
>`
  SELECT conversationId, authorId FROM directMessage WHERE directMessageId = ?
`.get

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
  insertReport({ me, messageId, reason, comment: comment.trim(), at: now() })
  Entry.insert.CONTENT_REPORTED({
    userId: me,
    communityId: maybe(null),
    postId: maybe(null),
    data: { targetType: 'direct_message', targetId: messageId },
    source: 'platform',
  })
}
