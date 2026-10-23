import { Fragment } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { A, navigate, url } from '@01edu/signal-router'
import {
  ArrowLeft,
  Bell,
  BellOff,
  Bookmark,
  BookmarkCheck,
  CircleAlert,
  CircleDot,
  CircleSlash,
  CornerDownRight,
  Flag,
  MessageSquare,
  PenLine,
  Plus,
  Search,
  SendHorizontal,
  X,
} from '/web/assets/icons.tsx'
import { LIMITS } from '/api/limits.ts'
import { type ReportReason, reportReasons } from '/api/vocabulary.ts'
import { personOf } from '/web/fixtures/people.ts'
import { t, translate } from '/web/lib/language.ts'
import {
  answerRequest,
  type Conversation,
  conversations,
  conversationsLoaded,
  conversationWith,
  deleteMessage,
  editMessage,
  loadOlder,
  markUnread,
  type Message,
  online,
  openAt,
  openConversation,
  react,
  reactions,
  reportMessage,
  searchMessages,
  type SearchResult,
  sendMessage,
  setArchived,
  setBlocked,
  setMuted,
  startConversation,
  tellLimit,
  tellTyping,
  thread,
  typingIn,
} from '/web/lib/messages.ts'
import { loadProfile } from '/web/lib/profile.ts'
import { ago } from '/web/lib/time.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { Field, Input, Textarea } from '/web/ui/input.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Markdown } from '/web/ui/rich-text.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'
import { notify } from '/web/ui/toast.tsx'

// Direct messages (§10.6): the conversations on the left, the one open on
// the right; on a phone, one or the other. Like Discord: edit, delete,
// reply, react, unread again, mute, archive, search.

const idOfAddress = () => {
  const id = Number(url.relativePath.slice(1).split('/')[1])
  return Number.isInteger(id) && id > 0 ? id : null
}

/*
 * The list
 */

/** The avatar, with a dot while the developer has Pamoja open */
const Present = ({ login, name, src, size }: {
  login: string
  name: string
  src?: string
  size: 38 | 42
}) => (
  <span class='relative flex-none'>
    <Avatar name={name} src={src} size={size} />
    {online.value.has(login) && (
      <span
        role='img'
        aria-label='En ligne'
        class='absolute right-0 bottom-0 size-3 rounded-full border-2 border-surface-100 bg-verified'
      />
    )}
  </span>
)

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
    <Present
      login={conversation.with.login}
      name={conversation.with.name}
      src={conversation.with.avatarUrl}
      size={42}
    />
    <span class='flex min-w-0 flex-1 flex-col gap-0.5'>
      <span class='flex items-baseline justify-between gap-2'>
        <span
          translate={false}
          class={`truncate text-[14px] ${
            conversation.unread && !conversation.muted
              ? 'font-bold'
              : 'font-semibold'
          }`}
        >
          {conversation.with.name}
        </span>
        <span class='flex flex-none items-center gap-1.5 text-[12px] text-ink-muted'>
          {conversation.muted && (
            <BellOff class='size-3.5' aria-label='En sourdine' />
          )}
          {conversation.last && ago(conversation.last.at * 1000)}
        </span>
      </span>
      <span class='flex items-center gap-2'>
        <span
          class={`min-w-0 flex-1 truncate text-[13px] ${
            conversation.unread && !conversation.muted
              ? 'text-ink'
              : 'text-ink-muted'
          }`}
        >
          {typingIn.value.has(conversation.id)
            ? <em class='text-indigo'>écrit…</em>
            : (
              <>
                {conversation.last?.mine && <span>{t`Toi : `}</span>}
                {conversation.last?.deleted
                  ? <em>Message supprimé</em>
                  : (
                    <span translate={false}>
                      {conversation.last?.excerpt}
                    </span>
                  )}
              </>
            )}
        </span>
        {conversation.unread > 0 && (
          <span
            class={`h-5 min-w-5 flex-none rounded-sm px-1.5 text-center font-mono text-[11px] leading-5 font-medium ${
              conversation.muted
                ? 'bg-surface-200 text-ink-muted'
                : 'bg-indigo text-on-indigo'
            }`}
          >
            {conversation.unread > 9 ? '9+' : conversation.unread}
          </span>
        )}
      </span>
    </span>
  </A>
)

