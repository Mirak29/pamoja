import { api } from '/web/lib/api.ts'
import { notifyFailure } from '/web/lib/failure.ts'
import { me } from '/web/fixtures/people.ts'
import {
  acceptAnswer as acceptLocal,
  adoptReply,
  adoptThread,
  dropPost,
  type Post,
  replyTo as replyLocal,
  serverIdOf,
} from '/web/fixtures/posts.ts'

// Replies and accepted answers persisted on the server (PAM-512, §10.1):
// shown at once, then saved. A post of the demo, whose id is a fixture
// string, stays handled in the page.

/**
 * Replies to a post: shown at once; on a server post it is saved and takes
 * the id the server gave it, so a sub-reply or an accept works right away
 */
export const reply = (parent: Post, text: string): Post => {
  const local = replyLocal(parent, me.login, text)
  const postId = serverIdOf(parent.id)
  if (postId) {
    api['POST/api/post/reply'].fetch({ postId, body: text }).then(
      (saved) => adoptReply(local, saved),
      (error) => {
        dropPost(local)
        notifyFailure('Réponse non enregistrée', error)
      },
    )
  }
  return local
}

/** Accepts a reply as the answer; its author gains a proof of Entraide (§8) */
export const accept = (question: Post, answer: Post) => {
  acceptLocal(question, answer)
  const postId = serverIdOf(question.id)
  const replyId = serverIdOf(answer.id)
  if (postId && replyId) {
    api['POST/api/post/accept'].fetch({ postId, replyId }).catch((error) => {
      question.acceptedReply = undefined
      notifyFailure('Réponse non acceptée', error)
    })
  }
}

/** Loads a post and its whole thread from the server, for a shared link */
export const loadThread = (id: number) =>
  api['GET/api/post/thread'].fetch({ postId: String(id) }).then(
    adoptThread,
    () => {},
  )
