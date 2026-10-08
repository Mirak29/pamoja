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
import { Page } from '/web/ui/layout.tsx'
import { Tabs } from '/web/ui/tabs.tsx'

const myProjects = Object.values(projects)
  .filter((p) => isMe(p.owner) || p.members.some((m) => isMe(m.login)))
  .map((p) => p.slug as string)

const tabs = [
  {
    key: 'pour-moi',
    label: 'Pour moi',
    empty: 'Aucune demande ouverte ne correspond à tes skills pour l’instant.',
  },
  {
    key: 'mes-demandes',
    label: 'Mes demandes',
    empty:
      'Tu n’as pas encore demandé d’aide. Une PR qui attend ? Demande une review.',
  },
  {
    key: 'acceptees',
    label: 'Acceptées par moi',
    empty: 'Tu n’as accepté aucune demande pour l’instant.',
  },
  {
    key: 'projets',
    label: 'Demandes des projets',
    empty: 'Aucune demande dans tes projets.',
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
    'pour-moi': scored,
    'mes-demandes': helpRequests.filter((h) => isMe(h.author))
      .map((request) => ({ request })),
    acceptees: helpRequests.filter((h) => h.helper && isMe(h.helper))
      .map((request) => ({ request })),
    projets: helpRequests
      .filter((h) =>
        !isMe(h.author) && h.project && myProjects.includes(h.project)
      )
      .map((request) => ({ request })),
  }
  const current = tabs.find((t) => t.key === url.params.tab) ?? tabs[0]
  const rows = lists[current.key]
  return (
    <Page title='Aide' class='flex flex-col gap-6 pt-5'>
      <div class='flex flex-wrap items-end justify-end gap-4'>
        <Button size={40} href='aide/nouvelle'>
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
          count: lists[key].length,
        }))}
      />
      <div class='slab mr-2 overflow-hidden'>
        <div class='-mt-px'>
          {rows.map(({ request, score }) => (
            <HelpRequestCard key={request.id} request={request} score={score} />
          ))}
        </div>
        {!rows.length && (
          <p class='px-6 py-10 text-center text-ink-muted'>{current.empty}</p>
        )}
      </div>
    </Page>
  )
}
