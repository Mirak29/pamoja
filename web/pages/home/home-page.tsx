import { counted } from '/web/lib/plural.ts'
import type { JSX } from 'preact'
import { signal } from '@preact/signals'
import { useRef, useState } from 'preact/hooks'
import { A, navigate, url } from '@01edu/signal-router'
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Code,
  GitMerge,
  GitPullRequest,
  Image,
  LifeBuoy,
  Send,
  Tag,
  UserPlus,
  Zap,
} from '/web/assets/icons.tsx'
import { activityKind, recentActivityOf } from '/web/fixtures/activity.ts'
import { communities } from '/web/fixtures/communities.ts'
import { helpRequests, matchingRequests } from '/web/fixtures/help.ts'
import {
  isMe,
  type Login,
  me,
  people,
  peopleChanged,
  type Person,
  personOf,
  toggleFollowing,
} from '/web/fixtures/people.ts'
import {
  type Post,
  posts,
  postsChanged,
  type PostType,
} from '/web/fixtures/posts.ts'
import {
  type Project,
  projects,
  projectsChanged,
} from '/web/fixtures/projects.ts'
import { pullRequests } from '/web/fixtures/pull-requests.ts'
import { confirmedHelpsOf } from '/web/fixtures/reputation.ts'
import { ago } from '/web/lib/time.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { DemoBadge, SkillChip } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { InfiniteList, useBatches } from '/web/ui/infinite-list.tsx'
import { Page } from '/web/ui/layout.tsx'
import { NewPostDialog } from '/web/ui/new-post-dialog.tsx'
import { PostCard } from '/web/ui/post.tsx'
import { Tabs } from '/web/ui/tabs.tsx'
import { notify } from '/web/ui/toast.tsx'
import { dotted, t } from '/web/lib/language.ts'
import { LIMITS } from '/api/limits.ts'
import { Counter } from '/web/ui/input.tsx'
import { overLimit } from '/web/lib/limits.ts'
import { savePost } from '/web/lib/posts.ts'
import { IMAGE_TYPES, MediaThumbs, useMediaPicker } from '/web/ui/media.tsx'
import { VideoEmbed, videoIn } from '/web/ui/video.tsx'

type IconComponent = (props: JSX.IntrinsicElements['svg']) => JSX.Element

// URL key and label of each feed tab (§6.2)
const feedTabs = [
  ['for-you', 'Pour toi'],
  ['following', 'Abonnements'],
  ['communities', 'Communautés'],
  ['questions', 'Questions'],
] as const

type FeedTab = typeof feedTabs[number][0]

const emptyTexts: Record<FeedTab, string> = {
  'for-you': 'Rien pour l’instant.',
  following: 'Suis des développeurs et des projets pour remplir ce fil.',
  communities: 'Rejoins des communautés pour voir leurs discussions ici.',
  questions: 'Rien pour l’instant.',
}

const composerTypes: PostType[] = [
  'Discussion',
  'Question',
  'Mise à jour de projet',
  'Vitrine',
  'Ressource',
  'Opportunité',
  'Release',
]

// Help requests set aside with « Plus tard » during the session
const dismissedHelp = signal<string[]>([])

// The author of a PR is often not on Pamoja: personOf names them anyway
const firstName = (login: string) => personOf(login).name.split(' ')[0]

/** Projects I build or follow: their GitHub events reach the feed */
const myProjects = () =>
  Object.values(projects as Record<string, Project>).filter((p) =>
    p.owner === me.login || p.members.some((m) => isMe(m.login)) ||
    p.followers.some(isMe)
  )

const githubEvent = /PR|CI|[Rr]elease|[Rr]eview|[Ss]ynchro|merg/

const eventIcons: [RegExp, IconComponent, string][] = [
  [/merg/, GitMerge, 'text-indigo'],
  [/CI en échec/, CircleX, 'text-danger'],
  [/CI réparée/, CircleCheck, 'text-verified'],
  [/[Rr]elease/, Tag, 'text-indigo'],
  [/[Rr]eview/, GitPullRequest, 'text-verified'],
  [/[Ss]ynchro/, Zap, 'text-indigo'],
]

