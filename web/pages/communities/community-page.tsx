import { A, url } from '@01edu/signal-router'
import { Check, Plus } from '/web/assets/icons.tsx'
import {
  communities,
  communitiesChanged,
  type Community,
  defaultRules,
  toggleMembership,
} from '/web/fixtures/communities.ts'
import { helpRequests } from '/web/fixtures/help.ts'
import { match } from '/web/fixtures/matching.ts'
import { type Login, me, people, type Person } from '/web/fixtures/people.ts'
import {
  childrenOf,
  type Post,
  posts,
  postsChanged,
} from '/web/fixtures/posts.ts'
import { type Project, projects } from '/web/fixtures/projects.ts'
import { ago } from '/web/lib/time.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import {
  DemoBadge,
  PostTypeBadge,
  SkillChip,
  StatusBadge,
} from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { DeveloperCard } from '/web/ui/developer-card.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Page } from '/web/ui/layout.tsx'
import { NewPostDialog } from '/web/ui/new-post-dialog.tsx'
import { ProjectCard } from '/web/ui/project-card.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'
import { Tabs } from '/web/ui/tabs.tsx'
import { countsOf, emblemOf } from '/web/pages/communities/communities-page.tsx'

const tabs = [
  ['', 'Fil'],
  ['membres', 'Membres'],
  ['projets', 'Projets'],
  ['aide', 'Demandes d’aide'],
  ['apropos', 'À propos'],
] as const

const FENCE = '`'.repeat(3)

/** Text of a post without code, cut at 170 characters */
const excerpt = (body: string) => {
  const text = body.split(FENCE).filter((_, i) => i % 2 === 0).join(' ')
    .replaceAll('`', '').replace(/\s+/g, ' ').trim()
  return text.length > 170 ? `${text.slice(0, 168)}…` : text
}

const statsOf = (post: Post) => {
  const reactions = Object.values(post.reactions)
    .reduce((sum, list) => sum + (list?.length ?? 0), 0)
  const replies = childrenOf(post.id).length
  return `${reactions} réaction${
    reactions > 1 ? 's' : ''
  } · ${replies} réponse${replies > 1 ? 's' : ''}`
}

const membersOf = (community: Community) =>
  (Object.values(people) as Person[]).filter((p) =>
    p.communities.includes(community.slug)
  )

/** Projects in its technology, its country, or built by its members */
const projectsOf = (community: Community, members: Person[]) =>
  Object.values(projects as Record<string, Project>).filter((p) =>
    community.type === 'Technologie'
      ? p.stack.includes(community.name)
      : community.type === 'Pays'
      ? people[p.owner].country === community.country
      : members.some((m) =>
        p.owner === m.login || p.members.some((x) => x.login === m.login)
      )
  )

const PostRow = ({ post, community }: { post: Post; community: Community }) => (
  <A
    href={`post/${post.id}`}
    class='flex items-start gap-3.5 border-t border-line px-5 py-4 text-ink no-underline hover:bg-surface-000 hover:no-underline'
  >
    <Avatar name={people[post.author].name} size={36} />
    <div class='flex min-w-0 flex-1 flex-col gap-1.5'>
      <div class='flex flex-wrap items-center gap-2'>
        <PostTypeBadge type={post.type} />
        {post.acceptedReply && <StatusBadge status='answered' />}
        <span class='text-[13px] text-ink-muted'>
          {people[post.author].name} · {community.name} · {ago(post.at)}
        </span>
      </div>
      {post.title && (
        <span class='font-display text-[17px] leading-6 font-semibold text-pretty'>
          {post.title}
        </span>
      )}
      <span class='text-[14px] leading-[22px] text-pretty text-ink-muted'>
        {excerpt(post.body)}
      </span>
      <div class='flex flex-wrap items-center gap-2.5'>
        <span class='font-mono text-[12px] leading-4 font-medium text-ink-muted'>
          {statsOf(post)}
        </span>
        {post.demo && <DemoBadge />}
      </div>
    </div>
  </A>
)

