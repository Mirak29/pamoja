import { A } from '@01edu/signal-router'
import { Plus } from '/web/assets/icons.tsx'
import {
  communities,
  communitiesChanged,
  type Community,
} from '/web/fixtures/communities.ts'
import { me } from '/web/fixtures/people.ts'
import { posts, postsChanged } from '/web/fixtures/posts.ts'
import { counted } from '/web/lib/plural.ts'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { translate } from '/web/lib/language.ts'
import { Batched } from '/web/ui/infinite-list.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Membership } from '/web/pages/communities/membership.tsx'
import { NewCommunityDialog } from '/web/pages/communities/new-community-dialog.tsx'
import { ScrollFrame } from '/web/ui/scroll-frame.tsx'

const groups: [Community['type'], string][] = [
  ['Technologie', 'Technologies'],
  ['Pays', 'Pays'],
  ['Domaine', 'Domaines'],
]

/** Initials of a community: its emblem, as a person has a disc */
export const emblemOf = (community: Community) =>
  community.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2)
    .toUpperCase()

/** Members and top level posts of a community */
export const countsOf = (community: Community) => {
  const count =
    posts.filter((p) =>
      p.community === community.slug && !p.hidden && !p.parent
    ).length
  return `${counted(community.members, 'membre')} · ${counted(count, 'post')}`
}

const CommunityCard = ({ community }: { community: Community }) => {
  const joined = me.communities.includes(community.slug)
  return (
    <div class='slab mb-2 flex flex-col gap-3 p-[18px]'>
      <A
        href={`community/${community.slug}`}
        class='flex min-w-0 items-center gap-3 text-ink no-underline hover:no-underline'
      >
        <span class='tile flex size-11 flex-none items-center justify-center font-display text-[14px] leading-none font-bold text-indigo'>
          {emblemOf(community)}
        </span>
        <span class='flex min-w-0 flex-col'>
          <span class='font-display text-[17px] leading-[22px] font-semibold'>
            {community.name}
          </span>
          <span class='font-mono text-[12px] leading-4 font-medium text-ink-muted'>
            {countsOf(community)}
          </span>
        </span>
      </A>
      <span class='text-[14px] leading-[22px] text-pretty text-ink-muted'>
        {community.description}
      </span>
      <div class='mt-auto flex items-center gap-2.5 pb-[3px]'>
        <Membership community={community} joined={joined} size={34} />
      </div>
    </div>
  )
}

/** Communities by technology, country and domain (§10.2) */
export const CommunitiesPage = () => {
  communitiesChanged.value
  postsChanged.value
  return (
    <Page title='Communautés' class='flex flex-col gap-9 pt-5'>
      <div class='flex justify-end'>
        <Button size={40} params={{ dialog: 'new-community' }}>
          <Plus />
          Nouvelle communauté
        </Button>
      </div>
      {groups.map(([type, label]) => {
        const list = communities.filter((c) => c.type === type)
        if (!list.length) return null
        return (
          <section key={type} class='flex flex-col gap-4'>
            <Eyebrow>
              {list.length > 6 ? `${translate(label)} · ${list.length}` : label}
            </Eyebrow>
            {
              /* About two rows: the others scroll inside, by batches, so a
              long kind does not push the next ones down (§12.7) */
            }
            <ScrollFrame class='-mr-1 max-h-[520px] pt-1 pr-3 pb-3'>
              <Batched
                items={list}
                reset={type}
                class='grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-x-7 gap-y-6'
                row={(community) => (
                  <CommunityCard key={community.slug} community={community} />
                )}
              />
            </ScrollFrame>
          </section>
        )
      })}
      <NewCommunityDialog />
    </Page>
  )
}
