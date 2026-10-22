import { signal } from '@preact/signals'
import { channels } from '/web/fixtures/channels.ts'
import { communities } from '/web/fixtures/communities.ts'
import { helpRequests } from '/web/fixtures/help.ts'
import { pushNotification } from '/web/fixtures/notifications.ts'
import { type Login, people, type Person } from '/web/fixtures/people.ts'
import { posts, postsChanged } from '/web/fixtures/posts.ts'
import { projects } from '/web/fixtures/projects.ts'
import { proofs } from '/web/fixtures/reputation.ts'
import { t, translate } from '/web/lib/language.ts'

// Reports and moderation decisions (§10.5), what POST/api/report/create and
// POST/api/moderation/decide will handle

export type ReportKind = 'post' | 'message' | 'help' | 'profile'

export const reportReasons = [
  'Spam',
  'Harcèlement',
  'Contenu inapproprié',
  'Usurpation',
  'Triche à la réputation',
  'Autre',
]

export const moderationActions = [
  ['ignore', 'Ignorer'],
  ['hide', 'Masquer'],
  ['warn', 'Avertir'],
  ['suspend', 'Suspendre'],
  ['remove-proof', 'Retirer la preuve'],
] as const

export type ModerationAction = typeof moderationActions[number][0]

export type Report = {
  id: string
  kind: ReportKind
  target: string
  reason: string
  comment: string
  by: Login
  at: number
  status: 'open' | 'handled' | 'ignored'
  action?: ModerationAction
  motif?: string
  moderator?: Login
  decidedAt?: number
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
  tracking: 'suivi',
  help: 'aide',
  announcements: 'annonces',
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
      href: `projet/${slug}/canaux/${channelPaths[channel]}`,
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
      where: help.project ? projects[help.project].name : '',
      href: `aide/${id}`,
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

/** POST/api/moderation/decide: the author is told why */
export const decideReport = (
  report: Report,
  action: ModerationAction,
  motif: string,
  moderator: Login,
) => {
  const target = reportTarget(report.kind, report.target)
  Object.assign(report, {
    status: action === 'ignore' ? 'ignored' : 'handled',
    action,
    motif,
    moderator,
    decidedAt: Date.now(),
  })
  if (target && action !== 'ignore') {
    // The motive and the title are written by people: kept as they are
    const tell = (title: string, body: string) =>
      pushNotification({
        to: target.author,
        category: 'system',
        kind: 'moderation',
        title: translate(title),
        body,
        href: target.href,
      })
    if (action === 'hide') {
      if (report.kind === 'post') {
        const post = posts.find((p) => p.id === report.target)!
        post.hidden = true
        post.hiddenReason = motif
        tell('Ton post a été masqué', t`« ${target.title} » · Motif : ${motif}`)
      } else if (report.kind === 'help') {
        const help = helpRequests.find((h) => h.id === report.target)!
        help.status = 'cancelled'
        help.hidden = true
        tell(
          'Ta demande d’aide a été retirée',
          t`« ${target.title} » · Motif : ${motif}`,
        )
      } else if (report.kind === 'profile') {
        const person: Person = people[report.target as Login]
        person.hiddenFromSearch = true
        tell('Ton profil est retiré des recherches', motif)
      } else {
        const found = findMessage(report.target)!
        found.message.text = 'Message masqué par la modération.'
        found.message.moderated = true
        tell('Ton message a été masqué', t`Motif : ${motif}`)
      }
    }
    if (action === 'warn') {
      tell(
        'Avertissement de la modération',
        t`À propos de ${translate(target.label)} · ${motif}`,
      )
    }
    if (action === 'suspend') {
      const author: Person = people[target.author]
      author.suspended = true
      tell('Ton compte est suspendu 7 jours', motif)
    }
    if (action === 'remove-proof') {
      for (let i = proofs.length - 1; i >= 0; i--) {
        const proof = proofs[i]
        if (proof.help === report.target || proof.post === report.target) {
          proofs.splice(i, 1)
        }
      }
      tell('Une preuve a été retirée de ton profil', motif)
    }
  }
  reportsChanged.value++
  postsChanged.value++
}
