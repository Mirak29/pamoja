import { channels } from '/web/fixtures/channels.ts'
import { helpRequests } from '/web/fixtures/help.ts'
import { pushNotification } from '/web/fixtures/notifications.ts'
import { type Login, people, type Person } from '/web/fixtures/people.ts'
import { posts } from '/web/fixtures/posts.ts'
import { t, translate } from '/web/lib/language.ts'

// Reports of the demo content (§10.5); the server ones go through
// POST/api/report/create, and moderators decide on GET/api/moderation/queue

export type ReportKind = 'post' | 'message' | 'help' | 'profile'

export const reportReasons = [
  'Spam',
  'Harcèlement',
  'Contenu inapproprié',
  'Usurpation',
  'Triche à la réputation',
  'Autre',
]

export type Report = {
  kind: ReportKind
  target: string
  reason: string
  comment: string
  by: Login
}

const cut = (text: string) =>
  text.length > 110 ? `${text.slice(0, 108)}…` : text

const findMessage = (id: string) => {
  for (const store of Object.values(channels)) {
    for (const messages of Object.values(store ?? {})) {
      const message = messages.find((m) => m.id === id)
      if (message) return message
    }
  }
}

/** What the report dialog shows of a content: its title, kind and author */
export type ReportTarget = {
  author: Login
  title: string
  kindLabel: string
}

/** What a report points at, read from its `kind:id` (?report=post:po1) */
export const reportTarget = (
  kind: string,
  id: string,
): ReportTarget | undefined => {
  if (kind === 'message') {
    const message = findMessage(id)
    if (!message || message.author === 'platform') return
    return {
      author: message.author as Login,
      title: cut(message.text),
      kindLabel: 'Message',
    }
  }
  if (kind === 'help') {
    const help = helpRequests.find((h) => h.id === id)
    if (!help) return
    return {
      author: help.author,
      title: help.title,
      kindLabel: 'Demande d’aide',
    }
  }
  if (kind === 'profile') {
    const person = (people as Record<string, Person>)[id]
    if (!person) return
    return {
      author: id as Login,
      title: `${person.name} · @${id}`,
      kindLabel: 'Profil',
    }
  }
  const post = posts.find((p) => p.id === id)
  if (!post) return
  return {
    author: post.author,
    title: post.title || cut(post.body),
    kindLabel: post.parent ? 'Réponse' : 'Post',
  }
}

/** A report of the demo content: its moderators are told in the page */
export const submitReport = (draft: Report) => {
  const kindLabel = reportTarget(draft.kind, draft.target)?.kindLabel ??
    'Contenu'
  for (const person of Object.values(people) as Person[]) {
    if (!person.moderator) continue
    pushNotification({
      to: person.login as Login,
      category: 'system',
      kind: 'moderation',
      title: t`Nouveau signalement : ${translate(draft.reason)}`,
      body: t`${
        translate(kindLabel)
      } signalé. Il attend ta décision dans la file de modération.`,
      href: 'moderation',
    })
  }
}
