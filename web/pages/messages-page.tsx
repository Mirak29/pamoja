import { useEffect, useRef, useState } from 'preact/hooks'
import { A, navigate, url } from '@01edu/signal-router'
import {
  ArrowLeft,
  CircleAlert,
  Flag,
  MessageSquare,
  SendHorizontal,
} from '/web/assets/icons.tsx'
import { LIMITS } from '/api/limits.ts'
import { type ReportReason, reportReasons } from '/api/vocabulary.ts'
import { personOf } from '/web/fixtures/people.ts'
import { t } from '/web/lib/language.ts'
import {
  answerRequest,
  type Conversation,
  conversations,
  conversationsLoaded,
  conversationWith,
  loadOlder,
  openConversation,
  reportMessage,
  sendMessage,
  setBlocked,
  startConversation,
  thread,
} from '/web/lib/messages.ts'
import { loadProfile } from '/web/lib/profile.ts'
import { ago } from '/web/lib/time.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { Field, Textarea } from '/web/ui/input.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Markdown } from '/web/ui/rich-text.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'
import { notify } from '/web/ui/toast.tsx'

// Direct messages (§10.6): the conversations on the left, the one open on
// the right; on a phone, one or the other.

const idOfAddress = () => {
  const id = Number(url.relativePath.slice(1).split('/')[1])
  return Number.isInteger(id) && id > 0 ? id : null
}

const Row = ({ conversation, active }: {
  conversation: Conversation
  active: boolean
}) => (
  <A
    href={`messages/${conversation.id}`}
    aria-current={active ? 'page' : undefined}
    class={`flex items-center gap-3 border-t border-line px-4 py-3 text-ink no-underline hover:bg-surface-000 hover:no-underline ${
      active ? 'bg-indigo-soft' : ''
    }`}
  >
    <Avatar
      name={conversation.with.name}
      src={conversation.with.avatarUrl}
      size={42}
    />
    <span class='flex min-w-0 flex-1 flex-col gap-0.5'>
      <span class='flex items-baseline justify-between gap-2'>
        <span
          translate={false}
          class={`truncate text-[14px] ${
            conversation.unread ? 'font-bold' : 'font-semibold'
          }`}
        >
          {conversation.with.name}
        </span>
        {conversation.last && (
          <span class='flex-none text-[12px] text-ink-muted'>
            {ago(conversation.last.at * 1000)}
          </span>
        )}
      </span>
      <span class='flex items-center gap-2'>
        <span
          translate={false}
          class={`min-w-0 flex-1 truncate text-[13px] ${
            conversation.unread ? 'text-ink' : 'text-ink-muted'
          }`}
        >
          {conversation.last?.mine && <span>{t`Toi : `}</span>}
          {conversation.last?.excerpt}
        </span>
        {conversation.unread > 0 && (
          <span class='h-5 min-w-5 flex-none rounded-sm bg-indigo px-1.5 text-center font-mono text-[11px] leading-5 font-medium text-on-indigo'>
            {conversation.unread > 9 ? '9+' : conversation.unread}
          </span>
        )}
      </span>
    </span>
  </A>
)

const List = ({ openId }: { openId: number | null }) => {
  const list = conversations.value
  const requests = list.filter((c) => c.incoming)
  const others = list.filter((c) => !c.incoming)
  return (
    <section class='slab flex min-w-0 flex-col overflow-hidden'>
      <h1 class='px-4 pt-4 pb-3 font-display text-[19px] leading-6 font-semibold'>
        Messages
      </h1>
      {requests.length > 0 && (
        <>
          <span class='border-t border-line px-4 pt-3 pb-1.5 font-mono text-label text-ink-muted uppercase'>
            {t`Demandes · ${requests.length}`}
          </span>
          {requests.map((c) => (
            <Row key={c.id} conversation={c} active={c.id === openId} />
          ))}
        </>
      )}
      {others.map((c) => (
        <Row key={c.id} conversation={c} active={c.id === openId} />
      ))}
      {conversationsLoaded.value && !list.length && (
        <p class='border-t border-line px-4 py-5 text-[14px] text-pretty text-ink-muted'>
          Pas encore de conversation. Écris à un développeur depuis son profil,
          avec « Écrire ».
        </p>
      )}
    </section>
  )
}

/** Enter sends, Shift + Enter goes to the next line */
const Composer = ({ placeholder, disabled, onSend }: {
  placeholder: string
  disabled?: boolean
  onSend: (text: string) => Promise<boolean>
}) => {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return
    if (text.length > LIMITS.directMessage) return
    setBusy(true)
    const sent = await onSend(text)
    setBusy(false)
    sent && setDraft('')
  }
  return (
    <div class='flex items-end gap-2.5 border-t border-line p-3'>
      <Textarea
        rows={1}
        value={draft}
        limit={LIMITS.directMessage}
        wrap='min-w-0 flex-1'
        disabled={disabled || busy}
        aria-label={placeholder}
        placeholder={placeholder}
        onInput={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.shiftKey) return
          event.preventDefault()
          send()
        }}
        class='max-h-48 min-h-10 resize-none [field-sizing:content]'
      />
      <Button
        size={40}
        onClick={send}
        disabled={disabled || busy || !draft.trim()}
      >
        <SendHorizontal />
        Envoyer
      </Button>
    </div>
  )
}

