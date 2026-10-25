import {
  adoptHelpRequests,
  type HelpAction,
  type HelpRequest,
} from '/web/fixtures/help.ts'
import type { Matched } from '/web/fixtures/matching.ts'
import { type Login, me, personOf } from '/web/fixtures/people.ts'
import { counted } from '/web/lib/plural.ts'
import { helpCategories, type HelpCategory } from '/api/vocabulary.ts'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { t, translate } from '/web/lib/language.ts'
import { signal } from '@preact/signals'

/*
 * The tabs of the help page come by batches of 20 (§12.7): the first when a
 * tab opens, the next ones on demand. The requests join those of the pages.
 */

export type HelpListTab = 'for-me' | 'mine' | 'accepted' | 'projects'

/**
 * Cursor of the next batch of each tab: empty once everything is read,
 * missing before the first batch
 */
export const helpBatches = signal<Partial<Record<HelpListTab, string>>>({})

const reading = new Map<HelpListTab, Promise<void>>()

const readBatch = async (tab: HelpListTab, before: string) => {
  if (tab === 'for-me') {
    const batch = await api['GET/api/help/for-me'].fetch({ before })
    adoptHelpRequests(batch.items)
      .forEach((request, i) => request.myScore = batch.items[i].score)
    return batch.next
  }
  const batch = await api['GET/api/help'].fetch({ tab, before })
  adoptHelpRequests(batch.items)
  return batch.next
}

/** The next batch of a tab, the first one if none was read; once at a time */
export const loadHelpBatch = (tab: HelpListTab) => {
  const before = helpBatches.peek()[tab]
  if (before === '') return Promise.resolve()
  const current = reading.get(tab)
  if (current) return current
  const read = readBatch(tab, before ?? '')
    .then((next) => {
      helpBatches.value = { ...helpBatches.peek(), [tab]: next }
    })
    .catch(() => {})
    .finally(() => reading.delete(tab))
  reading.set(tab, read)
  return read
}

/**
 * The newest requests again, after a change: the first batch of all of them
 * and of « Pour moi ». The older batches already read keep their cursor.
 */
export const reloadHelpRequests = () =>
  Promise.all([
    api['GET/api/help'].fetch({ tab: '', before: '' })
      .then((batch) => adoptHelpRequests(batch.items)),
    readBatch('for-me', '').then((next) => {
      const batches = helpBatches.peek()
      if (batches['for-me'] === undefined) {
        helpBatches.value = { ...batches, 'for-me': next }
      }
    }),
  ]).catch(() => {})

// A real help request plays its lifecycle on the server (§7.2); the demo ones
// keep playing it in the page (actOnHelp). The page reads the answer as the
// demo ones: thread, journal, release date.

type Detail = ApiOutput['GET/api/help/detail']

const firstName = (login: string) => personOf(login).name.split(' ')[0]

/** The journal of the page, from the entries of the request */
const logLine = ({ event, login }: Detail['timeline'][number]) => {
  const name = firstName(login)
  switch (event) {
    case 'HELP_REQUEST_CREATED':
      return translate('Demande publiée')
    case 'HELP_REQUEST_ACCEPTED':
      return t`${name} a accepté la demande`
    case 'HELP_REQUEST_WITHDRAWN':
      return t`${name} s’est désisté`
    case 'HELP_REQUEST_RELEASED':
      return t`Demande libérée : ${name} sans activité depuis 72 h`
    case 'HELP_REQUEST_REOPENED':
      return translate('Demande rouverte avec les mêmes données')
    case 'HELP_REQUEST_EXPIRED':
      return translate('Demande expirée : 7 jours sans acceptation')
    case 'HELP_REQUEST_CANCELLED':
      return translate('Demande annulée')
    case 'HELP_REQUEST_DELIVERED':
      return t`${name} a marqué l’aide comme livrée`
    case 'HELP_REQUEST_CLOSED':
      return translate('Demande fermée')
    case 'REVIEW_SUBMITTED':
      return t`Review de ${name} détectée sur GitHub`
    default:
      return t`Aide confirmée : preuve ajoutée au profil de ${name}`
  }
}

type Reason = Detail['matches'][number]['reasons'][number]

/** A criterion of « Pourquoi ce match ? », in the language of the page */
export const criterionOf = (reason: Reason) => {
  switch (reason.kind) {
    case 'skills':
      return t`Skills : ${(reason.skills ?? []).join(', ')} · ${
        reason.skills?.length ?? 0
      } sur ${reason.of ?? 0}`
    case 'type':
      return t`Accepte les demandes « ${
        translate(
          helpCategories[reason.category as HelpCategory] ??
            reason.category ?? '',
        )
      } »`
    case 'confirmed':
      return reason.review
        ? counted(reason.count ?? 0, 'review confirmée', 'reviews confirmées')
        : counted(reason.count ?? 0, 'aide confirmée', 'aides confirmées')
    case 'availability':
      return translate(
        !reason.available
          ? 'Peu disponible'
          : reason.active
          ? 'Disponible et actif ces 14 derniers jours'
          : 'Disponible cette semaine',
      )
    case 'affinity':
      return reason.community
        ? t`Communauté ${reason.community} en commun`
        : translate('Suit le projet')
    default:
      return ''
  }
}

