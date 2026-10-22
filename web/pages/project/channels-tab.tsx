import { signal } from '@preact/signals'
import type { JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { A, url } from '@01edu/signal-router'
import {
  Bell,
  CircleCheck,
  CircleX,
  Clock,
  Flag,
  FolderGit2,
  GitMerge,
  GitPullRequest,
  LifeBuoy,
  Lock,
  MessageSquare,
  SendHorizontal,
  Tag,
  X,
  Zap,
} from '/web/assets/icons.tsx'
import {
  type AlertKind,
  type Channel,
  channels,
  markChannelRead,
  type Message,
  unreadIn,
} from '/web/fixtures/channels.ts'
import { helpChanged, helpRequests } from '/web/fixtures/help.ts'
import { isMe, me, people } from '/web/fixtures/people.ts'
import type { Project, ProjectSlug } from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'
import { ago } from '/web/lib/time.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { DemoBadge } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Input } from '/web/ui/input.tsx'
import { RichText } from '/web/ui/rich-text.tsx'
import { t, translate } from '/web/lib/language.ts'

type IconComponent = (props: JSX.IntrinsicElements['svg']) => JSX.Element

// Path segment, data key, name and purpose of the four imposed channels
const channelList: [string, Channel, string, string][] = [
  ['general', 'general', 'général', 'Discussions de l’équipe'],
  [
    'suivi',
    'tracking',
    'suivi',
    'Alertes GitHub et CI/CD, écrites par la plateforme',
  ],
  ['aide', 'help', 'aide', 'Demandes d’aide du projet et leurs échanges'],
  [
    'annonces',
    'announcements',
    'annonces',
    'Annonces du Propriétaire et des Mainteneurs',
  ],
]

const alertIcons: Record<AlertKind, [IconComponent, string]> = {
  pr: [GitPullRequest, 'text-indigo'],
  review: [GitPullRequest, 'text-verified'],
  'ci-failed': [CircleX, 'text-danger'],
  'ci-fixed': [CircleCheck, 'text-verified'],
  merge: [GitMerge, 'text-indigo'],
  release: [Tag, 'text-indigo'],
  help: [LifeBuoy, 'text-indigo'],
  waiting: [Clock, 'text-warning'],
  sync: [Zap, 'text-indigo'],
  import: [FolderGit2, 'text-indigo'],
}

const notifyOptions = ['Tout', 'Mentions', 'Seulement mes PRs', 'Rien']

type Reply = NonNullable<Message['replies']>[number]

// Messages and replies written during the session, until
// POST/api/project/message/create exists (PAM-406)
const sentMessages = signal<Record<string, Message[]>>({})
const sentReplies = signal<Record<string, Reply[]>>({})

const sendMessage = (key: string, message: Message) => {
  const sent = sentMessages.peek()
  sentMessages.value = { ...sent, [key]: [...(sent[key] ?? []), message] }
}

const sendReply = (messageId: string, reply: Reply) => {
  const sent = sentReplies.peek()
  sentReplies.value = {
    ...sent,
    [messageId]: [...(sent[messageId] ?? []), reply],
  }
}

const repliesOf = (message: Message) => [
  ...(message.replies ?? []),
  ...(sentReplies.value[message.id] ?? []),
]

// Alerts lead to the help loop (§6.8): a failing CI asks for help, a PR
// waiting for a review asks for one
const alertAction = (project: string, message: Message) => {
  const pr = pullRequests.find((p) =>
    p.project === project && p.number === message.pullRequest
  )
  // A demo PR is not on GitHub: no request can be made on it
  if (!pr || pr.demo || pr.state !== 'open') return
  if (message.kind === 'ci-failed' && pr.ci === 'failed') {
    return {
      label: 'Demander de l’aide',
      params: { project: pr.project, ci: pr.number },
    }
  }
  const asked = helpRequests.some((help) =>
    help.project === pr.project && help.pullRequest === pr.number &&
    !['cancelled', 'expired', 'closed_unhelpful', 'closed_unconfirmed']
      .includes(help.status)
  )
  if (
    (message.kind === 'pr' || message.kind === 'waiting') &&
    pr.review === 'waiting' && !asked
  ) {
    return {
      label: 'Demander une review',
      params: { project: pr.project, pr: pr.number },
    }
  }
}

const authorName = (message: Message) =>
  message.author === 'platform'
    ? 'Pamoja · GitHub'
    : people[message.author].name

const Author = ({ message }: { message: Message }) => {
  if (message.author !== 'platform') {
    return (
      <Avatar
        name={people[message.author].name}
        src={people[message.author].avatarUrl}
        size={34}
      />
    )
  }
  const [Icon, color] = alertIcons[message.kind ?? 'pr']
  return (
    <span
      class={`tile flex size-[34px] flex-none items-center justify-center ${color}`}
    >
      <Icon />
    </span>
  )
}

const MessageRow = (
  { project, message, canAct }: {
    project: string
    message: Message
    canAct: boolean
  },
) => {
  // Its own subscription: an alert loses its action once help is asked
  helpChanged.value
  const likes = message.reactions?.like ?? []
  const [liked, setLiked] = useState(likes.some(isMe))
  const count = likes.length - (likes.some(isMe) ? 1 : 0) +
    (liked ? 1 : 0)
  const replies = repliesOf(message).length
  const action = canAct && alertAction(project, message)
  return (
    <div class='flex gap-3 rounded-md p-2.5 hover:bg-surface-000'>
      <Author message={message} />
      <div class='flex min-w-0 flex-1 flex-col gap-[5px]'>
        <div class='flex flex-wrap items-center gap-2'>
          <span class='font-display text-[14px] leading-5 font-semibold'>
            {authorName(message)}
          </span>
          <span class='text-[12px] text-ink-muted'>{ago(message.at)}</span>
          {message.demo && <DemoBadge />}
        </div>
        <div class='text-[15px] leading-6 text-pretty'>
          <RichText text={message.text} />
        </div>
        {action && (
          <Button
            size={32}
            href='aide/nouvelle'
            params={action.params}
            class='mt-0.5 mb-1 self-start'
          >
            {action.label}
          </Button>
        )}
        <div class='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setLiked(!liked)}
            aria-label='Réagir +1'
            aria-pressed={liked}
            class={`h-[26px] cursor-pointer rounded-[5px] border px-[9px] font-mono text-[12px] leading-none font-medium text-ink ${
              liked
                ? 'border-indigo bg-indigo-soft shadow-[1.73px_1px_0_0_var(--indigo)]'
                : 'border-line shadow-[1.73px_1px_0_0_var(--line)]'
            }`}
          >
            +1{count ? ` · ${count}` : ''}
          </button>
          <A
            params={{ thread: message.id }}
            class='inline-flex h-[26px] items-center gap-1 rounded-md px-2 text-[12px] leading-none font-medium text-ink-muted no-underline hover:text-indigo hover:no-underline'
          >
            <MessageSquare class='size-3.5' />
            {replies
              ? `${replies} ${replies > 1 ? 'réponses' : 'réponse'}`
              : 'Répondre en fil'}
          </A>
          {message.author !== 'platform' && message.author !== me.login && (
            // The report dialog comes with PAM-516
            <A
              params={{ dialog: 'report', report: `message:${message.id}` }}
              title='Signaler'
              class='inline-flex h-[26px] items-center gap-1 rounded-md px-2 text-[12px] leading-none font-medium text-ink-muted no-underline hover:bg-danger-soft hover:text-danger hover:no-underline'
            >
              <Flag class='size-3' />
              Signaler
            </A>
          )}
        </div>
      </div>
    </div>
  )
}

const Composer = (
  { placeholder, label, square, onSend }: {
    placeholder: string
    label: string
    square?: boolean
    onSend: (text: string) => void
  },
) => {
  const [draft, setDraft] = useState('')
  const send = () => {
    if (!draft.trim()) return
    onSend(draft.trim())
    setDraft('')
  }
  return (
    <>
      <Input
        value={draft}
        onInput={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.shiftKey) return
          event.preventDefault()
          send()
        }}
        placeholder={placeholder}
        aria-label={label}
        class='min-w-0 flex-1'
      />
      {square
        ? (
          <Button
            size={40}
            square
            onClick={send}
            aria-label='Envoyer la réponse'
          >
            <SendHorizontal />
          </Button>
        )
        : (
          <Button size={40} onClick={send}>
            <SendHorizontal />
            Envoyer
          </Button>
        )}
    </>
  )
}

