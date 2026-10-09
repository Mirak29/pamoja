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
import { ConnexionPage } from '/web/pages/public/connexion-page.tsx'
import { LandingPage } from '/web/pages/public/landing-page.tsx'
import { NotFoundPage } from '/web/pages/public/not-found-page.tsx'
import { OnboardingPage } from '/web/pages/public/onboarding-page.tsx'
import { SearchPage } from '/web/pages/search-page.tsx'
import { SettingsPage } from '/web/pages/settings-page.tsx'
import { SoclePage } from '/web/pages/socle.tsx'
import { signedIn } from '/web/fixtures/session.ts'
import { AppLayout } from '/web/ui/layout.tsx'

Object.assign(globalThis, { h, Fragment })

// Pages by first path segment; each page reads the rest of its path
// (/projet/openpay-africa/pulse). A profile lives at /@login. A page with
// a single address is listed by its full path.
const routes: Record<string, () => JSX.Element | null> = {
  '': HomePage,
  '@': ProfilePage,
  aide: HelpPage,
  communaute: CommunityPage,
  communautes: CommunitiesPage,
  dev: SoclePage,
  explorer: ExplorePage,
  onboarding: OnboardingPage,
  moderation: ModerationPage,
  notifications: NotificationsPage,
  post: PostPage,
  'profil/modifier': ProfileEditPage,
  projet: ProjectPage,
  projets: ProjectsPage,
  recherche: SearchPage,
  reglages: SettingsPage,
}

const routeOf = (key: string) =>
  Object.hasOwn(routes, key) ? routes[key] : undefined

const App = () => {
  const path = url.relativePath.slice(1)
  const section = path.startsWith('@') ? '@' : path.split('/')[0]
  const Route = routeOf(section) ?? routeOf(path)
  if (section === 'connexion') return <ConnexionPage />
  if (!signedIn.value) {
    // Without a session: the landing, the passports, and the login before
    // any page of the app
    if (section === '') return <LandingPage />
    if (section === '@') return <PassportPage />
    return Route ? <ConnexionPage /> : <NotFoundPage />
  }
  // The passport is the profile seen without a session: no app shell
  if (section === '@' && url.params.vue === 'publique') return <PassportPage />
  if (section === 'onboarding') return <OnboardingPage />
  if (!Route) return <NotFoundPage />
  return (
    <AppLayout>
      <Route />
    </AppLayout>
  )
}

const root = document.getElementById('app')
if (!root) throw Error('unable to find root element #app')
render(<App />, root)
root.style.opacity = '1'
