import { signal } from '@preact/signals'

// The installed app (PWA): the service worker (web/assets/pwa/sw.js), the
// updates it brings, and the install, on any device. Production only: in
// dev the service worker would keep code the live reload replaces.

// Set by the build (build-config.ts): true in dev
declare const DEV_PAGES: boolean

/** The event Chromium browsers give before they offer to install */
type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const ua = navigator.userAgent

/** Where the page runs, to say how to install it there */
export const device = /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  ? 'ios'
  : /Android/.test(ua)
  ? 'android'
  : 'desktop'

export const browser = /Edg\//.test(ua)
  ? 'edge'
  : /Firefox|FxiOS/.test(ua)
  ? 'firefox'
  : /SamsungBrowser/.test(ua)
  ? 'samsung'
  : /Chrome|Chromium|CriOS/.test(ua)
  ? 'chrome'
  : /Safari/.test(ua)
  ? 'safari'
  : 'other'

const standalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as { standalone?: boolean }).standalone === true

/** The app runs installed, in its own window */
export const installed = signal(standalone())

/** The browser's own install offer, while it has one to give */
export const installPrompt = signal<InstallPrompt | null>(null)

/** A new version took over: the page reloads when nobody is looking */
export const updated = signal(false)

/** Shows the browser's install offer; true once installed */
export const install = async () => {
  const offer = installPrompt.peek()
  if (!offer) return false
  await offer.prompt()
  const { outcome } = await offer.userChoice
  installPrompt.value = null
  return outcome === 'accepted'
}

/** Reloads on the new version now */
export const reloadNow = () => location.reload()

/**
 * Listens for the install offer and registers the service worker. Called
 * once, as the app starts: the offer comes early and only once.
 */
export const startPwa = () => {
  addEventListener('beforeinstallprompt', (event) => {
    // Kept for « Installer l'app », instead of the browser's own banner
    event.preventDefault()
    installPrompt.value = event as InstallPrompt
  })
  addEventListener('appinstalled', () => {
    installed.value = true
    installPrompt.value = null
  })
  matchMedia('(display-mode: standalone)').addEventListener(
    'change',
    () => installed.value = standalone(),
  )

  if (DEV_PAGES || !('serviceWorker' in navigator)) return
  const sw = navigator.serviceWorker
  // The first service worker of a browser takes over a page that already
  // runs the current code: nothing to reload then
  let current = !!sw.controller
  sw.addEventListener('controllerchange', () => {
    if (!current) {
      current = true
      return
    }
    updated.value = true
    // What someone is typing is never lost: the reload waits until the
    // page is hidden (another tab, the app in the background)
    if (document.visibilityState === 'hidden') reloadNow()
    else {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') reloadNow()
      })
    }
  })
  sw.register('/sw.js').then((registration) => {
    // A new version is looked for on each return to the app, and every
    // half hour for a window left open
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {})
      }
    })
    setInterval(() => registration.update().catch(() => {}), 30 * 60_000)
  }).catch(() => {})
}