/** A match of the server as the pages show them */
export const matchedOf = (
  m: { login: string; score: number; reasons: Reason[]; newcomer: boolean },
): Matched => ({
  login: m.login as Login,
  score: m.score,
  criteria: m.reasons
    .filter((r) => r.kind !== 'newcomer')
    .map((r) => ({ label: criterionOf(r), points: r.points })),
  promising: m.newcomer,
})

/** The answer of the server joins the request of the page */
const adoptDetail = (detail: Detail) => {
  const [request] = adoptHelpRequests([detail])
  Object.assign(request, {
    matched: detail.matches.map(matchedOf),
    wave: Math.max(1, ...detail.matches.map((m) => m.wave)),
    releasableAt: detail.releasableAt * 1000,
    withdrawn: detail.left ? [me.login] : [],
    messages: detail.messages.map((m) => ({
      author: m.author as Login,
      text: m.body,
      at: m.createdAt * 1000,
    })),
    log: detail.timeline.map((entry) => ({
      text: logLine(entry),
      at: entry.at * 1000,
      verified: entry.event === 'REVIEW_SUBMITTED',
    })),
  })
  return request
}

/** Reads a real request: by its id, any developer may open it */
export const loadHelpDetail = (id: string) =>
  api['GET/api/help/detail'].fetch({ id }).then(adoptDetail)

const routes = {
  accept: 'POST/api/help/accept',
  withdraw: 'POST/api/help/withdraw',
  release: 'POST/api/help/release',
  cancel: 'POST/api/help/cancel',
  reopen: 'POST/api/help/reopen',
  deliver: 'POST/api/help/deliver',
  decline: 'POST/api/help/decline',
  confirm: 'POST/api/help/confirm',
} as const

export type Feedback = {
  title: string
  body?: string
  tone: 'verified' | 'warning' | 'muted'
}

const done = (
  action: keyof typeof routes,
  request: HelpRequest,
): Feedback => {
  switch (action) {
    case 'accept':
      return {
        title: translate('Demande acceptée'),
        body: request.pullRequest
          ? translate(
            'Fais ta review sur GitHub : Pamoja la détectera automatiquement.',
          )
          : translate('Marque l’aide comme livrée quand c’est fait.'),
        tone: 'verified',
      }
    case 'withdraw':
      return {
        title: translate('Tu t’es désisté'),
        body: translate('La demande repasse en Ouverte.'),
        tone: 'muted',
      }
    case 'release':
      return {
        title: translate('Demande libérée'),
        body: translate(
          'Elle repasse en Ouverte et la vague suivante est notifiée.',
        ),
        tone: 'muted',
      }
    case 'cancel':
      return { title: translate('Demande annulée'), tone: 'muted' }
    case 'reopen':
      return {
        title: translate('Demande rouverte'),
        body: translate(
          'Elle est ouverte 7 jours, le temps qu’un développeur l’accepte.',
        ),
        tone: 'verified',
      }
    case 'deliver':
      return {
        title: translate('Aide livrée'),
        body: t`En attente de la confirmation de ${firstName(request.author)}.`,
        tone: 'verified',
      }
    case 'decline':
      return { title: translate('Demande fermée'), tone: 'muted' }
    case 'confirm':
      return {
        title: translate('Merci pour la confirmation'),
        body: t`${
          firstName(request.helper ?? '')
        } reçoit une preuve sur son profil.`,
        tone: 'verified',
      }
  }
}

/** What the server answered, said for the developer */
const refusal = (err: unknown): Feedback => {
  const message = err instanceof Error ? err.message : ''
  if (message === 'Already taken') {
    return {
      title: translate('Déjà prise'),
      body: translate(
        'Un autre développeur a accepté cette demande avant toi.',
      ),
      tone: 'warning',
    }
  }
  if (message.startsWith('Possible 72 h')) {
    return {
      title: translate('Pas encore'),
      body: translate('Possible après 72 h sans activité de l’aidant.'),
      tone: 'warning',
    }
  }
  if (message === 'You left this request') {
    return {
      title: translate('Tu t’es désisté de cette demande'),
      body: translate('Elle est proposée à d’autres développeurs.'),
      tone: 'warning',
    }
  }
  return {
    title: translate('Action impossible'),
    body: translate(
      'La demande a changé entre-temps. La page montre son état actuel.',
    ),
    tone: 'warning',
  }
}

/** A transition of a real request; the page then shows the state saved */
export const playOnServer = async (
  request: HelpRequest,
  action: HelpAction,
): Promise<Feedback | undefined> => {
  if (!(action in routes)) return
  const route = routes[action as keyof typeof routes]
  try {
    const detail = await api[route].fetch({ id: Number(request.id) })
    return done(action as keyof typeof routes, adoptDetail(detail))
  } catch (err) {
    await loadHelpDetail(request.id).catch(() => {})
    return refusal(err)
  }
}

/** A message of the thread of a real request */
export const sendOnServer = async (request: HelpRequest, text: string) => {
  const detail = await api['POST/api/help/message'].fetch({
    id: Number(request.id),
    body: text,
  })
  adoptDetail(detail)
}
