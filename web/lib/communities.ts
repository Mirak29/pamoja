import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import { setInOrder } from '/web/lib/in-order.ts'
import { me, type Person } from '/web/fixtures/people.ts'
import {
  adoptCommunities,
  type Community,
  type CommunityType,
  createCommunity as createLocal,
  setMembership,
} from '/web/fixtures/communities.ts'

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

// The type of a community, stored in English on the server (§10.2, §12.2)
const typeKeys: Record<CommunityType, string> = {
  Technologie: 'technology',
  Pays: 'country',
  Domaine: 'domain',
}

const createFailed = () =>
  notify({
    title: 'Communauté non créée',
    body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })

/**
 * Creates a community on the server, then in the page with the slug it gave:
 * its creator joins and moderates it. Null when the server refused.
 */
export const createCommunity = async (
  draft: Pick<Community, 'name' | 'type' | 'description'>,
  person: Person,
) => {
  try {
    const saved = await api['POST/api/community/create'].fetch({
      name: draft.name,
      type: typeKeys[draft.type],
      description: draft.description,
    })
    return createLocal(draft, person, { slug: saved.slug })
  } catch {
    createFailed()
    return null
  }
}

/** Reads every community from the server into the pages, newest kept */
export const loadCommunities = () =>
  api['GET/api/communities'].fetch().then(adoptCommunities, () => {})

/** Join a community, or leave it */
export const joinOrLeave = (community: Community) =>
  setInOrder(
    `community:${community.slug}`,
    !me.communities.includes(community.slug),
    {
      who: () => me.login,
      show: (join) => setMembership(community, me, join),
      send: (join) =>
        api['POST/api/community/join'].fetch({ slug: community.slug, join })
          .then((saved) => saved.joined),
      failed,
    },
  )
