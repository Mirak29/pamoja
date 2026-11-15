// The README of a project, read for its page (§6.3): GitHub's Markdown as
// blocks the page draws as elements, never as an HTML string. Its HTML is
// cut down to what Markdown says (images, links, line breaks), then dropped.

export type Repo = { owner: string; name: string; branch: string }

export type Block =
  | { kind: 'heading'; level: number; text: string; id: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: { text: string; depth: number }[] }
  | { kind: 'code'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; head: string[]; align: Align[]; rows: string[][] }
  | { kind: 'rule' }

export type Align = 'left' | 'center' | 'right' | ''

const attr = (tag: string, name: string) =>
  tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  )
    ?.slice(1).find((v) => v !== undefined) ?? ''

/** GitHub's HTML in a README, said in Markdown, then the rest dropped */
const fromHtml = (text: string) =>
  text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const src = attr(tag, 'src')
      return src ? `![${attr(tag, 'alt')}](${src})` : ''
    })
    .replace(
      /<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
      (_, attrs, inner) => {
        const href = attr(` ${attrs}`, 'href')
        return href ? `[${inner.trim()}](${href})` : inner
      },
    )
    // A hard break, as Markdown writes it: two spaces before the end
    .replace(/<br\s*\/?>/gi, '  \n')
    .replace(
      /<\/?(p|div|h[1-6]|picture|source|details|summary)\b[^>]*>/gi,
      '\n',
    )
    .replace(/<\/?[a-z][^>]*>/gi, '')

/**
 * The id GitHub gives a heading, for the links of a table of contents:
 * lower case, punctuation and emoji gone, each space a hyphen
 */
export const slugOf = (text: string) =>
  plainOf(text).toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/ /g, '-')

/** The words of a line, without its Markdown */
export const plainOf = (text: string) =>
  text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()

const fence = /^\s*(```|~~~)/
const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const rule = /^\s*([-*_])(\s*\1){2,}\s*$/
const item = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/
const separator = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

const cells = (line: string) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '')
    .split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))

const alignOf = (cell: string): Align =>
  cell.startsWith(':') && cell.endsWith(':')
    ? 'center'
    : cell.endsWith(':')
    ? 'right'
    : cell.startsWith(':')
    ? 'left'
    : ''

/** The blocks of a README */
export const parseReadme = (readme: string): Block[] => {
  const blocks: Block[] = []
  const lines = fromHtml(readme.replace(/\r\n?/g, '\n')).split('\n')
  let i = 0
  const isBreak = (line: string) =>
    !line.trim() || fence.test(line) || heading.test(line) ||
    rule.test(line) || item.test(line) || line.trimStart().startsWith('>')
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (fence.test(line)) {
      const mark = line.trim().slice(0, 3)
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith(mark)) {
        code.push(lines[i++])
      }
      i++
      blocks.push({ kind: 'code', text: code.join('\n') })
      continue
    }
    const h = line.match(heading)
    if (h) {
      blocks.push({
        kind: 'heading',
        level: h[1].length,
        text: h[2],
        id: slugOf(h[2]),
      })
      i++
      continue
    }
    if (rule.test(line)) {
      blocks.push({ kind: 'rule' })
      i++
      continue
    }
    if (line.includes('|') && separator.test(lines[i + 1] ?? '')) {
      const head = cells(line)
      const align = cells(lines[i + 1]).map(alignOf)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(cells(lines[i++]))
      }
      blocks.push({ kind: 'table', head, align, rows })
      continue
    }
    if (line.trimStart().startsWith('>')) {
      const quote: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        quote.push(lines[i++].trimStart().replace(/^>\s?/, ''))
      }
      blocks.push({ kind: 'quote', text: quote.join(' ') })
      continue
    }
    const first = line.match(item)
    if (first) {
      const ordered = /\d/.test(first[2])
      const items: { text: string; depth: number }[] = []
      while (i < lines.length) {
        const m = lines[i].match(item)
        if (m) {
          items.push({
            text: m[3],
            depth: Math.min(
              3,
              Math.floor(m[1].replace(/\t/g, '  ').length / 2),
            ),
          })
          i++
        } else if (lines[i].trim() && /^\s/.test(lines[i]) && items.length) {
          // A line that goes on the item above
          items[items.length - 1].text += ' ' + lines[i++].trim()
        } else break
      }
      blocks.push({ kind: 'list', ordered, items })
      continue
    }
    const paragraph: string[] = []
    while (
      i < lines.length && !isBreak(lines[i]) &&
      !(lines[i].includes('|') && separator.test(lines[i + 1] ?? ''))
    ) {
      paragraph.push(lines[i++])
    }
    if (!paragraph.length) paragraph.push(lines[i++])
    // As on GitHub, a line break is a space, unless the line ends with two
    // spaces or a backslash: then it is kept
    const text = paragraph.map((line, n) =>
      n === paragraph.length - 1
        ? line.trim()
        : /( {2}|\\)$/.test(line)
        ? line.trim().replace(/\\$/, '') + '\n'
        : line.trim() + ' '
    ).join('')
    blocks.push({ kind: 'paragraph', text })
  }
  return blocks
}

/**
 * Where a link of the README leads: a web address as it is, a heading of
 * the README by its id, a file of the repository on GitHub; anything else
 * (`javascript:`, `data:`) is none, and stays text
 */
export const linkOf = (
  href: string,
  repo: Repo,
): { anchor: string } | { href: string } | undefined => {
  const target = href.trim()
  if (target.startsWith('#')) {
    return { anchor: decodeURIComponent(target.slice(1)) }
  }
  if (/^mailto:/i.test(target)) return { href: target }
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
    return /^https?:/i.test(target) ? { href: target } : undefined
  }
  if (target.startsWith('//')) return { href: `https:${target}` }
  if (!repo.owner || !repo.name) return undefined
  const path = target.replace(/^\.?\//, '')
  return {
    href: `https://github.com/${repo.owner}/${repo.name}/blob/${
      repo.branch || 'HEAD'
    }/${path}`,
  }
}

// Images are loaded from GitHub only: anywhere else would learn who reads
// the page, as GitHub's own proxy prevents on github.com
const IMAGE_HOSTS = new Set([
  'raw.githubusercontent.com',
  'github.com',
  'user-images.githubusercontent.com',
  'private-user-images.githubusercontent.com',
  'objects.githubusercontent.com',
  'avatars.githubusercontent.com',
  'camo.githubusercontent.com',
])

/** Where an image of the README is read from, or none */
export const imageOf = (src: string, repo: Repo) => {
  const target = src.trim()
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) {
    try {
      const url = new URL(target.startsWith('//') ? `https:${target}` : target)
      return url.protocol === 'https:' && IMAGE_HOSTS.has(url.hostname)
        ? url.href
        : undefined
    } catch {
      return undefined
    }
  }
  if (!repo.owner || !repo.name) return undefined
  const path = target.replace(/^\.?\//, '')
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${
    repo.branch || 'HEAD'
  }/${path}`
}
