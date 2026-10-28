import { db, sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { Entry } from '/api/entries.ts'
import { type Window, within } from '/api/lib/rate.ts'
import { LIMITS } from '/api/limits.ts'
import { attach, mediaOf } from '/api/media.ts'
import { ProjectMessage } from '/api/schema.ts'

// The messages of the project channels, saved with their image (PAM-428,
// §6.8, §17.3). A video goes in the text by its link and is embedded by the
// page. #suivi has no message of its own; threads, reactions and the live
// stream come with PAM-406.

export const CHANNELS = ['general', 'help', 'announcements']
export const CHANNEL_MEDIA_MAX = 1
export const CHANNEL_RATE = { count: 120, per: 3600 }

export type ChannelMessageInput = {
  project: string
  channel: string
  body: string
  media?: number[] | null
}

const badRequest = (message: string) => new respond.BadRequestError({ message })

const getProject = sql<{ projectId: number }, string>`
  SELECT projectId FROM project WHERE slug = ?
`.get

const getRole = sql<{ role: string }, { projectId: number; userId: number }>`
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
  channel: string
  author: string
  authorName: string
  avatarUrl: string
  body: string
  createdAt: number
}

const messageSelect = `
  SELECT projectMessage.messageId, projectMessage.channel,
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
      AND projectMessage.hiddenAt IS NULL
      AND projectMessage.channel IN (SELECT value FROM json_each(:channels))
    ORDER BY projectMessage.createdAt DESC
    LIMIT 300
  ) ORDER BY createdAt
`.all

const getOne = sql<MessageRow, number>`${messageSelect}
  WHERE projectMessage.messageId = ?
`.get

const shown = (rows: MessageRow[]) => {
  const media = mediaOf('channel_message', rows.map((row) => row.messageId))
  return rows.map((row) => ({
    id: row.messageId,
    channel: row.channel,
    author: row.author,
    authorName: row.authorName,
    avatarUrl: row.avatarUrl,
    body: row.body,
    media: media.get(row.messageId) ?? [],
    createdAt: row.createdAt,
  }))
}

// The channels a developer reads and writes in a project (§6.8)
const rightsIn = (me: number, slug: string) => {
  const project = getProject(slug)
  if (!project) throw new respond.NotFoundError({ message: 'No such project' })
  const role = getRole({ projectId: project.projectId, userId: me })?.role
  const follows = !!getFollow({ projectId: project.projectId, userId: me })
  const leads = role === 'owner' || role === 'maintainer'
  return {
    projectId: project.projectId,
    reads: role ? CHANNELS : follows ? ['announcements'] : [],
    writes: role ? leads ? CHANNELS : ['general', 'help'] : [],
  }
}

/** The latest messages of the channels the developer reads, oldest first */
export const listChannelMessages = (me: number, slug: string) => {
  const { projectId, reads } = rightsIn(me, slug)
  if (!reads.length) return []
  return shown(listRecent({ projectId, channels: JSON.stringify(reads) }))
}

/** Writes a message with its image, if the channel is open to its author */
export const createChannelMessage = (
  me: number,
  input: ChannelMessageInput,
) => {
  const body = input.body.trim()
  const media = input.media ?? []
  if (!CHANNELS.includes(input.channel)) throw badRequest('Unknown channel')
  if (!body && !media.length) throw badRequest('An empty message')
  if (body.length > LIMITS.channelMessage) throw badRequest('Text too long')
  if (media.length > CHANNEL_MEDIA_MAX) throw badRequest('One image at most')
  const { projectId, writes } = rightsIn(me, input.project)
  if (!writes.includes(input.channel)) {
    throw new respond.ForbiddenError({ message: 'Not open to you' })
  }
  within(countMessages, CHANNEL_RATE, me, 'Too many messages this hour')
  const messageId = db.transaction(() => {
    const messageId = ProjectMessage.insert({
      projectId,
      channel: input.channel,
      authorId: me,
      body,
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
  return shown([getOne(messageId)!])[0]
}
