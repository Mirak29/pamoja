import { effect, signal } from '@preact/signals'
import { url } from '@01edu/signal-router'
import { CircleAlert } from '/web/assets/icons.tsx'
import { api, type ApiOutput, retryAfterOf } from '/web/lib/api.ts'
import { t } from '/web/lib/language.ts'
import { waitLabel } from '/web/lib/messages.ts'
import { currentUser } from '/web/lib/session.ts'
import { notify } from '/web/ui/toast.tsx'

// The Assistant (§11, PAM-534): a panel on every page. Its conversation is
// kept by the server; the panel stays open from a page to the next, and
// from a visit to the next.

type State = ApiOutput['GET/api/assistant']
export type AssistantMessage = State['messages'][number]

const OPEN_KEY = 'pamoja-assistant-open'

// Private windows may refuse the storage: the panel then opens closed
const stored = () => {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

/** The panel is open */
export const assistantOpen = signal(stored())
/** The conversation and the point of the developer; undefined until read */
export const assistant = signal<State | undefined>(undefined)
/** The question on its way, until its answer comes */
export const asking = signal<string | null>(null)

effect(() => {
  const open = assistantOpen.value
  try {
    localStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    // Not kept: nothing else depends on it
  }
})

// The page open, for the context of a question (a project, §11)
const page = () => url.peek().pathname

let reading: Promise<void> | undefined

/** Reads the conversation and the point; once at a time */
export const loadAssistant = () =>
  reading ??= api['GET/api/assistant'].fetch({ page: page() })
    .then((state) => {
      assistant.value = state
    }, () => {})
    .finally(() => reading = undefined)

/** Asks a question; the answer joins the conversation */
export const askAssistant = async (question: string) => {
  const asked = question.trim()
  if (!asked || asking.peek() !== null) return false
  asking.value = asked
  try {
    const answer = await api['POST/api/assistant/ask'].fetch({
      question: asked,
      page: page(),
    })
    const state = assistant.peek()
    assistant.value = {
      point: state?.point ??
        { cards: [], actions: [], fallback: true, parts: [] },
      messages: [
        ...state?.messages ?? [],
        {
          ...answer,
          id: answer.id - 1,
          role: 'user',
          content: asked,
          cards: [],
          actions: [],
          fallback: false,
          parts: [],
        },
        answer,
      ],
    }
    return true
  } catch (err) {
    const wait = retryAfterOf(err)
    notify({
      title: wait ? 'Beaucoup de questions aujourd’hui' : 'Pas de réponse',
      body: wait
        ? t`Tu as posé toutes tes questions du jour. Réessaie ${
          waitLabel(wait)
        }.`
        : 'Pamoja n’a pas pu répondre. Réessaie dans un instant.',
      icon: CircleAlert,
      tone: 'warning',
    })
    return false
  } finally {
    asking.value = null
  }
}

/** « Nouvelle conversation »: erased on the server, for good */
export const clearAssistant = async () => {
  await api['POST/api/assistant/clear'].fetch().catch(() => {})
  await loadAssistant()
}

/** Opens the panel, on a question if one is given */
export const openAssistant = (question?: string) => {
  assistantOpen.value = true
  question && askAssistant(question)
}

// Another developer signs in: their conversation, not the last one's
let readFor: number | undefined
effect(() => {
  const userId = currentUser.value?.userId
  if (userId === readFor) return
  readFor = userId
  assistant.value = undefined
})

// Ctrl J / ⌘J opens and closes the panel, from any page
addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'j' || !(event.metaKey || event.ctrlKey)) {
    return
  }
  if (!currentUser.peek()) return
  event.preventDefault()
  assistantOpen.value = !assistantOpen.peek()
})
