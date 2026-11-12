import { url } from '@01edu/signal-router'
import { Plus } from '/web/assets/icons.tsx'
import {
  helpChanged,
  helpRequests,
  matchingRequests,
} from '/web/fixtures/help.ts'
import { isMe, me } from '/web/fixtures/people.ts'
import { projects } from '/web/fixtures/projects.ts'
import { Button } from '/web/ui/button.tsx'
import { HelpRequestCard } from '/web/ui/help-request-card.tsx'
import { InfiniteList } from '/web/ui/infinite-list.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Tabs } from '/web/ui/tabs.tsx'
import { helpLists, type HelpListTab, loadHelpBatch } from '/web/lib/help.ts'

const myProjects = Object.values(projects)
  .filter((p) => isMe(p.owner) || p.members.some((m) => isMe(m.login)))
  .map((p) => p.slug as string)

// An empty tab is never a dead end: it says what to do next (`action`)
const tabs: {
  key: HelpListTab
  label: string
  empty: string
  action: [label: string, href: string]
}[] = [
  {
    key: 'for-me',
    label: 'Pour moi',
    empty:
      'Aucune demande ouverte ne correspond à tes skills pour l’instant. Plus ton profil en dit sur toi, plus Pamoja t’en propose.',
    action: ['Compléter mes skills', 'profile/edit'],
  },
  {
    key: 'mine',
    label: 'Mes demandes',
    empty:
      'Tu n’as pas encore demandé d’aide. Une PR qui attend ? Demande une review.',
    action: ['Nouvelle demande d’aide', 'help/new'],
  },
  {
    key: 'accepted',
    label: 'Acceptées par moi',
    empty: 'Tu n’as accepté aucune demande pour l’instant.',
    action: ['Voir sur quoi travailler', 'explore/work'],
  },
  {
    key: 'projects',
    label: 'Demandes des projets',
    empty: 'Aucune demande dans tes projets.',
    action: ['Voir mes projets', 'projects'],
  },
]

/** Help requests for me, mine, accepted by me and those of my projects */
export const HelpList = () => {
  helpChanged.value
  const scored = matchingRequests(me)
  const lists: Record<
    string,
    { request: typeof helpRequests[0]; score?: number }[]
  > = {
    'for-me': scored,
    mine: helpRequests.filter((h) => isMe(h.author))
      .map((request) => ({ request })),
    accepted: helpRequests.filter((h) => h.helper && isMe(h.helper))
      .map((request) => ({ request })),
    projects: helpRequests
      .filter((h) =>
        !isMe(h.author) && h.project && myProjects.includes(h.project)
      )
      .map((request) => ({ request })),
  }
  const current = tabs.find((t) => t.key === url.params.tab) ?? tabs[0]
  const rows = lists[current.key]
  // By batches of 20 (§12.7): the list reads the first when the tab opens.
  // A batch that failed leaves « Charger plus » to try again
  const batches = helpLists.cursors.value
  return (
    <Page title='Aide' class='flex flex-col gap-6 pt-5'>
      <div class='flex flex-wrap items-end justify-end gap-4'>
        <Button size={40} href='help/new'>
          <Plus />
          Nouvelle demande d’aide
        </Button>
      </div>
      <Tabs
        label='Demandes d’aide'
        current={current.key}
        tabs={tabs.map(({ key, label }, i) => ({
          key,
          label,
          params: { tab: i ? key : null },
          // Known once every batch of the tab is read
          count: batches[key] === '' ? lists[key].length : undefined,
        }))}
      />
      <div class='slab mr-2 overflow-hidden'>
        <InfiniteList
          key={current.key}
          more={helpLists.more(current.key)}
          onMore={() => loadHelpBatch(current.key)}
          end='Tu as tout vu.'
          class='-mt-px'
        >
          {rows.map(({ request, score }) => (
            <HelpRequestCard key={request.id} request={request} score={score} />
          ))}
        </InfiniteList>
        {!rows.length && batches[current.key] === '' && (
          <div class='flex flex-col items-center gap-3 px-6 py-10 text-center'>
            <p class='max-w-[520px] text-pretty text-ink-muted'>
              {current.empty}
            </p>
            <Button variant='secondary' size={36} href={current.action[1]}>
              {current.action[0]}
            </Button>
          </div>
        )}
      </div>
    </Page>
  )
}
