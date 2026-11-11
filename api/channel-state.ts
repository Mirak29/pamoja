import { sql } from '@01edu/db'
import { respond } from '@01edu/api/response'
import { now } from '@01edu/time'
import { rightsIn } from '/api/channels.ts'
import { ChannelState } from '/api/schema.ts'

// What each developer read in each channel of a project, and what reaches
// them from it (PAM-412, §6.8): the page counts the messages of others
// after `lastReadAt`, as the setting says

export const NOTIFY = ['all', 'mentions', 'mine', 'none']
// #suivi speaks of every PR: only mine by default
const defaultNotify = (channel: string) =>
  channel === 'tracking' ? 'mine' : 'all'

const listStates = ChannelState.sql<
  'channel' | 'lastReadAt' | 'notify',
  { userId: number; projectId: number }
>`
  SELECT channel, lastReadAt, notify FROM channelState
  WHERE userId = :userId AND projectId = :projectId
`.all

const writeRead = sql<
  undefined,
  { userId: number; projectId: number; channel: string; at: number }
>`
  INSERT INTO channelState (userId, projectId, channel, lastReadAt, notify)
  VALUES (:userId, :projectId, :channel, :at,
    CASE :channel WHEN 'tracking' THEN 'mine' ELSE 'all' END)
  ON CONFLICT (userId, projectId, channel)
  DO UPDATE SET lastReadAt = max(coalesce(lastReadAt, 0), excluded.lastReadAt)
`.run

const writeNotify = sql<
  undefined,
  { userId: number; projectId: number; channel: string; notify: string }
>`
  INSERT INTO channelState (userId, projectId, channel, notify)
  VALUES (:userId, :projectId, :channel, :notify)
  ON CONFLICT (userId, projectId, channel)
  DO UPDATE SET notify = excluded.notify
`.run

// The project of a channel the developer reads, or an error
const readable = (me: number, slug: string, channel: string) => {
  const { projectId, reads } = rightsIn(me, slug)
  if (!reads.includes(channel)) {
    throw new respond.ForbiddenError({ message: 'Not a channel you read' })
  }
  return projectId
}

/** Each channel the developer reads: when they last read it, its setting */
export const channelStatesOf = (me: number, slug: string) => {
  const { projectId, reads } = rightsIn(me, slug)
  const saved = new Map(
    listStates({ userId: me, projectId }).map((row) => [row.channel, row]),
  )
  return reads.map((channel) => ({
    channel,
    // Never opened: 0, everything of others is new
    lastReadAt: saved.get(channel)?.lastReadAt ?? 0,
    notify: saved.get(channel)?.notify ?? defaultNotify(channel),
  }))
}

/** The channel is read up to now; a read never goes back in time */
export const markRead = (me: number, slug: string, channel: string) => {
  const projectId = readable(me, slug, channel)
  writeRead({ userId: me, projectId, channel, at: now() })
}

/** All, mentions, mine (#suivi only) or none */
export const setNotify = (
  me: number,
  slug: string,
  channel: string,
  notify: string,
) => {
  if (
    !NOTIFY.includes(notify) || (notify === 'mine' && channel !== 'tracking')
  ) {
    throw new respond.BadRequestError({ message: 'Unknown setting' })
  }
  const projectId = readable(me, slug, channel)
  writeNotify({ userId: me, projectId, channel, notify })
}