const HelpRow = ({ request }: { request: typeof helpRequests[0] }) => (
  <A
    href={`aide/${request.id}`}
    class='flex items-start gap-4 border-t border-line px-5 py-4 text-ink no-underline hover:bg-surface-000 hover:no-underline'
  >
    <span class='tile flex h-[50px] w-[58px] flex-none flex-col items-center justify-center gap-0.5'>
      <span class='font-mono text-[18px] leading-5 font-medium'>
        {match(me, request).total}
      </span>
      <span class='font-mono text-[10px] leading-3 font-medium text-ink-muted'>
        / 100
      </span>
    </span>
    <div class='flex min-w-0 flex-1 flex-col gap-1.5'>
      <span class='font-mono text-label text-ink-muted uppercase'>
        {request.type} ·{' '}
        {request.project ? projects[request.project].name : 'Sans projet'}
      </span>
      <span class='text-[16px] leading-6 font-semibold text-pretty'>
        {request.title}
      </span>
      <div class='flex flex-wrap gap-1.5'>
        {request.skills.map((skill) => (
          <SkillChip key={skill} match={me.skills.includes(skill)}>
            {skill}
          </SkillChip>
        ))}
      </div>
      <span class='text-[13px] leading-5 text-ink-muted'>
        {people[request.author].name} · {ago(request.at)} · {request.duration} ·
        {' '}
        {request.level}
      </span>
    </div>
    <div class='flex flex-none flex-col items-end gap-1.5'>
      <StatusBadge status={request.status} />
      {request.demo && <DemoBadge />}
    </div>
  </A>
)

const Empty = ({ children }: { children: preact.ComponentChildren }) => (
  <GhostSlab class='px-6 py-7'>
    <EmptyState>{children}</EmptyState>
  </GhostSlab>
)

const About = ({ community }: { community: Community }) => {
  const mods = [
    ...(community.moderators ?? []),
    ...(community.owner ? [community.owner] : []),
  ] as Login[]
  return (
    <div class='mr-2 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
      <section class='slab flex flex-col gap-3 p-[22px]'>
        <Eyebrow>À propos</Eyebrow>
        <p class='text-[16px] leading-[26px] text-pretty'>
          {community.description}
        </p>
        <span class='pt-2'>
          <Eyebrow>Règles</Eyebrow>
        </span>
        {(community.rules ?? defaultRules).map((rule) => (
          <span
            key={rule}
            class='flex items-baseline gap-2.5 text-[14px] leading-[22px]'
          >
            <span class='-translate-y-0.5'>
              <span
                aria-hidden='true'
                class='diamond block size-[7px] bg-indigo'
              />
            </span>
            {rule}
          </span>
        ))}
      </section>
      <section class='slab flex flex-col gap-3 p-[22px]'>
        <Eyebrow>Modération</Eyebrow>
        {mods.map((login) => (
          <A
            key={login}
            href={`@${login}`}
            class='flex items-center gap-2.5 text-ink no-underline hover:no-underline'
          >
            <Avatar name={people[login].name} size={32} />
            <span class='font-display text-[14px] leading-5 font-semibold'>
              {people[login].name}
            </span>
          </A>
        ))}
        {!mods.length && (
          <span class='text-[14px] text-ink-muted'>
            Modérée par l’équipe Pamoja.
          </span>
        )}
      </section>
    </div>
  )
}

const NotFound = ({ slug }: { slug: string }) => (
  <Page title='Communauté introuvable' class='pt-5'>
    <GhostSlab>
      <EmptyState
        action={<Button href='communautes'>Voir les communautés</Button>}
      >
        La communauté « {slug} » n’existe pas.
      </EmptyState>
    </GhostSlab>
  </Page>
)