const GithubEvent = (
  { project, text, at, session }: {
    project: Project
    text: string
    at: number
    session?: boolean
  },
) => {
  const [, Icon, color] = eventIcons.find(([pattern]) => pattern.test(text)) ??
    [, GitPullRequest, 'text-indigo']
  return (
    <div class='tile mr-2 flex flex-wrap items-center gap-3 rounded-[8px] px-4 py-3'>
      <span
        class={`tile flex size-9 flex-none items-center justify-center ${color}`}
      >
        <Icon class='size-[18px]' />
      </span>
      <div class='flex min-w-[220px] flex-1 flex-col gap-0.5'>
        <span class='text-[14px] leading-[21px] text-pretty'>{text}</span>
        <span class='text-[12px] text-ink-muted'>
          <A
            href={`project/${project.slug}/channels/updates`}
            class='font-semibold'
          >
            {project.name}
          </A>{' '}
          · {ago(at)}
        </span>
      </div>
      {(session || project.demo) && <DemoBadge />}
    </div>
  )
}

const HelpInsert = (
  { request, score }: { request: typeof helpRequests[0]; score: number },
) => (
  <article class='slab-selected mr-2 flex flex-col gap-2.5 px-[18px] py-4'>
    <div class='flex items-center justify-between gap-2.5'>
      <Eyebrow accent>Ce projet a besoin de toi</Eyebrow>
      <span class='font-mono text-[13px] leading-none font-medium text-indigo'>
        {score} / 100
      </span>
    </div>
    <A
      href={`help/${request.id}`}
      class='font-display text-[18px] leading-[25px] font-semibold text-pretty text-ink hover:text-indigo hover:no-underline'
    >
      <span translate={false} class='wrap-anywhere'>{request.title}</span>
    </A>
    <span class='text-[13px] text-ink-muted'>
      {dotted([
        request.type,
        request.project &&
        (
          <span key='project' translate={false}>
            {projects[request.project]?.name ?? request.project}
          </span>
        ),
        <span key='author' translate={false}>
          {personOf(request.author).name}
        </span>,
        ago(request.at),
        request.duration,
        request.level,
      ])}
    </span>
    <div class='flex flex-wrap gap-1.5'>
      {request.skills.map((skill) => (
        <SkillChip key={skill} match={me.skills.includes(skill)}>
          {skill}
        </SkillChip>
      ))}
    </div>
    <div class='flex flex-wrap gap-3 py-1'>
      <Button size={36} href={`help/${request.id}`}>Voir la demande</Button>
      <Button
        variant='secondary'
        size={36}
        onClick={() =>
          dismissedHelp.value = [...dismissedHelp.value, request.id]}
      >
        Plus tard
      </Button>
    </div>
  </article>
)

// `node` is built only for the items a batch shows
type FeedItem = { at: number; key: string; node: () => JSX.Element }

/** Posts, reposts, GitHub events and a matching help request (§6.2) */
const feedItems = (tab: FeedTab): FeedItem[] => {
  const followed = me.follows ?? []
  const mine = myProjects()
  const slugs = mine.map((p) => p.slug)
  const entries: { at: number; post: Post; repostBy?: Login; fol: boolean }[] =
    []
  for (const post of posts) {
    if (post.parent || (post.hidden && !isMe(post.author))) continue
    const community = me.communities.includes(post.community)
    const fol = followed.includes(post.author) || isMe(post.author) ||
      (!!post.link && slugs.includes(post.link))
    if (
      tab === 'for-you' || (tab === 'following' && fol) ||
      (tab === 'communities' && community) ||
      (tab === 'questions' && post.type === 'Question')
    ) entries.push({ at: post.at, post, fol })
    if (tab !== 'for-you' && tab !== 'following') continue
    for (const repost of post.reposts) {
      if (followed.includes(repost.by) || isMe(repost.by)) {
        entries.push({ at: repost.at, post, repostBy: repost.by, fol: true })
      }
    }
  }
  entries.sort((a, b) =>
    tab === 'questions'
      ? Number(!!a.post.acceptedReply) - Number(!!b.post.acceptedReply) ||
        b.at - a.at
      : b.at - a.at
  )
  const seen = new Set<string>()
  let items: FeedItem[] = entries
    .filter(({ post }) => !seen.has(post.id) && seen.add(post.id))
    .map(({ at, post, repostBy }) => ({
      at,
      key: post.id,
      node: () => <PostCard post={post} repostBy={repostBy} />,
    }))
  if (tab === 'for-you' || tab === 'following') {
    const events = mine.flatMap((project) =>
      recentActivityOf(project)
        .filter((entry) =>
          githubEvent.test(entry.text) && activityKind(entry.text) !== 'help'
        )
        .map((entry) => ({
          at: entry.at,
          key: `${project.slug}-${entry.at}-${entry.text}`,
          node: () => (
            <GithubEvent
              project={project}
              text={entry.text}
              at={entry.at}
              session={entry.session}
            />
          ),
        }))
    )
    items = [...items, ...events].sort((a, b) => b.at - a.at)
  }
  // Every item: the page shows them by batches (§12.7)
  if (tab === 'for-you') {
    const top = matchingRequests(me).find(({ request }) =>
      !dismissedHelp.value.includes(request.id)
    )
    if (top) {
      items.splice(Math.min(1, items.length), 0, {
        at: 0,
        key: `help-${top.request.id}`,
        node: () => <HelpInsert request={top.request} score={top.score} />,
      })
    }
  }
  return items
}