const Thread = (
  { message, canReply }: { message: Message; canReply: boolean },
) => (
  <section class='slab col-span-full flex min-w-0 flex-col overflow-hidden min-[1180px]:col-auto'>
    <div class='flex items-center gap-2 border-b border-line py-3.5 pr-4 pl-5'>
      <span class='flex-1'>
        <Eyebrow>Fil de discussion</Eyebrow>
      </span>
      <Button
        variant='secondary'
        size={34}
        square
        params={{ thread: null }}
        aria-label='Fermer'
      >
        <X class='size-[18px]' />
      </Button>
    </div>
    <div class='flex flex-col gap-1 border-b border-line bg-surface-000 px-[18px] py-3'>
      <span class='font-display text-[13px] leading-[18px] font-semibold'>
        {authorName(message)}{' '}
        <span class='font-sans font-normal text-ink-muted'>
          {ago(message.at)}
        </span>
      </span>
      <span class='text-[14px] leading-[22px]'>
        <RichText text={message.text} />
      </span>
    </div>
    <div class='flex flex-col gap-3.5 px-[18px] py-3.5'>
      {repliesOf(message).map((reply) => (
        <div key={reply.id} class='flex gap-2.5'>
          <Avatar
            name={people[reply.author].name}
            src={people[reply.author].avatarUrl}
            size={26}
          />
          <div class='flex min-w-0 flex-col gap-0.5'>
            <span class='font-display text-[13px] leading-[18px] font-semibold'>
              {people[reply.author].name}{' '}
              <span class='font-sans font-normal text-ink-muted'>
                {ago(reply.at)}
              </span>
            </span>
            <span class='text-[14px] leading-[22px]'>
              <RichText text={reply.text} />
            </span>
            {reply.demo && <DemoBadge />}
          </div>
        </div>
      ))}
    </div>
    {canReply && (
      <div class='flex gap-2.5 border-t border-line px-3.5 py-3'>
        <Composer
          placeholder='Répondre dans le fil'
          label='Réponse'
          square
          onSend={(text) =>
            sendReply(message.id, {
              id: `r${Date.now()}`,
              author: me.login,
              text,
              at: Date.now(),
              demo: false,
            })}
        />
      </div>
    )}
  </section>
)