const Found = ({ result }: { result: SearchResult }) => (
  <A
    href={`messages/${result.conversationId}`}
    params={{ message: result.message.id }}
    class='flex items-start gap-3 border-t border-line px-4 py-3 text-ink no-underline hover:bg-surface-000 hover:no-underline'
  >
    <Avatar name={result.with.name} src={result.with.avatarUrl} size={34} />
    <span class='flex min-w-0 flex-1 flex-col gap-0.5'>
      <span class='flex items-baseline justify-between gap-2 text-[13px]'>
        <span translate={false} class='truncate font-semibold'>
          {result.message.mine
            ? t`Toi, à ${result.with.name}`
            : result.with.name}
        </span>
        <span class='flex-none text-[12px] text-ink-muted'>
          {ago(result.message.at * 1000)}
        </span>
      </span>
      <span translate={false} class='text-[13px] text-pretty text-ink-muted'>
        {result.message.snippet}
      </span>
    </span>
  </A>
)

/** Searches as one types, after a short pause */
const SearchBox = ({ onResults }: {
  onResults: (results: SearchResult[] | null) => void
}) => {
  const [q, setQ] = useState('')
  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) return onResults(null)
    const timer = setTimeout(() => {
      searchMessages(query).then(onResults, (err) => {
        tellLimit(err)
        onResults([])
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [q])
  return (
    <label class='relative block px-4 pb-3'>
      <Search class='pointer-events-none absolute top-3 left-7 size-4 text-ink-muted' />
      <Input
        compact
        type='search'
        value={q}
        maxLength={100}
        aria-label='Rechercher dans mes messages'
        placeholder='Rechercher dans mes messages'
        onInput={(event) => setQ(event.currentTarget.value)}
        class='pl-9'
      />
    </label>
  )
}

const List = ({ openId }: { openId: number | null }) => {
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [archives, setArchives] = useState(false)
  const list = conversations.value
  const requests = list.filter((c) => c.incoming)
  const others = list.filter((c) => !c.incoming && !c.archived)
  const archived = list.filter((c) => !c.incoming && c.archived)
  return (
    <section class='slab flex min-w-0 flex-col overflow-hidden'>
      <h1 class='px-4 pt-4 pb-3 font-display text-[19px] leading-6 font-semibold'>
        Messages
      </h1>
      <SearchBox onResults={setResults} />
      {results
        ? (
          <>
            <span class='border-t border-line px-4 pt-3 pb-1.5 font-mono text-label text-ink-muted uppercase'>
              {t`Résultats · ${results.length}`}
            </span>
            {results.map((r) => <Found key={r.message.id} result={r} />)}
            {!results.length && (
              <p class='border-t border-line px-4 py-5 text-[14px] text-ink-muted'>
                Aucun message ne contient ce texte.
              </p>
            )}
          </>
        )
        : (
          <>
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
            {archived.length > 0 && (
              <>
                <button
                  type='button'
                  aria-expanded={archives}
                  onClick={() => setArchives(!archives)}
                  class='cursor-pointer border-t border-line px-4 pt-3 pb-2 text-left font-mono text-label text-ink-muted uppercase hover:text-indigo'
                >
                  {t`Archives · ${archived.length}`}
                </button>
                {archives &&
                  archived.map((c) => (
                    <Row key={c.id} conversation={c} active={c.id === openId} />
                  ))}
              </>
            )}
            {conversationsLoaded.value && !list.length && (
              <p class='border-t border-line px-4 py-5 text-[14px] text-pretty text-ink-muted'>
                Pas encore de conversation. Écris à un développeur depuis son
                profil, avec « Écrire ».
              </p>
            )}
          </>
        )}
    </section>
  )
}

/*
 * Writing
 */

/** Enter sends, Shift + Enter goes to the next line, ↑ edits the last one */
const Composer = (
  {
    placeholder,
    replying,
    withName,
    onCancelReply,
    onEditLast,
    onTyping,
    onSend,
  }: {
    placeholder: string
    onTyping?: () => void
    replying?: Message | null
    withName?: string
    onCancelReply?: () => void
    onEditLast?: () => void
    onSend: (text: string) => Promise<boolean>
  },
) => {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    replying && box.current?.querySelector('textarea')?.focus()
  }, [replying?.id])
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
    <div ref={box} class='flex flex-col border-t border-line'>
      {replying && (
        <div class='flex items-center gap-2 bg-surface-000 px-4 py-2 text-[13px] text-ink-muted'>
          <CornerDownRight class='size-3.5 flex-none' />
          <span class='min-w-0 flex-1 truncate'>
            {replying.mine
              ? 'En réponse à ton message'
              : t`En réponse à ${withName}`}
            {' · '}
            <span translate={false}>{replying.body.slice(0, 80)}</span>
          </span>
          <button
            type='button'
            aria-label='Ne plus répondre à ce message'
            onClick={onCancelReply}
            class='flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-surface-200'
          >
            <X class='size-3.5' />
          </button>
        </div>
      )}
      <div class='flex items-end gap-2.5 p-3'>
        <Textarea
          rows={1}
          value={draft}
          limit={LIMITS.directMessage}
          wrap='min-w-0 flex-1'
          disabled={busy}
          aria-label={placeholder}
          placeholder={placeholder}
          onInput={(event) => {
            setDraft(event.currentTarget.value)
            event.currentTarget.value.trim() && onTyping?.()
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' && !draft && onEditLast) {
              event.preventDefault()
              return onEditLast()
            }
            if (event.key === 'Escape' && replying) return onCancelReply?.()
            if (event.key !== 'Enter' || event.shiftKey) return
            event.preventDefault()
            send()
          }}
          class='max-h-48 min-h-10 resize-none [field-sizing:content]'
        />
        <Button size={40} onClick={send} disabled={busy || !draft.trim()}>
          <SendHorizontal />
          Envoyer
        </Button>
      </div>
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
      <Present login={login} name={name} src={avatarUrl} size={38} />
      <span class='flex min-w-0 flex-col'>
        <span translate={false} class='truncate font-semibold'>{name}</span>
        <span class='font-mono text-[12px] text-ink-muted'>
          @{login}
          {online.value.has(login) && <span class='ml-1'>· en ligne</span>}
        </span>
      </span>
    </A>
    {actions}
  </div>
)

