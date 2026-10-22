import { A, url } from '@01edu/signal-router'
import {
  Check,
  Flag,
  FolderGit2,
  Github,
  GitMerge,
  GitPullRequest,
  GraduationCap,
  LifeBuoy,
  Link,
  UserPlus,
} from '/web/assets/icons.tsx'
import { communities } from '/web/fixtures/communities.ts'
import { helpRequests } from '/web/fixtures/help.ts'
import {
  isMe,
  type Login,
  me,
  people,
  peopleChanged,
  type Person,
  placeOf,
  toggleFollowing,
  websiteHref,
  websiteLabel,
} from '/web/fixtures/people.ts'
import {
  profileChanged,
  type ProfileSection,
  settingsOf,
} from '/web/fixtures/profile-settings.ts'
import {
  projects,
  type ProjectSlug,
  projectsOf,
} from '/web/fixtures/projects.ts'
import {
  type Dimension,
  profileStats,
  type Proof,
  proofsOf,
} from '/web/fixtures/reputation.ts'
import { githubUrl } from '/web/lib/links.ts'
import { plural } from '/web/lib/plural.ts'
import { ago } from '/web/lib/time.ts'
import { Portrait } from '/web/ui/avatar.tsx'
import {
  DemoBadge,
  SkillChip,
  StatusBadge,
  VerifiedBadge,
} from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Cube } from '/web/ui/shapes.tsx'
import { EmptyState, GhostSlab } from '/web/ui/states.tsx'
import {
  CollaborationGraph,
  CollaborationMap,
} from '/web/pages/profile/collaboration.tsx'
import { CollaborationDialog } from '/web/pages/profile/collaboration-dialog.tsx'
import { Cover } from '/web/pages/profile/cover.tsx'
import { Passport } from '/web/pages/profile/passport.tsx'
import { proofMeta, ProofsDrawer } from '/web/pages/profile/proofs-drawer.tsx'
import { BadgeList, DimensionBars } from '/web/pages/profile/reputation.tsx'
import { ShareDialog } from '/web/pages/profile/share-dialog.tsx'
import { t } from '/web/lib/language.ts'

const dimensionIcons = {
  review: GitPullRequest,
  build: FolderGit2,
  oss: GitMerge,
  mentor: GraduationCap,
  help: LifeBuoy,
} satisfies Record<Dimension, unknown>

const firstName = (login: Login) => people[login].name.split(' ')[0]

/** Login of the profile at /@login, if that person exists */
const profileLogin = () => {
  const login = url.relativePath.slice(2).split('/')[0]
  return Object.hasOwn(people, login) ? login as Login : undefined
}

const Actions = ({ login }: { login: Login }) => {
  const following = me.follows?.includes(login) ?? false
  if (isMe(login)) {
    return (
      <div class='flex flex-wrap gap-3 pb-1'>
        <Button variant='secondary' params={{ dialog: 'partage' }}>
          Partager
        </Button>
        <Button variant='secondary' href='profil/modifier'>
          Modifier le profil
        </Button>
      </div>
    )
  }
  return (
    <div class='flex flex-wrap gap-3 pb-1'>
      <Button variant='secondary' onClick={() => toggleFollowing(login)}>
        {following ? <Check /> : <UserPlus />}
        {following ? 'Suivi' : 'Suivre'}
      </Button>
      <Button params={{ dialog: 'collaboration' }}>
        Proposer une collaboration
      </Button>
      <Button variant='secondary' params={{ dialog: 'partage' }}>
        Partager
      </Button>
      {/* The report dialog comes with PAM-516 */}
      <A
        params={{ dialog: 'report', report: `profile:${login}` }}
        title='Signaler'
        class='inline-flex h-[26px] items-center gap-1 rounded-md px-2 text-[12px] leading-none font-medium text-ink-muted no-underline hover:bg-danger-soft hover:text-danger hover:no-underline'
      >
        <Flag class='size-3' />
        Signaler
      </A>
    </div>
  )
}

