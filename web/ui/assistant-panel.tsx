import { useEffect, useRef, useState } from 'preact/hooks'
import { A, url } from '@01edu/signal-router'
import { Send, Sparkles, Trash2, X } from '/web/assets/icons.tsx'
import {
  askAssistant,
  asking,
  assistant,
  type AssistantMessage,
  assistantOpen,
  clearAssistant,
  loadAssistant,
} from '/web/lib/assistant.ts'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Input } from '/web/ui/input.tsx'

// The panel of the Assistant (§11, PAM-534): on every page, at the right
// (the whole screen on a phone). It stays open while one browses: an answer
// is read, its link followed, the conversation is still there.

const QUESTION_MAX = 500

type Extras = Pick<AssistantMessage, 'cards' | 'actions'>

// What developers ask first (State of Dev Sénégal 2026, §10.3), and what
// the page open invites to ask
const suggestionsFor = (path: string) => [
  ...(/^\/project\/[^/]+/.test(path)
    ? ['Où en est ce projet ?', 'Que puis-je faire sur ce projet ?']
    : []),
  'Qu’est-ce qui m’attend aujourd’hui ?',
  'Je veux contribuer à l’open source, par où commencer ?',
  'Sur quel projet suis-je le plus utile ?',
  'Comment demander une review ?',
]

const Cards = ({ cards, actions }: Extras) => (
  <>
    {cards.length > 0 && (
      <div class='tile flex flex-col overflow-hidden'>
        {cards.map((card, i) => (
          <div
            key={`${card.href} ${card.title}`}
            class={`flex items-center gap-3 px-3.5 py-2.5 ${
              i ? 'border-t border-line' : ''
            }`}
          >
            <span class='flex min-w-0 flex-1 flex-col'>
              <span class='truncate font-mono text-[11px] leading-4 font-medium tracking-[.06em] text-ink-muted uppercase'>
                {card.type}
                {card.project && ' · '}
                {
                  // The project itself is one click away
                  card.project && (card.projectHref
                    ? (
                      <A href={card.projectHref} class='text-indigo'>
                        {card.project}
                      </A>
                    )
                    : card.project)
                }
              </span>
              <A
                href={card.href}
                class='text-[14px] leading-5 font-semibold text-pretty text-ink'
              >
                {card.title}
              </A>
            </span>
            {card.score > 0 && (
              <span class='flex-none font-mono text-[12px] leading-4 font-medium text-ink-muted'>
                {card.score} / 100
              </span>
            )}
          </div>
        ))}
      </div>
    )}
    {actions.length > 0 && (
      <div class='flex flex-wrap gap-2 pb-1'>
        {actions.map((action) => (
          <Button
            key={action.href}
            variant='secondary'
            size={36}
            href={action.href}
          >
            {action.label}
          </Button>
        ))}
      </div>
    )}
  </>
)

// The answer with its links where it names things; a message kept before
// the links existed has its text only
const Answer = ({ message }: { message: AssistantMessage }) =>
  message.parts?.length
    ? (
      <>
        {message.parts.map((part, i) =>
          part.href
            ? (
              <A key={i} href={part.href} class='font-semibold text-indigo'>
                {part.text}
              </A>
            )
            : part.text
        )}
      </>
    )
    : <>{message.content}</>

const Message = ({ message }: { message: AssistantMessage }) =>
  message.role === 'user'
    ? (
      <p class='max-w-[85%] self-end rounded-md bg-indigo-soft px-3 py-2 text-[14px] leading-5 text-pretty'>
        {message.content}
      </p>
    )
    : (
      <div class='flex flex-col gap-2.5'>
        <p class='text-[14px] leading-[22px] text-pretty whitespace-pre-line'>
          {message.fallback
            ? message.cards.length
              ? 'Je ne peux pas rédiger de réponse pour l’instant. Voici ce que Pamoja a trouvé pour toi :'
              : 'Je ne peux pas rédiger de réponse pour l’instant. Pamoja ne sait pas encore ce qui te correspond : ajoute tes skills à ton profil, ça prend deux minutes, et je pourrai te proposer des choses précises.'
            : <Answer message={message} />}
        </p>
        <Cards cards={message.cards} actions={message.actions} />
      </div>
    )

// The point of the developer, before any question: computed without AI
const Opening = ({ point }: { point: Extras }) => (
  <div class='flex flex-col gap-2.5'>
    <p class='text-[14px] leading-[22px] text-pretty'>
      {point.cards.length
        ? 'Bonjour ! Voici ton point du moment. Pose-moi une question, ou choisis-en une plus bas.'
        : 'Bonjour ! Tu es à jour, rien ne t’attend. Pose-moi une question, ou choisis-en une plus bas.'}
    </p>
    <Cards cards={point.cards} actions={point.actions} />
  </div>
)

