import { signal } from '@preact/signals'
import type { JSX } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { A, url } from '@01edu/signal-router'
import {
  Bell,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleX,
  Clock,
  Flag,
  FolderGit2,
  GitMerge,
  GitPullRequest,
  Image,
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
  channelsChanged,
  likesOf,
  type Message,
  type Notify,
  notifyOf,
  unreadIn,
} from '/web/fixtures/channels.ts'
import { helpChanged, helpRequests } from '/web/fixtures/help.ts'
import { isMe, me, people, personOf } from '/web/fixtures/people.ts'
import type { Project, ProjectSlug } from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'
import { ago } from '/web/lib/time.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { DemoBadge } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Textarea } from '/web/ui/input.tsx'
import { Markdown } from '/web/ui/rich-text.tsx'
import { counted } from '/web/lib/plural.ts'
import { t, translate } from '/web/lib/language.ts'
import { LIMITS } from '/api/limits.ts'
import { overLimit } from '/web/lib/limits.ts'
import {
  answerAlert,
  answerMessage,
  readChannel,
  saveNotify,
  sendChannelMessage,
  toggleLike,
} from '/web/lib/channels.ts'
import type { Media } from '/web/lib/messages.ts'
import {
  IMAGE_TYPES,
  MediaGrid,
  MediaThumbs,
  MediaViewer,
  useMediaPicker,
} from '/web/ui/media.tsx'
import { notify } from '/web/ui/toast.tsx'
import { VideoEmbed, videoIn } from '/web/ui/video.tsx'
import { textOf } from '/web/lib/tracking.ts'

type IconComponent = (props: JSX.IntrinsicElements['svg']) => JSX.Element

