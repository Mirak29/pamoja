import type { ComponentChildren } from 'preact'
import { useMemo } from 'preact/hooks'
import { memberLink } from '/web/lib/member-links.ts'
import {
  type Block,
  imageOf,
  linkOf,
  parseReadme,
  type Repo,
  slugOf,
} from '/web/lib/readme.ts'
import { ScrollFrame } from '/web/ui/scroll-frame.tsx'

// The README of a project on its page (§6.3): drawn from its blocks as
// elements, so nothing it holds runs. Its headings keep GitHub's ids, under
// a prefix, so a table of contents scrolls the README instead of searching.

const PREFIX = 'readme-'

const INLINE = new RegExp(
  [
    '`(?<code>[^`\\n]+)`',
    // [![alt](image)](link): a badge or a screenshot that leads somewhere
    '\\[!\\[(?<balt>[^\\]]*)\\]\\((?<bsrc>[^)\\s]+)[^)]*\\)\\]\\((?<bhref>[^)\\s]+)[^)]*\\)',
    '!\\[(?<alt>[^\\]]*)\\]\\((?<src>[^)\\s]+)[^)]*\\)',
    '\\[(?<label>[^\\]\\n]+)\\]\\((?<href>[^)\\s]+)[^)]*\\)',
    // A numbered \1 would count the groups above: named, it is this one
    '(?<mark>\\*\\*|__)(?<bold>[^\\n]+?)\\k<mark>',
    '(?<![\\w*])\\*(?<star>[^*\\n]+?)\\*(?![\\w*])',
    '(?<![\\w_])_(?<under>[^_\\n]+?)_(?![\\w_])',
    '~~(?<strike>[^~\\n]+)~~',
    '(?<url>https?:\\/\\/[^\\s<>"\'`)\\]]+)',
  ].join('|'),
  'gu',
)

const linkClass = 'text-indigo underline decoration-1 underline-offset-2'

const scrollTo = (anchor: string) => (event: MouseEvent) => {
  event.preventDefault()
  document.getElementById(PREFIX + slugOf(anchor))?.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
    block: 'start',
  })
}

const Image = (
  { src, alt, repo }: { src: string; alt: string; repo: Repo },
) => {
  const url = imageOf(src, repo)
  return url
    ? (
      <img
        src={url}
        alt={alt}
        loading='lazy'
        referrerpolicy='no-referrer'
        class='inline-block max-h-[420px] max-w-full rounded-md align-middle'
      />
    )
    : <span class='text-ink-muted'>{alt}</span>
}

const Link = (
  { href, repo, children }: {
    href: string
    repo: Repo
    children: ComponentChildren
  },
) => {
  const target = linkOf(href, repo)
  if (!target) return <>{children}</>
  if ('anchor' in target) {
    return (
      <a
        href={`#${PREFIX}${slugOf(target.anchor)}`}
        onClick={scrollTo(target.anchor)}
        class={linkClass}
      >
        {children}
      </a>
    )
  }
  return <a href={target.href} {...memberLink} class={linkClass}>{children}</a>
}

/** The inline Markdown of a line, as elements */
const inline = (text: string, repo: Repo, depth = 0): ComponentChildren[] => {
  const parts: ComponentChildren[] = []
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    const g = match.groups!
    parts.push(text.slice(last, match.index))
    last = match.index + match[0].length
    const key = `${depth}-${match.index}`
    const inner = (s: string) => depth < 2 ? inline(s, repo, depth + 1) : s
    if (g.code !== undefined) {
      parts.push(
        <code
          key={key}
          translate={false}
          class='rounded-sm bg-surface-200 px-[5px] py-px font-mono text-[0.87em]'
        >
          {g.code}
        </code>,
      )
    } else if (g.bsrc !== undefined) {
      parts.push(
        <Link key={key} href={g.bhref} repo={repo}>
          <Image src={g.bsrc} alt={g.balt} repo={repo} />
        </Link>,
      )
    } else if (g.src !== undefined) {
      parts.push(<Image key={key} src={g.src} alt={g.alt} repo={repo} />)
    } else if (g.label !== undefined) {
      parts.push(
        <Link key={key} href={g.href} repo={repo}>{inner(g.label)}</Link>,
      )
    } else if (g.bold !== undefined) {
      parts.push(
        <strong key={key} class='font-semibold'>{inner(g.bold)}</strong>,
      )
    } else if (g.star !== undefined || g.under !== undefined) {
      parts.push(<em key={key}>{inner(g.star ?? g.under)}</em>)
    } else if (g.strike !== undefined) {
      parts.push(<s key={key}>{inner(g.strike)}</s>)
    } else if (g.url !== undefined) {
      parts.push(<Link key={key} href={g.url} repo={repo}>{g.url}</Link>)
    }
  }
  parts.push(text.slice(last))
  return parts
}

