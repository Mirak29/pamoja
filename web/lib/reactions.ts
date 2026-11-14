import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import { me } from '/web/fixtures/people.ts'
import {
  adoptPosts,
  type Post,
  toggleBookmark as bookmarkLocal,
  toggleLike as likeLocal,
} from '/web/fixtures/posts.ts'

// Reactions and bookmarks persisted on the server (PAM-501): shown at once,
// then saved; a failure puts it back. A post of the demo, whose id is a
// fixture string, stays handled in the page (§10.1).

const serverId = (
  id: string,
) => (id.startsWith('s') ? Number(id.slice(1)) : NaN)

const failed = () =>
  notify({
    title: 'Action non enregistrée',
    body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })

/** « J'aime » on a post, or taken back: the only reaction (PAM-539) */
export const toggleLike = (post: Post) => {
  likeLocal(post, me.login)
  const postId = serverId(post.id)
  if (!Number.isInteger(postId)) return
  api['POST/api/reaction/toggle'].fetch({ postId, kind: 'like' }).catch(() => {
    likeLocal(post, me.login)
    failed()
  })
}

/** Save a post, or remove it from the saved ones */
export const toggleBookmark = (post: Post) => {
  bookmarkLocal(post, me.login)
  const postId = serverId(post.id)
  if (!Number.isInteger(postId)) return
  api['POST/api/bookmark/toggle'].fetch({ postId }).catch(() => {
    bookmarkLocal(post, me.login)
    failed()
  })
}

/** The posts the developer saved, for the « Enregistrés » page */
export const loadSaved = () =>
  api['GET/api/saved'].fetch().then(adoptPosts, () => {})