const Hero = ({ login }: { login: Login }) => {
  const person: Person = people[login]
  return (
    <section class='slab mr-2 overflow-hidden'>
      <Cover cover={settingsOf(login).cover} />
      <div class='flex flex-col gap-3 px-6 pb-6'>
        <div class='relative -mt-12 flex flex-wrap items-end justify-between gap-4'>
          <Portrait
            name={person.name}
            src={person.avatarUrl}
            px={96}
            class='flex size-24 items-center justify-center rounded-full border border-figure-edge bg-surface-200 font-display text-[32px] leading-none font-bold shadow-slab'
          />
          <div class='hidden sm:block'>
            <Actions login={login} />
          </div>
        </div>
        <div class='flex flex-col gap-1 pt-2'>
          <h1 class='font-display text-[34px] leading-10 font-bold tracking-[-.015em] text-pretty'>
            {person.name}
          </h1>
          <span class='flex flex-wrap items-center gap-2 text-[14px] text-ink-muted'>
            <span>{person.role}</span>
            <span>·</span>
            <span>{placeOf(person)}</span>
          </span>
        </div>
        <div class='sm:hidden'>
          <Actions login={login} />
        </div>
        <p class='max-w-[680px] text-[18px] leading-[27px] text-pretty'>
          {person.headline}
        </p>
        <div class='flex flex-wrap gap-1.5'>
          {person.skills.map((skill) => (
            <SkillChip key={skill}>{skill}</SkillChip>
          ))}
        </div>
        <p class='max-w-[680px] text-pretty text-ink-muted'>{person.bio}</p>
        <div class='flex flex-wrap items-center gap-4 text-[13px]'>
          <a
            href={`https://github.com/${login}`}
            class='inline-flex items-center gap-1.5 font-mono text-ink-muted'
          >
            <Github class='size-3.5' />
            github.com/{login}
          </a>
          {person.website && (
            <a
              href={websiteHref(person.website)}
              class='inline-flex items-center gap-1.5 font-mono text-ink-muted'
            >
              <Link class='size-3.5' />
              {websiteLabel(person.website)}
            </a>
          )}
          {person.openTo && (
            <span class='inline-flex h-[26px] items-center gap-2 rounded-[5px] border border-indigo bg-indigo-soft px-2.5 font-semibold text-indigo shadow-key-selected'>
              <span aria-hidden='true' class='diamond size-1.5 bg-current' />
              {person.openTo}
            </span>
          )}
          {person.promising && (
            <span class='inline-flex h-[22px] items-center rounded-sm border border-dashed border-indigo px-2 font-mono text-[11px] leading-none font-medium tracking-[.06em] text-indigo uppercase'>
              Nouveau profil prometteur
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

const Stats = ({ login }: { login: Login }) => {
  const figures = profileStats(login)
  // What was done for others first, then one's own projects
  const stats = [
    [
      figures.reviews,
      plural(figures.reviews, 'review confirmée', 'reviews confirmées'),
    ],
    [figures.contributions, plural(figures.contributions, 'contribution')],
    [
      figures.helped,
      plural(figures.helped, 'développeur aidé', 'développeurs aidés'),
    ],
    [figures.collaborations, plural(figures.collaborations, 'collaboration')],
    [figures.projects, plural(figures.projects, 'projet')],
  ] as const
  return (
    <div class='mr-2 grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-5'>
      {stats.map(([value, label]) => (
        <div
          key={label}
          class='flex flex-col gap-0.5 rounded-[8px] border border-figure-edge bg-surface-100 px-4 py-3.5 shadow-tile'
        >
          <span class='font-mono text-[28px] leading-8 font-medium tabular-nums'>
            {value}
          </span>
          <span class='text-[13px] text-ink-muted'>{label}</span>
        </div>
      ))}
    </div>
  )
}

const Building = ({ login }: { login: Login }) => {
  const { featured } = settingsOf(login)
  const list = projectsOf(login).filter((project) =>
    !featured.length || featured.includes(project.slug as ProjectSlug)
  )
  if (!list.length) return null
  return (
    <section class='flex flex-col gap-4'>
      <Eyebrow>En train de construire</Eyebrow>
      {list.map((project) => (
        <A
          key={project.slug}
          href={`projet/${project.slug}`}
          class='slab slab-lift mb-2 flex items-start gap-3.5 p-[18px] text-ink no-underline hover:no-underline'
        >
          <Cube size={40} />
          <span class='flex min-w-0 flex-1 flex-col gap-1'>
            <span class='flex items-center justify-between gap-2'>
              <span class='font-display text-[17px] leading-[22px] font-semibold'>
                {project.name}
              </span>
              <span class='text-[12px] text-ink-muted'>
                {project.owner === login
                  ? 'Propriétaire'
                  : project.members.find((m) => m.login === login)?.role}
              </span>
            </span>
            <span class='text-[14px] text-pretty text-ink-muted'>
              {project.description}
            </span>
            <span class='font-mono text-[12px] leading-4 text-ink-muted'>
              {project.stack.join(' · ')}
            </span>
          </span>
        </A>
      ))}
    </section>
  )
}

const SectionHeader = (
  { title, children }: { title: string; children?: preact.ComponentChildren },
) => (
  <div class='flex flex-wrap items-end justify-between gap-4 px-5 pt-[18px] pb-4'>
    <div class='flex min-w-0 flex-[1_1_260px] flex-col gap-1.5'>
      <Eyebrow>{title}</Eyebrow>
    </div>
    {children}
  </div>
)

// A proof leads to what proves it: the PR on GitHub, the accepted answer,
// the help request, or the project
const proofHref = (proof: Proof) =>
  proof.pullRequest && proof.project
    ? githubUrl(projects[proof.project], 'pull', proof.pullRequest)
    : proof.post
    ? `post/${proof.post}`
    : proof.help
    ? `aide/${proof.help}`
    : `projet/${proof.project}`

const Contributions = ({ login }: { login: Login }) => {
  const mine = proofsOf(login)
  return (
    <section class='slab overflow-hidden'>
      <SectionHeader title='Contributions réelles'>
        <Button variant='secondary' size={32} params={{ dialog: 'preuves' }}>
          Toutes les preuves · <span>{mine.length}</span>
        </Button>
      </SectionHeader>
      {mine.slice(0, 6).map((proof) => {
        const Icon = dimensionIcons[proof.dimension]
        return (
          <A
            key={proof.id}
            href={proofHref(proof)}
            class='flex flex-wrap items-start gap-3.5 border-t border-line px-5 py-3.5 text-ink no-underline hover:bg-surface-000 hover:no-underline'
          >
            <span class='tile flex size-[34px] flex-none items-center justify-center text-ink-muted'>
              <Icon />
            </span>
            <span class='flex min-w-[200px] flex-1 flex-col'>
              <span class='text-[14px] font-semibold'>{proof.title}</span>
              <span class='text-[13px] text-ink-muted'>
                {proofMeta(proof)}
              </span>
            </span>
            {proof.verified && <VerifiedBadge />}
            {proof.demo && !proof.verified && <DemoBadge />}
          </A>
        )
      })}
      {!mine.length && (
        <EmptyState>
          Pas encore de contribution vérifiée. Une review, une aide ou une PR
          mergée apparaît ici.
        </EmptyState>
      )}
    </section>
  )
}

const Reputation = ({ login }: { login: Login }) => (
  <section class='slab flex flex-col p-[22px]'>
    <div class='flex flex-wrap items-baseline justify-between gap-3 pb-2.5'>
      <Eyebrow>Réputation</Eyebrow>
      <span class='text-[12px] text-ink-muted'>
        Pas de score global : cinq dimensions, chacune prouvée.
      </span>
    </div>
    <DimensionBars login={login} />
  </section>
)

const Badges = ({ login }: { login: Login }) => (
  <section class='slab flex flex-col gap-3.5 p-[22px]'>
    <Eyebrow>Badges</Eyebrow>
    <BadgeList login={login} />
  </section>
)

const Activity = ({ login }: { login: Login }) => {
  const list = helpRequests
    .filter((h) => h.helper === login || h.author === login)
    .sort((a, b) => b.at - a.at)
    .slice(0, 4)
  if (!list.length) return null
  return (
    <section class='slab overflow-hidden'>
      <SectionHeader title='Activité' />
      {list.map((help) => (
        <A
          key={help.id}
          href={`aide/${help.id}`}
          class='flex flex-col gap-1.5 border-t border-line px-5 py-3 text-ink no-underline hover:bg-surface-000 hover:no-underline'
        >
          <span class='text-[14px] text-pretty'>
            {help.helper === login
              ? t`A aidé ${firstName(help.author)} : ${help.title}`
              : t`A demandé : ${help.title}`}
          </span>
          <span class='flex items-center gap-2'>
            <span class='text-[12px] text-ink-muted'>{ago(help.at)}</span>
            <StatusBadge status={help.status} />
          </span>
        </A>
      ))}
    </section>
  )
}

const Communities = ({ login }: { login: Login }) => (
  <section class='slab flex flex-col gap-3 p-[22px]'>
    <Eyebrow>Communautés</Eyebrow>
    <div class='flex flex-wrap gap-2.5 pb-[3px]'>
      {people[login].communities.map((slug) => (
        <A
          key={slug}
          href={`communaute/${slug}`}
          class='inline-flex h-[30px] items-center rounded-[5px] border border-figure-edge bg-surface-100 px-2.5 text-[13px] text-ink no-underline shadow-tile hover:bg-surface-200 hover:no-underline'
        >
          {communities.find((c) => c.slug === slug)?.name}
        </A>
      ))}
    </div>
  </section>
)

const NotFound = ({ login }: { login: string }) => (
  <Page title='Profil introuvable' class='pt-5'>
    <GhostSlab>
      <EmptyState action={<Button href='explorer'>Explorer</Button>}>
        {t`Aucun développeur « ${login} » sur Pamoja.`}
      </EmptyState>
    </GhostSlab>
  </Page>
)

const sections: Record<
  ProfileSection,
  (props: { login: Login }) => preact.JSX.Element | null
> = {
  building: Building,
  contributions: Contributions,
  reputation: Reputation,
  badges: Badges,
  activity: Activity,
  communities: Communities,
  map: CollaborationMap,
  graph: CollaborationGraph,
}

/**
 * /@login: hero, stats then the sections in the order chosen by the
 * developer, in the theme and accent of the profile (§9.1, §9.2).
 */
export const ProfilePage = () => {
  profileChanged.value
  peopleChanged.value
  const login = profileLogin()
  if (!login) return <NotFound login={url.relativePath.slice(2)} />
  const { theme, accent, order } = settingsOf(login)
  return (
    <Page title={people[login].name} heading={false} class='pt-5'>
      <div
        data-ptheme={theme}
        data-paccent={accent}
        class={`flex flex-col gap-8 rounded-[14px] bg-surface-000 text-ink ${
          theme === 'minimal' ? '' : 'px-[18px] pt-5 pb-7'
        }`}
      >
        <Hero login={login} />
        <Stats login={login} />
        <div class='mr-2 flex flex-col gap-8'>
          {order.map((key) => {
            const Section = sections[key]
            return <Section key={key} login={login} />
          })}
        </div>
      </div>
      <ProofsDrawer login={login} />
      <ShareDialog login={login} />
      {!isMe(login) && <CollaborationDialog login={login} />}
    </Page>
  )
}

/**
 * The profile seen without a session: the passport, outside the app shell
 * (§9.3). Until sessions exist (PAM-110) it shows at /@login?vue=publique.
 */
export const PassportPage = () => {
  const login = profileLogin()
  if (login) return <Passport login={login} />
  return (
    <main class='mx-auto w-full max-w-[820px] px-6'>
      <ProfilePage />
    </main>
  )
}
