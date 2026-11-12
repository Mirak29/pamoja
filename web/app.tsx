import { Fragment, h, type JSX, render } from 'preact'
// Links leaving Pamoja open in a new tab, everywhere
import '/web/lib/external-links.ts'
// A frame at its end gives the rest of the gesture to the page (§12.7)
import '/web/lib/scroll-handoff.ts'
import '/web/lib/scroll-position.ts'
// Projects and help requests follow their entries, without a refresh
import '/web/lib/live-data.ts'
// The notifications of the server, and their toast (§7.4)
import '/web/lib/notifications.ts'
// Direct messages, their counter and their toast (§10.6)
import '/web/lib/messages.ts'
import { effect } from '@preact/signals'
import { navigate, url } from '@01edu/signal-router'
import { englishAddress } from '/web/lib/addresses.ts'
import { CommunitiesPage } from '/web/pages/communities/communities-page.tsx'
import { CommunityPage } from '/web/pages/communities/community-page.tsx'
import { ExplorePage } from '/web/pages/explore/explore-page.tsx'
import { HelpPage } from '/web/pages/help/help-page.tsx'
import { HomePage } from '/web/pages/home/home-page.tsx'
import { ModerationPage } from '/web/pages/moderation-page.tsx'
import { MessagesPage } from '/web/pages/messages-page.tsx'
import { NotificationsPage } from '/web/pages/notifications.tsx'
import { ProfileEditPage } from '/web/pages/profile/profile-edit.tsx'
import { PassportPage, ProfilePage } from '/web/pages/profile/profile-page.tsx'
import { PostPage } from '/web/pages/post-page.tsx'
import { ProjectPage } from '/web/pages/project/project-page.tsx'
import { ProjectsPage } from '/web/pages/projects/projects-page.tsx'
import { ConnexionPage } from '/web/pages/public/connexion-page.tsx'
import { InstallationReturn } from '/web/pages/public/installation-return.tsx'
import { LandingPage } from '/web/pages/public/landing-page.tsx'
import { NotFoundPage } from '/web/pages/public/not-found-page.tsx'
import { OnboardingPage } from '/web/pages/public/onboarding-page.tsx'
import { SavedPage } from '/web/pages/saved-page.tsx'
import { SearchPage } from '/web/pages/search-page.tsx'
import { SettingsPage } from '/web/pages/settings-page.tsx'
import { SoclePage } from '/web/pages/socle.tsx'
import { currentUser, signedIn } from '/web/lib/session.ts'
import { language } from '/web/lib/language.ts'
import { AppLayout } from '/web/ui/layout.tsx'

Object.assign(globalThis, { h, Fragment })

// An old French address (a shared link, a bookmark) is replaced by its
// English one before any page shows, without a step in the history (PAM-125)
effect(() => {
  const to = englishAddress(`${url.relativePath}${url.value.search}`)
  to && navigate({ href: to.slice(1), replace: true })
})

// Pages by first path segment; each page reads the rest of its path
// (/project/openpay-africa/pulse). A profile lives at /@login. A page with
// a single address is listed by its full path. Addresses are in English;
// the French ones of the first versions are redirected (PAM-125).
const routes: Record<string, () => JSX.Element | null> = {
  '': HomePage,
  '@': ProfilePage,
  help: HelpPage,
  community: CommunityPage,
  communities: CommunitiesPage,
  saved: SavedPage,
  dev: SoclePage,
  explore: ExplorePage,
  onboarding: OnboardingPage,
  moderation: ModerationPage,
  messages: MessagesPage,
  notifications: NotificationsPage,
  post: PostPage,
  'profile/edit': ProfileEditPage,
  project: ProjectPage,
  projects: ProjectsPage,
  search: SearchPage,
  settings: SettingsPage,
}

const routeOf = (key: string) =>
  Object.hasOwn(routes, key) ? routes[key] : undefined

const Pages = () => {
  const path = url.relativePath.slice(1)
  const section = path.startsWith('@') ? '@' : path.split('/')[0]
  const Route = routeOf(section) ?? routeOf(path)
  // GitHub returns to /login/github after a login, or after the
  // installation of the app (§5.4), with an installation_id
  if (
    section === 'login' &&
    (url.params.installation_id || url.params.setup_action)
  ) return <InstallationReturn />
  if (section === 'login') return <ConnexionPage />
  // Until the server says who is signed in, neither the landing nor the app
  if (currentUser.value === undefined) return null
  if (!signedIn.value) {
    // Without a session: the landing, the passports, and the login before
    // any page of the app
    if (section === '') return <LandingPage />
    if (section === '@') return <PassportPage />
    return Route ? <ConnexionPage /> : <NotFoundPage />
  }
  // The passport is the profile seen without a session: no app shell
  if (section === '@' && url.params.view === 'public') return <PassportPage />
  if (section === 'onboarding') return <OnboardingPage />
  if (!Route) return <NotFoundPage />
  return (
    <AppLayout>
      <Route />
    </AppLayout>
  )
}

/**
 * The whole app is built again when the language changes, so that every
 * sentence is translated at once. No component reads the language itself:
 * @preact/signals would then render it again only when its props change,
 * and screens fed by mutated data (applications, notifications) froze.
 */
const App = () => <Pages key={language.value} />

const root = document.getElementById('app')
if (!root) throw Error('unable to find root element #app')
render(<App />, root)
root.style.opacity = '1'
