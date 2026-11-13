import type { ComponentChildren } from 'preact'
import { A } from '/web/ui/link.tsx'
import { openSearch } from '/web/ui/command-palette.tsx'
import { memberLink, webHref } from '/web/lib/member-links.ts'

// What a member writes is text, never HTML (§10.1, §16). A small Markdown is
// read into elements, never into an HTML string, so nothing they write can
// run: **bold**, *italic*, `code`, [links](https://…), lists, quotes, code
// blocks. Bare links, @mentions and #hashtags lead somewhere too. Only http
// and https reach an href: `javascript:` and the like stay text. A link
// opens in a new tab, without access to the page, and is marked as written
// by a member (`memberLink`, §16).

const INLINE = new RegExp(
  [
    // `code`
    '`(?<code>[^`\\n]+)`',
    // [text](https://…)
    '\\[(?<label>[^\\]\\n]+)\\]\\((?<target>https?:\\/\\/[^\\s)]+)\\)',
    // **bold**
    '\\*\\*(?<bold>[^*\\n]+?)\\*\\*',
    // *italic* or _italic_, not inside a word
    '(?<![\\w*])\\*(?<star>[^*\\n]+?)\\*(?![\\w*])',
    '(?<![\\w_])_(?<under>[^_\\n]+?)_(?![\\w_])',
    // a bare web link
    '(?<url>https?:\\/\\/[^\\s<>"\'`]+|www\\.[^\\s<>"\'`]+)',
    // @login, not the middle of an email
    '(?<![\\w.@])@(?<login>[A-Za-z0-9][A-Za-z0-9-]{0,38})',
    // #hashtag, from a letter: « PR #8 » stays a number
    '(?<![\\w&#])#(?<tag>\\p{L}[\\p{L}\\p{N}_-]{0,49})',
  ].join('|'),
  'gu',
)

// The punctuation that ends a sentence is not part of a bare link
const TRAILING = /[.,;:!?)\]}'"»]+$/

const linkClass = 'underline decoration-1 underline-offset-2'

const codeClass =
  'rounded-sm bg-surface-200 px-[5px] py-px font-mono text-[0.87em] leading-5'

/** The inline Markdown of a line, as elements */
const inline = (text: string, depth = 0): ComponentChildren[] => {
  const parts: ComponentChildren[] = []
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    const g = match.groups!
    let end = match.index + match[0].length
    parts.push(text.slice(last, match.index))
    const key = `${depth}-${match.index}`
    if (g.code !== undefined) {
      parts.push(
        <code translate={false} key={key} class={codeClass}>{g.code}</code>,
      )
    } else if (g.label !== undefined) {
      const href = webHref(g.target)
      const label = depth < 2 ? inline(g.label, depth + 1) : g.label
      parts.push(
        href
          ? (
            <a
              translate={false}
              key={key}
              href={href}
              {...memberLink}
              class={linkClass}
            >
              {label}
            </a>
          )
          : match[0],
      )
    } else if (g.bold !== undefined) {
      parts.push(
        <strong translate={false} key={key} class='font-semibold'>
          {depth < 2 ? inline(g.bold, depth + 1) : g.bold}
        </strong>,
      )
    } else if (g.star !== undefined || g.under !== undefined) {
      const content = g.star ?? g.under
      parts.push(
        <em translate={false} key={key}>
          {depth < 2 ? inline(content, depth + 1) : content}
        </em>,
      )
    } else if (g.url !== undefined) {
      const trailing = g.url.match(TRAILING)?.[0] ?? ''
      const shown = g.url.slice(0, g.url.length - trailing.length)
      end -= trailing.length
      const href = webHref(
        shown.startsWith('www.') ? `https://${shown}` : shown,
      )
      parts.push(
        href
          ? (
            <a
              translate={false}
              key={key}
              href={href}
              {...memberLink}
              class={linkClass}
            >
              {shown}
            </a>
          )
          : shown,
      )
    } else if (g.login !== undefined) {
      parts.push(
        <A key={key} href={`@${g.login}`} class={linkClass}>@{g.login}</A>,
      )
    } else {
      const tag = g.tag
      parts.push(
        <button
          key={key}
          type='button'
          onClick={() => openSearch(tag)}
          class={`cursor-pointer text-indigo ${linkClass}`}
        >
          #{tag}
        </button>,
      )
    }
    last = end
  }
  parts.push(text.slice(last))
  return parts
}

