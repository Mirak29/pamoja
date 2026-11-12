import { useState } from 'preact/hooks'
import { tabMemory } from '/web/lib/tab-memory.ts'

// Drafts (§12.2): a post or a message begun is not lost when one goes to
// another page and comes back, nor when the page reloads. Kept for the tab
// of the browser only, never sent anywhere.

const drafts = tabMemory<string>('draft')

/**
 * A text field whose value survives leaving the page. The component that
 * uses it is keyed by what it writes to (a conversation): another key is
 * another component, with its own draft.
 *
 * @example
 * const [text, setText] = useDraft(`message:${id}`)
 */
export const useDraft = (key: string) => {
  const [text, setText] = useState(() => drafts.get(key) ?? '')
  // A text, or what to make of the current one, as with useState
  const set = (next: string | ((now: string) => string)) =>
    setText((now) => {
      const value = typeof next === 'function' ? next(now) : next
      value ? drafts.set(key, value) : drafts.remove(key)
      return value
    })
  return [text, set] as const
}
