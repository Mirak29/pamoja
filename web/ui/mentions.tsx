import type { ComponentChildren } from 'preact'
import { useEffect, useId, useRef } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { Avatar } from '/web/ui/avatar.tsx'

// @mentions while writing (§10.1): after an @, the developers to name, those
// followed first. Arrows, Enter or Tab pick one, Escape closes; a finger
// taps it. The text changes as if typed: the form keeps its own state.

type Suggestion = ApiOutput['GET/api/mentions'][number]

// The @ being typed, right before the caret: not inside an email
const TYPING = /(?:^|[^\w.@])@([A-Za-z0-9-]{0,39})$/

// What each query returned, for the time of the page
const known = new Map<string, Suggestion[]>()

const suggestionsFor = async (q: string) => {
  const key = q.toLowerCase()
  const hit = known.get(key)
  if (hit) return hit
  const found = await api['GET/api/mentions'].fetch({ q })
  known.set(key, found)
  return found
}

/**
 * Wraps a text field to suggest developers after an @. Its keys are read
 * before the field's own (capture), so Enter picks instead of sending.
 *
 * @example
 * <Mentions><textarea value={text} onInput={…} /></Mentions>
 */
export const Mentions = ({ children }: { children: ComponentChildren }) => {
  const wrap = useRef<HTMLDivElement>(null)
  const query = useSignal<string | null>(null)
  const items = useSignal<Suggestion[]>([])
  const active = useSignal(0)
  const above = useSignal(false)
  const id = useId()

  const field = () =>
    wrap.current?.querySelector<HTMLTextAreaElement>('textarea, input')

  const close = () => {
    query.value = null
    items.value = []
  }

  const pick = (login: string) => {
    const el = field()
    if (!el) return
    const caret = el.selectionStart ?? el.value.length
    const before = el.value.slice(0, caret)
    const at = before.lastIndexOf('@')
    const text = `${before.slice(0, at)}@${login} ${el.value.slice(caret)}`
    el.value = text
    const end = at + login.length + 2
    el.setSelectionRange(end, end)
    // The form hears it as typing, and keeps its own state
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.focus()
    close()
  }

  useEffect(() => {
    const host = wrap.current
    const el = field()
    if (!host || !el) return
    let timer = 0
    const look = () => {
      const caret = el.selectionStart ?? 0
      const match = el.value.slice(0, caret).match(TYPING)
      if (!match) return close()
      const q = match[1]
      if (q === query.peek()) return
      query.value = q
      clearTimeout(timer)
      timer = setTimeout(() => {
        suggestionsFor(q).then((found) => {
          // Only for what is still typed
          if (query.peek() !== q) return
          items.value = found
          active.value = 0
          // Near the bottom of the screen, the list opens above the field
          above.value = el.getBoundingClientRect().bottom + 300 > innerHeight
        }).catch(close)
      }, 120)
    }
    const keys = (event: KeyboardEvent) => {
      const list = items.peek()
      if (!list.length) return
      const move = (by: number) => {
        event.preventDefault()
        event.stopPropagation()
        active.value = (active.peek() + by + list.length) % list.length
      }
      if (event.key === 'ArrowDown') move(1)
      else if (event.key === 'ArrowUp') move(-1)
      else if (
        (event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab'
      ) {
        event.preventDefault()
        event.stopPropagation()
        pick(list[active.peek()].login)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }
    const leave = () => setTimeout(close, 150)
    el.addEventListener('input', look)
    el.addEventListener('click', look)
    el.addEventListener('blur', leave)
    host.addEventListener('keydown', keys, true)
    return () => {
      clearTimeout(timer)
      el.removeEventListener('input', look)
      el.removeEventListener('click', look)
      el.removeEventListener('blur', leave)
      host.removeEventListener('keydown', keys, true)
    }
  }, [])

  // The field says it suggests, and which one is chosen
  const open = items.value.length > 0
  useEffect(() => {
    const el = field()
    if (!el) return
    el.setAttribute('aria-autocomplete', 'list')
    el.setAttribute('aria-expanded', String(open))
    el.setAttribute('aria-controls', id)
    if (open) el.setAttribute('aria-activedescendant', `${id}-${active.value}`)
    else el.removeAttribute('aria-activedescendant')
  }, [open, active.value])

  return (
    <div ref={wrap} class='relative w-full'>
      {children}
      {open && (
        <ul
          id={id}
          role='listbox'
          aria-label='Développeurs à mentionner'
          class={`slab-pop absolute left-0 z-40 flex w-[min(300px,calc(100vw-2rem))] flex-col gap-0.5 p-1.5 ${
            above.value ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {items.value.map((item, i) => (
            <li
              key={item.login}
              id={`${id}-${i}`}
              role='option'
              aria-selected={i === active.value}
              // The field keeps the focus: a tap picks, the keyboard stays
              onPointerDown={(event) => {
                event.preventDefault()
                pick(item.login)
              }}
              onPointerEnter={() => active.value = i}
              class={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 ${
                i === active.value ? 'bg-indigo-soft' : ''
              }`}
            >
              <Avatar name={item.name} src={item.avatarUrl} size={28} />
              <span class='flex min-w-0 flex-col'>
                <span class='truncate text-[14px] leading-5 font-semibold'>
                  {item.name}
                </span>
                <span class='truncate font-mono text-[12px] leading-4 text-ink-muted'>
                  @{item.login}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
