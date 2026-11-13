import { counted } from '/web/lib/plural.ts'
import { signal } from '@preact/signals'
import type { JSX } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { navigate } from '@01edu/signal-router'
import { A } from '/web/ui/link.tsx'
import {
  FolderGit2,
  LifeBuoy,
  MessageSquare,
  Search,
  Tag,
  Users,
} from '/web/assets/icons.tsx'
import { communities, type Community } from '/web/fixtures/communities.ts'
import { type HelpRequest, helpRequests } from '/web/fixtures/help.ts'
import { type Login, people, type Person } from '/web/fixtures/people.ts'
import { type Post, posts, savedId } from '/web/fixtures/posts.ts'
import {
  type Project,
  projects,
  type ProjectSlug,
} from '/web/fixtures/projects.ts'
import { helpCategories, type HelpCategory } from '/api/vocabulary.ts'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { skills } from '/web/fixtures/skills.ts'
import { fuzzyMatch } from '/web/lib/fuzzy.ts'
import { initials } from '/web/ui/avatar.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { t } from '/web/lib/language.ts'

export const paletteOpen = signal(false)
const query = signal('')
const active = signal(0)

/** Opens the search on a text: a #hashtag of a post */
export const openSearch = (text: string) => {
  query.value = text
  active.value = 0
  paletteOpen.value = true
}

addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    paletteOpen.value = !paletteOpen.peek()
    return
  }
  // Letters typed right after ⌘K, before the field is drawn, are kept
  const field = document.getElementById('palette-input')
  if (
    paletteOpen.peek() && document.activeElement !== field &&
    event.key.length === 1 && !event.metaKey && !event.ctrlKey &&
    !event.altKey
  ) {
    event.preventDefault()
    query.value += event.key
    active.value = 0
    field?.focus()
  }
})

type Result = {
  title: string
  sub: string
  href: string
  lead: JSX.Element | string
  round?: boolean
}

// One result of each kind, from what the page knows of it: the server only
// says which ones match, the page draws them as it draws them elsewhere
const ofPerson = (p: Person): Result => ({
  title: p.name,
  sub: `@${p.login} · ${p.city}, ${p.country} · ${p.skills.join(', ')}`,
  href: `@${p.login}`,
  lead: initials(p.name),
  round: true,
})
const ofProject = (p: Project): Result => ({
  title: p.name,
  sub: `${p.stack.join(', ')} · ${p.description}`,
  href: `project/${p.slug}`,
  lead: <FolderGit2 class='size-3.5' />,
})
const ofCommunity = (c: Community): Result => ({
  title: c.name,
  sub: `${c.type} · ${counted(c.members, 'membre')}`,
  href: `community/${c.slug}`,
  lead: <Users class='size-3.5' />,
})
const excerpt = (title: string, body: string) =>
  title || (body.length > 80 ? `${body.slice(0, 78)}…` : body)
const ofPost = (p: Post): Result => ({
  title: excerpt(p.title, p.body),
  sub: [
    p.type,
    people[p.author]?.name,
    communities.find((c) => c.slug === p.community)?.name,
  ].filter(Boolean).join(' · '),
  href: `post/${p.id}`,
  lead: <MessageSquare class='size-3.5' />,
})
const ofHelp = (help: HelpRequest): Result => ({
  title: help.title,
  sub: `${help.type}${
    help.project ? ` · ${projects[help.project]?.name ?? help.project}` : ''
  }`,
  href: `help/${help.id}`,
  lead: <LifeBuoy class='size-3.5' />,
})

// What the server found, as results. Known to the page: drawn from it;
// new to it (someone who just joined): drawn from what the server sent.
type Found = ApiOutput['GET/api/search']
const COMMUNITY_TYPES: Record<string, string> = {
  technology: 'Technologie',
  country: 'Pays',
  domain: 'Domaine',
}
const fromServer = (found: Found) => ({
  developers: found.developers.map((d): Result =>
    Object.hasOwn(people, d.login) ? ofPerson(people[d.login as Login]) : {
      title: d.name,
      sub: [
        `@${d.login}`,
        [d.city, d.country].filter(Boolean).join(', '),
        d.skills.join(', '),
      ].filter(Boolean).join(' · '),
      href: `@${d.login}`,
      lead: initials(d.name),
      round: true,
    }
  ),
  projects: found.projects.map((p): Result =>
    Object.hasOwn(projects, p.slug)
      ? ofProject(projects[p.slug as ProjectSlug])
      : {
        title: p.name,
        sub: [p.skills.join(', '), p.description].filter(Boolean).join(' · '),
        href: `project/${p.slug}`,
        lead: <FolderGit2 class='size-3.5' />,
      }
  ),
  communities: found.communities.map((c): Result => {
    const known = communities.find((k) => k.slug === c.slug)
    return known ? ofCommunity(known) : {
      title: c.name,
      sub: `${COMMUNITY_TYPES[c.type] ?? c.type} · ${
        counted(c.members, 'membre')
      }`,
      href: `community/${c.slug}`,
      lead: <Users class='size-3.5' />,
    }
  }),
  posts: found.posts.map((p): Result => ({
    title: excerpt(p.title, p.body),
    sub: [p.type, p.author, p.community].filter(Boolean).join(' · '),
    href: `post/${savedId(p.id)}`,
    lead: <MessageSquare class='size-3.5' />,
  })),
  help: found.help_requests.map((help): Result => ({
    title: help.title,
    sub: [
      helpCategories[help.category as HelpCategory] ?? help.category,
      help.project,
    ].filter(Boolean).join(' · '),
    href: `help/${help.id}`,
    lead: <LifeBuoy class='size-3.5' />,
  })),
})

