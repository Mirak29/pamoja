import { useEffect, useState } from 'preact/hooks'
import { url } from '@01edu/signal-router'
import { Heart, MessageSquare } from '/web/assets/icons.tsx'
import { communities } from '/web/fixtures/communities.ts'
import {
  guestFeedState,
  type GuestPost,
  guestPosts,
  type GuestThread,
  loadGuestFeed,
  readGuestThread,
} from '/web/lib/guest-feed.ts'
import { counted } from '/web/lib/plural.ts'
import { ago } from '/web/lib/time.ts'
import { t } from '/web/lib/language.ts'
import { Page } from '/web/ui/layout.tsx'
import { A } from '/web/ui/link.tsx'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button } from '/web/ui/button.tsx'
import { PostTypeBadge } from '/web/ui/badge.tsx'
import { MediaGrid, MediaViewer } from '/web/ui/media.tsx'
import { PostBody } from '/web/ui/post.tsx'
import { PublicHeader } from '/web/ui/public-header.tsx'
import { VideoEmbed } from '/web/ui/video.tsx'

// The feed read without an account (§10.1): the latest posts, a thread,
// read only. Every action (like, reply, publish) asks to sign in first.

const Invite = () => (
  <div class='slab flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between'>
    <span class='text-[14px] leading-[22px] text-pretty'>
      Tu lis Pamoja sans compte. Connecte-toi avec GitHub pour aimer, répondre,
      publier et demander de l’aide.
    </span>
    <Button href='login' class='flex-none'>Se connecter</Button>
  </div>
)

const communityName = (slug: string) =>
  communities.find((c) => c.slug === slug)?.name ?? slug

/** A post, read only: its counts, and the way into its discussion */
const GuestPostCard = (
  { post, inThread = false }: { post: GuestPost; inThread?: boolean },
) => (
  <article class='slab flex flex-col gap-2.5 px-[18px] pt-4 pb-3'>
    <div class='flex gap-3.5'>
      <A
        href={`@${post.author}`}
        aria-label={post.authorName}
        class='flex h-[42px] flex-none'
      >
        <Avatar name={post.authorName} size={42} />
      </A>
      <div class='flex min-w-0 flex-1 flex-col gap-2'>
        <div class='flex flex-wrap items-baseline gap-1.5 leading-5'>
          <A
            href={`@${post.author}`}
            class='font-display text-[15px] leading-5 font-semibold text-ink'
          >
            {post.authorName}
          </A>
          <span class='font-mono text-[13px] leading-5 text-ink-muted'>
            @{post.author}
          </span>
          <span class='text-ink-muted'>·</span>
          <span class='text-[13px] text-ink-muted'>
            {ago(post.createdAt * 1000)}
          </span>
          {post.community && (
            <>
              <span class='text-ink-muted'>·</span>
              <span class='text-[13px] font-semibold'>
                {communityName(post.community)}
              </span>
            </>
          )}
        </div>
        {post.type !== 'Discussion' && post.type !== 'Réponse' && (
          <div class='flex flex-wrap gap-1.5'>
            <PostTypeBadge type={post.type as 'Question'} />
          </div>
        )}
        {post.title && (
          <span class='font-display text-[17px] leading-6 font-semibold text-pretty'>
            <span translate={false} class='wrap-anywhere'>{post.title}</span>
          </span>
        )}
        <PostBody
          body={post.body}
          size={inThread ? 'large' : 'default'}
          mentions={post.mentions}
        />
        <MediaGrid
          id={`images-${post.id}`}
          items={post.media}
          label={t`Images du post`}
        />
        <MediaViewer
          id={`images-${post.id}`}
          items={post.media}
          label={t`Images du post`}
        />
        {post.videoUrl && <VideoEmbed url={post.videoUrl} />}
        <div class='flex flex-wrap items-center gap-4 pt-1 text-[13px] text-ink-muted'>
          <A
            href='login'
            class='flex items-center gap-1.5 text-ink-muted no-underline'
            aria-label={t`Se connecter pour aimer ce post`}
          >
            <Heart class='size-4' />
            {post.reactions.like}
          </A>
          {!inThread && (
            <A
              href={`post/s${post.id}`}
              class='flex items-center gap-1.5 font-semibold'
            >
              <MessageSquare class='size-4' />
              {post.replies
                ? counted(post.replies, 'réponse', 'réponses')
                : 'Lire la discussion'}
            </A>
          )}
        </div>
      </div>
    </div>
  </article>
)

/** /feed: the latest posts, read without an account */
export const GuestFeedPage = () => {
  useEffect(() => {
    if (guestFeedState.peek() === 'idle') loadGuestFeed()
  }, [])
  const state = guestFeedState.value
  return (
    <Page title='Le fil' heading={false}>
      <PublicHeader />
      <main class='mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 pt-2 pb-[120px]'>
        <h1 class='font-display text-[28px] leading-9 font-bold'>Le fil</h1>
        <Invite />
        {guestPosts.value.map((post) => (
          <GuestPostCard key={post.id} post={post} />
        ))}
        {state === 'loading' && (
          <span class='text-[14px] text-ink-muted'>Chargement du fil…</span>
        )}
        {state === 'failed' && (
          <span class='text-[14px] text-ink-muted'>
            Le fil n’a pas pu être chargé. Réessaie dans un instant.
          </span>
        )}
        {state === 'more' && (
          <Button
            variant='secondary'
            class='self-center'
            onClick={() => loadGuestFeed(true)}
          >
            Voir les posts plus anciens
          </Button>
        )}
      </main>
    </Page>
  )
}

/** /post/:id: a post and its discussion, read without an account */
export const GuestPostPage = () => {
  const id = Number(url.relativePath.split('/')[2]?.replace(/^s/, '')) || 0
  const [thread, setThread] = useState<GuestThread | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setThread(null)
    setFailed(false)
    if (!id) return setFailed(true)
    readGuestThread(id).then(setThread, () => setFailed(true))
  }, [id])
  const root = thread?.posts.find((post) => post.id === thread.rootId)
  const replies = thread?.posts.filter((post) => post.id !== thread.rootId) ??
    []
  return (
    <Page title={root?.title || 'Discussion'} heading={false}>
      <PublicHeader />
      <main class='mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 pt-2 pb-[120px]'>
        <A href='feed' class='self-start text-[14px] font-semibold'>
          ← Le fil
        </A>
        <Invite />
        {failed && (
          <span class='text-[14px] text-ink-muted'>
            Cette discussion n’existe pas ou n’est plus visible.
          </span>
        )}
        {!thread && !failed && (
          <span class='text-[14px] text-ink-muted'>Chargement…</span>
        )}
        {root && <GuestPostCard post={root} inThread />}
        {replies.length > 0 && (
          <div class='ml-6 flex flex-col gap-3 border-l-2 border-line pl-4'>
            {replies.map((post) => (
              <GuestPostCard key={post.id} post={post} inThread />
            ))}
          </div>
        )}
      </main>
    </Page>
  )
}
