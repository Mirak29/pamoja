import type { ComponentChildren, JSX } from 'preact'
import { useState } from 'preact/hooks'
import { A } from '@01edu/signal-router'
import {
  Bookmark,
  BookmarkCheck,
  Check,
  CornerDownRight,
  Flag,
  Lightbulb,
  Link,
  MessageSquare,
  Minus,
  Plus,
  Repeat2,
  Share2,
  ThumbsUp,
} from '/web/assets/icons.tsx'
import { communities } from '/web/fixtures/communities.ts'
import { isMe, me, people } from '/web/fixtures/people.ts'
import {
  childrenOf,
  descendantCount,
  type Post,
  posts,
  postsChanged,
  replyTo,
  toggleBookmark,
  toggleReaction,
  toggleRepost,
} from '/web/fixtures/posts.ts'
import { projects } from '/web/fixtures/projects.ts'
import { ago } from '/web/lib/time.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { PostTypeBadge, StatusBadge } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { RichText } from '/web/ui/rich-text.tsx'
import { Cube } from '/web/ui/shapes.tsx'
import { notify } from '/web/ui/toast.tsx'

type IconComponent = (props: JSX.IntrinsicElements['svg']) => JSX.Element

const FENCE = '`'.repeat(3)

/** Paragraphs with `inline code`, and fenced code blocks */
export const PostBody = (
  { body, small }: { body: string; small?: boolean },
) => (
  <div
    class={`flex flex-col ${
      small
        ? 'gap-2 text-[14px] leading-[22px]'
        : 'gap-2.5 text-[15px] leading-6'
    }`}
  >
    {body.split(FENCE).flatMap((part, i) =>
      i % 2
        ? [
          <pre
            key={i}
            class={`overflow-x-auto rounded-md border border-line-strong bg-surface-000 font-mono inset-shadow-well ${
              small
                ? 'px-3 py-2.5 text-[12px] leading-5'
                : 'px-3.5 py-3 text-[13px] leading-[21px]'
            }`}
          >
            {part.replace(/^[a-z]*\n/, '').trim()}
          </pre>,
        ]
        : part.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((
          paragraph,
          j,
        ) => (
          <p key={`${i}-${j}`} class='text-pretty'>
            <RichText text={paragraph} />
          </p>
        ))
    )}
  </div>
)

const actionSizes = {
  post: 'h-8 min-w-8 gap-1.5 px-[9px] text-[13px]',
  reply: 'h-7 min-w-7 gap-[5px] px-[7px] text-[12px]',
}

const actionKey = (size: keyof typeof actionSizes, pressed?: boolean) =>
  `inline-flex cursor-pointer items-center rounded-md border font-mono leading-none font-medium no-underline transition-[translate,box-shadow,color] duration-120 ease-out hover:text-indigo hover:no-underline active:translate-x-[2.6px] active:translate-y-[1.5px] active:shadow-none ${
    actionSizes[size]
  } ${
    pressed
      ? 'border-indigo bg-indigo-soft text-indigo shadow-key-selected'
      : 'border-transparent text-ink-muted'
  }`

const ActionKey = (
  { icon: Icon, count, pressed, label, size, onClick }: {
    icon: IconComponent
    count?: number
    pressed?: boolean
    label: string
    size: keyof typeof actionSizes
    onClick: () => void
  },
) => (
  <button
    type='button'
    aria-pressed={pressed}
    aria-label={label}
    title={label}
    onClick={onClick}
    class={actionKey(size, pressed)}
  >
    <Icon class={size === 'post' ? 'size-4' : 'size-[15px]'} />
    {/* Always there, as in the prototype: the gap keeps keys the same width */}
    <span>{count || ''}</span>
  </button>
)

const share = (post: Post) => {
  const link = `${location.origin}/post/${post.id}`
  navigator.clipboard?.writeText(link).catch(() => {})
  notify({
    title: 'Lien copié',
    body: `${location.host}/post/${post.id}`,
    icon: Link,
    tone: 'muted',
  })
}

const repost = (post: Post) => {
  const on = toggleRepost(post, me.login)
  notify({
    title: on ? 'Republié' : 'Republication retirée',
    body: on
      ? 'Le post apparaît dans le fil de tes abonnés.'
      : 'Le post n’apparaît plus dans ton fil.',
    icon: Repeat2,
    tone: on ? 'verified' : 'muted',
  })
}