const Notice = ({ children, action }: {
  children: preact.ComponentChildren
  action?: preact.ComponentChildren
}) => (
  <div class='flex flex-wrap items-center gap-3 border-t border-line bg-surface-000 px-4 py-3 text-[14px] text-pretty text-ink-muted'>
    <span class='min-w-[200px] flex-1'>{children}</span>
    {action}
  </div>
)

const Header = ({ login, name, avatarUrl, actions }: {
  login: string
  name: string
  avatarUrl?: string
  actions?: preact.ComponentChildren
}) => (
  <div class='flex items-center gap-3 border-b border-line px-4 py-3'>
    <A
      href='messages'
      aria-label='Toutes les conversations'
      class='flex size-9 flex-none items-center justify-center rounded-md text-ink-muted hover:bg-surface-200 md:hidden'
    >
      <ArrowLeft />
    </A>
    <A
      href={`@${login}`}
      class='flex min-w-0 flex-1 items-center gap-3 text-ink no-underline hover:no-underline'
    >
      <Avatar name={name} src={avatarUrl} size={38} />
      <span class='flex min-w-0 flex-col'>
        <span translate={false} class='truncate font-semibold'>{name}</span>
        <span class='font-mono text-[12px] text-ink-muted'>@{login}</span>
      </span>
    </A>
    {actions}
  </div>
)

const Open = ({ id }: { id: number }) => {
  const shown = thread.value
  const [missing, setMissing] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setMissing(false)
    openConversation(id).catch(() => setMissing(true))
  }, [id])
  const last = shown?.id === id ? shown.messages.at(-1)?.id : undefined
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [last])
  if (missing) {
    return (
      <GhostSlab>
        <EmptyState action={<Button href='messages'>Mes messages</Button>}>
          Cette conversation n’existe pas, ou n’est pas la tienne.
        </EmptyState>
      </GhostSlab>
    )
  }
  if (!shown || shown.id !== id) return <section class='slab min-h-[420px]' />
  const other = shown.with
  const notice = shown.incoming
    ? (
      <Notice
        action={
          <span class='flex gap-2'>
            <Button size={36} onClick={() => answerRequest(id, true)}>
              Accepter
            </Button>
            <Button
              size={36}
              variant='secondary'
              onClick={() => answerRequest(id, false)}
            >
              Refuser
            </Button>
          </span>
        }
      >
        {t`${other.name} veut t’écrire. Accepte pour lui répondre ; s’il est refusé, il n’en saura rien.`}
      </Notice>
    )
    : shown.blockedByMe
    ? (
      <Notice
        action={
          <Button
            size={36}
            variant='secondary'
            onClick={() => setBlocked(other.login, false)}
          >
            Débloquer
          </Button>
        }
      >
        {t`Tu as bloqué ${other.name} : vous ne pouvez plus vous écrire.`}
      </Notice>
    )
    : !shown.canWrite
    ? (
      <Notice>
        {shown.status === 'pending'
          ? t`En attente : ${other.name} lira ton message s’il accepte ta demande.`
          : t`Tu ne peux pas écrire à ${other.name} pour l’instant.`}
      </Notice>
    )
    : null
  return (
    <section class='slab flex min-h-[420px] min-w-0 flex-col overflow-hidden'>
      <Header
        login={other.login}
        name={other.name}
        avatarUrl={other.avatarUrl}
        actions={!shown.blockedByMe && (
          <Button
            size={32}
            variant='secondary'
            onClick={() => setBlocked(other.login, true)}
          >
            Bloquer
          </Button>
        )}
      />
      <div class='flex max-h-[62vh] min-h-[260px] flex-col gap-3 overflow-y-auto px-4 py-4'>
        {shown.more && (
          <button
            type='button'
            onClick={() => loadOlder()}
            class='cursor-pointer self-center text-[13px] font-semibold text-indigo'
          >
            Afficher les messages précédents
          </button>
        )}
        {shown.messages.map((message) => (
          <div
            key={message.id}
            class={`group flex max-w-[85%] flex-col gap-1 ${
              message.mine ? 'items-end self-end' : 'items-start self-start'
            }`}
          >
            <div
              class={`rounded-lg border px-3.5 py-2.5 text-[15px] leading-6 ${
                message.mine
                  ? 'border-indigo bg-indigo-soft'
                  : 'border-line-strong bg-surface-000'
              }`}
            >
              <Markdown text={message.body} class='gap-1.5' />
            </div>
            <span class='flex items-center gap-2 text-[12px] text-ink-muted'>
              {ago(message.at * 1000)}
              {!message.mine && (
                <A
                  params={{ dialog: 'report-message', message: message.id }}
                  class='inline-flex items-center gap-1 text-ink-muted hover:text-danger'
                >
                  <Flag class='size-3' />
                  Signaler
                </A>
              )}
            </span>
          </div>
        ))}
        <div ref={end} />
      </div>
      {notice}
      {shown.canWrite && (
        <Composer
          placeholder={t`Écrire à ${other.name}`}
          onSend={(text) => sendMessage(id, text)}
        />
      )}
    </section>
  )
}