// Path segment, data key, name and purpose of the four imposed channels
const channelList: [string, Channel, string, string][] = [
  ['general', 'general', 'général', 'Discussions de l’équipe'],
  [
    'updates',
    'tracking',
    'suivi',
    'Alertes GitHub et CI/CD, écrites par la plateforme',
  ],
  ['help', 'help', 'aide', 'Demandes d’aide du projet et leurs échanges'],
  [
    'announcements',
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
  issue: [CircleDot, 'text-indigo'],
  push: [Zap, 'text-ink-muted'],
}

const notifyOptions: [Notify, string][] = [
  ['all', 'Tout'],
  ['mentions', 'Mentions'],
  ['mine', 'Seulement mes PRs'],
  ['none', 'Rien'],
]

type Reply = NonNullable<Message['replies']>[number]

// Messages and replies of a project the server does not know, or under a
// demo message, kept for the session
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
    : personOf(message.author).name

const Author = ({ message }: { message: Message }) => {
  if (message.author !== 'platform') {
    const author = personOf(message.author)
    return <Avatar name={author.name} src={author.avatarUrl} size={34} />
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
  // Its own subscriptions: an alert loses its action once help is asked,
  // a +1 changes the message in place
  helpChanged.value
  channelsChanged.value
  const { count, mine: liked } = likesOf(message)
  const replies = repliesOf(message).length
  const action = canAct && alertAction(project, message)
  const text = textOf(message)
  const video = videoIn(text)
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
          <Markdown text={text} class='gap-1.5' />
        </div>
        {(message.media?.length || video) && (
          <div class='flex max-w-[480px] flex-col gap-2 py-1'>
            <MediaGrid
              id={`image-${message.id}`}
              items={message.media ?? []}
              label={t`Image de ${authorName(message)}`}
            />
            {video && <VideoEmbed url={video} label='Vidéo du message' />}
            <MediaViewer
              id={`image-${message.id}`}
              items={message.media ?? []}
              label={t`Image de ${authorName(message)}`}
            />
          </div>
        )}
        {action && (
          <Button
            size={32}
            href='help/new'
            params={action.params}
            class='mt-0.5 mb-1 self-start'
          >
            {action.label}
          </Button>
        )}
        <div class='flex items-center gap-2'>
          {
            // An alert of the server is an entry: no +1 is kept on it
            !message.alert && (
              <button
                type='button'
                onClick={() => toggleLike(message)}
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
            )
          }
          <A
            params={{ thread: message.id }}
            class='inline-flex h-[26px] items-center gap-1 rounded-md px-2 text-[12px] leading-none font-medium text-ink-muted no-underline hover:text-indigo hover:no-underline'
          >
            <MessageSquare class='size-3.5' />
            {replies ? counted(replies, 'réponse') : 'Répondre en fil'}
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
  { placeholder, label, square, images, onSend }: {
    placeholder: string
    label: string
    square?: boolean
    /** One image with the message: picked, dropped or pasted (§17.3) */
    images?: boolean
    /** Resolves false when the message was not sent: the draft stays */
    onSend: (text: string, media: Media[]) => void | Promise<boolean>
  },
) => {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const picker = useMediaPicker(1)
  const files = useRef<HTMLInputElement>(null)
  const send = async () => {
    const text = draft.trim()
    if (!text && !picker.media.length) return
    if (overLimit(draft, 'channelMessage') || sending || picker.uploading) {
      return
    }
    setSending(true)
    const sent = await onSend(text, picker.media)
    setSending(false)
    if (sent === false) return
    setDraft('')
    picker.reset()
  }
  return (
    <div
      class={`flex flex-col gap-2.5 border-t border-line ${
        square ? 'px-3.5 py-3' : 'p-3.5'
      }`}
    >
      {images && <MediaThumbs picker={picker} />}
      <div class={`flex ${square ? 'gap-2.5' : 'items-center gap-3'}`}>
        {images && (
          <>
            <input
              ref={files}
              type='file'
              accept={IMAGE_TYPES.join(',')}
              class='hidden'
              onChange={(event) => {
                picker.add([...event.currentTarget.files ?? []])
                event.currentTarget.value = ''
              }}
            />
            <Button
              variant='secondary'
              size={40}
              square
              aria-label='Ajouter une image'
              title='Ajouter une image'
              disabled={picker.full}
              onClick={() => files.current?.click()}
            >
              <Image />
            </Button>
          </>
        )}
        {/* Enter sends, Shift + Enter goes to the next line (QA-25) */}
        <Textarea
          rows={1}
          value={draft}
          limit={LIMITS.channelMessage}
          wrap='min-w-0 flex-1'
          onInput={(event) => setDraft(event.currentTarget.value)}
          onPaste={images ? picker.onPaste : undefined}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return
            event.preventDefault()
            send()
          }}
          placeholder={placeholder}
          aria-label={label}
          class='max-h-40 min-h-10 resize-none [field-sizing:content]'
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
            <Button
              size={40}
              onClick={send}
              disabled={sending || picker.uploading}
            >
              <SendHorizontal />
              Envoyer
            </Button>
          )}
      </div>
    </div>
  )
}

