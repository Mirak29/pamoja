import { Fragment, h, type JSX, render } from 'preact'
import { url } from '@01edu/signal-router'
import { CommunitiesPage } from '/web/pages/communities/communities-page.tsx'
import { CommunityPage } from '/web/pages/communities/community-page.tsx'
import { ExplorePage } from '/web/pages/explore/explore-page.tsx'
import { HelpPage } from '/web/pages/help/help-page.tsx'
import { HomePage } from '/web/pages/home/home-page.tsx'
import { ModerationPage } from '/web/pages/moderation-page.tsx'
import { NotificationsPage } from '/web/pages/notifications.tsx'
import { ProfileEditPage } from '/web/pages/profile/profile-edit.tsx'
import { PassportPage, ProfilePage } from '/web/pages/profile/profile-page.tsx'
import { PostPage } from '/web/pages/post-page.tsx'
import { ProjectPage } from '/web/pages/project/project-page.tsx'
import { ProjectsPage } from '/web/pages/projects/projects-page.tsx'
import { SearchPage } from '/web/pages/search-page.tsx'
import { SettingsPage } from '/web/pages/settings-page.tsx'
import { SoclePage } from '/web/pages/socle.tsx'
import { AppLayout } from '/web/ui/layout.tsx'
import { UpcomingState } from '/web/ui/states.tsx'

Object.assign(globalThis, { h, Fragment })

// Pages by first path segment; each page reads the rest of its path
// (/projet/openpay-africa/pulse). A profile lives at /@login.
const routes: Record<string, () => JSX.Element | null> = {
  '': HomePage,
  '@': ProfilePage,
  aide: HelpPage,
  communaute: CommunityPage,
  communautes: CommunitiesPage,
  dev: SoclePage,
  explorer: ExplorePage,
  moderation: ModerationPage,
  notifications: NotificationsPage,
  post: PostPage,
  profil: ProfileEditPage,
  projet: ProjectPage,
  projets: ProjectsPage,
  recherche: SearchPage,
  reglages: SettingsPage,
}

const App = () => {
  const path = url.relativePath.slice(1)
  const section = path.startsWith('@') ? '@' : path.split('/')[0]
  // The passport is the profile seen without a session: no app shell
  if (section === '@' && url.params.vue === 'publique') return <PassportPage />
  const Route = routes[section]
  return (
    <AppLayout>
      {Route ? <Route /> : <UpcomingState path={path} />}
    </AppLayout>
  )
}

const root = document.getElementById('app')
if (!root) throw Error('unable to find root element #app')
render(<App />, root)
root.style.opacity = '1'
