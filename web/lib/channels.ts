import {
  adoptChannelMessage,
  adoptChannelStates,
  adoptTracking,
  type Channel,
  channels,
  channelsChanged,
  markChannelRead,
  type Notify,
  setNotifyOf,
} from '/web/fixtures/channels.ts'
import type { Login } from '/web/fixtures/people.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'
import { api } from '/web/lib/api.ts'
import type { Media } from '/web/lib/messages.ts'

// Channel messages saved on the server with their image (PAM-428); threads
// and reactions stay in the page until PAM-406

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
    }),
  )

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
