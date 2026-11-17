import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { parseHTML } from 'npm:linkedom@0.18.12'

// The demo button and the first read of the session (PAM-127): whoever the
// page knew when the demo answers is replaced, and the page has to know it

const user = (userId: number, login: string, demoAccount: boolean) => ({
  userId,
  moderator: false,
  demoAccount,
  login,
  githubLogin: login,
  avatarUrl: '',
  displayName: login,
  headline: '',
  bio: '',
  country: '',
  city: '',
  website: '',
  cover: '',
  theme: 'minimal',
  accent: 'indigo',
  sectionOrder: [],
  featured: [],
  matchingMode: 'instant',
  minScore: 50,
  helpTypes: [],
  onlySkills: [],
  onlyProjects: [],
  onlyCommunities: [],
  skills: [],
  domains: [],
  intents: [],
  communities: [],
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

Deno.test({
  name:
    'session: the demo replaces whoever the first read named while it was on its way',
  // The modules of the page keep timers and listeners of their own
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { document, window } = parseHTML(
      '<html><head><base href="http://localhost/"></head><body></body></html>',
    )
    const storage = () => {
      const map = new Map<string, string>()
      return {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => map.set(key, value),
        removeItem: (key: string) => map.delete(key),
      }
    }
    // The answers of the server, given when the test decides
    const me = Promise.withResolvers<Response>()
    const demo = Promise.withResolvers<Response>()
    const asked: string[] = []
    const replacements: Record<string, unknown> = {
      document,
      window,
      navigator: { languages: ['fr-FR'], language: 'fr-FR' },
      location: Object.assign(new URL('http://localhost/login'), {
        assign: () => {},
        replace: () => {},
        reload: () => {},
      }),
      history: {
        state: null,
        scrollRestoration: 'auto',
        pushState: () => {},
        replaceState: () => {},
      },
      localStorage: storage(),
      sessionStorage: storage(),
      matchMedia: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      EventSource: class {
        static CLOSED = 2
        readyState = 0
        addEventListener() {}
        close() {}
      },
      fetch: (input: string | URL | Request) => {
        const path = new URL(
          input instanceof Request ? input.url : String(input),
        ).pathname
        asked.push(path)
        if (path === '/api/user/me') return me.promise
        if (path === '/api/auth/demo') return demo.promise
        // What a signed in page reads next: none of it matters here
        return Promise.resolve(json({ message: 'Not in this test' }, 401))
      },
    }
    const originals = Object.getOwnPropertyDescriptors(globalThis)
    for (const [key, value] of Object.entries(replacements)) {
      Object.defineProperty(globalThis, key, { value, configurable: true })
    }
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
    try {
      const { currentUser, startDemo } = await import('./session.ts')
      // The login page is shown before the server said who is signed in
      assertEquals(currentUser.peek(), undefined)
      const opening = startDemo()
      await settle()
      assertEquals(asked.includes('/api/auth/demo'), true)
      // The first read answers while the demo is on its way: someone was
      // signed in, and the page now knows them
      me.resolve(json(user(1, 'abdou', false)))
      await settle()
      assertEquals(currentUser.peek()?.login, 'abdou')
      demo.resolve(json(user(2, 'fatou', true)))
      // The demo took their place: the page must load again
      assertEquals(await opening, true)
      assertEquals(currentUser.peek()?.login, 'fatou')
    } finally {
      await settle()
      for (const key of Object.keys(replacements)) {
        const original = originals[key]
        if (original) Object.defineProperty(globalThis, key, original)
        else delete (globalThis as Record<string, unknown>)[key]
      }
    }
  },
})