/** A small key under a message */
const Act = ({ label, onClick, children, danger }: {
  label: string
  onClick: () => void
  children: preact.ComponentChildren
  danger?: boolean
}) => (
  <button
    type='button'
    title={label}
    aria-label={label}
    onClick={onClick}
    class={`flex h-7 min-w-7 cursor-pointer items-center justify-center gap-1 rounded-md px-1.5 text-[12px] text-ink-muted hover:bg-surface-200 ${
      danger ? 'hover:text-danger' : 'hover:text-indigo'
    }`}
  >
    {children}
  </button>
)

/** Edits a message in place: Enter saves, Escape leaves it as it was */
const Editing = ({ message, onDone }: {
  message: Message
  onDone: (body?: string) => void
}) => {
  const [draft, setDraft] = useState(message.body)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // The caret at the end, ready to go on
    const field = box.current?.querySelector('textarea')
    field?.focus()
    field?.setSelectionRange(field.value.length, field.value.length)
  }, [])
  const save = () => {
    const text = draft.trim()
    text && text !== message.body ? onDone(text) : onDone()
  }
  return (
    <div ref={box} class='flex w-full min-w-[240px] flex-col gap-1.5'>
      <Textarea
        rows={2}
        value={draft}
        limit={LIMITS.directMessage}
        aria-label='Modifier le message'
        onInput={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') return onDone()
          if (event.key !== 'Enter' || event.shiftKey) return
          event.preventDefault()
          save()
        }}
        class='resize-none [field-sizing:content]'
      />
      <span class='text-[12px] text-ink-muted'>
        Entrée pour enregistrer · Échap pour annuler
      </span>
    </div>
  )
}

