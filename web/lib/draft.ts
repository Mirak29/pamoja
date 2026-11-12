import { useEffect, useState } from 'preact/hooks'

// Drafts (§12.2): a post or a message begun is not lost when one goes to
// another page and comes back. Kept for the tab of the browser only
// (sessionStorage), never sent anywhere.

const PREFIX = 'pamoja-draft:'

const read = (key: string) => {
  try {
    return sessionStorage.getItem(PREFIX + key) ?? ''
  } catch {
    return ''
  }
}

const write = (key: string, text: string) => {
  try {
    text
      ? sessionStorage.setItem(PREFIX + key, text)
      : sessionStorage.removeItem(PREFIX + key)
  } catch {
    // A private window may refuse it: the draft just is not kept
  }
}

/**
 * A text field whose value survives leaving the page; another key (another
 * conversation) has its own draft
 *
 * @example
 * const [text, setText] = useDraft(`message:${id}`)
 */
export const useDraft = (key: string) => {
  const [state, setState] = useState(() => ({ key, text: read(key) }))
  // Another key: its own draft
  const text = state.key === key ? state.text : read(key)
  useEffect(() => {
    state.key !== key && setState({ key, text })
  }, [key])
  // A text, or what to make of the current one, as with useState
  const set = (next: string | ((now: string) => string)) =>
    setState((was) => {
      const now = was.key === key ? was.text : read(key)
      const text = typeof next === 'function' ? next(now) : next
      write(key, text)
      return { key, text }
    })
  return [text, set] as const
}
