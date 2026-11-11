import {
  adoptChannelMessage,
  adoptChannelStates,
  adoptTracking,
  type Channel,
  channels,
  channelsChanged,
  likesOf,
  markChannelRead,
  type Message,
  type Notify,
  setNotifyOf,
} from '/web/fixtures/channels.ts'
import { type Login, me } from '/web/fixtures/people.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'
import { api } from '/web/lib/api.ts'
import type { Media } from '/web/lib/messages.ts'

// Channel messages saved on the server with their image (PAM-428), their
// threads and their +1 (PAM-406)

/** The latest messages of the channels the developer reads */
export const loadChannelMessages = (project: ProjectSlug) =>
  api['GET/api/project/messages'].fetch({ project }).then(
    (list) => list.forEach((saved) => adoptChannelMessage(project, saved)),
    () => {},
  )

/** Writes a message: saved by the server, then shown at once */
export const sendChannelMessage = async (
  project: ProjectSlug,
  channel: Channel,
  text: string,
  media: Media[],
) =>
  adoptChannelMessage(
    project,
    await api['POST/api/project/message/create'].fetch({
      project,
      channel,
      body: text,
      media: media.map((m) => m.id),
      alert: null,
      parent: null,
    }),
  )

/** An answer in the thread of a saved message, saved, then shown at once */
export const answerMessage = async (
  project: ProjectSlug,
  channel: Channel,
  parent: string,
  text: string,
) =>
  adoptChannelMessage(
    project,
    await api['POST/api/project/message/create'].fetch({
      project,
      channel,
      body: text,
      media: [],
      alert: null,
      parent: Number(parent.slice(1)),
    }),
  )

/**
 * A +1 given or taken back, shown at once; the server keeps the one of a
 * saved message and gives its count
 */
export const toggleLike = (message: Message) => {
  const { count, mine } = likesOf(message)
  const saved = message.id.startsWith('s')
  if (saved) message.likes = { count: count + (mine ? -1 : 1), mine: !mine }
  else {
    const like = message.reactions?.like ?? []
    message.reactions = {
      ...message.reactions,
      like: mine ? like.filter((login) => login !== me.login) : [
        ...like,
        me.login,
      ],
    }
  }
  channelsChanged.value++
  if (!saved) return
  api['POST/api/project/message/like']
    .fetch({ message: Number(message.id.slice(1)), on: !mine })
    .then((likes) => message.likes = { count: likes.likes, mine: likes.liked })
    .catch(() => message.likes = { count, mine })
    .finally(() => channelsChanged.value++)
}
/** When I last read each channel, and what reaches me from it (PAM-412) */
export const loadChannelStates = (project: ProjectSlug) =>
  api['GET/api/project/channels'].fetch({ project }).then(
    (states) => adoptChannelStates(project, states),
    () => {},
  )

// Reads of this page the server does not know yet: a channel can be read
// before the page knows its project is on the server
const unsent = new Set<string>()

/**
 * The channel on screen is read; a project the server knows keeps it, so
 * another device starts from there
 */
export const readChannel = (
  project: ProjectSlug,
  channel: Channel,
  saved: boolean,
) => {
  const key = `${project}:${channel}`
  if (markChannelRead(project, channel)) unsent.add(key)
  if (!saved || !unsent.delete(key)) return
  api['POST/api/project/channel/read'].fetch({ project, channel })
    .catch(() => unsent.add(key))
}

/** What reaches me from a channel, shown at once, kept by the server */
export const saveNotify = (
  project: ProjectSlug,
  channel: Channel,
  notify: Notify,
  saved: boolean,
) => {
  setNotifyOf(project, channel, notify)
  return saved &&
    api['POST/api/project/channel/notify'].fetch({ project, channel, notify })
      .catch(() => {})
}

// Projects whose channels this page read: a new entry reads them again
const opened = new Set<ProjectSlug>()

/** The alerts of #suivi and their threads (PAM-411) */
export const loadTracking = (project: ProjectSlug) => {
  opened.add(project)
  return api['GET/api/project/tracking'].fetch({ project }).then(
    (alerts) => adoptTracking(project, alerts),
    () => {},
  )
}

/** The channels of the projects opened, read again after GitHub or a message */
export const reloadOpenedChannels = () => {
  for (const project of opened) {
    loadTracking(project)
    loadChannelMessages(project)
  }
}

/** An answer under an alert of #suivi, saved, then shown at once */
export const answerAlert = async (
  project: ProjectSlug,
  alertId: string,
  text: string,
) => {
  const saved = await api['POST/api/project/message/create'].fetch({
    project,
    channel: 'tracking',
    body: text,
    media: [],
    alert: Number(alertId.slice(1)),
    parent: null,
  })
  const alert = channels[project]?.tracking.find((m) => m.id === alertId)
  const id = `s${saved.id}`
  if (alert && !alert.replies?.some((reply) => reply.id === id)) {
    alert.replies = [...alert.replies ?? [], {
      id,
      author: saved.author as Login,
      text: saved.body,
      at: saved.createdAt * 1000,
      demo: false,
    }]
  }
  channelsChanged.value++
}
