import { signal } from '@preact/signals'

// The menu item of the page one is on, tapped again (§12.2): back to the
// top of the page, its content read again. On a social network that is how
// one checks for news. What each page reads is said by its menu item
// (navigation.tsx).

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

/** A page reads its content again: a bar shows meanwhile */
export const refreshing = signal(false)

/** Back to the top of the page, and its news when it has some to read */
export const refreshPage = (read?: () => Promise<unknown>) => {
  toTop()
  if (!read || refreshing.peek()) return
  refreshing.value = true
  read().catch(() => {}).finally(() => refreshing.value = false)
}