/** Reply, repost, like, useful, then bookmark, share and report */
const Actions = (
  { post, size, replies, replying, onReply, before }: {
    post: Post
    size: keyof typeof actionSizes
    replies: number
    replying: boolean
    onReply: () => void
    /** The fold key of a reply, at the start of the row */
    before?: ComponentChildren
  },
) => {
  const likes = post.reactions.like ?? []
  const useful = post.reactions.useful ?? []
  const saved = post.bookmarks?.includes(me.login) ?? false
  return (
    <div
      class={`flex flex-wrap items-center ${
        size === 'post' ? '-ml-[9px] gap-1' : '-ml-[7px] gap-0.5'
      }`}
    >
      {before}
      <ActionKey
        icon={MessageSquare}
        count={replies}
        pressed={replying}
        label={size === 'post' ? 'Commenter' : 'Répondre'}
        size={size}
        onClick={onReply}
      />
      <ActionKey
        icon={Repeat2}
        count={post.reposts.length}
        pressed={post.reposts.some((r) => isMe(r.by))}
        label='Republier'
        size={size}
        onClick={() => repost(post)}
      />
      <ActionKey
        icon={ThumbsUp}
        count={likes.length}
        pressed={likes.some(isMe)}
        label='J’aime'
        size={size}
        onClick={() => toggleReaction(post, 'like', me.login)}
      />
      <ActionKey
        icon={Lightbulb}
        count={useful.length}
        pressed={useful.some(isMe)}
        label='Utile'
        size={size}
        onClick={() => toggleReaction(post, 'useful', me.login)}
      />
      <span class='flex-1' />
      <ActionKey
        icon={saved ? BookmarkCheck : Bookmark}
        pressed={saved}
        label={saved ? 'Retirer des enregistrés' : 'Enregistrer'}
        size={size}
        onClick={() => toggleBookmark(post, me.login)}
      />
      <ActionKey
        icon={Share2}
        label='Partager'
        size={size}
        onClick={() => share(post)}
      />
      {!isMe(post.author) && (
        // The report dialog comes with PAM-516
        <A
          params={{ dialog: 'report', report: `post:${post.id}` }}
          aria-label='Signaler'
          title='Signaler'
          class={actionKey(size)}
        >
          <Flag class={size === 'post' ? 'size-4' : 'size-[15px]'} />
          <span />
        </A>
      )}
    </div>
  )
}

const ReplyInput = (
  { placeholder, onSend, size }: {
    placeholder: string
    onSend: (text: string) => void
    size: 'feed' | 'reply'
  },
) => {
  const [draft, setDraft] = useState('')
  const send = () => {
    if (!draft.trim()) return
    onSend(draft.trim())
    setDraft('')
  }
  return (
    <div
      class={`flex items-center ${
        size === 'feed' ? 'gap-2.5' : 'animate-enter-fast gap-2 pt-0.5'
      }`}
    >
      {size === 'feed' && <Avatar name={me.name} size={28} />}
      <input
        value={draft}
        placeholder={placeholder}
        aria-label={placeholder}
        onInput={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.shiftKey) return
          event.preventDefault()
          send()
        }}
        class={`well min-w-0 flex-1 leading-none text-ink ${
          size === 'feed'
            ? 'h-9 px-3 text-[14px]'
            : 'h-[34px] px-2.5 text-[14px]'
        }`}
      />
      <Button size={size === 'feed' ? 36 : 34} onClick={send}>Répondre</Button>
    </div>
  )
}

// Width of one level of the thread and height of the elbow to an avatar
const AVATAR_Y = 22
const levelWidth = () =>
  globalThis.matchMedia?.('(min-width: 760px)').matches ? 28 : 22

type Rail = JSX.CSSProperties

const rail = (
  x: number,
  top: number,
  bottom?: number,
  height?: number,
  width = 0,
  elbow = false,
): Rail => ({
  left: `${x - 0.75}px`,
  top: `${top}px`,
  bottom: bottom == null ? 'auto' : `${bottom}px`,
  height: height == null ? 'auto' : `${height}px`,
  width: `${width}px`,
  borderBottomWidth: elbow ? '1.5px' : '0',
  borderBottomLeftRadius: elbow ? '10px' : '0',
})

