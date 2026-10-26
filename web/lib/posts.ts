import { me } from '/web/fixtures/people.ts'
import {
  adoptPosts,
  type PostDraft,
  publishPost,
  savedId,
} from '/web/fixtures/posts.ts'
import { api } from '/web/lib/api.ts'

// Posts saved on the server with their images and their video (PAM-427);
// replies and reactions stay in the page until PAM-501

/** The latest posts, into the feed */
export const loadPosts = () =>
  api['GET/api/posts'].fetch().then(adoptPosts, () => {})

/** Publishes a post: saved by the server, then shown at once */
export const savePost = async (draft: PostDraft) => {
  const saved = await api['POST/api/post/create'].fetch({
    community: draft.community,
    type: draft.type,
    title: draft.title,
    body: draft.body,
    media: draft.media?.map((media) => media.id) ?? [],
    videoUrl: draft.video ?? '',
  })
  return publishPost({ ...draft, media: saved.media }, me, {
    id: savedId(saved.id),
    at: saved.createdAt * 1000,
  })
}