const Bubble = (
  {
    message,
    conversationId,
    nameOf,
    canAct,
    onReply,
    editing,
    setEditing,
    jumped,
  }: {
    message: Message
    conversationId: number
    nameOf: (login: string) => string
    canAct: boolean
    onReply: (message: Message) => void
    editing: boolean
    setEditing: (id: number | null) => void
    jumped: boolean
  },
) => {
  const [picking, setPicking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const side = message.mine ? 'items-end self-end' : 'items-start self-start'
  if (message.deleted) {
    return (
      <div
        id={`message-${message.id}`}
        class={`flex max-w-[85%] flex-col gap-1 ${side}`}
      >
        <div class='rounded-lg border border-dashed border-line-control px-3.5 py-2 text-[14px] text-ink-muted italic'>
          Message supprimé
        </div>
        <span class='text-[12px] text-ink-muted'>{ago(message.at * 1000)}</span>
      </div>
    )
  }
  return (
    <div
      id={`message-${message.id}`}
      class={`flex max-w-[85%] flex-col gap-1 ${side}`}
    >
      {message.replyTo && (
        <button
          type='button'
          onClick={() =>
            document.getElementById(`message-${message.replyTo!.id}`)
              ?.scrollIntoView({ block: 'center' })}
          class='flex max-w-full cursor-pointer items-center gap-1.5 text-left text-[12px] text-ink-muted hover:text-indigo'
        >
          <CornerDownRight class='size-3 flex-none' />
          <span class='truncate'>
            <span translate={false}>{nameOf(message.replyTo.author)}</span>
            {' · '}
            {message.replyTo.deleted
              ? <em>Message supprimé</em>
              : <span translate={false}>{message.replyTo.excerpt}</span>}
          </span>
        </button>
      )}
      {editing
        ? (
          <Editing
            message={message}
            onDone={async (body) => {
              if (body) await editMessage(conversationId, message.id, body)
              setEditing(null)
            }}
          />
        )
        : (
          <div
            class={`rounded-lg border px-3.5 py-2.5 text-[15px] leading-6 ${
              message.mine
                ? 'border-indigo bg-indigo-soft'
                : 'border-line-strong bg-surface-000'
            } ${jumped ? 'ring-2 ring-indigo ring-offset-2' : ''}`}
          >
            <Markdown text={message.body} class='gap-1.5' />
          </div>
        )}
      {message.reactions.length > 0 && (
        <div class='flex flex-wrap gap-1'>
          {message.reactions.map((r) => (
            <button
              key={r.emoji}
              type='button'
              aria-pressed={r.mine}
              disabled={!canAct}
              onClick={() =>
                react(
                  conversationId,
                  message.id,
                  r.emoji as typeof reactions[number],
                )}
              class={`flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2 text-[13px] ${
                r.mine
                  ? 'border-indigo bg-indigo-soft text-indigo'
                  : 'border-line-strong bg-surface-000'
              }`}
            >
              <span>{r.emoji}</span>
              <span class='font-mono text-[12px]'>{r.count}</span>
            </button>
          ))}
        </div>
      )}
      {picking && (
        <div class='flex gap-1 rounded-md border border-line-strong bg-surface-100 p-1 shadow-tile'>
          {reactions.map((emoji) => (
            <button
              key={emoji}
              type='button'
              aria-label={t`Réagir ${emoji}`}
              onClick={() => {
                setPicking(false)
                react(conversationId, message.id, emoji)
              }}
              class='flex size-8 cursor-pointer items-center justify-center rounded-md text-[17px] hover:bg-surface-200'
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <span class='flex flex-wrap items-center gap-1 text-[12px] text-ink-muted'>
        <span class='px-1'>
          {ago(message.at * 1000)}
          {message.edited && <span class='ml-1'>· modifié</span>}
        </span>
        {canAct && !editing && (
          <>
            <Act label='Répondre' onClick={() => onReply(message)}>
              <CornerDownRight class='size-3.5' />
            </Act>
            <Act label='Réagir' onClick={() => setPicking(!picking)}>
              <Plus class='size-3.5' />
            </Act>
          </>
        )}
        {message.mine && canAct && !editing && !deleting && (
          <>
            <Act label='Modifier' onClick={() => setEditing(message.id)}>
              <PenLine class='size-3.5' />
            </Act>
            <Act label='Supprimer' danger onClick={() => setDeleting(true)}>
              <X class='size-3.5' />
            </Act>
          </>
        )}
        {deleting && (
          <span class='flex items-center gap-1'>
            <Act
              label='Supprimer définitivement'
              danger
              onClick={() => deleteMessage(conversationId, message.id)}
            >
              Supprimer définitivement
            </Act>
            <Act label='Annuler' onClick={() => setDeleting(false)}>
              Annuler
            </Act>
          </span>
        )}
        {!message.mine && (
          <>
            <Act
              label='Marquer comme non lu'
              onClick={async () => {
                await markUnread(conversationId, message.id)
                navigate({ href: 'messages' })
              }}
            >
              <CircleDot class='size-3.5' />
            </Act>
            <A
              params={{ dialog: 'report-message', message: message.id }}
              title='Signaler'
              aria-label='Signaler'
              class='flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-ink-muted hover:bg-surface-200 hover:text-danger'
            >
              <Flag class='size-3.5' />
            </A>
          </>
        )}
      </span>
    </div>
  )
}

/*
 * A conversation
 */

const Open = ({ id }: { id: number }) => {
  const shown = thread.value
  const jumpTo = Number(url.params.message) || 0
  const [missing, setMissing] = useState(false)
  const [replying, setReplying] = useState<Message | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setMissing(false)
    setReplying(null)
    setEditing(null)
    ;(jumpTo ? openAt(id, jumpTo) : openConversation(id)).catch(() =>
      setMissing(true)
    )
  }, [id, jumpTo])
  const last = shown?.id === id ? shown.messages.at(-1)?.id : undefined
  useEffect(() => {
    if (shown?.jumpedTo) {
      document.getElementById(`message-${shown.jumpedTo}`)
        ?.scrollIntoView({ block: 'center' })
    } else end.current?.scrollIntoView({ block: 'end' })
  }, [last, shown?.jumpedTo])
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
  const canAct = shown.status === 'accepted' && shown.canWrite
  const firstNew = shown.jumpedTo
    ? undefined
    : shown.messages.find((m) => !m.mine && m.at > shown.readUpTo)?.id
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
        {t`${other.name} veut t’écrire. Accepte pour répondre ; si tu refuses, personne n’en sera prévenu.`}
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
          ? t`En attente : ${other.name} lira ton message une fois ta demande acceptée.`
          : t`Tu ne peux pas écrire à ${other.name} pour l’instant.`}
      </Notice>
    )
    : null
  const nameOf = (login: string) =>
    login === other.login ? other.name : translate('Toi')
  const lastMine = [...shown.messages].reverse().find((m) =>
    m.mine && !m.deleted
  )
  const key = (label: string) =>
    `flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border border-transparent text-ink-muted hover:border-line-strong hover:text-indigo ${label}`
  return (
    <section class='slab flex min-h-[420px] min-w-0 flex-col overflow-hidden'>
      <Header
        login={other.login}
        name={other.name}
        avatarUrl={other.avatarUrl}
        actions={
          <span class='flex flex-none items-center gap-1'>
            <button
              type='button'
              aria-pressed={shown.muted}
              title={shown.muted
                ? 'Réactiver les alertes'
                : 'Mettre en sourdine'}
              aria-label={shown.muted
                ? 'Réactiver les alertes'
                : 'Mettre en sourdine'}
              onClick={() => setMuted(id, !shown.muted)}
              class={key(shown.muted ? 'text-indigo' : '')}
            >
              {shown.muted
                ? <BellOff class='size-4' />
                : <Bell class='size-4' />}
            </button>
            <button
              type='button'
              aria-pressed={shown.archived}
              title={shown.archived ? 'Désarchiver' : 'Archiver'}
              aria-label={shown.archived ? 'Désarchiver' : 'Archiver'}
              onClick={async () => {
                await setArchived(id, !shown.archived)
                shown.archived || navigate({ href: 'messages' })
              }}
              class={key(shown.archived ? 'text-indigo' : '')}
            >
              {shown.archived
                ? <BookmarkCheck class='size-4' />
                : <Bookmark class='size-4' />}
            </button>
            {!shown.blockedByMe && (
              <button
                type='button'
                title='Bloquer'
                aria-label='Bloquer'
                onClick={() => setBlocked(other.login, true)}
                class={key('hover:text-danger')}
              >
                <CircleSlash class='size-4' />
              </button>
            )}
          </span>
        }
      />
      {shown.jumpedTo && (
        <Notice
          action={
            <Button
              size={32}
              variant='secondary'
              onClick={() => navigate({ params: { message: null } })}
            >
              Revenir aux derniers messages
            </Button>
          }
        >
          Message trouvé par la recherche.
        </Notice>
      )}
      <div class='flex max-h-[62vh] min-h-[260px] flex-col gap-3 overflow-y-auto px-4 py-4'>
        {shown.more && !shown.jumpedTo && (
          <button
            type='button'
            onClick={() => loadOlder()}
            class='cursor-pointer self-center text-[13px] font-semibold text-indigo'
          >
            Afficher les messages précédents
          </button>
        )}
        {shown.messages.map((message) => (
          <Fragment key={message.id}>
            {message.id === firstNew && (
              <div
                role='separator'
                class='flex items-center gap-2 font-mono text-label text-danger uppercase'
              >
                <span class='h-px flex-1 bg-danger' />
                Nouveaux messages
                <span class='h-px flex-1 bg-danger' />
              </div>
            )}
            <Bubble
              message={message}
              conversationId={id}
              nameOf={nameOf}
              canAct={canAct}
              onReply={setReplying}
              editing={editing === message.id}
              setEditing={setEditing}
              jumped={message.id === shown.jumpedTo}
            />
          </Fragment>
        ))}
        <div ref={end} />
      </div>
      {typingIn.value.has(id) && (
        <p
          aria-live='polite'
          class='-mt-1 px-4 pb-2 text-[13px] text-ink-muted italic'
        >
          {t`${other.name} écrit…`}
        </p>
      )}
      {notice}
      {shown.canWrite && !shown.jumpedTo && (
        <Composer
          placeholder={t`Écrire à ${other.name}`}
          replying={replying}
          withName={other.name}
          onCancelReply={() => setReplying(null)}
          onEditLast={canAct && lastMine
            ? () => setEditing(lastMine.id)
            : undefined}
          onTyping={canAct ? () => tellTyping(id) : undefined}
          onSend={async (text) => {
            const sent = await sendMessage(id, text, replying?.id ?? 0)
            sent && setReplying(null)
            return sent
          }}
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
          pourras écrire de nouveau une fois la demande acceptée.
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
    } catch (err) {
      if (tellLimit(err)) return close()
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

/** /messages, /messages/12, /messages/12?message=40, /messages?avec=login */
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
      <div class='mr-2 grid grid-cols-1 items-start gap-6 md:grid-cols-[320px_minmax(0,1fr)]'>
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