type Row = {
  post: Post
  depth: number
  rails: Rail[]
  /** Replies below, folded or unfolded, when the thread can go deeper */
  fold?: 'folded' | 'unfolded'
  more?: string
}

/**
 * Flattens a thread: each reply with its lines to the parent and siblings,
 * at most `topLimit` replies at the first level (then 2), `maxDepth` levels.
 */
const flatten = (
  rootId: string,
  unfolded: string[],
  maxDepth: number,
  topLimit: number,
) => {
  const level = levelWidth()
  const column = (k: number) => k * level + 16
  const rows: Row[] = []
  const walk = (
    id: string,
    depth: number,
    limit: number,
    lines: boolean[],
    parent?: Row,
  ) => {
    const all = childrenOf(id)
    const shown = limit ? all.slice(0, limit) : all
    if (parent && shown.length < all.length) {
      parent.more = `Voir les ${all.length} réponses`
    }
    shown.forEach((post, i) => {
      const next = i < shown.length - 1
      const row: Row = { post, depth, rails: [] }
      lines.forEach((on, k) => on && row.rails.push(rail(column(k), 0, 0)))
      if (depth > 0) {
        row.rails.push(
          rail(column(depth - 1), 0, undefined, AVATAR_Y, level - 16, true),
        )
        if (next) row.rails.push(rail(column(depth - 1), 0, 0))
      }
      rows.push(row)
      const kids = childrenOf(post.id).length
      if (!kids) return
      if (depth + 1 >= maxDepth) {
        row.more = `Continuer le fil · ${kids} ${
          kids > 1 ? 'réponses' : 'réponse'
        }`
      } else if (!unfolded.includes(post.id)) {
        row.fold = 'folded'
      } else {
        row.fold = 'unfolded'
        row.rails.push(rail(column(depth), AVATAR_Y + 20, 0))
        walk(
          post.id,
          depth + 1,
          limit ? 2 : 0,
          depth > 0 ? [...lines, next] : [],
          row,
        )
      }
    })
    return all.length - shown.length
  }
  const rest = walk(rootId, 0, topLimit, [])
  return { rows, rest, level }
}

const SmallPill = (
  { tone, children }: {
    tone: 'verified' | 'demo'
    children: ComponentChildren
  },
) => (
  <span
    class={`inline-flex h-5 items-center gap-1 rounded-sm border px-1.5 font-mono text-[10px] leading-none font-medium tracking-[.06em] whitespace-nowrap uppercase ${
      tone === 'verified'
        ? 'border-verified bg-verified-soft text-verified'
        : 'border-dashed border-line-control text-ink-muted'
    }`}
  >
    {children}
  </span>
)