/** A first message to a developer, from their profile (?avec=login) */
const New = ({ login }: { login: string }) => {
  useEffect(() => {
    loadProfile(login)
  }, [login])
  const person = personOf(login)
  return (
    <section class='slab flex min-h-[420px] min-w-0 flex-col overflow-hidden'>
      <Header login={login} name={person.name} avatarUrl={person.avatarUrl} />
      <div class='flex flex-1 flex-col justify-end gap-2 px-4 py-6 text-[14px] text-pretty text-ink-muted'>
        <span>
          {t`Ton premier message à ${person.name}.`}
        </span>
        <span>
          Si vous n’avez jamais travaillé ensemble, il arrivera en demande : tu
          pourras lui écrire de nouveau quand il l’aura acceptée.
        </span>
      </div>
      <Composer
        placeholder={t`Écrire à ${person.name}`}
        onSend={async (text) => {
          const id = await startConversation(login, text)
          if (!id) return false
          navigate({ href: `messages/${id}`, params: { avec: null } })
          return true
        }}
      />
    </section>
  )
}

const ReportMessage = () => {
  const id = Number(url.params.message)
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const close = () => navigate({ params: { dialog: null, message: null } })
  const send = async () => {
    if (!reason) return setError('Choisis un motif.')
    try {
      await reportMessage(id, reason, comment.trim())
    } catch {
      return setError('Le signalement n’a pas pu être envoyé. Réessaie.')
    }
    close()
    notify({
      title: 'Signalement envoyé',
      body: 'L’équipe de modération va l’examiner. Merci.',
      icon: Flag,
      tone: 'muted',
    })
  }
  return (
    <Dialog
      id='report-message'
      title='Signaler ce message'
      width={560}
      clear={['message']}
    >
      <div class='flex flex-col gap-[18px] px-6 pt-5 pb-6'>
        <div class='flex flex-wrap gap-2'>
          {(Object.entries(reportReasons) as [ReportReason, string][]).map((
            [key, label],
          ) => (
            <OptionButton
              key={key}
              pressed={reason === key}
              onClick={() => {
                setReason(key)
                setError('')
              }}
            >
              {label}
            </OptionButton>
          ))}
        </div>
        <Field label='Commentaire (facultatif)'>
          <Textarea
            rows={3}
            value={comment}
            limit={LIMITS.note}
            placeholder='Ce qui pose problème'
            onInput={(event) => setComment(event.currentTarget.value)}
          />
        </Field>
        {error && (
          <div role='alert' class='flex items-center gap-2 text-danger'>
            <CircleAlert />
            {error}
          </div>
        )}
        <span class='text-[13px] text-ink-muted'>
          Seul ce message est transmis aux modérateurs. Ton signalement reste
          anonyme pour son auteur.
        </span>
        <div class='flex flex-wrap gap-3.5 border-t border-line pt-[18px]'>
          <Button size={40} onClick={send}>Envoyer le signalement</Button>
          <Button variant='secondary' size={40} onClick={close}>
            Annuler
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

/** /messages, /messages/12, /messages?avec=login (§10.6) */
export const MessagesPage = () => {
  const openId = idOfAddress()
  const avec = String(url.params.avec ?? '')
  // Writing to someone already in a conversation opens it
  const existing = avec ? conversationWith(avec) : undefined
  useEffect(() => {
    existing && navigate({
      href: `messages/${existing.id}`,
      params: { avec: null },
      replace: true,
    })
  }, [existing?.id])
  const right = openId
    ? <Open id={openId} />
    : avec && !existing && conversationsLoaded.value
    ? <New login={avec} />
    : null
  return (
    <Page title='Messages' heading={false} class='pt-5'>
      <div class='mr-2 grid items-start gap-6 md:grid-cols-[320px_minmax(0,1fr)]'>
        <div class={right ? 'hidden md:block' : ''}>
          <List openId={openId} />
        </div>
        {right ?? (
          <div class='hidden md:block'>
            <GhostSlab>
              <EmptyState>
                <span class='flex flex-col items-center gap-2'>
                  <MessageSquare class='size-6' />
                  Choisis une conversation, ou écris à un développeur depuis son
                  profil.
                </span>
              </EmptyState>
            </GhostSlab>
          </div>
        )}
      </div>
      <ReportMessage />
    </Page>
  )
}
