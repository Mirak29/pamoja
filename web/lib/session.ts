import { computed, signal } from '@preact/signals'
import { api, type ApiOutput } from '/web/lib/api.ts'

// The signed in developer (§5.3): undefined until the server answered, null
// without a session
export const currentUser = signal<
  ApiOutput['GET/api/user/me'] | null | undefined
>(undefined)

export const signedIn = computed(() => !!currentUser.value)

api['GET/api/user/me'].fetch().then(
  (user) => currentUser.value = user,
  () => currentUser.value = null,
)

// The page asked for before the login, kept during the round trip to GitHub
const BACK_KEY = 'pamoja-login-back'

const remember = (back: string) => {
  try {
    sessionStorage.setItem(BACK_KEY, back)
  } catch {
    // Without storage, the login ends on the home page
  }
}

/** The page to open after the login: a path of this site only, never //host */
export const takeBack = () => {
  let back = ''
  try {
    back = sessionStorage.getItem(BACK_KEY) ?? ''
    sessionStorage.removeItem(BACK_KEY)
  } catch {
    return ''
  }
  return back.startsWith('/') && !back.startsWith('//') ? back.slice(1) : ''
}

/** Sends the browser to GitHub, or to the callback page in dev */
export const startLogin = async (back: string) => {
  remember(back)
  const { url } = await api['GET/api/auth/github'].fetch()
  location.href = new URL(url, document.baseURI).href
}

/** Ends the login with the code GitHub returned; true on the first login */
export const finishLogin = async (code: string, state: string) => {
  const { created, ...user } = await api['POST/api/auth/github/callback']
    .fetch({ code, state })
  currentUser.value = user
  return created
}

export const signOut = () => {
  currentUser.value = null
  // Signed out at once on this page; the server archives the session
  api['POST/api/auth/logout'].fetch().catch(() => {})
}