const ReplyRow = (
  { row, level, replying, onToggleReply, onFold, onReply }: {
    row: Row
    level: number
    replying: boolean
    onToggleReply: () => void
    onFold: () => void
    onReply: (text: string) => void
  },
) => {
  const { post } = row
  const root = posts.find((p) => p.id === (post.root ?? post.id))
  const masked = post.hidden && !isMe(post.author)
  const name = people[post.author].name
  return (
    <div
      class='relative flex gap-2.5 pt-1.5 pb-2.5'
      style={{ paddingLeft: `${row.depth * level}px` }}
    >
      {row.rails.map((style, i) => (
        <span
          key={i}
          aria-hidden='true'
          style={style}
          class='pointer-events-none absolute border-l-[1.5px] border-line-strong'
        />
      ))}
      <A
        href={`@${post.author}`}
        aria-label={name}
        class='relative z-[1] flex h-8 flex-none'
      >
        <Avatar name={name} size={32} />
      </A>
      <div class='flex min-w-0 flex-1 flex-col gap-[5px]'>
        <div class='flex min-h-[22px] flex-wrap items-baseline gap-1.5 pt-0.5 leading-[18px]'>
          <A
            href={`@${post.author}`}
            class='font-display text-[14px] leading-[18px] font-semibold text-ink'
          >
            {name}
          </A>
          <span class='font-mono text-[12px] leading-[18px] text-ink-muted'>
            @{post.author}
          </span>
          <span class='text-ink-muted'>·</span>
          <A href={`post/${post.id}`} class='text-[12px] text-ink-muted'>
            {ago(post.at)}
          </A>
          {root?.acceptedReply === post.id && (
            <SmallPill tone='verified'>
              <Check class='size-3' />
              Réponse acceptée
            </SmallPill>
          )}
          {post.demo && <SmallPill tone='demo'>Donnée de démo</SmallPill>}
        </div>
        {post.hidden && isMe(post.author) && (
          <span class='text-[12px] text-warning'>
            Masquée par la modération. Toi seul la vois encore.
          </span>
        )}
        {masked
          ? (
            <span class='text-[14px] leading-[22px] text-ink-muted italic'>
              Réponse masquée par la modération.
            </span>
          )
          : <PostBody body={post.body} small />}
        <Actions
          post={post}
          size='reply'
          replies={childrenOf(post.id).length}
          replying={replying}
          onReply={onToggleReply}
          before={row.fold && (
            <button
              type='button'
              onClick={onFold}
              aria-expanded={row.fold === 'unfolded'}
              aria-label={row.fold === 'folded'
                ? 'Afficher les réponses'
                : 'Replier ce fil'}
              title={row.fold === 'folded'
                ? 'Afficher les réponses'
                : 'Replier ce fil'}
              class='relative z-[1] mr-2 -ml-7 flex size-[18px] flex-none cursor-pointer items-center justify-center rounded-full border-[1.5px] border-line-strong bg-surface-100 p-0 text-ink-muted hover:border-indigo hover:text-indigo'
            >
              {row.fold === 'folded'
                ? <Plus class='size-3' />
                : <Minus class='size-3' />}
            </button>
          )}
        />
        {row.fold === 'folded' && (
          <button
            type='button'
            onClick={onFold}
            class='cursor-pointer self-start p-0 text-[13px] leading-[18px] font-semibold text-indigo'
          >
            Afficher {descendantCount(post.id)}{' '}
            {descendantCount(post.id) > 1 ? 'réponses' : 'réponse'}
          </button>
        )}
        {replying && (
          <ReplyInput
            size='reply'
            placeholder={`Répondre à ${name.split(' ')[0]}`}
            onSend={onReply}
          />
        )}
        {row.more && (
          <A
            href={`post/${post.id}`}
            class='self-start text-[13px] font-semibold'
          >
            {row.more}
          </A>
        )}
      </div>
    </div>
  )
}

/**
 * Replies under a post with their connecting lines; folded below the first
 * level until unfolded (§10.1).
 *
 * @example
 * <Thread root={post} maxDepth={3} topLimit={3} />
 */
export const Thread = (
  { root, maxDepth, topLimit = 0, onRest }: {
    root: Post
    maxDepth: number
    topLimit?: number
    /** Called with the number of first level replies left out */
    onRest?: (rest: number) => ComponentChildren
  },
) => {
  postsChanged.value
  const [unfolded, setUnfolded] = useState<string[]>([])
  const [replying, setReplying] = useState<string[]>([])
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  const { rows, rest, level } = flatten(root.id, unfolded, maxDepth, topLimit)
  return (
    <>
      <div class='flex flex-col'>
        {rows.map((row) => (
          <ReplyRow
            key={row.post.id}
            row={row}
            level={level}
            replying={replying.includes(row.post.id)}
            onToggleReply={() => setReplying(toggle(replying, row.post.id))}
            onFold={() => setUnfolded(toggle(unfolded, row.post.id))}
            onReply={(text) => {
              replyTo(row.post, me.login, text)
              setReplying(replying.filter((id) => id !== row.post.id))
              if (!unfolded.includes(row.post.id)) {
                setUnfolded([...unfolded, row.post.id])
              }
            }}
          />
        ))}
      </div>
      {onRest?.(rest)}
    </>
  )
}

const firstName = (login: string) =>
  people[login as keyof typeof people].name.split(' ')[0]

/**
 * A post in a feed: author, community, type, title, body, images, linked
 * project, actions and its replies on demand.
 *
 * @example
 * <PostCard post={post} />
 * <PostCard post={post} repostBy='moussa' />
 */
