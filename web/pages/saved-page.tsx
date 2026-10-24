import { isMe, me } from '/web/fixtures/people.ts'
import { posts, postsChanged } from '/web/fixtures/posts.ts'
import { Button } from '/web/ui/button.tsx'
import { Page } from '/web/ui/layout.tsx'
import { PostCard } from '/web/ui/post.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'

/** /saved: the posts kept with « Enregistrer », newest first (§6.2) */
export const SavedPage = () => {
  postsChanged.value
  const saved = posts
    .filter((post) =>
      post.bookmarks?.includes(me.login) && (!post.hidden || isMe(post.author))
    )
    .sort((a, b) => b.at - a.at)
  return (
    <Page title='Enregistrés' class='flex max-w-[720px] flex-col gap-5 pt-5'>
      {saved.map((post) => (
        <div key={post.id}>
          <PostCard post={post} />
        </div>
      ))}
      {!saved.length && (
        <GhostSlab>
          <EmptyState action={<Button href='.'>Retour au fil</Button>}>
            Rien d’enregistré pour l’instant. « Enregistrer » sous un post le
            garde ici.
          </EmptyState>
        </GhostSlab>
      )}
    </Page>
  )
}
