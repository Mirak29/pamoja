import { signal } from '@preact/signals'
import { channels } from '/web/fixtures/channels.ts'
import { communities } from '/web/fixtures/communities.ts'
import { helpRequests } from '/web/fixtures/help.ts'
import { pushNotification } from '/web/fixtures/notifications.ts'
import { type Login, people, type Person } from '/web/fixtures/people.ts'
import { posts } from '/web/fixtures/posts.ts'
import { projects } from '/web/fixtures/projects.ts'
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
  id: string
  kind: ReportKind
  target: string
  reason: string
  comment: string
  by: Login
  at: number
  status: 'open' | 'handled' | 'ignored'
}

export const reports: Report[] = []

export const reportsChanged = signal(0)

const cut = (text: string) =>
  text.length > 110 ? `${text.slice(0, 108)}…` : text

const findMessage = (id: string) => {
  for (const [slug, store] of Object.entries(channels)) {
    for (const [channel, messages] of Object.entries(store ?? {})) {
      const message = messages.find((m) => m.id === id)
      if (message) return { slug, channel, message }
    }
  }
}

const channelPaths: Record<string, string> = {
  general: 'general',
  tracking: 'updates',
  help: 'help',
  announcements: 'announcements',
}

export type ReportTarget = {
  author: Login
  title: string
  excerpt: string
  kindLabel: string
  where: string
  href: string
  /** How the author is told about it: « ton post », « ta demande » */
  label: string
}

/** What a report points at, read from its `kind:id` (?report=post:po1) */
export const reportTarget = (
  kind: string,
  id: string,
): ReportTarget | undefined => {
  if (kind === 'message') {
    const found = findMessage(id)
    if (!found || found.message.author === 'platform') return
    const { slug, channel, message } = found
    return {
      author: message.author as Login,
      title: cut(message.text),
      excerpt: '',
      kindLabel: 'Message',
      where: `${projects[slug as keyof typeof projects].name} · #${
        channelPaths[channel] === 'general' ? 'général' : channelPaths[channel]
      }`,
      href: `project/${slug}/channels/${channelPaths[channel]}`,
      label: 'ton message',
    }
  }
  if (kind === 'help') {
    const help = helpRequests.find((h) => h.id === id)
    if (!help) return
    return {
      author: help.author,
      title: help.title,
      excerpt: cut(help.description),
      kindLabel: 'Demande d’aide',
      where: help.project ? projects[help.project]?.name ?? help.project : '',
      href: `help/${id}`,
      label: 'ta demande d’aide',
    }
  }
  if (kind === 'profile') {
    const person = (people as Record<string, Person>)[id]
    if (!person) return
    return {
      author: id as Login,
      title: `${person.name} · @${id}`,
      excerpt: cut(person.headline),
      kindLabel: 'Profil',
      where: `${person.city}, ${person.country}`,
      href: `@${id}`,
      label: 'ton profil',
    }
  }
  const post = posts.find((p) => p.id === id)
  if (!post) return
  return {
    author: post.author,
    title: post.title || cut(post.body),
    excerpt: post.title ? cut(post.body) : '',
    kindLabel: post.parent ? 'Réponse' : 'Post',
    where: communities.find((c) => c.slug === post.community)?.name ?? '',
    href: `post/${id}`,
    label: post.parent ? 'ta réponse' : 'ton post',
  }
}

/** POST/api/report/create: moderators are notified */
export const submitReport = (
  draft: Pick<Report, 'kind' | 'target' | 'reason' | 'comment' | 'by'>,
) => {
  reports.unshift({
    ...draft,
    id: `r${reports.length + 1}`,
    at: Date.now(),
    status: 'open',
  })
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
  reportsChanged.value++
}
