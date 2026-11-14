import { api } from '/web/lib/api.ts'
import { notifyFailure } from '/web/lib/failure.ts'
import { me } from '/web/fixtures/people.ts'
import {
  adoptPosts,
  type Post,
  serverIdOf,
  toggleBookmark as bookmarkLocal,
  toggleLike as likeLocal,
} from '/web/fixtures/posts.ts'

// Reactions and bookmarks persisted on the server (PAM-501): shown at once,
// then saved; a failure puts it back. A post of the demo, whose id is a
// fixture string, stays handled in the page (§10.1).

/** « J'aime » on a post, or taken back: the only reaction (PAM-539) */
export const toggleLike = (post: Post) => {
  likeLocal(post, me.login)
  const postId = serverIdOf(post.id)
  if (!postId) return
  api['POST/api/reaction/toggle'].fetch({ postId, kind: 'like' }).catch(
    (error) => {
      likeLocal(post, me.login)
      notifyFailure('Action non enregistrée', error)
    },
  )
}

/** Save a post, or remove it from the saved ones */
export const toggleBookmark = (post: Post) => {
  bookmarkLocal(post, me.login)
  const postId = serverIdOf(post.id)
  if (!postId) return
  api['POST/api/bookmark/toggle'].fetch({ postId }).catch((error) => {
    bookmarkLocal(post, me.login)
    notifyFailure('Action non enregistrée', error)
  })
}

/** The posts the developer saved, for the « Enregistrés » page */
export const loadSaved = () =>
  api['GET/api/saved'].fetch().then(adoptPosts, () => {})
