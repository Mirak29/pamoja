import { signal } from '@preact/signals'
import { daysAgo, hoursAgo } from '/web/fixtures/clock.ts'
import { logActivity } from '/web/fixtures/activity.ts'
import { postAlert } from '/web/fixtures/channels.ts'
import { match, waves } from '/web/fixtures/matching.ts'
import { pushNotification } from '/web/fixtures/notifications.ts'
import { type Login, me, people, type Person } from '/web/fixtures/people.ts'
import { projectsChanged, type ProjectSlug } from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'
import { proofs } from '/web/fixtures/reputation.ts'
import { counted } from '/web/lib/plural.ts'
import { settings } from '/web/fixtures/settings.ts'

/** Kinds of help a request asks for, and a developer accepts (§7.1) */
export const helpTypes = [
  'Review de code',
  'Debug',
  'Architecture',
  'Sécurité',
  'Tests',
  'DevOps',
  'UI/UX',
  'Documentation',
  'Pair programming',
  'Mentorat',
  'Recherche de contributeur',
]

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
  /** Withdrawn by a moderator */
  hidden?: boolean
  log?: { text: string; at: number; verified?: boolean }[]
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

/**
 * Open requests of others that match a developer, best first, from the
 * minimum score set in the settings (§7.3)
 */
export const matchingRequests = (person: Person, min = settings.minScore) =>
  helpRequests
    .filter((h) =>
      h.status === 'open' && h.author !== person.login &&
      !h.withdrawn?.includes(person.login as Login)
    )
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
      text: `Vague 1 : ${
        counted(
          waves(request)[0].length,
          'développeur notifié',
          'développeurs notifiés',
        )
      }`,
      at,
    },
  ]
  helpRequests.unshift(request)
  helpChanged.value++
  answer(request)
  return request
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
      title: `${firstName(author)} t’a écrit`,
      body: text.length > 90 ? `${text.slice(0, 88)}…` : text,
      href: `aide/${request.id}`,
    })
  }
  helpChanged.value++
}

/**
 * A review detected on GitHub (§7.5): the request, and the whole project
 * with it, the PR, its Pulse, #suivi and the journal
 */
const reviewDetected = (request: HelpRequest, helper: Login) => {
  const name = firstName(helper)
  const number = request.pullRequest!
  request.status = 'review_submitted'
  log(request, `Review de ${name} détectée sur la PR #${number}`)
  const pr = pullRequests.find((p) =>
    p.project === request.project && p.number === number
  )
  if (pr) {
    pr.review = 'received'
    pr.reviewers = [...(pr.reviewers ?? []), helper]
  }
  if (request.project) {
    logActivity(request.project, `Review de ${name} reçue sur la PR #${number}`)
    postAlert(
      request.project,
      'review',
      `Review de ${name} sur la PR #${number}${pr ? ` « ${pr.title} »` : ''}.`,
    )
    projectsChanged.value++
  }
}

// Delays of the simulated answer, short enough to rehearse the demo
const ACCEPT_DELAY = 4000
const MESSAGE_DELAY = 1500
const REVIEW_DELAY = 7000

/**
 * What the other side does until the API exists: the best notified developer
 * accepts, then their review is detected on GitHub, or they deliver the help
 * (§7.2, §7.5). Each step reaches the requester as a notification.
 */
const answer = (request: HelpRequest) => {
  const helper = waves(request)[0][0]?.login
  if (!helper) return
  const name = firstName(helper)
  setTimeout(() => {
    if (request.status !== 'open') return
    Object.assign(request, {
      status: 'accepted',
      helper,
      acceptedAt: Date.now(),
    })
    log(request, `${name} a accepté la demande`)
    helpChanged.value++
    pushNotification({
      to: request.author,
      category: 'for-you',
      kind: 'help',
      title: `${name} a accepté ta demande`,
      body: request.pullRequest
        ? `Sa review de la PR #${request.pullRequest} sera détectée sur GitHub.`
        : `« ${request.title} »`,
      href: `aide/${request.id}`,
    })
    // The helper says hello in the thread of the request
    setTimeout(() => {
      if (request.helper !== helper) return
      sendHelpMessage(
        request,
        helper,
        request.pullRequest
          ? `Je prends la PR #${request.pullRequest}. Je commence par les tests, puis ${
            request.skills.slice(0, 2).join(' et ')
          }. Je te laisse mes remarques sur GitHub.`
          : 'Je regarde ça aujourd’hui. Si tu as un exemple qui reproduit le problème, mets-le ici.',
      )
    }, MESSAGE_DELAY)
    setTimeout(() => {
      if (request.status !== 'accepted' || request.helper !== helper) return
      const review = !!request.pullRequest
      if (review) reviewDetected(request, helper)
      else {
        request.status = 'delivered'
        log(request, `${name} a marqué l’aide comme livrée`)
      }
      helpChanged.value++
      pushNotification({
        to: request.author,
        category: 'for-you',
        kind: 'help',
        title: review
          ? `${name} a relu la PR #${request.pullRequest}`
          : `${name} a livré son aide`,
        body: 'Confirme si elle t’a aidé : la preuve rejoint son profil.',
        href: `aide/${request.id}`,
      })
    }, REVIEW_DELAY)
  }, ACCEPT_DELAY)
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
            title: `${firstName(helper!)} s’est désisté`,
            body: `« ${request.title} » repasse en Ouverte.`,
            href: `aide/${request.id}`,
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
