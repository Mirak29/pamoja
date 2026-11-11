import { signal } from '@preact/signals'
import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
import { match, type Matched } from '/web/fixtures/matching.ts'
import { demoImage } from '/web/fixtures/media.ts'
import { pushNotification } from '/web/fixtures/notifications.ts'
import {
  type Login,
  me,
  people,
  type Person,
  personOf,
} from '/web/fixtures/people.ts'
import { projectsChanged, type ProjectSlug } from '/web/fixtures/projects.ts'
import { proofs } from '/web/fixtures/reputation.ts'
import { settings } from '/web/fixtures/settings.ts'
import type { ApiOutput } from '/web/lib/api.ts'
import {
  helpCategories,
  type HelpCategory,
  type HelpLevel,
  helpLevels,
} from '/api/vocabulary.ts'
import { t } from '/web/lib/language.ts'
import type { Media } from '/web/lib/messages.ts'

/** Kinds of help a request asks for, and a developer accepts (§7.1) */
export const helpTypes: string[] = Object.values(helpCategories)

/** Lifecycle of a help request (cahier des charges §7.2) */
export type HelpStatus =
  | 'open'
  | 'accepted'
  | 'review_submitted'
  | 'delivered'
  | 'completed'
  | 'closed_unhelpful'
  | 'closed_unconfirmed'
  | 'expired'
  | 'cancelled'

export type HelpRequest = {
  id: string
  author: Login
  helper?: Login
  project?: ProjectSlug
  type: string
  title: string
  description: string
  skills: string[]
  level: string
  duration: string
  status: HelpStatus
  at: number
  acceptedAt?: number
  issue?: number
  pullRequest?: number
  branch?: string
  /** owner/name of the repository of the PR, from the API */
  repository?: string
  /** Failing CI job, for a request born from a #suivi alert */
  job?: string
  video?: string
  /** Screenshots, 4 at most (§17.3) */
  media?: Media[]
  /** Developers who withdrew or were released: excluded from next waves */
  withdrawn?: Login[]
  wave?: number
  /** Withdrawn by a moderator */
  hidden?: boolean
  log?: { text: string; at: number; verified?: boolean }[]
  /** A real request: when the requester may release the helper (§7.2) */
  releasableAt?: number
  /** A real request: its matches as the server shows them to me (§7.3) */
  matched?: Matched[]
  /** A real request I was matched with: my score */
  myScore?: number
  /** The thread between the requester and the helper (§7.2) */
  messages?: HelpMessage[]
  demo: boolean
}

export type HelpMessage = { author: Login; text: string; at: number }

export const helpRequests: HelpRequest[] = [
  {
    id: 'h1',
    author: 'kofi',
    project: 'africommerce',
    type: 'Review de code',
    title: 'Relire l’API Go de paiement à la livraison',
    description:
      'L’API Go qui gère le paiement à la livraison est prête. Je voudrais un second avis sur la gestion des erreurs et la validation des montants avant de la brancher à l’app mobile.',
    skills: ['Go', 'Backend'],
    level: 'Intermédiaire',
    duration: '~30 min',
    status: 'open',
    media: [demoImage('paiement-api-go')],
    at: hoursAgo(5),
    demo: true,
  },
  {
    id: 'h2',
    author: 'fatou',
    project: 'dakar-transit',
    type: 'Architecture',
    title: 'Choisir l’architecture du backend des horaires',
    description:
      'Les horaires changent souvent et les données arrivent en CSV. Je cherche à choisir entre un import planifié et une API qui sert directement les fichiers. Un avis sur la structure serait précieux.',
    skills: ['Backend', 'Go', 'SQL'],
    level: 'Confirmé',
    duration: '~45 min',
    status: 'open',
    media: [demoImage('horaires-architecture')],
    at: hoursAgo(20),
    demo: true,
  },
  {
    id: 'h3',
    author: 'abdou',
    project: 'openpay-africa',
    type: 'Debug',
    title: 'Verrou SQLite sous charge concurrente (issue #44)',
    description:
      'Sous charge, plusieurs callbacks Wave écrivent en même temps dans SQLite et on obtient « database is locked ». Le mode WAL n’a pas suffi. J’aimerais une piste sur les transactions ou le pool de connexions.',
    skills: ['SQLite', 'Go', 'Concurrency'],
    level: 'Confirmé',
    duration: '~1 h',
    status: 'open',
    media: [demoImage('sqlite-locked')],
    at: hoursAgo(30),
    issue: 44,
    demo: true,
  },
  {
    id: 'h4',
    author: 'awa',
    project: 'senegal-maps',
    type: 'Debug',
    title: 'Les tuiles de la carte clignotent sur mobile',
    description:
      'Sur mobile, les tuiles clignotent quand on zoome rapidement. Le problème apparaît surtout sur Android avec une connexion lente.',
    skills: ['React', 'TypeScript'],
    level: 'Intermédiaire',
    duration: '~30 min',
    status: 'open',
    media: [
      demoImage('carte-tuiles-mobile'),
      demoImage('carte-tuiles-reseau'),
    ],
    at: hoursAgo(3),
    demo: true,
  },
  {
    id: 'h5',
    author: 'abdou',
    helper: 'moussa',
    project: 'openpay-africa',
    type: 'Review de code',
    title: 'Relire la migration SQLite de la PR #62',
    description:
      'La PR #62 migre le schéma des transactions. Je veux être sûr que la migration est réversible et ne bloque pas la base en production.',
    skills: ['Go', 'SQLite'],
    level: 'Intermédiaire',
    duration: '~20 min',
    status: 'completed',
    at: daysAgo(12),
    pullRequest: 62,
    demo: true,
  },
]

