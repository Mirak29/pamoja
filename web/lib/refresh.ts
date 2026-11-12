import { signal } from '@preact/signals'
import { reloadHelpRequests } from '/web/lib/help.ts'
import { loadConversations } from '/web/lib/messages.ts'
import { loadNotifications } from '/web/lib/notifications.ts'
import { loadPosts } from '/web/lib/posts.ts'
import { loadProjects } from '/web/lib/session.ts'

// The menu item of the page one is on, tapped again (§12.2): back to the
// top of the page, its content read again. On a social network that is how
// one checks for news.

// What each main page reads again, by its section of the menu
const readAgain: Record<string, () => Promise<unknown>> = {
  '': () => Promise.all([loadPosts(), loadProjects(), reloadHelpRequests()]),
  explore: () => Promise.all([loadProjects(), reloadHelpRequests()]),
  projects: () => loadProjects(),
  help: () => reloadHelpRequests(),
  notifications: () => loadNotifications(),
  messages: () => loadConversations(),
}

/**
 * Back to the top of the page: from far down, a jump close to it then a
 * short glide, instead of a long one through the whole page
 */
export const toTop = () => {
  if (scrollY > innerHeight * 2) {
    scrollTo({ top: innerHeight, behavior: 'instant' })
  }
  scrollTo({ top: 0, behavior: 'smooth' })
}

/** A section reads its content again: a bar shows meanwhile */
export const refreshing = signal(false)

/** Back to the top of the page, and its news */
export const refreshSection = (section: string) => {
  toTop()
  const read = readAgain[section]
  if (!read || refreshing.peek()) return
  refreshing.value = true
  read().catch(() => {}).finally(() => refreshing.value = false)
}
