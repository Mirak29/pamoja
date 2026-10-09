import { signal } from '@preact/signals'
import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
import { match, MIN_SCORE, waves } from '/web/fixtures/matching.ts'
import { type Login, me, people, type Person } from '/web/fixtures/people.ts'
import type { ProjectSlug } from '/web/fixtures/projects.ts'

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
  /** Failing CI job, for a request born from a #suivi alert */
  job?: string
  video?: string
  /** Screenshot URLs, 4 at most */
  captures?: string[]
  /** Developers who withdrew or were released: excluded from next waves */
  withdrawn?: Login[]
  wave?: number
  log?: { text: string; at: number; verified?: boolean }[]
  demo: boolean
}

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

// Session changes until the help routes exist (PAM-207, PAM-208): screens
// read this signal to refresh, as they will on an SSE entry
export const helpChanged = signal(0)

/** Open requests of others that match a developer, best first (§7.3) */
export const matchingRequests = (person: Person, min = MIN_SCORE) =>
  helpRequests
    .filter((h) => h.status === 'open' && h.author !== person.login)
    .map((h) => ({ request: h, score: match(person, h).total }))
    .filter((h) => h.score >= min)
    .sort((a, b) => b.score - a.score)

const firstName = (login: Login) => people[login].name.split(' ')[0]
const log = (request: HelpRequest, text: string) => {
  request.log = [
    ...(request.log ?? [{ text: 'Demande publiée', at: request.at }]),
    { text, at: Date.now() },
  ]
}

export type HelpDraft = Pick<
  HelpRequest,
  | 'type'
  | 'title'
  | 'description'
  | 'project'
  | 'pullRequest'
  | 'skills'
  | 'level'
  | 'duration'
  | 'branch'
  | 'job'
  | 'video'
  | 'captures'
>

/** POST/api/help/create: publish and notify the first wave */
export const publishHelp = (draft: HelpDraft) => {
  const at = Date.now()
  const request: HelpRequest = {
    ...draft,
    id: `h${at}`,
    author: me.login,
    status: 'open',
    at,
    wave: 1,
    demo: false,
  }
  request.log = [
    { text: 'Demande publiée', at },
    {
      text: `Vague 1 : ${waves(request)[0].length} développeurs notifiés`,
      at,
    },
  ]
  helpRequests.unshift(request)
  helpChanged.value++
  return request
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
