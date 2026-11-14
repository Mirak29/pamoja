import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import { me } from '/web/fixtures/people.ts'
import {
  acceptAnswer as acceptLocal,
  adoptReply,
  adoptThread,
  dropPost,
  type Post,
  replyTo as replyLocal,
} from '/web/fixtures/posts.ts'

// Replies and accepted answers persisted on the server (PAM-512, §10.1):
// shown at once, then saved. A post of the demo, whose id is a fixture
// string, stays handled in the page.

const serverId = (id: string) => id.startsWith('s') ? Number(id.slice(1)) : NaN

const failed = () =>
  notify({
    title: 'Action non enregistrée',
    body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })

/**
 * Replies to a post: shown at once; on a server post it is saved and takes
 * the id the server gave it, so a sub-reply or an accept works right away
 */
export const reply = (parent: Post, text: string): Post => {
  const local = replyLocal(parent, me.login, text)
  const postId = serverId(parent.id)
  if (Number.isInteger(postId)) {
    api['POST/api/post/reply'].fetch({ postId, body: text }).then(
      (saved) => adoptReply(local, saved),
      () => {
        dropPost(local)
        failed()
      },
    )
  }
  return local
}

/** Accepts a reply as the answer; its author gains a proof of Entraide (§8) */
export const accept = (question: Post, answer: Post) => {
  acceptLocal(question, answer)
  const postId = serverId(question.id)
  const replyId = serverId(answer.id)
  if (Number.isInteger(postId) && Number.isInteger(replyId)) {
    api['POST/api/post/accept'].fetch({ postId, replyId }).catch(() => {
      question.acceptedReply = undefined
      failed()
    })
  }
}

/** Loads a post and its whole thread from the server, for a shared link */
export const loadThread = (id: number) =>
  api['GET/api/post/thread'].fetch({ postId: String(id) }).then(
    adoptThread,
    () => {},
  )
