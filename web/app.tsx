import { Fragment, h, type JSX, render } from 'preact'
import { url } from '@01edu/signal-router'
import { HelpPage } from '/web/pages/help/help-page.tsx'
import { HomePage } from '/web/pages/home/home-page.tsx'
import { NotificationsPage } from '/web/pages/notifications.tsx'
import { ProfileEditPage } from '/web/pages/profile/profile-edit.tsx'
import { PassportPage, ProfilePage } from '/web/pages/profile/profile-page.tsx'
import { ProjectPage } from '/web/pages/project/project-page.tsx'
import { ProjectsPage } from '/web/pages/projects/projects-page.tsx'
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
  dev: SoclePage,
  notifications: NotificationsPage,
  profil: ProfileEditPage,
  projet: ProjectPage,
  projets: ProjectsPage,
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
