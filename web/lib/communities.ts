import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import { inOrder } from '/web/lib/in-order.ts'
import { me } from '/web/fixtures/people.ts'
import { type Community, setMembership } from '/web/fixtures/communities.ts'

// Joining or leaving a community persisted on the server (PAM-502). The
// page asks for the state it shows the opposite of, never for a toggle: a
// retry, or a second tab that saw an older state, cannot undo a join. It
// shows the change at once, then takes the state the server confirms; a
// failure puts it back. The communities joined come with the signed in
// developer (GET/api/user/me), so every session starts from the server.
// A community's posts then reach its members in real time (§10.2, §13.2).
//
// The count on the cards stays the page's own until the communities are
// read from the server (GET/api/communities): the server's count of a
// seeded community is not the one the demo shows.

const failed = () =>
  notify({
    title: 'Adhésion non enregistrée',
    body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })

/** Join a community, or leave it */
export const joinOrLeave = (community: Community) => {
  // The developer who clicked: an answer that comes once another one signed
  // in is not theirs
  const who = me.login
  const join = !me.communities.includes(community.slug)
  setMembership(community, me, join)
  // The writes about one community leave in order, the last one decides
  const { answer, current } = inOrder(
    `community:${community.slug}`,
    () => api['POST/api/community/join'].fetch({ slug: community.slug, join }),
  )
  answer.then(
    (saved) => {
      if (me.login === who && current()) {
        setMembership(community, me, saved.joined)
      }
    },
    () => {
      if (me.login !== who || !current()) return
      setMembership(community, me, !join)
      failed()
    },
  )
}