const Thread = (
  { project, channel, message, canReply }: {
    project: ProjectSlug
    channel: Channel
    message: Message
    canReply: boolean
  },
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
      <div class='text-[14px] leading-[22px]'>
        <Markdown text={textOf(message)} class='gap-1.5' />
      </div>
    </div>
    <div class='flex flex-col gap-3.5 px-[18px] py-3.5'>
      {repliesOf(message).map((reply) => (
        <div key={reply.id} class='flex gap-2.5'>
          <Avatar
            name={personOf(reply.author).name}
            src={personOf(reply.author).avatarUrl}
            size={26}
          />
          <div class='flex min-w-0 flex-col gap-0.5'>
            <span class='font-display text-[13px] leading-[18px] font-semibold'>
              {personOf(reply.author).name}{' '}
              <span class='font-sans font-normal text-ink-muted'>
                {ago(reply.at)}
              </span>
            </span>
            <div class='text-[14px] leading-[22px]'>
              <Markdown text={reply.text} class='gap-1.5' />
            </div>
            {reply.demo && <DemoBadge />}
          </div>
        </div>
      ))}
    </div>
    {canReply && (
      <Composer
        placeholder='Répondre dans le fil'
        label='Réponse'
        square
        onSend={(text) =>
          // A message or an alert of the server keeps its thread there
          // (PAM-406, PAM-411)
          message.alert || message.id.startsWith('s')
            ? (message.alert
              ? answerAlert(project, message.id, text)
              : answerMessage(project, channel, message.id, text)).then(
                () => true,
                () => {
                  notify({
                    title: 'Réponse non envoyée',
                    body: 'Réessaie dans un instant.',
                    icon: CircleAlert,
                    tone: 'warning',
                  })
                  return false
                },
              )
            : sendReply(message.id, {
              id: `r${Date.now()}`,
              author: me.login,
              text,
              at: Date.now(),
              demo: false,
            })}
      />
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

// What reaches me from a channel: it counts the unread too. #suivi defaults
// to « only my PRs » (§6.8); saved for a project the server knows (PAM-412)
const NotifySelect = (
  { project, channel, saved }: {
    project: ProjectSlug
    channel: Channel
    saved: boolean
  },
) => (
  <label class='flex items-center gap-1.5 text-[12px] text-ink-muted'>
    <Bell class='size-3.5' />
    <select
      aria-label='Notifications du canal'
      value={notifyOf(project, channel)}
      onChange={(event) =>
        saveNotify(
          project,
          channel,
          event.currentTarget.value as Notify,
          saved,
        )}
      class='well h-8 px-2 text-[13px] leading-none text-ink'
    >
      {notifyOptions
        .filter(([value]) => channel === 'tracking' || value !== 'mine')
        .map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
    </select>
  </label>
)

/** Four imposed channels, like a Discord server (§6.8) */
export const ChannelsTab = ({ project }: { project: Project }) => {
  const segment = url.relativePath.slice(1).split('/')[3] ?? 'general'
  const [path, key, name, purpose] = channelList.find(([p]) => p === segment) ??
    channelList[0]
  const slug = project.slug as ProjectSlug
  // A project the server knows keeps its messages and what I read there
  // (PAM-428, PAM-412): the project page loads them, for its badge too
  const saved = !!project.shots
  channelsChanged.value
  const store = channels[slug]
  const messagesOf = (channel: Channel, path: string) => [
    ...(store?.[channel] ?? []),
    ...(sentMessages.value[`${project.slug}:${path}`] ?? []),
  ]
  const messages = messagesOf(key, path)
  // The channel on screen is read, new messages included
  useEffect(() => {
    readChannel(slug, key, saved)
  }, [slug, key, messages.length, saved])

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
                href={`project/${project.slug}/channels/${p}`}
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
          <NotifySelect project={slug} channel={key} saved={saved} />
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
            <Composer
              placeholder={t`Écrire dans #${
                translate(name)
              } (Markdown, \`code\`, lien vidéo)`}
              label='Message'
              images={saved}
              onSend={(text, media) =>
                saved
                  ? sendChannelMessage(slug, key, text, media).then(
                    () => true,
                    () => {
                      notify({
                        title: 'Message non envoyé',
                        body: 'Réessaie dans un instant.',
                        icon: CircleAlert,
                        tone: 'warning',
                      })
                      return false
                    },
                  )
                  : sendMessage(`${project.slug}:${path}`, {
                    id: `m${Date.now()}`,
                    author: me.login,
                    text,
                    at: Date.now(),
                    demo: false,
                  })}
            />
          )
          : (
            <div class='flex items-center gap-2 border-t border-line bg-surface-000 px-[18px] py-3.5 text-[13px] text-ink-muted'>
              <Lock class='size-3.5' />
              {readOnlyNote}
            </div>
          )}
      </section>
      {
        // Members answer in a thread; followers read (§6.8)
        thread && (
          <Thread
            project={slug}
            channel={key}
            message={thread}
            canReply={isMember}
          />
        )
      }
    </div>
  )
}