// Changes of the requests, read from the API or played on the page until the
// lifecycle routes exist (PAM-208): screens read this signal to refresh
export const helpChanged = signal(0)

// The skills, projects and communities kept in the settings; an empty
// filter keeps everything (§7.4)
const kept = (request: HelpRequest) =>
  (!settings.onlySkills.length ||
    request.skills.some((skill) => settings.onlySkills.includes(skill))) &&
  (!settings.onlyProjects.length ||
    (!!request.project && settings.onlyProjects.includes(request.project))) &&
  (!settings.onlyCommunities.length ||
    personOf(request.author).communities.some((slug) =>
      settings.onlyCommunities.includes(slug)
    ))

/**
 * Open requests of others that match a developer, best first, from the
 * filters and the minimum score set in the settings (§7.3, §7.4)
 */
export const matchingRequests = (person: Person, min = settings.minScore) =>
  helpRequests
    .filter((h) =>
      h.status === 'open' && h.author !== person.login &&
      !h.withdrawn?.includes(person.login as Login)
    )
    // A real request reaches me through the matching of the server, which
    // already applied my filters and my minimum score
    .filter((h) => !h.demo || kept(h))
    .map((h) => ({
      request: h,
      score: h.demo ? match(person, h).total : h.myScore ?? 0,
    }))
    .filter((h) => h.request.demo ? h.score >= min : h.score > 0)
    .sort((a, b) => b.score - a.score)

const firstName = (login: Login) => people[login].name.split(' ')[0]
const log = (request: HelpRequest, text: string) => {
  request.log = [
    ...(request.log ?? [{ text: 'Demande publiée', at: request.at }]),
    { text, at: Date.now() },
  ]
}

type ApiHelp = ApiOutput['GET/api/help'][number]

/** « ~20 min », « ~1 h »: a duration in minutes as the form shows it */
export const durationLabel = (minutes: number) =>
  minutes >= 60 ? `~${minutes / 60} h` : `~${minutes} min`

/** Minutes of a duration label of the form */
export const minutesOf = (label: string) => {
  const [, value, unit] = label.match(/(\d+)\s*(min|h)/) ?? []
  return value ? Number(value) * (unit === 'h' ? 60 : 1) : 0
}

/**
 * The requests read from the API join those of the pages (§7.1), until the
 * help screens read the API themselves. Returns them as the pages see them.
 */
export const adoptHelpRequests = (list: ApiHelp[]) => {
  const adopted = list.map((help) => {
    const id = String(help.id)
    const known = helpRequests.find((h) => h.id === id)
    const request: HelpRequest = Object.assign(known ?? {} as HelpRequest, {
      id,
      author: help.author as Login,
      helper: (help.helper || undefined) as Login | undefined,
      project: (help.project || undefined) as ProjectSlug | undefined,
      type: helpCategories[help.category as HelpCategory] ?? help.category,
      title: help.title,
      description: help.description,
      skills: help.skills,
      level: helpLevels[help.expectedLevel as HelpLevel] ?? '',
      duration: help.estimatedMinutes
        ? durationLabel(help.estimatedMinutes)
        : '',
      status: help.status as HelpStatus,
      at: help.createdAt * 1000,
      acceptedAt: help.acceptedAt ? help.acceptedAt * 1000 : undefined,
      pullRequest: help.pullRequest || undefined,
      branch: help.branch || undefined,
      repository: help.repository || undefined,
      video: help.videoUrl || undefined,
      media: help.media,
      demo: help.demo,
    })
    known || helpRequests.unshift(request)
    return request
  })
  // Newest first, as the lists show them
  helpRequests.sort((a, b) => b.at - a.at)
  helpChanged.value++
  // A project page shows its requests too: counter, PR, #suivi
  projectsChanged.value++
  return adopted
}