const FENCE = '`'.repeat(3)

const Composer = () => {
  const [text, setText] = useState('')
  const [community, setCommunity] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)
  const [type, setType] = useState<PostType>('Discussion')
  // Uploaded as soon as they are picked, dropped or pasted (§17.3)
  const picker = useMediaPicker(4)
  const files = useRef<HTMLInputElement>(null)
  const [sending, setSending] = useState(false)
  // On a phone the tools show once one writes: the feed comes sooner
  const [touched, setTouched] = useState(false)
  const opened = touched || !!text || picker.items.length > 0
  // A YouTube, Loom or Vimeo link pasted in the text becomes the video
  const video = videoIn(text)
  const ordered = [...communities].sort((a, b) =>
    Number(me.communities.includes(b.slug)) -
    Number(me.communities.includes(a.slug))
  )
  const publish = async () => {
    if (!text.trim() || overLimit(text, 'post')) return
    if (sending || picker.uploading) return
    setSending(true)
    const post = await savePost({
      community,
      type,
      title: '',
      body: text.trim(),
      media: picker.media,
      video,
    }).catch(() => undefined)
    setSending(false)
    if (!post) {
      notify({
        title: 'Post non publié',
        body: 'Réessaie dans un instant.',
        icon: CircleAlert,
        tone: 'warning',
      })
      return
    }
    setText('')
    picker.reset()
    navigate({ params: { feed: null } })
    field.current?.focus()
    const name = communities.find((c) => c.slug === community)?.name
    notify({
      title: 'Publié',
      body: name
        ? t`Dans ${name}. Tes abonnés le voient dans leur fil.`
        : 'Sur ton profil. Tes abonnés le voient dans leur fil.',
      icon: Send,
      tone: 'verified',
    })
  }
  const tool =
    'flex size-8 cursor-pointer items-center justify-center rounded-md border border-transparent text-indigo hover:bg-indigo-soft'
  const select =
    'well h-8 w-[180px] max-w-full min-w-0 px-2 text-[13px] leading-none font-medium text-ink'
  return (
    <section class='slab mr-2 flex gap-3.5 px-[18px] py-4'>
      <Avatar name={me.name} src={me.avatarUrl} size={42} />
      <div class='flex min-w-0 flex-1 flex-col gap-3'>
        <textarea
          ref={field}
          rows={opened ? 3 : 1}
          value={text}
          onFocus={() => setTouched(true)}
          aria-label='Écrire un post'
          placeholder={opened
            ? 'Sur quoi tu travailles ? Une question, une astuce, du code, un lien vidéo…'
            : 'Sur quoi tu travailles ?'}
          onInput={(event) => setText(event.currentTarget.value)}
          onPaste={picker.onPaste}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            const dropped = [...event.dataTransfer?.files ?? []]
            if (!dropped.length) return
            event.preventDefault()
            picker.add(dropped)
          }}
          onKeyDown={(event) =>
            event.key === 'Enter' && (event.metaKey || event.ctrlKey) &&
            publish()}
          maxLength={LIMITS.post}
          class='well w-full resize-y px-3 py-2.5 text-[16px] leading-[23px] text-ink'
        />
        <Counter value={text} limit={LIMITS.post} />
        <MediaThumbs picker={picker} />
        {video && <VideoEmbed url={video} />}
        <div
          class={`flex-wrap items-center gap-2 sm:flex ${
            opened ? 'flex' : 'hidden'
          }`}
        >
          <input
            ref={files}
            type='file'
            accept={IMAGE_TYPES.join(',')}
            multiple
            class='hidden'
            onChange={(event) => {
              picker.add([...event.currentTarget.files ?? []])
              event.currentTarget.value = ''
            }}
          />
          <button
            type='button'
            aria-label='Ajouter une image'
            title='Ajouter une image (4 maximum) ; une vidéo se colle en lien dans le texte'
            disabled={picker.full}
            onClick={() => files.current?.click()}
            class={`${tool} disabled:cursor-default disabled:opacity-50`}
          >
            <Image />
          </button>
          <button
            type='button'
            aria-label='Ajouter un bloc de code'
            title='Bloc de code'
            onClick={() =>
              setText(`${text}${text ? '\n\n' : ''}${FENCE}\n\n${FENCE}`)}
            class={tool}
          >
            <Code />
          </button>
          <select
            aria-label='Communauté'
            value={community}
            onChange={(event) => setCommunity(event.currentTarget.value)}
            class={select}
          >
            <option value=''>Sans communauté</option>
            {ordered.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <select
            aria-label='Type de post'
            value={type}
            onChange={(event) => setType(event.currentTarget.value as PostType)}
            class={select}
          >
            {composerTypes.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <span class='flex-1' />
          <Button
            size={36}
            disabled={!text.trim() || picker.uploading}
            aria-busy={sending}
            onClick={publish}
          >
            {sending ? 'Publication…' : 'Publier'}
          </Button>
        </div>
      </div>
    </section>
  )
}

