import { effect, signal } from '@preact/signals'
import { me } from '/web/fixtures/people.ts'
import { profileChanged, settingsOf } from '/web/fixtures/profile-settings.ts'
import { signedIn } from '/web/lib/session.ts'

// The whole app in the theme of one's profile (§9.2): its theme and accent
// (Terminal, Cyber, Vert…) carried by <body>, so every page follows, as the
// profile itself does. A profile of someone else keeps its own (it carries
// its own data-ptheme). Minimal Indigo is the app's own look: nothing
// changes for a profile never personalized. One can keep the app's look:
// a choice of this device, in its storage.

const KEY = 'pamoja-app-theme'

const read = () => {
  try {
    return localStorage.getItem(KEY) !== 'app'
  } catch {
    return true
  }
}

/** True: the app takes the theme of my profile; false: the app's own */
export const followsProfile = signal(read())

export const setFollowsProfile = (on: boolean) => {
  followsProfile.value = on
  try {
    localStorage.setItem(KEY, on ? 'profile' : 'app')
  } catch {
    // A private window: for this visit only
  }
}

effect(() => {
  profileChanged.value
  const body = document.body
  const { theme, accent } = signedIn.value && followsProfile.value
    ? settingsOf(me.login)
    : { theme: 'minimal', accent: 'indigo' }
  if (theme === 'minimal' && accent === 'indigo') {
    delete body.dataset.ptheme
    delete body.dataset.paccent
  } else {
    body.dataset.ptheme = theme
    body.dataset.paccent = accent
  }
})