/**
 * A short text a member wrote, on one or a few lines: inline Markdown,
 * line breaks kept. Never translated.
 *
 * @example
 * <RichText text='On obtient `database is locked` sous charge.' />
 */
export const RichText = ({ text }: { text: string }) => (
  <span translate={false} class='whitespace-pre-line wrap-anywhere'>
    {inline(text)}
  </span>
)

type Block =
  | { kind: 'code'; text: string }
  | { kind: 'paragraph' | 'heading' | 'quote'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }

const FENCE = /^\s*```/
const BULLET = /^\s*[-*+]\s+/
const NUMBER = /^\s*\d+[.)]\s+/
const QUOTE = /^\s*>\s?/
const HEADING = /^\s*#{1,6}\s+/

const starts = (line: string) =>
  FENCE.test(line) || BULLET.test(line) || NUMBER.test(line) ||
  QUOTE.test(line) || HEADING.test(line)

/** The blocks of a text: code, lists, quotes, headings and paragraphs */
const blocksOf = (text: string) => {
  const blocks: Block[] = []
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (FENCE.test(line)) {
      const code: string[] = []
      i++
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++])
      i++
      blocks.push({ kind: 'code', text: code.join('\n') })
    } else if (!line.trim()) {
      i++
    } else if (BULLET.test(line) || NUMBER.test(line)) {
      const ordered = NUMBER.test(line)
      const marker = ordered ? NUMBER : BULLET
      const items: string[] = []
      while (i < lines.length && marker.test(lines[i])) {
        items.push(lines[i++].replace(marker, ''))
      }
      blocks.push({ kind: 'list', ordered, items })
    } else if (QUOTE.test(line)) {
      const quoted: string[] = []
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push(lines[i++].replace(QUOTE, ''))
      }
      blocks.push({ kind: 'quote', text: quoted.join('\n') })
    } else if (HEADING.test(line)) {
      blocks.push({ kind: 'heading', text: line.replace(HEADING, '') })
      i++
    } else {
      const paragraph: string[] = []
      while (i < lines.length && lines[i].trim() && !starts(lines[i])) {
        paragraph.push(lines[i++])
      }
      blocks.push({ kind: 'paragraph', text: paragraph.join('\n') })
    }
  }
  return blocks
}

/**
 * A longer text a member wrote: posts, replies, messages, the description
 * of a help request. `code` sizes the code blocks.
 */
export const Markdown = (
  { text, class: className = 'gap-2.5', code = 'px-3.5 py-3 text-[13px]' }: {
    text: string
    class?: string
    code?: string
  },
) => (
  <div
    translate={false}
    class={`flex min-w-0 flex-col wrap-anywhere ${className}`}
  >
    {blocksOf(text).map((block, i) => {
      switch (block.kind) {
        case 'code':
          return (
            <pre
              translate={false}
              key={i}
              class={`overflow-x-auto rounded-md border border-line-strong bg-surface-000 font-mono leading-[21px] text-ink inset-shadow-well [overflow-wrap:normal] ${code}`}
            >
              {block.text}
            </pre>
          )
        case 'list': {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List
              translate={false}
              key={i}
              class={`flex flex-col gap-1 pl-5 ${
                block.ordered ? 'list-decimal' : 'list-disc'
              }`}
            >
              {block.items.map((item, j) => (
                <li translate={false} key={j} class='text-pretty'>
                  {inline(item)}
                </li>
              ))}
            </List>
          )
        }
        case 'quote':
          return (
            <blockquote
              translate={false}
              key={i}
              class='border-l-2 border-line-strong pl-3 whitespace-pre-line text-ink-muted'
            >
              {inline(block.text)}
            </blockquote>
          )
        case 'heading':
          return (
            <p translate={false} key={i} class='font-semibold'>
              {inline(block.text)}
            </p>
          )
        default:
          return (
            <p
              translate={false}
              key={i}
              class='whitespace-pre-line text-pretty'
            >
              {inline(block.text)}
            </p>
          )
      }
    })}
  </div>
)