const Panel = () => {
  const [question, setQuestion] = useState('')
  const state = assistant.value
  const pending = asking.value
  const scroller = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const count = state?.messages.length ?? 0
  useEffect(() => {
    loadAssistant()
    field.current?.querySelector('input')?.focus()
  }, [])
  // The last message, or the wait for it, stays in view
  useEffect(() => {
    const box = scroller.current
    box && box.scrollTo({ top: box.scrollHeight })
  }, [count, pending])
  const send = async (text: string) => {
    setQuestion('')
    await askAssistant(text) || setQuestion(text)
  }
  return (
    <aside
      aria-label='Assistant'
      onKeyDown={(event) => {
        event.key === 'Escape' && (assistantOpen.value = false)
      }}
      class='fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-line-strong bg-surface-100 shadow-slab-pop sm:w-[400px]'
    >
      <div class='flex flex-none items-center gap-2 border-b border-line px-4 py-3'>
        <Sparkles class='size-4 flex-none text-indigo' />
        <h2 class='flex-1 font-display text-[16px] leading-6 font-semibold'>
          Assistant
        </h2>
        {count > 0 && (
          <Button
            variant='secondary'
            size={32}
            square
            aria-label='Nouvelle conversation : efface celle-ci'
            title='Nouvelle conversation'
            disabled={pending !== null}
            onClick={clearAssistant}
          >
            <Trash2 class='size-4' />
          </Button>
        )}
        <Button
          variant='secondary'
          size={32}
          square
          aria-label='Fermer l’Assistant'
          onClick={() => assistantOpen.value = false}
        >
          <X class='size-4' />
        </Button>
      </div>
      <div
        ref={scroller}
        // A column that keeps its gesture, as a ScrollFrame `contain`
        data-scroller='contain'
        class='relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4'
      >
        {!state && (
          <p class='text-[13px] text-ink-muted' role='status'>Chargement…</p>
        )}
        {state && !count && pending === null && <Opening point={state.point} />}
        {state?.messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {pending !== null && (
          <>
            <p class='max-w-[85%] self-end rounded-md bg-indigo-soft px-3 py-2 text-[14px] leading-5 text-pretty'>
              {pending}
            </p>
            <p class='text-[13px] text-ink-muted' role='status'>
              Je regarde ce que Pamoja sait pour toi…
            </p>
          </>
        )}
      </div>
      <div class='flex flex-none flex-col gap-2.5 border-t border-line px-4 pt-3 pb-4'>
        {state && pending === null && (
          <div class='flex flex-col gap-1.5'>
            <Eyebrow>Demande-moi</Eyebrow>
            <div class='flex flex-wrap gap-2 pb-1'>
              {suggestionsFor(url.relativePath)
                .slice(0, count ? 3 : 6)
                .map((text) => (
                  <OptionButton
                    key={text}
                    pressed={false}
                    onClick={() => send(text)}
                  >
                    {text}
                  </OptionButton>
                ))}
            </div>
          </div>
        )}
        <form
          class='flex gap-2'
          onSubmit={(event) => {
            event.preventDefault()
            send(question)
          }}
        >
          <div ref={field} class='min-w-0 flex-1'>
            <Input
              value={question}
              maxLength={QUESTION_MAX}
              placeholder='Pose ta question'
              aria-label='Ta question à l’Assistant'
              onInput={(event) => setQuestion(event.currentTarget.value)}
            />
          </div>
          <Button
            type='submit'
            size={40}
            square
            aria-label='Envoyer la question'
            disabled={pending !== null || !question.trim()}
          >
            <Send class='size-4' />
          </Button>
        </form>
        <span class='text-[12px] leading-4 text-ink-muted'>
          Je réponds avec ce que Pamoja sait de toi, sans rien inventer. Ta
          conversation est gardée pour toi seul ; la corbeille l’efface.
        </span>
      </div>
    </aside>
  )
}

/** The Assistant, when it is open; on every page of the app */
export const AssistantPanel = () => assistantOpen.value ? <Panel /> : null

/** The button of the header that opens and closes the Assistant */
export const AssistantButton = () => (
  <Button
    variant='secondary'
    size={40}
    square
    aria-label='Assistant'
    aria-pressed={assistantOpen.value}
    title='Assistant (Ctrl J)'
    onClick={() => assistantOpen.value = !assistantOpen.peek()}
  >
    <Sparkles class='size-5' />
  </Button>
)