/**
 * The results of a search, `limit` of each kind. With what the server
 * found (§10.4), the demo posts and requests, which only the page has, are
 * added to it; without (no answer yet, offline), the page searches alone.
 */
export const search = (query: string, limit: number, found?: Found) => {
  const server = found && fromServer(found)
  const demoPosts = posts.filter((p) =>
    !p.parent && !p.hidden && (!found || p.demo) &&
    fuzzyMatch(query, [p.title, p.body, p.type].join(' '))
  ).map(ofPost)
  const demoHelp = helpRequests.filter((help) =>
    (!found || help.demo) &&
    fuzzyMatch(query, [help.title, help.type, ...help.skills].join(' '))
  ).map(ofHelp)
  const groups: [string, Result[]][] = [
    [
      'Développeurs',
      server?.developers ?? Object.values(people)
        .filter((p) =>
          fuzzyMatch(
            query,
            [p.name, p.login, p.city, p.country, p.role, ...p.skills].join(' '),
          )
        )
        .map(ofPerson),
    ],
    [
      'Projets',
      server?.projects ?? Object.values(projects)
        .filter((p) =>
          fuzzyMatch(query, [p.name, p.description, ...p.stack].join(' '))
        )
        .map(ofProject),
    ],
    [
      'Communautés',
      server?.communities ?? communities
        .filter((c) => fuzzyMatch(query, `${c.name} ${c.type}`))
        .map(ofCommunity),
    ],
    ['Posts', [...(server?.posts ?? []), ...demoPosts]],
    ['Demandes d’aide', [...(server?.help ?? []), ...demoHelp]],
    [
      'Skills',
      skills
        .filter((skill) => fuzzyMatch(query, skill))
        .map((skill) => ({
          title: skill,
          sub: t`Développeurs et projets en ${skill}`,
          href: `explore?skill=${encodeURIComponent(skill)}`,
          lead: <Tag class='size-3.5' />,
        })),
    ],
  ]
  return groups
    .map(([label, items]) => ({ label, items: items.slice(0, limit) }))
    .filter((group) =>
      group.items.length && (query.trim() || group.label !== 'Skills')
    )
}

// The latest answer of the server, for the text it was asked
const answer = signal<{ query: string; limit: number; found?: Found }>()
let asking: ReturnType<typeof setTimeout> | undefined
// Asked once typing pauses: a word typed is one request, not one a letter
const ASK_AFTER_MS = 120

/**
 * The results of the search as one types: the server's answer once it
 * comes, the page's own search meanwhile and when the server cannot answer
 *
 * @example
 * const groups = useSearch(q, 4)
 */
export const useSearch = (query: string, limit: number, enabled = true) => {
  useEffect(() => {
    clearTimeout(asking)
    // Closed, or nothing to show: nothing asked
    if (!enabled) return
    asking = setTimeout(() => {
      api['GET/api/search'].fetch({ q: query, limit: String(limit) }).then(
        (found) => answer.value = { query, limit, found },
        () => answer.value = { query, limit },
      )
    }, ASK_AFTER_MS)
    return () => clearTimeout(asking)
  }, [query, limit, enabled])
  const last = answer.value
  // An answer for another text is not shown: the page searches meanwhile
  const found = last?.query === query && last.limit === limit
    ? last.found
    : undefined
  return search(query, limit, found)
}

const close = () => {
  paletteOpen.value = false
  query.value = ''
  active.value = 0
}

