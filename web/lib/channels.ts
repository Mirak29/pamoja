import {
  adoptChannelMessage,
  adoptChannelStates,
  type Channel,
  markChannelRead,
  type Notify,
  setNotifyOf,
} from '/web/fixtures/channels.ts'
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
