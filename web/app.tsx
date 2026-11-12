import { Fragment, h, render } from 'preact'
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
import { NotFoundPage } from '/web/pages/public/not-found-page.tsx'
import { currentUser, signedIn } from '/web/lib/session.ts'
import { language, languageReady } from '/web/lib/language.ts'
import { lazyPage } from '/web/lib/lazy-page.ts'
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
// Each page is read at its first visit (lazy-page.ts)
const CommunitiesPage = lazyPage(() =>
  import('/web/pages/communities/communities-page.tsx').then((page) =>
    page.CommunitiesPage
  )
)
const CommunityPage = lazyPage(() =>
  import('/web/pages/communities/community-page.tsx').then((page) =>
    page.CommunityPage
  )
)
const ExplorePage = lazyPage(() =>
  import('/web/pages/explore/explore-page.tsx').then((page) => page.ExplorePage)
)
const HelpPage = lazyPage(() =>
  import('/web/pages/help/help-page.tsx').then((page) => page.HelpPage)
)
const HomePage = lazyPage(() =>
  import('/web/pages/home/home-page.tsx').then((page) => page.HomePage)
)
const ModerationPage = lazyPage(() =>
  import('/web/pages/moderation-page.tsx').then((page) => page.ModerationPage)
)
const MessagesPage = lazyPage(() =>
  import('/web/pages/messages-page.tsx').then((page) => page.MessagesPage)
)
const NotificationsPage = lazyPage(() =>
  import('/web/pages/notifications.tsx').then((page) => page.NotificationsPage)
)
const ProfileEditPage = lazyPage(() =>
  import('/web/pages/profile/profile-edit.tsx').then((page) =>
    page.ProfileEditPage
  )
)
const PassportPage = lazyPage(() =>
  import('/web/pages/profile/profile-page.tsx').then((page) =>
    page.PassportPage
  )
)
const ProfilePage = lazyPage(() =>
  import('/web/pages/profile/profile-page.tsx').then((page) => page.ProfilePage)
)
const PostPage = lazyPage(() =>
  import('/web/pages/post-page.tsx').then((page) => page.PostPage)
)
const ProjectPage = lazyPage(() =>
  import('/web/pages/project/project-page.tsx').then((page) => page.ProjectPage)
)
const ProjectsPage = lazyPage(() =>
  import('/web/pages/projects/projects-page.tsx').then((page) =>
    page.ProjectsPage
  )
)
const ConnexionPage = lazyPage(() =>
  import('/web/pages/public/connexion-page.tsx').then((page) =>
    page.ConnexionPage
  )
)
const InstallationReturn = lazyPage(() =>
  import('/web/pages/public/installation-return.tsx').then((page) =>
    page.InstallationReturn
  )
)
const LandingPage = lazyPage(() =>
  import('/web/pages/public/landing-page.tsx').then((page) => page.LandingPage)
)
const OnboardingPage = lazyPage(() =>
  import('/web/pages/public/onboarding-page.tsx').then((page) =>
    page.OnboardingPage
  )
)
const SavedPage = lazyPage(() =>
  import('/web/pages/saved-page.tsx').then((page) => page.SavedPage)
)
const SearchPage = lazyPage(() =>
  import('/web/pages/search-page.tsx').then((page) => page.SearchPage)
)
const SettingsPage = lazyPage(() =>
  import('/web/pages/settings-page.tsx').then((page) => page.SettingsPage)
)
const SoclePage = lazyPage(() =>
  import('/web/pages/socle.tsx').then((page) => page.SoclePage)
)

const routes: Record<string, ReturnType<typeof lazyPage>> = {
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

// The page asked for is read while the session is: they come together.
// Without a session, the address of the feed is the landing.
const section = url.relativePath.slice(1)
routeOf(section.startsWith('@') ? '@' : section.split('/')[0])?.preload()
section === '' && LandingPage.preload()
section.startsWith('login') && ConnexionPage.preload()

const root = document.getElementById('app')
if (!root) throw Error('unable to find root element #app')
// In English, once its words are in: never a French flash
await languageReady
render(<App />, root)
root.style.opacity = '1'

// The other pages, once the first is drawn and the browser is idle: a
// click then opens its page at once, as if it were in the app
const preloadAll = () => {
  for (const page of Object.values(routes)) page.preload()
  LandingPage.preload()
  ConnexionPage.preload()
}
'requestIdleCallback' in globalThis
  ? requestIdleCallback(preloadAll, { timeout: 5000 })
  : setTimeout(preloadAll, 2000)