/** Global search, ⌘K or Ctrl K from anywhere */
export const CommandPalette = () => {
  const dialog = useRef<HTMLDialogElement>(null)
  const open = paletteOpen.value
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      element.showModal()
      document.getElementById('palette-input')?.focus()
    }
    if (!open && element.open) element.close()
  }, [open])

  const q = query.value
  const found = useSearch(q, q.trim() ? 4 : 3, open)
  const results = open ? found : []
  // One list for the arrows: the active result is the one Enter opens
  const flat = results.flatMap((group) => group.items)
  const current = Math.min(active.value, Math.max(0, flat.length - 1))
  const chosen = flat[current]
  const optionId = (i: number) => `palette-option-${i}`
  const move = (step: number) => {
    if (!flat.length) return
    active.value = (current + step + flat.length) % flat.length
    document.getElementById(optionId(active.value))?.scrollIntoView({
      block: 'nearest',
    })
  }

  return (
    <dialog
      ref={dialog}
      aria-label='Recherche globale'
      onClose={close}
      onPointerDown={(event) => event.target === dialog.current && close()}
      class='fixed inset-0 m-0 size-full max-h-none max-w-none bg-transparent px-4 pt-[10vh] pb-4 backdrop:bg-scrim'
    >
      {open && (
        <div class='slab-pop mx-auto w-full max-w-[640px] animate-enter-fast overflow-hidden'>
          <div class='p-3.5'>
            <div class='well flex h-12 items-center gap-2.5 px-3 text-ink-muted'>
              <Search />
              <input
                id='palette-input'
                autofocus
                value={q}
                role='combobox'
                aria-expanded={flat.length > 0}
                aria-controls='palette-results'
                aria-activedescendant={chosen ? optionId(current) : undefined}
                aria-autocomplete='list'
                onInput={(event) => {
                  query.value = event.currentTarget.value
                  active.value = 0
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault()
                    return move(event.key === 'ArrowDown' ? 1 : -1)
                  }
                  if (event.key !== 'Enter' || !chosen) return
                  navigate({ href: chosen.href })
                  close()
                }}
                aria-label='Rechercher'
                placeholder='Développeurs, projets, communautés, demandes, skills'
                class='h-full min-w-0 flex-1 border-0 bg-transparent px-0.5 text-[16px] leading-none text-ink outline-none'
              />
              <kbd class='rounded-sm border border-figure-edge px-[7px] py-[5px] font-mono text-[11px] leading-none font-medium text-ink shadow-[1.73px_1px_0_0_var(--figure-edge)]'>
                Échap
              </kbd>
            </div>
          </div>
          <div
            id='palette-results'
            role='listbox'
            aria-label='Résultats'
            class='max-h-[56vh] overflow-auto px-2.5 pb-2.5'
          >
            {results.map((group) => (
              <div key={group.label} role='group' aria-label={group.label}>
                <div aria-hidden='true' class='px-2 pt-2.5 pb-1.5'>
                  <Eyebrow>{group.label}</Eyebrow>
                </div>
                {group.items.map((result) => (
                  <A
                    key={result.href}
                    id={optionId(flat.indexOf(result))}
                    role='option'
                    aria-selected={result === chosen}
                    tabIndex={-1}
                    href={result.href}
                    onClick={close}
                    onPointerEnter={() => active.value = flat.indexOf(result)}
                    class={`flex items-center gap-3 rounded-md p-2 text-ink no-underline hover:no-underline ${
                      result === chosen ? 'bg-surface-200' : ''
                    }`}
                  >
                    <span
                      class={`flex size-[30px] flex-none items-center justify-center font-display text-[11px] leading-none font-semibold text-ink ${
                        result.round
                          ? 'rounded-full border border-figure-edge bg-surface-100 shadow-tile'
                          : 'tile'
                      }`}
                    >
                      {result.lead}
                    </span>
                    <span class='flex min-w-0 flex-1 flex-col'>
                      <span class='text-[14px] leading-5 font-semibold'>
                        {result.title}
                      </span>
                      <span class='truncate text-[12px] leading-[18px] text-ink-muted'>
                        {result.sub}
                      </span>
                    </span>
                  </A>
                ))}
              </div>
            ))}
            {!results.length && (
              <div class='px-4 py-8 text-center text-ink-muted'>
                {t`Aucun résultat pour « ${q} ».`}
              </div>
            )}
          </div>
          <div class='flex flex-wrap gap-4 border-t border-line bg-surface-000 px-4 py-2.5 text-[12px] text-ink-muted'>
            <span>↑ ↓ : choisir · Entrée : ouvrir</span>
            <span>Tolère les fautes : essaie « postgress »</span>
            {q.trim() && (
              <A
                href='search'
                params={{ q }}
                onClick={close}
                class='ml-auto font-semibold'
              >
                Voir tous les résultats
              </A>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