const Presence = ({ channelName }: { channelName: string }) => {
  // Presence lives in memory on the server (§13.6), here a fixed snapshot
  const present: [name: string, what: string, photo?: string][] = [
    [me.name, t`regarde #${translate(channelName)}`, me.avatarUrl],
    [people.fatou.name, 'travaille sur la PR #84'],
    [people.moussa.name, 'regarde la PR #81'],
  ]
  return (
    <div class='slab flex flex-col gap-3 p-3.5'>
      <span class='flex items-center gap-2 text-[13px] font-semibold'>
        <span aria-hidden='true' class='diamond size-2 bg-verified' />
        3 développeurs actifs
      </span>
      {present.map(([name, what, photo]) => (
        <div key={name} class='flex items-center gap-2.5'>
          <Avatar name={name} src={photo} size={26} />
          <span class='flex min-w-0 flex-col'>
            <span class='text-[13px] leading-[18px] font-semibold'>
              {name.split(' ')[0]}
            </span>
            <span class='text-[12px] leading-4 text-ink-muted'>{what}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// Per channel notification setting, saved with POST/api/project/channel/notify
// (PAM-412). #suivi defaults to "only my PRs" (§6.8)
const NotifySelect = ({ tracking }: { tracking: boolean }) => {
  const [value, setValue] = useState(tracking ? 'Seulement mes PRs' : 'Tout')
  return (
    <label class='flex items-center gap-1.5 text-[12px] text-ink-muted'>
      <Bell class='size-3.5' />
      <select
        aria-label='Notifications du canal'
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        class='well h-8 px-2 text-[13px] leading-none text-ink'
      >
        {notifyOptions
          .filter((option) => tracking || option !== 'Seulement mes PRs')
          .map((option) => <option key={option} value={option}>{option}
          </option>)}
      </select>
    </label>
  )
}

/** Four imposed channels, like a Discord server (§6.8) */
export const ChannelsTab = ({ project }: { project: Project }) => {
  const segment = url.relativePath.slice(1).split('/')[3] ?? 'general'
  const [path, key, name, purpose] = channelList.find(([p]) => p === segment) ??
    channelList[0]
  const store = channels[project.slug as ProjectSlug]
  const messagesOf = (channel: Channel, path: string) => [
    ...(store?.[channel] ?? []),
    ...(sentMessages.value[`${project.slug}:${path}`] ?? []),
  ]
  const messages = messagesOf(key, path)
  // The channel on screen is read, new messages included
  useEffect(() => markChannelRead(project.slug as ProjectSlug, key), [
    project.slug,
    key,
    messages.length,
  ])

  const isOwner = project.owner === me.login
  const isMember = isOwner || project.members.some((m) => m.login === me.login)
  const isMaintainer = isOwner ||
    project.members.some((m) => m.login === me.login && m.role === 'Mainteneur')
  const following = project.followers.some(isMe)
  const canWrite = key === 'tracking'
    ? false
    : key === 'announcements'
    ? isMaintainer
    : isMember
  const readOnlyNote = key === 'tracking'
    ? '#suivi est écrit par la plateforme. Réponds en fil sous une alerte.'
    : key === 'announcements'
    ? 'Seuls le Propriétaire et les Mainteneurs écrivent dans #annonces.'
    : 'Rejoins le projet pour écrire ici. Les abonnés lisent #suivi et #annonces.'
  const thread = messages.find((m) => m.id === url.params.thread)

  return (
    <div
      class={`mr-2 grid items-start gap-7 lg:grid-cols-[190px_minmax(0,1fr)] ${
        thread ? 'min-[1180px]:grid-cols-[190px_minmax(0,1fr)_300px]' : ''
      }`}
    >
      <aside class='flex min-w-0 flex-col gap-7'>
        <nav aria-label='Canaux' class='slab flex flex-col gap-1 p-2'>
          <span class='px-2 pt-2 pb-1'>
            <Eyebrow>Canaux</Eyebrow>
          </span>
          {channelList.map(([p, channel, label]) => {
            const active = p === path
            const unread = active
              ? 0
              : unreadIn(project.slug as ProjectSlug, channel)
            return (
              <A
                key={p}
                href={`projet/${project.slug}/canaux/${p}`}
                aria-current={active ? 'page' : undefined}
                class={`mr-[3px] flex h-9 items-center gap-2 rounded-md border px-2.5 font-mono text-[14px] no-underline hover:bg-surface-200 hover:no-underline ${
                  active
                    ? 'border-indigo bg-indigo-soft font-semibold text-indigo shadow-key-selected'
                    : `border-transparent text-ink ${
                      unread ? 'font-semibold' : ''
                    }`
                }`}
              >
                <span class='flex-1'>#{label}</span>
                {unread > 0 && (
                  <span class='h-[18px] min-w-5 rounded-sm bg-indigo px-[5px] text-center font-mono text-[11px] leading-[18px] font-medium text-on-indigo'>
                    {unread}
                  </span>
                )}
              </A>
            )
          })}
        </nav>
        <Presence channelName={name} />
      </aside>
      <section class='slab flex min-h-[560px] min-w-0 flex-col overflow-hidden'>
        <div class='flex flex-wrap items-center gap-3 border-b border-line px-[18px] py-3.5'>
          <div class='flex min-w-[160px] flex-1 flex-col'>
            <span class='font-mono text-[17px] leading-[22px] font-semibold'>
              #{name}
            </span>
            <span class='text-[13px] leading-[18px] text-ink-muted'>
              {purpose}
            </span>
          </div>
          <NotifySelect key={path} tracking={key === 'tracking'} />
        </div>
        <div class='flex flex-1 flex-col gap-0.5 p-2.5'>
          {messages.map((message) => (
            <MessageRow
              key={message.id}
              project={project.slug}
              message={message}
              canAct={isMember || following}
            />
          ))}
          {!messages.length && (
            <p class='px-4 py-10 text-center text-ink-muted'>
              Pas encore de message dans ce canal.
            </p>
          )}
        </div>
        {canWrite
          ? (
            <div class='flex items-center gap-3 border-t border-line p-3.5'>
              <Composer
                placeholder={t`Écrire dans #${
                  translate(name)
                } (Markdown, \`code\`)`}
                label='Message'
                onSend={(text) =>
                  sendMessage(`${project.slug}:${path}`, {
                    id: `m${Date.now()}`,
                    author: me.login,
                    text,
                    at: Date.now(),
                    demo: false,
                  })}
              />
            </div>
          )
          : (
            <div class='flex items-center gap-2 border-t border-line bg-surface-000 px-[18px] py-3.5 text-[13px] text-ink-muted'>
              <Lock class='size-3.5' />
              {readOnlyNote}
            </div>
          )}
      </section>
      {thread && <Thread message={thread} canReply={isMember || following} />}
    </div>
  )
}
