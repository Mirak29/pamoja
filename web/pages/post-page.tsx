import { useState } from 'preact/hooks'
import { A, url } from '@01edu/signal-router'
import {
  Bookmark,
  BookmarkCheck,
  CornerDownRight,
  Flag,
  Heart,
  Lightbulb,
  ThumbsUp,
} from '/web/assets/icons.tsx'
import { communities } from '/web/fixtures/communities.ts'
import { isMe, me, people } from '/web/fixtures/people.ts'
import {
  descendantCount,
  type Post,
  posts,
  postsChanged,
  type Reaction,
  replyTo,
  toggleBookmark,
  toggleReaction,
} from '/web/fixtures/posts.ts'
import { projects } from '/web/fixtures/projects.ts'
import { ago } from '/web/lib/time.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { DemoBadge, PostTypeBadge, StatusBadge } from '/web/ui/badge.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Textarea } from '/web/ui/input.tsx'
import { Page } from '/web/ui/layout.tsx'
import { ParentChain, PostBody, Thread } from '/web/ui/post.tsx'
import { Cube } from '/web/ui/shapes.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'

const reactions = [
  ['like', ThumbsUp, '+1'],
  ['useful', Lightbulb, 'Utile'],
  ['thanks', Heart, 'Merci'],
] as const

const Article = ({ post }: { post: Post }) => {
  const author = people[post.author]
  const community = communities.find((c) => c.slug === post.community)
  const parent = post.parent && posts.find((p) => p.id === post.parent)
  const project = post.link && projects[post.link]
  const saved = post.bookmarks?.includes(me.login) ?? false
  return (
    <article class='slab flex flex-col gap-4 p-6'>
      {post.hidden && (
        <div class='rounded-md border border-dashed border-warning px-3 py-2.5 text-[14px] text-warning'>
          Masqué par la modération
          {post.hiddenReason ? ` : ${post.hiddenReason}` : ''}. Toi seul le vois
          encore.
        </div>
      )}
      {parent && (
        <span class='flex items-center gap-1.5 text-[13px] text-ink-muted'>
          <CornerDownRight class='size-3.5' />
          <span>
            En réponse à{' '}
            <A href={`post/${parent.id}`} class='font-semibold'>
              @{parent.author}
            </A>
          </span>
        </span>
      )}
      <div class='flex flex-wrap items-center gap-2'>
        <PostTypeBadge type={post.type} />
        {post.acceptedReply && <StatusBadge status='answered' />}
        {post.demo && <DemoBadge />}
        <A
          href={`communaute/${post.community}`}
          class='text-[13px] font-semibold'
        >
          {community?.name}
        </A>
      </div>
      {post.title && (
        <h1 class='font-display text-[28px] leading-[34px] font-bold tracking-[-.01em] text-pretty'>
          {post.title}
        </h1>
      )}
      <A
        href={`@${post.author}`}
        class='flex items-center gap-2.5 text-ink no-underline hover:no-underline'
      >
        <Avatar name={author.name} size={32} />
        <span class='flex flex-col'>
          <span class='font-display text-[14px] leading-[18px] font-semibold'>
            {author.name}
          </span>
          <span class='text-[12px] text-ink-muted'>
            {author.role} · {ago(post.at)}
          </span>
        </span>
      </A>
      <PostBody body={post.body} size='large' />
      {!!post.images && (
        <div class='grid grid-cols-4 gap-3'>
          {Array.from(
            { length: post.images },
            (_, i) => (
              <div key={i} class='tile flex aspect-[4/3] items-end p-1.5'>
                <span class='rounded-sm bg-surface-100 px-1 py-px font-mono text-[10px] leading-[14px] font-medium text-ink-muted'>
                  capture-{i + 1}.png
                </span>
              </div>
            ),
          )}
        </div>
      )}
      {post.video && (
        <span class='font-mono text-[13px] leading-5 text-ink-muted'>
          Vidéo : {post.video}
        </span>
      )}
      {project && (
        <A
          href={`projet/${project.slug}`}
          class='mr-1 flex items-center gap-3 rounded-[8px] border border-figure-edge p-3 text-ink no-underline shadow-tile hover:bg-surface-000 hover:no-underline'
        >
          <Cube size={30} />
          <span class='flex flex-col'>
            <span class='font-display text-[15px] leading-5 font-semibold'>
              {project.name}
            </span>
            <span class='font-mono text-[12px] leading-4 text-ink-muted'>
              github.com/{project.owner}/{project.slug}
            </span>
          </span>
        </A>
      )}
      <div class='flex flex-wrap items-center gap-2.5 border-t border-line pt-4'>
        <div class='flex flex-wrap gap-2 pb-1'>
          {reactions.map(([kind, Icon, label]) => {
            const list = post.reactions[kind as Reaction] ?? []
            return (
              <OptionButton
                key={kind}
                pressed={list.some(isMe)}
                onClick={() => toggleReaction(post, kind, me.login)}
              >
                <Icon class='size-3.5' />
                {label}
                {list.length ? ` · ${list.length}` : ''}
              </OptionButton>
            )
          })}
        </div>
        <span class='flex-1' />
        <Button
          variant='secondary'
          size={34}
          onClick={() => toggleBookmark(post, me.login)}
        >
          {saved ? <BookmarkCheck /> : <Bookmark />}
          {saved ? 'Enregistré' : 'Enregistrer'}
        </Button>
        {!isMe(post.author) && (
          // The report dialog comes with PAM-516
          <Button
            variant='secondary'
            size={34}
            square
            params={{ dialog: 'report', report: `post:${post.id}` }}
            aria-label='Signaler'
            title='Signaler'
          >
            <Flag />
          </Button>
        )}
      </div>
    </article>
  )
}

