import { counted } from '/web/lib/plural.ts'
import { signal } from '@preact/signals'
import type { JSX } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { A, navigate } from '@01edu/signal-router'
import {
  FolderGit2,
  LifeBuoy,
  MessageSquare,
  Search,
  Tag,
  Users,
} from '/web/assets/icons.tsx'
import { communities } from '/web/fixtures/communities.ts'
import { helpRequests } from '/web/fixtures/help.ts'
import { people } from '/web/fixtures/people.ts'
import { posts } from '/web/fixtures/posts.ts'
import { projects } from '/web/fixtures/projects.ts'
import { skills } from '/web/fixtures/skills.ts'
import { fuzzyMatch } from '/web/lib/fuzzy.ts'
import { initials } from '/web/ui/avatar.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'

export const paletteOpen = signal(false)

addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) {
    return
  }
  event.preventDefault()
  paletteOpen.value = !paletteOpen.peek()
})

type Result = {
  title: string
  sub: string
  href: string
  lead: JSX.Element | string
  round?: boolean
}

export const search = (query: string, limit: number) => {
  const groups: [string, Result[]][] = [
    [
      'Développeurs',
      Object.values(people)
        .filter((p) =>
          fuzzyMatch(
            query,
            [p.name, p.login, p.city, p.country, p.role, ...p.skills].join(' '),
          )
        )
        .map((p) => ({
          title: p.name,
          sub: `@${p.login} · ${p.city}, ${p.country} · ${p.skills.join(', ')}`,
          href: `@${p.login}`,
          lead: initials(p.name),
          round: true,
        })),
    ],
    [
      'Projets',
      Object.values(projects)
        .filter((p) =>
          fuzzyMatch(query, [p.name, p.description, ...p.stack].join(' '))
        )
        .map((p) => ({
          title: p.name,
          sub: `${p.stack.join(', ')} · ${p.description}`,
          href: `projet/${p.slug}`,
          lead: <FolderGit2 class='size-3.5' />,
        })),
    ],
    [
      'Communautés',
      communities
        .filter((c) => fuzzyMatch(query, `${c.name} ${c.type}`))
        .map((c) => ({
          title: c.name,
          sub: `${c.type} · ${counted(c.members, 'membre')}`,
          href: `communaute/${c.slug}`,
          lead: <Users class='size-3.5' />,
        })),
    ],
    [
      'Posts',
      posts
        .filter((p) =>
          !p.parent && !p.hidden &&
          fuzzyMatch(query, [p.title, p.body, p.type].join(' '))
        )
        .map((p) => ({
          title: p.title ||
            (p.body.length > 80 ? `${p.body.slice(0, 78)}…` : p.body),
          sub: `${p.type} · ${people[p.author].name} · ${
            communities.find((c) => c.slug === p.community)?.name
          }`,
          href: `post/${p.id}`,
          lead: <MessageSquare class='size-3.5' />,
        })),
    ],
    [
      'Demandes d’aide',
      helpRequests
        .filter((help) =>
          fuzzyMatch(query, [help.title, help.type, ...help.skills].join(' '))
        )
        .map((help) => ({
          title: help.title,
          sub: `${help.type}${
            help.project ? ` · ${projects[help.project].name}` : ''
          }`,
          href: `aide/${help.id}`,
          lead: <LifeBuoy class='size-3.5' />,
        })),
    ],
    [
      'Skills',
      skills
        .filter((skill) => fuzzyMatch(query, skill))
        .map((skill) => ({
          title: skill,
          sub: `Développeurs et projets en ${skill}`,
          href: `explorer?skill=${encodeURIComponent(skill)}`,
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

const query = signal('')
const close = () => paletteOpen.value = false

/** Global search, ⌘K or Ctrl K from anywhere */
export const CommandPalette = () => {
  const dialog = useRef<HTMLDialogElement>(null)
  const open = paletteOpen.value
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      query.value = ''
      element.showModal()
    }
    if (!open && element.open) element.close()
  }, [open])

  const q = query.value
  const results = open ? search(q, q.trim() ? 4 : 3) : []
  const first = results[0]?.items[0]

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
                autofocus
                value={q}
                onInput={(event) => query.value = event.currentTarget.value}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || !first) return
                  navigate({ href: first.href })
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
          <div class='max-h-[56vh] overflow-auto px-2.5 pb-2.5'>
            {results.map((group) => (
              <div key={group.label}>
                <div class='px-2 pt-2.5 pb-1.5'>
                  <Eyebrow>{group.label}</Eyebrow>
                </div>
                {group.items.map((result) => (
                  <A
                    key={result.href}
                    href={result.href}
                    onClick={close}
                    class='flex items-center gap-3 rounded-md p-2 text-ink no-underline hover:bg-surface-200 hover:no-underline'
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
                Aucun résultat pour « {q} ».
              </div>
            )}
          </div>
          <div class='flex flex-wrap gap-4 border-t border-line bg-surface-000 px-4 py-2.5 text-[12px] text-ink-muted'>
            <span>Entrée : ouvrir le premier résultat</span>
            <span>Tolère les fautes : essaie « postgress »</span>
            {q.trim() && (
              <A
                href='recherche'
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