export const PostCard = (
  { post, repostBy }: { post: Post; repostBy?: string },
) => {
  postsChanged.value
  const [open, setOpen] = useState(false)
  const author = people[post.author]
  const community = communities.find((c) => c.slug === post.community)
  const parent = post.parent && posts.find((p) => p.id === post.parent)
  const project = post.link && projects[post.link]
  return (
    <article class='slab mr-2 flex animate-enter flex-col gap-2.5 px-[18px] pt-4 pb-3'>
      {post.hidden && isMe(post.author) && (
        <span class='rounded-md border border-dashed border-warning px-2.5 py-2 text-[13px] text-warning'>
          Masqué par la modération. Toi seul le vois encore.
        </span>
      )}
      {repostBy && (
        <span class='ml-14 flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted'>
          <Repeat2 class='size-3.5' />
          {isMe(repostBy as typeof me.login)
            ? 'Tu as republié'
            : `${firstName(repostBy)} a republié`}
        </span>
      )}
      {parent && (
        <span class='ml-14 flex items-center gap-1.5 text-[13px] text-ink-muted'>
          <CornerDownRight class='size-3.5' />
          <span>
            En réponse à{' '}
            <A href={`post/${parent.id}`} class='font-semibold'>
              @{parent.author}
            </A>
          </span>
        </span>
      )}
      <div class='flex gap-3.5'>
        <A
          href={`@${post.author}`}
          aria-label={author.name}
          class='flex h-[42px] flex-none'
        >
          <Avatar name={author.name} size={42} />
        </A>
        <div class='flex min-w-0 flex-1 flex-col gap-2'>
          <div class='flex flex-wrap items-baseline gap-1.5 leading-5'>
            <A
              href={`@${post.author}`}
              class='font-display text-[15px] leading-5 font-semibold text-ink'
            >
              {author.name}
            </A>
            <span class='font-mono text-[13px] leading-5 text-ink-muted'>
              @{post.author}
            </span>
            <span class='text-ink-muted'>·</span>
            <span class='text-[13px] text-ink-muted'>{ago(post.at)}</span>
            <span class='text-ink-muted'>·</span>
            <A
              href={`communaute/${post.community}`}
              class='text-[13px] font-semibold'
            >
              {community?.name}
            </A>
          </div>
          {post.type !== 'Discussion' && (
            <div class='flex flex-wrap gap-1.5'>
              <PostTypeBadge type={post.type} />
              {post.acceptedReply && <StatusBadge status='answered' />}
            </div>
          )}
          {post.title && (
            <A
              href={`post/${post.id}`}
              class='font-display text-[17px] leading-6 font-semibold text-pretty text-ink hover:text-indigo hover:no-underline'
            >
              {post.title}
            </A>
          )}
          <PostBody body={post.body} />
          {!!post.images && (
            <div class='grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5 pr-[3px]'>
              {Array.from({ length: post.images }, (_, i) => (
                <div
                  key={i}
                  class='flex aspect-[16/10] items-end rounded-[8px] border border-figure-edge bg-surface-000 p-1.5 shadow-tile'
                >
                  <span class='rounded-sm bg-surface-100 px-1 py-px font-mono text-[10px] leading-[14px] font-medium text-ink-muted'>
                    capture-{i + 1}.png
                  </span>
                </div>
              ))}
            </div>
          )}
          {project && (
            <A
              href={`projet/${project.slug}`}
              class='mr-[3px] flex items-center gap-3 rounded-[8px] border border-figure-edge px-3 py-2.5 text-ink no-underline shadow-tile hover:bg-surface-000 hover:no-underline'
            >
              <Cube />
              <span class='flex min-w-0 flex-col'>
                <span class='font-display text-[14px] leading-5 font-semibold'>
                  {project.name}
                </span>
                <span class='font-mono text-[12px] leading-4 text-ink-muted'>
                  github.com/{project.owner}/{project.slug}
                </span>
              </span>
            </A>
          )}
          <Actions
            post={post}
            size='post'
            replies={childrenOf(post.id).length}
            replying={open}
            onReply={() => setOpen(!open)}
          />
          {open && (
            <div class='flex animate-enter-fast flex-col gap-2.5 border-t border-line pt-3 pb-1'>
              <Thread
                root={post}
                maxDepth={3}
                topLimit={3}
                onRest={(rest) =>
                  rest > 0 && (
                    <A
                      href={`post/${post.id}`}
                      class='text-[13px] font-semibold'
                    >
                      Voir le fil complet · {descendantCount(post.id)} réponses
                    </A>
                  )}
              />
              <ReplyInput
                size='feed'
                placeholder='Répondre'
                onSend={(text) => replyTo(post, me.login, text)}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
