import { type ComponentChildren, options, type VNode } from 'preact'
import { effect, signal } from '@preact/signals'
import { english, englishTemplates } from '/web/lib/english.ts'

// The interface in French or in English (§2). French is the language of the
// code: each sentence of the interface is the key of its English. What
// developers write (names, titles, posts, messages) is never translated.

export type Language = 'fr' | 'en'
export type LanguagePreference = Language | 'system'

const fromSystem = (): Language => {
  // The server also loads this module (the seed reads the fixtures): always
  // French there, whatever the language of the machine
  if (!globalThis.document) return 'fr'
  const { languages = [], language = 'fr' } = navigator
  const preferred =
    languages.find((candidate) =>
      candidate.toLowerCase().startsWith('en') ||
      candidate.toLowerCase().startsWith('fr')
    ) ?? language
  return preferred.toLowerCase().startsWith('en') ? 'en' : 'fr'
}

const STORAGE_KEY = 'language'

// Storage may be refused (private window, blocked site data): the system
// language then applies, for this page only
const readStored = (): LanguagePreference => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'fr' || stored === 'en' ? stored : 'system'
  } catch {
    return 'system'
  }
}

const store = (preference: LanguagePreference) => {
  try {
    preference === 'system'
      ? localStorage.removeItem(STORAGE_KEY)
      : localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Kept for this page only
  }
}

const languageOf = (preference: LanguagePreference): Language =>
  preference === 'system' ? fromSystem() : preference

export const languagePreference = signal<LanguagePreference>(readStored())
export const language = signal<Language>(languageOf(languagePreference.peek()))

export const setLanguagePreference = (preference: LanguagePreference) => {
  store(preference)
  languagePreference.value = preference
  language.value = languageOf(preference)
}

// The system language changes, or another tab chose one
globalThis.addEventListener('languagechange', () => {
  language.value = languageOf(languagePreference.peek())
})
globalThis.addEventListener('storage', (event: StorageEvent) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return
  languagePreference.value = readStored()
  language.value = languageOf(languagePreference.peek())
})

effect(() => {
  if (globalThis.document) document.documentElement.lang = language.value
})

const missing = new Set<string>()
// In dev, a sentence without English is said once in the console
const warnMissing = (key: string) => {
  if (missing.has(key) || globalThis.location?.hostname !== 'localhost') return
  missing.add(key)
  console.warn(`[language] no English for: ${key}`)
}

/**
 * The English of a whole sentence of the interface, or the sentence itself.
 * Only an exact match is translated: a sentence written by a developer that
 * begins like one of the interface stays as written.
 */
export const translate = (value: string): string => {
  if (language.peek() !== 'en') return value
  const core = value.trim()
  const found = core ? english[core] : undefined
  if (found === undefined) return value
  const leading = value.slice(0, value.indexOf(core))
  return `${leading}${found}${value.slice(leading.length + core.length)}`
}

/**
 * A sentence with values, in the language of the interface. The values are
 * kept as they are: only the words of the code are translated.
 *
 * @example
 * t`Écrire à ${name}` // 'Write to Moussa' in English
 */
export const t = (parts: TemplateStringsArray, ...values: unknown[]) => {
  // Peeked, never subscribed: the whole app is rendered again on a change
  // (web/app.tsx), and a component that reads a signal is only rendered again
  // when its props change, which froze the screens fed by mutated data
  const current = language.peek()
  const french = parts.reduce(
    (text, part, i) => text + part + (i < values.length ? values[i] : ''),
    '',
  )
  if (current !== 'en') return french
  const key = parts.reduce(
    (text, part, i) => text + part + (i < values.length ? `{${i}}` : ''),
    '',
  )
  const found = englishTemplates[key]
  if (found === undefined) {
    warnMissing(key)
    return french
  }
  return found.replace(/\{(\d+)\}/g, (_, i) => String(values[Number(i)]))
}

/**
 * The parts of a line, joined by « · », the empty ones left out. They stay
 * apart so that each one is translated on its own: joined into one string,
 * « Review de code · Intermédiaire » matches no entry and stays in French.
 * A member's name or a project goes in a `translate={false}` span.
 *
 * @example
 * <span>{dotted([request.type, ago(request.at), request.level])}</span>
 */
export const dotted = (parts: ComponentChildren[]) =>
  parts.filter(Boolean).flatMap((part, i) => (i ? [' · ', part] : [part]))

// The props of an element that people read
const readable = ['aria-label', 'alt', 'placeholder', 'title']

const translateChildren = (children: unknown): unknown =>
  typeof children === 'string'
    ? translate(children)
    : Array.isArray(children)
    ? children.map(translateChildren)
    : children

// Every element created while English is on gets its text and readable props
// in English. Component props are left alone: they may hold content. The
// language is peeked, not read, for the reason given at `t`.
const previousVNode = options.vnode
options.vnode = (vnode: VNode) => {
  previousVNode?.(vnode)
  if (typeof vnode.type !== 'string') return
  if (language.peek() !== 'en') return
  const props = vnode.props as Record<string, unknown>
  // What a member wrote is never translated, even when it reads like a
  // sentence of the interface (« Merci », « Tests »)
  if (props.translate === false) return
  for (const name of readable) {
    if (typeof props[name] === 'string') {
      props[name] = translate(props[name] as string)
    }
  }
  props.children = translateChildren(props.children)
}