const Replies = ({ post }: { post: Post }) => {
  const [draft, setDraft] = useState('')
  const count = descendantCount(post.id)
  const open = post.type === 'Question' && !post.acceptedReply
  const send = () => {
    if (!draft.trim()) return
    replyTo(post, me.login, draft.trim())
    setDraft('')
  }
  return (
    <section class='slab overflow-hidden'>
      <div class='flex px-5 pt-[18px] pb-4'>
        <Eyebrow>{count} {count > 1 ? 'réponses' : 'réponse'}</Eyebrow>
      </div>
      {open && (
        <div class='mx-5 mb-3.5 rounded-md border border-dashed border-warning px-3 py-2.5 text-[13px] leading-5 text-warning'>
          {isMe(post.author)
            ? 'Accepte la réponse qui a résolu ton problème : son auteur progresse en Entraide.'
            : 'L’auteur pourra accepter la réponse qui l’a aidé.'}
        </div>
      )}
      <div class='flex flex-col gap-3 px-5 pb-[18px]'>
        {count
          ? <Thread root={post} maxDepth={8} />
          : (
            <span class='text-[14px] text-ink-muted'>
              Pas encore de réponse. Lance la discussion.
            </span>
          )}
      </div>
      <div class='flex flex-col gap-2.5 border-t border-line bg-surface-000 px-5 py-4'>
        <Textarea
          rows={3}
          value={draft}
          aria-label='Réponse'
          placeholder='Écrire une réponse (Markdown, `code`)'
          onInput={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) =>
            event.key === 'Enter' && (event.metaKey || event.ctrlKey) &&
            send()}
        />
        <div class='flex flex-wrap items-center justify-between gap-3 pb-[3px]'>
          <span class='text-[12px] text-ink-muted'>
            Ctrl + Entrée pour publier
          </span>
          <Button size={36} onClick={send}>Répondre</Button>
        </div>
      </div>
    </section>
  )
}

const NotFound = () => (
  <Page title='Post introuvable' class='pt-5'>
    <GhostSlab>
      <EmptyState action={<Button href='.'>Retour au fil</Button>}>
        Ce post n’existe pas ou a été retiré.
      </EmptyState>
    </GhostSlab>
  </Page>
)

/** /post/:id: the post, its parents, its replies (§10.1) */
export const PostPage = () => {
  postsChanged.value
  const id = url.relativePath.slice(1).split('/')[1]
  const post = posts.find((p) => p.id === id && (!p.hidden || isMe(p.author)))
  if (!post) return <NotFound />
  const community = communities.find((c) => c.slug === post.community)
  return (
    <Page
      title={post.title || `Réponse de ${people[post.author].name}`}
      heading={!post.title}
      class='mr-2 grid items-start gap-8 pt-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
    >
      <div class='flex min-w-0 flex-col gap-7'>
        <ParentChain post={post} />
        <Article post={post} />
        <Replies post={post} />
      </div>
      <aside class='flex min-w-0 flex-col gap-7'>
        {post.type === 'Question' && (
          <section class='slab flex flex-col gap-2 p-5'>
            <Eyebrow>Question</Eyebrow>
            <span class='text-[14px] leading-[22px] text-ink-muted'>
              Une réponse acceptée compte comme une aide : elle fait progresser
              la dimension Entraide et le badge Pilier de communauté de son
              auteur.
            </span>
          </section>
        )}
        <A
          href={`communaute/${post.community}`}
          class='slab slab-lift flex flex-col gap-1.5 p-5 text-ink no-underline hover:no-underline'
        >
          <Eyebrow>Communauté</Eyebrow>
          <span class='font-display text-[18px] leading-6 font-semibold'>
            {community?.name}
          </span>
          <span class='text-[13px] font-semibold text-indigo'>Voir le fil</span>
        </A>
      </aside>
    </Page>
  )
}
