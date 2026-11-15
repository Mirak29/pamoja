// The service worker of the installed app (PWA). Its version changes with
// each build (build-config.ts): the browser sees a new file, installs it,
// and it takes over at once; web/lib/pwa.ts then reloads the page when
// nobody is looking. It never touches /api (the event stream, the writes):
// the data is always the server's.
const VERSION = '__VERSION__'
const CACHE = `pamoja-${VERSION}`
// What the app needs to open without the network: its shell
const SHELL = ['/', '/index.js', '/manifest.webmanifest', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('pamoja-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        )
      )
      .then(() => self.clients.claim()),
  )
})

const keep = (request, response) => {
  if (response.ok) {
    const copy = response.clone()
    caches.open(CACHE).then((cache) => cache.put(request, copy))
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return

  // A page: the network first, so a new version shows at once; offline,
  // the shell, whose screens say what they cannot load
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/')),
    )
    return
  }

  // The chunks are named after their content: kept forever once read
  if (url.pathname.startsWith('/chunks/')) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit ?? fetch(request).then((response) => keep(request, response))
      ),
    )
    return
  }

  // The rest (the bundle, the icons): the network, the cache offline
  event.respondWith(
    fetch(request)
      .then((response) => keep(request, response))
      .catch(() => caches.match(request)),
  )
})