/** A paragraph keeps its line breaks */
const lines = (text: string, repo: Repo) =>
  text.split('\n').flatMap((line, i) =>
    i ? [<br key={`br-${i}`} />, ...inline(line, repo)] : inline(line, repo)
  )

const align = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  '': 'text-left',
}

const BlockView = ({ block, repo }: { block: Block; repo: Repo }) => {
  switch (block.kind) {
    case 'heading': {
      const Tag = block.level <= 2 ? 'h3' : 'h4'
      return (
        <Tag
          id={PREFIX + block.id}
          class={`scroll-mt-3 font-display font-semibold text-pretty ${
            block.level === 1
              ? 'mt-2 text-[22px] leading-[30px]'
              : block.level === 2
              ? 'mt-2 border-b border-line pb-1.5 text-[19px] leading-[28px]'
              : 'mt-1 text-[16px] leading-[24px]'
          }`}
        >
          {inline(block.text, repo)}
        </Tag>
      )
    }
    case 'paragraph':
      return <p class='text-pretty'>{lines(block.text, repo)}</p>
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul'
      return (
        <List
          class={`flex flex-col gap-1 pl-5 ${
            block.ordered ? 'list-decimal' : 'list-disc'
          } marker:text-ink-muted`}
        >
          {block.items.map((it, i) => (
            <li key={i} style={{ marginLeft: `${it.depth * 20}px` }}>
              {inline(
                it.text.replace(
                  /^\[( |x|X)\]\s+/,
                  (_, c) =>
                    c === ' ' ? '☐ ' : '☑ ',
                ),
                repo,
              )}
            </li>
          ))}
        </List>
      )
    }
    case 'code':
      return (
        <pre class='overflow-x-auto rounded-md bg-surface-200 px-3.5 py-3 font-mono text-[13px] leading-5'>
          <code translate={false}>{block.text}</code>
        </pre>
      )
    case 'quote':
      return (
        <blockquote class='border-l-2 border-line-strong pl-3.5 text-ink-muted'>
          {lines(block.text, repo)}
        </blockquote>
      )
    case 'rule':
      return <hr class='border-line' />
    case 'table':
      return (
        <div class='overflow-x-auto'>
          <table class='w-full border-collapse text-[14px] leading-[22px]'>
            <thead>
              <tr>
                {block.head.map((cell, i) => (
                  <th
                    key={i}
                    class={`border-b border-line-strong px-2.5 py-1.5 font-semibold ${
                      align[block.align[i] ?? '']
                    }`}
                  >
                    {inline(cell, repo)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {block.head.map((_, i) => (
                    <td
                      key={i}
                      class={`border-b border-line px-2.5 py-1.5 align-top ${
                        align[block.align[i] ?? '']
                      }`}
                    >
                      {inline(row[i] ?? '', repo)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

/** The whole README, scrolling inside its card */
export const Readme = ({ text, repo }: { text: string; repo: Repo }) => {
  const blocks = useMemo(() => parseReadme(text), [text])
  return (
    <ScrollFrame class='-mr-2 max-h-[560px] pr-3'>
      <div class='flex flex-col gap-3 text-[16px] leading-[26px] break-words'>
        {blocks.map((block, i) => (
          <BlockView key={i} block={block} repo={repo} />
        ))}
      </div>
    </ScrollFrame>
  )
}
