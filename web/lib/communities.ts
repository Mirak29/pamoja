import { api } from '/web/lib/api.ts'
import { CircleAlert } from '/web/assets/icons.tsx'
import { notify } from '/web/ui/toast.tsx'
import { me } from '/web/fixtures/people.ts'
import { type Community, toggleMembership } from '/web/fixtures/communities.ts'

// Joining or leaving a community persisted on the server (PAM-502): the page
// shows the change at once, then it is saved; a failure puts it back and says
// so. Membership feeds the live feed, since a community's posts reach the
// members the server reads from the database (§10.2, §13.2).

const failed = () =>
  notify({
    title: 'Adhésion non enregistrée',
    body: 'Pamoja n’a pas pu joindre le serveur. Réessaie dans un instant.',
    icon: CircleAlert,
    tone: 'danger',
  })

/** Join or leave a community */
export const joinOrLeave = (community: Community) => {
  toggleMembership(community, me)
  api['POST/api/community/join'].fetch({ slug: community.slug })
    .catch(() => {
      toggleMembership(community, me)
      failed()
    })
}