/** POST/api/help/message: the other side of the thread is notified */
export const sendHelpMessage = (
  request: HelpRequest,
  author: Login,
  text: string,
) => {
  request.messages = [
    ...(request.messages ?? []),
    { author, text, at: Date.now() },
  ]
  const to = author === request.author ? request.helper : request.author
  if (to) {
    pushNotification({
      to,
      category: 'for-you',
      kind: 'help',
      title: t`${firstName(author)} t’a écrit`,
      body: text.length > 90 ? `${text.slice(0, 88)}…` : text,
      href: `help/${request.id}`,
    })
  }
  helpChanged.value++
}

export type HelpAction =
  | 'accept'
  | 'later'
  | 'withdraw'
  | 'release'
  | 'cancel'
  | 'reopen'
  | 'deliver'
  | 'confirm'
  | 'decline'

type Feedback = {
  title: string
  body?: string
  tone: 'verified' | 'warning' | 'muted'
}

/** REVIEW_HELP_CONFIRMED: the helper gets a proof and a confirmed help (§8.3) */
const confirmProof = (request: HelpRequest) => {
  const helper = request.helper!
  proofs.push({
    id: `p${proofs.length + 1}`,
    who: helper,
    dimension: request.pullRequest ? 'review' : 'help',
    title: request.pullRequest
      ? `Review de la PR #${request.pullRequest}`
      : request.title,
    project: request.project,
    by: request.author,
    at: Date.now(),
    verified: false,
    pullRequest: request.pullRequest,
    help: request.id,
    demo: true,
  })
}

/** The lifecycle transitions of §7.2, played by the signed-in developer */
export const actOnHelp = (
  request: HelpRequest,
  action: HelpAction,
): Feedback => {
  const helper = request.helper
  const feedback = ((): Feedback => {
    switch (action) {
      case 'accept':
        if (request.status !== 'open') {
          return {
            title: 'Déjà prise',
            body: helper
              ? `${firstName(helper)} a accepté cette demande avant toi.`
              : 'Cette demande n’est plus ouverte.',
            tone: 'warning',
          }
        }
        Object.assign(request, {
          status: 'accepted',
          helper: me.login,
          acceptedAt: Date.now(),
        })
        log(request, `${firstName(me.login)} a accepté la demande`)
        return {
          title: 'Demande acceptée',
          body: request.pullRequest
            ? 'Fais ta review sur GitHub : Pamoja la détectera automatiquement.'
            : 'Marque l’aide comme livrée quand c’est fait.',
          tone: 'verified',
        }
      case 'later':
        return {
          title: 'Demande mise de côté',
          body: 'Tu la retrouves dans Aide, onglet Pour moi.',
          tone: 'muted',
        }
      case 'withdraw':
      case 'release':
        request.withdrawn = [...(request.withdrawn ?? []), helper!]
        Object.assign(request, {
          status: 'open',
          helper: undefined,
          wave: (request.wave ?? 1) + 1,
        })
        if (action === 'withdraw') {
          log(request, `${firstName(helper!)} s’est désisté`)
          pushNotification({
            to: request.author,
            category: 'for-you',
            kind: 'help',
            title: t`${firstName(helper!)} s’est désisté`,
            body: t`« ${request.title} » repasse en Ouverte.`,
            href: `help/${request.id}`,
          })
          return {
            title: 'Tu t’es désisté',
            body: 'La demande repasse en Ouverte.',
            tone: 'muted',
          }
        }
        log(
          request,
          `${firstName(me.login)} a libéré la demande après 72 h sans activité`,
        )
        return {
          title: 'Demande libérée',
          body: 'Elle repasse en Ouverte et la vague suivante est notifiée.',
          tone: 'muted',
        }
      case 'cancel':
        request.status = 'cancelled'
        log(request, 'Demande annulée')
        return { title: 'Demande annulée', tone: 'muted' }
      case 'reopen':
        Object.assign(request, {
          status: 'open',
          at: Date.now(),
          helper: undefined,
          wave: 1,
        })
        log(request, 'Demande rouverte avec les mêmes données')
        return {
          title: 'Demande rouverte',
          body: 'La vague 1 est notifiée à nouveau.',
          tone: 'verified',
        }
      case 'deliver':
        request.status = 'delivered'
        log(request, `${firstName(me.login)} a marqué l’aide comme livrée`)
        return {
          title: 'Aide livrée',
          body: `En attente de la confirmation de ${
            firstName(request.author)
          }.`,
          tone: 'verified',
        }
      case 'decline':
        request.status = 'closed_unhelpful'
        log(
          request,
          `${firstName(me.login)} a indiqué que l’aide n’était pas utile`,
        )
        return { title: 'Demande fermée', tone: 'muted' }
      case 'confirm':
        request.status = 'completed'
        log(request, `${firstName(me.login)} a confirmé que l’aide était utile`)
        confirmProof(request)
        return {
          title: 'Merci pour la confirmation',
          body: `${firstName(helper!)} reçoit une preuve sur son profil.`,
          tone: 'verified',
        }
    }
  })()
  helpChanged.value++
  return feedback
}