const RailSection = (
  { title, accent, children }: {
    title: string
    accent?: boolean
    children: preact.ComponentChildren
  },
) => (
  <section class='slab flex flex-col gap-1 px-[18px] py-4'>
    <Eyebrow accent={accent}>{title}</Eyebrow>
    {children}
  </section>
)

/** What deserves attention today: help, reviews, people, projects */
const homeData = () => {
  const matches = matchingRequests(me)
  const slugs = myProjects().map((p) => p.slug)
  // Reviews I can give: my own PRs wait for others
  const waiting = pullRequests.filter((pr) =>
    pr.state === 'open' && pr.review === 'waiting' && !isMe(pr.author) &&
    slugs.includes(pr.project)
  )
  return {
    matches,
    waiting,
    matchTitle: matches.length
      ? t`${
        counted(
          matches.length,
          'demande d’aide correspond',
          'demandes d’aide correspondent',
        )
      } à tes skills`
      : 'Aucune demande ne correspond à tes skills',
    reviewTitle: waiting.length
      ? counted(
        waiting.length,
        'PR attend une review',
        'PRs attendent une review',
      )
      : 'Aucune PR en attente',
  }
}

const Rail = () => {
  const { matches, waiting, matchTitle, reviewTitle } = homeData()
  const followed = me.follows ?? []
  const people_ = (Object.values(people) as Person[])
    .filter((p) => !isMe(p.login as Login) && !followed.includes(p.login))
    .map((p) => ({
      person: p,
      hits: p.skills.filter((skill) => me.skills.includes(skill)),
    }))
    .filter(({ hits }) => hits.length)
    .sort((a, b) =>
      b.hits.length - a.hits.length ||
      confirmedHelpsOf(b.person.login as Login) -
        confirmedHelpsOf(a.person.login as Login)
    )
    .slice(0, 3)
  const seeking = Object.values(projects as Record<string, Project>)
    .filter((p) => p.owner !== me.login && p.needs.length)
    .slice(0, 3)
  const follow = (person: Person) => {
    toggleFollowing(person.login)
    notify({
      title: t`Tu suis ${person.name}`,
      body: 'Ses posts et republications arrivent dans ton fil.',
      icon: UserPlus,
      tone: 'verified',
    })
  }
  return (
    <aside
      aria-label='Pour toi'
      data-scroller=''
      class='sticky top-24 hidden max-h-[calc(100vh-112px)] flex-col gap-6 overflow-y-auto pr-2.5 pb-4 [scrollbar-color:transparent_transparent] [scrollbar-width:thin] hover:[scrollbar-color:var(--line-control)_transparent] min-[1100px]:flex'
    >
      <RailSection title={matchTitle} accent>
        {matches.slice(0, 3).map(({ request, score }) => (
          <A
            key={request.id}
            href={`help/${request.id}`}
            class='flex items-start gap-2.5 border-b border-line py-2.5 text-ink no-underline hover:no-underline'
          >
            <span class='tile flex h-[26px] min-w-[38px] flex-none items-center justify-center rounded-[5px] px-[5px] font-mono text-[13px] leading-none font-medium'>
              {score}
            </span>
            <span class='flex min-w-0 flex-1 flex-col'>
              <span
                translate={false}
                class='wrap-anywhere text-[14px] leading-5 font-semibold text-pretty'
              >
                {request.title}
              </span>
              <span class='text-[12px] leading-4 text-ink-muted'>
                {request.type}
                {request.project &&
                  ` · ${projects[request.project]?.name ?? request.project}`}
              </span>
            </span>
          </A>
        ))}
        <A href='help' class='pt-2.5 text-[13px] font-semibold'>
          Voir l’aide
        </A>
      </RailSection>
      <RailSection title={reviewTitle}>
        {waiting.slice(0, 4).map((pr) => (
          <A
            key={`${pr.project}-${pr.number}`}
            href={`project/${pr.project}/prs`}
            params={{ dialog: `pr-${pr.number}` }}
            class='flex flex-col border-b border-line py-2.5 text-ink no-underline hover:no-underline'
          >
            <span class='text-[14px] leading-5 font-semibold'>
              <span class='font-mono text-[13px] leading-5 font-medium text-ink-muted'>
                #{pr.number}
              </span>{' '}
              {pr.title}
            </span>
            <span class='text-[12px] leading-4 text-ink-muted'>
              {projects[pr.project].name} · {firstName(pr.author)} · ouverte
              {' '}
              {ago(pr.at)}
            </span>
          </A>
        ))}
        {!waiting.length && (
          <span class='pt-2 text-[13px] text-ink-muted'>Rien à relire.</span>
        )}
      </RailSection>
      <RailSection title='Avec qui construire'>
        {people_.map(({ person, hits }) => (
          <div
            key={person.login}
            class='flex items-center gap-2.5 border-b border-line py-2.5'
          >
            <A
              href={`@${person.login}`}
              class='flex min-w-0 flex-1 items-center gap-2.5 text-ink no-underline hover:no-underline'
            >
              <Avatar name={person.name} src={person.avatarUrl} size={34} />
              <span class='flex min-w-0 flex-col'>
                <span class='font-display text-[14px] leading-[18px] font-semibold'>
                  {person.name}
                </span>
                <span class='text-[12px] leading-4 font-semibold text-indigo'>
                  {hits.join(', ')} en commun
                </span>
              </span>
            </A>
            <button
              type='button'
              onClick={() => follow(person)}
              class='key key-secondary h-[30px] rounded-md px-3 text-[13px]'
            >
              Suivre
            </button>
          </div>
        ))}
        <A href='explore' class='pt-2.5 text-[13px] font-semibold'>
          Explorer les développeurs
        </A>
      </RailSection>
      <RailSection title='Ils cherchent des contributeurs'>
        {seeking.map((project) => (
          <A
            key={project.slug}
            href={`project/${project.slug}`}
            class='flex flex-col border-b border-line py-2.5 text-ink no-underline hover:no-underline'
          >
            <span class='font-display text-[14px] leading-5 font-semibold'>
              {project.name}
            </span>
            <span class='text-[12px] leading-4 text-ink-muted'>
              On cherche {project.needs.join(', ')}
            </span>
          </A>
        ))}
      </RailSection>
    </aside>
  )
}

