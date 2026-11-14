import { db, sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { Entry } from '/api/entries.ts'
import { type Window, within } from '/api/lib/rate.ts'
import { LIMITS } from '/api/limits.ts'
import { attach, mediaOf } from '/api/media.ts'
import { entries } from '/api/entry-types.ts'
import { ProjectMessage } from '/api/schema.ts'

// The messages of the project channels, saved with their image (PAM-428,
// §6.8, §17.3). A video goes in the text by its link and is embedded by the
// page. #suivi has no message of its own. Members answer in a thread under a
// message or an alert, readers give a +1 (PAM-406).

export const CHANNELS = ['general', 'help', 'announcements']

/** The entries #suivi shows: what GitHub did in the project (§6.8) */
export const TRACKING_TYPES = [
  entries.PR_OPENED,
  entries.PR_REVIEWED,
  entries.PR_MERGED,
  entries.PR_CLOSED,
  entries.PR_REVIEW_STALE,
  entries.ISSUE_UPDATED,
  entries.RELEASE_PUBLISHED,
  entries.CI_FAILED,
  entries.CI_FIXED,
  entries.COMMITS_PUSHED,
]
export const CHANNEL_MEDIA_MAX = 1
export const CHANNEL_RATE = { count: 120, per: 3600 }
/** The one reaction of a message for now; the table keeps its emoji */
export const LIKE = '+1'

export type ChannelMessageInput = {
  project: string
  channel: string
  body: string
  media?: number[] | null
  /** An alert of #suivi: the message answers it in its thread */
  alert?: number | null
  /** A message of the channel: the message answers it in its thread */
  parent?: number | null
}

const badRequest = (message: string) => new respond.BadRequestError({ message })

const getProject = sql<{ projectId: number }, string>`
  SELECT projectId FROM project WHERE slug = ?
`.get

/** The role of a developer in a project, if they belong to it */
export const getRole = sql<
  { role: string },
  { projectId: number; userId: number }
>`
  SELECT role FROM projectMember
  WHERE projectId = :projectId AND userId = :userId
`.get

const getFollow = sql<{ yes: number }, { projectId: number; userId: number }>`
  SELECT 1 AS yes FROM follow
  WHERE followerId = :userId AND targetType = 'project'
    AND targetId = :projectId
`.get

const countMessages = sql<Window, { me: number; since: number }>`
  SELECT count(*) AS n, min(createdAt) AS oldest FROM projectMessage
  WHERE authorId = :me AND createdAt > :since
`.get

type MessageRow = {
  messageId: number
  parentMessageId: number | null
  parentEntryId: number | null
  channel: string
  author: string
  authorName: string
  avatarUrl: string
  body: string
  createdAt: number
}

const messageSelect = `
  SELECT projectMessage.messageId, projectMessage.parentMessageId,
    projectMessage.parentEntryId,
    projectMessage.channel,
    user.githubUsername AS author, profile.displayName AS authorName,
    user.avatarUrl, projectMessage.body, projectMessage.createdAt
  FROM projectMessage
  JOIN user ON user.userId = projectMessage.authorId
  JOIN profile ON profile.userId = projectMessage.authorId
`

const listRecent = sql<MessageRow, { projectId: number; channels: string }>`
  SELECT * FROM (${messageSelect}
    WHERE projectMessage.projectId = :projectId
      AND projectMessage.parentMessageId IS NULL
      AND projectMessage.parentEntryId IS NULL
      AND projectMessage.hiddenAt IS NULL
      AND projectMessage.channel IN (SELECT value FROM json_each(:channels))
    ORDER BY projectMessage.createdAt DESC
    LIMIT 300
  ) ORDER BY createdAt
`.all

// The threads under the messages shown, oldest reply first
const listReplies = sql<MessageRow, { projectId: number; parents: string }>`
  ${messageSelect}
  WHERE projectMessage.projectId = :projectId
    AND projectMessage.parentMessageId IN (SELECT value FROM json_each(:parents))
    AND projectMessage.hiddenAt IS NULL
  ORDER BY projectMessage.createdAt
`.all

const getOne = sql<MessageRow, number>`${messageSelect}
  WHERE projectMessage.messageId = ?
`.get

const listUnder = sql<MessageRow, { projectId: number; alerts: string }>`
  ${messageSelect}
  WHERE projectMessage.projectId = :projectId
    AND projectMessage.parentEntryId IN (SELECT value FROM json_each(:alerts))
    AND projectMessage.hiddenAt IS NULL
  ORDER BY projectMessage.createdAt
`.all

const getAlert = sql<{ yes: number }, { entryId: number; projectId: number }>`
  SELECT 1 AS yes FROM entry
  WHERE id = :entryId AND projectId = :projectId
    AND type IN (SELECT value FROM json_each('${
  JSON.stringify(TRACKING_TYPES)
}'))
`.get

// A message a thread can start under: shown, in its project, not a reply
const getParent = sql<
  { channel: string },
  { messageId: number; projectId: number }
>`
  SELECT channel FROM projectMessage
  WHERE messageId = :messageId AND projectId = :projectId
    AND parentMessageId IS NULL AND parentEntryId IS NULL
    AND hiddenAt IS NULL
`.get

// The message of a project and its channel, for a reaction
const getTarget = sql<{ channel: string; slug: string }, number>`
  SELECT projectMessage.channel, project.slug
  FROM projectMessage JOIN project USING (projectId)
  WHERE projectMessage.messageId = ? AND projectMessage.hiddenAt IS NULL
`.get

type LikeRow = { messageId: number; likes: number; liked: number }

const listLikes = sql<LikeRow, { me: number; messages: string }>`
  SELECT messageId, count(*) AS likes, max(userId = :me) AS liked
  FROM messageReaction
  WHERE emoji = '${LIKE}'
    AND messageId IN (SELECT value FROM json_each(:messages))
  GROUP BY messageId
`.all

const addLike = sql<undefined, { messageId: number; me: number }>`
  INSERT OR IGNORE INTO messageReaction (messageId, userId, emoji)
  VALUES (:messageId, :me, '${LIKE}')
`.run

const removeLike = sql<undefined, { messageId: number; me: number }>`
  DELETE FROM messageReaction
  WHERE messageId = :messageId AND userId = :me AND emoji = '${LIKE}'
`.run

const shown = (me: number, rows: MessageRow[]) => {
  const ids = rows.map((row) => row.messageId)
  const media = mediaOf('channel_message', ids)
  const likes = new Map(
    listLikes({ me, messages: JSON.stringify(ids) })
      .map((like) => [like.messageId, like]),
  )
  return rows.map((row) => ({
    id: row.messageId,
    channel: row.channel,
    alert: row.parentEntryId ?? 0,
    parent: row.parentMessageId ?? 0,
    author: row.author,
    authorName: row.authorName,
    avatarUrl: row.avatarUrl,
    body: row.body,
    media: media.get(row.messageId) ?? [],
    likes: likes.get(row.messageId)?.likes ?? 0,
    liked: !!likes.get(row.messageId)?.liked,
    createdAt: row.createdAt,
  }))
}

// The channels a developer reads and writes in a project (§6.8); #suivi is
// read by members and followers, written by the platform only
export const rightsIn = (me: number, slug: string) => {
  const project = getProject(slug)
  if (!project) throw new respond.NotFoundError({ message: 'No such project' })
  const role = getRole({ projectId: project.projectId, userId: me })?.role
  const follows = !!getFollow({ projectId: project.projectId, userId: me })
  const leads = role === 'owner' || role === 'maintainer'
  return {
    projectId: project.projectId,
    member: !!role,
    reads: role
      ? [...CHANNELS, 'tracking']
      : follows
      ? ['tracking', 'announcements']
      : [],
    writes: role ? leads ? CHANNELS : ['general', 'help'] : [],
  }
}

/**
 * The latest messages of the channels the developer reads, oldest first,
 * then the replies of their threads
 */
export const listChannelMessages = (me: number, slug: string) => {
  const { projectId, reads } = rightsIn(me, slug)
  if (!reads.length) return []
  const messages = listRecent({ projectId, channels: JSON.stringify(reads) })
  const parents = JSON.stringify(messages.map((row) => row.messageId))
  return shown(me, [...messages, ...listReplies({ projectId, parents })])
}

/** The threads under alerts of #suivi, oldest reply first */
export const repliesUnder = (me: number, projectId: number, alerts: number[]) =>
  shown(me, listUnder({ projectId, alerts: JSON.stringify(alerts) }))

/**
 * Writes a message with its image, if the channel is open to its author;
 * a thread, under a message or an alert of #suivi, is open to the members
 */
export const createChannelMessage = (
  me: number,
  input: ChannelMessageInput,
) => {
  const body = input.body.trim()
  const media = input.media ?? []
  const alert = input.alert ?? 0
  const parent = input.parent ?? 0
  if (alert && parent) throw badRequest('One thread at a time')
  if (
    alert ? input.channel !== 'tracking' : !CHANNELS.includes(input.channel)
  ) {
    throw badRequest('Unknown channel')
  }
  if (!body && !media.length) throw badRequest('An empty message')
  if (body.length > LIMITS.channelMessage) throw badRequest('Text too long')
  if (media.length > CHANNEL_MEDIA_MAX) throw badRequest('One image at most')
  const { projectId, writes, member } = rightsIn(me, input.project)
  const open = alert
    ? member && !!getAlert({ entryId: alert, projectId })
    : parent
    ? member &&
      getParent({ messageId: parent, projectId })?.channel === input.channel
    : writes.includes(input.channel)
  if (!open) {
    throw new respond.ForbiddenError({ message: 'Not open to you' })
  }
  within(countMessages, CHANNEL_RATE, me, 'Too many messages this hour')
  const messageId = db.transaction(() => {
    const messageId = ProjectMessage.insert({
      projectId,
      channel: input.channel,
      authorId: me,
      body,
      parentMessageId: parent || null,
      parentEntryId: alert || null,
      source: 'platform',
      createdAt: now(),
    })
    attach(me, media, 'channel_message', messageId)
    Entry.insert.MESSAGE_CREATED({
      userId: me,
      projectId,
      messageId,
      source: 'platform',
    })
    return messageId
  })()
  return shown(me, [getOne(messageId)!])[0]
}

/** A +1 given or taken back by a reader of the channel; the new count */
export const likeMessage = (me: number, messageId: number, on: boolean) => {
  const target = getTarget(messageId)
  if (!target || !rightsIn(me, target.slug).reads.includes(target.channel)) {
    throw new respond.NotFoundError({ message: 'No such message' })
  }
  ;(on ? addLike : removeLike)({ messageId, me })
  const [like] = listLikes({ me, messages: JSON.stringify([messageId]) })
  return { likes: like?.likes ?? 0, liked: !!like?.liked }
}
