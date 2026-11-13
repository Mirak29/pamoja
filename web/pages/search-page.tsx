import { navigate, url } from '@01edu/signal-router'
import { A } from '/web/ui/link.tsx'
import { Search } from '/web/assets/icons.tsx'
import { helpChanged } from '/web/fixtures/help.ts'
import { peopleChanged } from '/web/fixtures/people.ts'
import { projectsChanged } from '/web/fixtures/projects.ts'
import { useSearch } from '/web/ui/command-palette.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Page } from '/web/ui/layout.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'
import { t } from '/web/lib/language.ts'
import { counted } from '/web/lib/plural.ts'

/** Full results of the global search, tolerant to typos (§10.4) */
export const SearchPage = () => {
  // What the search reads arrives from the API after the first render
  projectsChanged.value
  helpChanged.value
  peopleChanged.value
  const q = url.params.q ?? ''
  const results = useSearch(q, 50, !!q.trim())
  const groups = q.trim() ? results : []
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)
  return (
    <Page title='Recherche' class='flex max-w-[880px] flex-col gap-6 pt-5'>
      <div class='well flex h-[52px] items-center gap-2.5 rounded-[8px] px-3.5 text-ink-muted'>
        <Search />
        <input
          autofocus
          value={q}
          aria-label='Rechercher'
          placeholder='Développeurs, projets, communautés, posts, demandes, skills'
          onInput={(event) =>
            navigate({
              params: { q: event.currentTarget.value || null },
              replace: true,
            })}
          class='h-full min-w-0 flex-1 border-0 bg-transparent px-0.5 text-[17px] leading-none text-ink outline-none'
        />
      </div>
      {total > 0 && (
        <Eyebrow>
          {t`${counted(total, 'résultat')} pour « ${q} »`}
        </Eyebrow>
      )}
      {groups.map((group) => (
        <section key={group.label} class='slab mr-2 overflow-hidden'>
          <div class='flex px-5 pt-[18px] pb-4'>
            <Eyebrow>{group.label}</Eyebrow>
          </div>
          {group.items.map((result) => (
            <A
              key={result.href}
              href={result.href}
              class='flex items-center gap-3 border-t border-line px-5 py-3 text-ink no-underline hover:bg-surface-000 hover:no-underline'
            >
              <span
                class={`flex size-[34px] flex-none items-center justify-center border border-figure-edge bg-surface-100 font-display text-[12px] leading-none font-semibold shadow-tile ${
                  result.round ? 'rounded-full' : 'rounded-md'
                }`}
              >
                {result.lead}
              </span>
              <span class='flex min-w-0 flex-1 flex-col'>
                <span class='text-[15px] leading-[22px] font-semibold'>
                  {result.title}
                </span>
                <span class='text-[13px] leading-5 text-ink-muted'>
                  {result.sub}
                </span>
              </span>
            </A>
          ))}
        </section>
      ))}
      {q.trim() && !groups.length && (
        <GhostSlab class='px-6 py-7'>
          <EmptyState>
            {t`Aucun résultat pour « ${q} ». La recherche tolère les fautes : vérifie le mot ou essaie un skill.`}
          </EmptyState>
        </GhostSlab>
      )}
      {!q.trim() && (
        <span class='text-[14px] text-ink-muted'>
          Tape un nom, un projet, une ville ou un skill. « postgress » trouve
          PostgreSQL.
        </span>
      )}
    </Page>
  )
}