/** Accueil: compose, read the feed, see what needs you (§6.2, §10.1) */
export const HomePage = () => {
  postsChanged.value
  peopleChanged.value
  projectsChanged.value
  dismissedHelp.value
  const current = feedTabs.find(([key]) => key === url.params.feed)?.[0] ??
    'for-you'
  const items = feedItems(current)
  const { shown, more, next } = useBatches(items, current)
  const { matches, waiting } = homeData()
  return (
    <Page
      title='Accueil'
      class='grid items-start gap-8 pt-5 min-[1100px]:grid-cols-[minmax(0,1fr)_330px]'
    >
      <div class='flex w-full max-w-[720px] min-w-0 flex-col gap-5'>
        {/* Short labels: the rail says the long ones on wide screens */}
        <div class='flex flex-wrap gap-3 pb-1 min-[1100px]:hidden'>
          <Button href='help'>
            <LifeBuoy />
            {counted(matches.length, 'demande pour toi', 'demandes pour toi')}
          </Button>
          <Button
            variant='secondary'
            href={waiting[0] ? `project/${waiting[0].project}/prs` : 'projects'}
          >
            {counted(waiting.length, 'PR à relire', 'PRs à relire')}
          </Button>
        </div>
        <Composer />
        <Tabs
          label='Fil'
          current={current}
          roomy
          tabs={feedTabs.map(([key, label], i) => ({
            key,
            label,
            params: { feed: i ? key : null },
          }))}
        />
        <InfiniteList
          more={more}
          onMore={next}
          end='Tu as tout vu. Suis des développeurs ou des communautés pour voir plus de publications.'
          class='flex flex-col gap-5'
        >
          {shown.map((item) => <div key={item.key}>{item.node()}</div>)}
        </InfiniteList>
        {!items.length && (
          <div class='mr-2 rounded-lg border border-dashed border-line-control px-6 py-8 text-center text-ink-muted'>
            {emptyTexts[current]}
          </div>
        )}
      </div>
      <Rail />
      <NewPostDialog />
    </Page>
  )
}