/** /communaute/:slug/:tab (§10.2) */
export const CommunityPage = () => {
  communitiesChanged.value
  postsChanged.value
  const [, slug = '', tab = ''] = url.relativePath.slice(1).split('/')
  const community = communities.find((c) => c.slug === slug)
  if (!community) return <NotFound slug={slug} />
  const current = tabs.find(([key]) => key === tab)?.[0] ?? ''
  const joined = me.communities.includes(community.slug)
  const members = membersOf(community)
  const list = posts
    .filter((p) => p.community === community.slug && !p.hidden && !p.parent)
    .sort((a, b) => b.at - a.at)
  const projectList = projectsOf(community, members)
  const help = helpRequests.filter((h) =>
    h.status === 'open' &&
    (community.type === 'Technologie'
      ? h.skills.includes(community.name)
      : members.some((m) => m.login === h.author))
  )
  return (
    <Page title={community.name} class='flex flex-col gap-6 pt-5'>
      <section class='slab mr-2 flex flex-wrap items-center gap-[18px] p-[22px]'>
        <span class='tile flex size-16 flex-none items-center justify-center font-display text-[20px] leading-none font-bold text-indigo'>
          {emblemOf(community)}
        </span>
        <div class='flex min-w-[220px] flex-1 flex-col gap-1'>
          <h1 class='font-display text-[30px] leading-9 font-bold tracking-[-.01em]'>
            {community.name}
          </h1>
          <span class='font-mono text-label text-ink-muted uppercase'>
            {community.type} · {countsOf(community)}
          </span>
          <span class='text-[14px] leading-[22px] text-pretty text-ink-muted'>
            {community.description}
          </span>
        </div>
        <div class='flex flex-wrap gap-3 pb-1'>
          {joined
            ? (
              <Button
                variant='secondary'
                onClick={() => toggleMembership(community, me)}
              >
                <Check class='size-3.5' />
                Membre
              </Button>
            )
            : (
              <Button onClick={() => toggleMembership(community, me)}>
                Rejoindre
              </Button>
            )}
          <Button variant='secondary' params={{ dialog: 'new-post' }}>
            <Plus />
            Nouveau post
          </Button>
        </div>
      </section>
      <Tabs
        label='Sections de la communauté'
        current={current}
        wide
        tabs={tabs.map(([key, label]) => ({
          key,
          label,
          href: key ? `communaute/${slug}/${key}` : `communaute/${slug}`,
        }))}
      />
      {current === '' && (
        <section class='slab mr-2 overflow-hidden'>
          <div class='-mt-px'>
            {list.map((post) => (
              <PostRow key={post.id} post={post} community={community} />
            ))}
          </div>
          {!list.length && (
            <EmptyState
              action={
                <Button size={36} params={{ dialog: 'new-post' }}>
                  Nouveau post
                </Button>
              }
            >
              Pas encore de post. Lance la première discussion.
            </EmptyState>
          )}
        </section>
      )}
      {current === 'membres' && (
        <div class='grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-x-7 gap-y-6 pr-2'>
          {members.map((person) => (
            <DeveloperCard key={person.login} person={person} />
          ))}
        </div>
      )}
      {current === 'projets' && (
        <>
          <div class='grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-7 gap-y-6 pr-2'>
            {projectList.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
          {!projectList.length && (
            <Empty>Aucun projet lié à cette communauté pour l’instant.</Empty>
          )}
        </>
      )}
      {current === 'aide' && (
        <section class='slab mr-2 overflow-hidden'>
          <div class='-mt-px'>
            {help.map((request) => (
              <HelpRow key={request.id} request={request} />
            ))}
          </div>
          {!help.length && (
            <div class='px-5 py-6 text-[14px] text-ink-muted'>
              Aucune demande d’aide ouverte ici.
            </div>
          )}
        </section>
      )}
      {current === 'apropos' && <About community={community} />}
      <NewPostDialog community={community.slug} type='Question' />
    </Page>
  )
}
