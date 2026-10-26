import { adoptChannelMessage, type Channel } from '/web/fixtures/channels.ts'
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
