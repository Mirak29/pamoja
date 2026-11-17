import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { A } from '/web/ui/link.tsx'
import {
  Compass,
  FolderGit2,
  Github,
  LifeBuoy,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
} from '/web/assets/icons.tsx'
import { type Login, people, placeOf } from '/web/fixtures/people.ts'
import { Portrait } from '/web/ui/avatar.tsx'
import { Button } from '/web/ui/button.tsx'
import { DemoButton } from '/web/ui/demo-button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Plates } from '/web/ui/plates.tsx'
import { Progress } from '/web/ui/progress.tsx'
import { passportLink, PublicHeader } from '/web/ui/public-header.tsx'
import { VideoEmbed } from '/web/ui/video.tsx'
import { LANDING_VIDEO } from '/api/video-links.ts'
import { dimensionsOf } from '/web/pages/profile/reputation.tsx'
import { LandingScene } from '/web/pages/public/landing-scene.tsx'
import { t } from '/web/lib/language.ts'

// The developer shown to visitors, as in the demo scenario (§18)
const sample: Login = 'moussa'

// Where the demo of the contest stands on the page (§17.3)
const DEMO_ID = 'demo-video'

/** True once the element entered the screen, and for good */
const useShown = <T extends Element>() => {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element || !('IntersectionObserver' in globalThis)) {
      setShown(true)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setShown(true)
      observer.disconnect()
    }, { rootMargin: '0px 0px -8% 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, shown] as const
}

/**
 * A block that comes in along the 30° axis once it is read. It wraps its
 * content: a slab keeps its own relief and transitions.
 */
const Reveal = (
  { delay, class: className = '', children }: {
    /** Milliseconds after its neighbours, for a row that comes in turn */
    delay?: number
    class?: string
    children: ComponentChildren
  },
) => {
  const [ref, shown] = useShown<HTMLDivElement>()
  return (
    <div
      ref={ref}
      data-shown={shown || undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      class={`reveal ${className}`}
    >
      {children}
    </div>
  )
}

const Face = ({ points, fill }: { points: string; fill: string }) => (
  <polygon
    points={points}
    fill={fill}
    stroke='var(--ink)'
    stroke-width='0.9'
    stroke-linejoin='round'
  />
)

/** A person, seen as a disc with its thickness */
const Disc = (
  { x, y, r, active }: { x: number; y: number; r: number; active?: boolean },
) => (
  <>
    <circle cx={x + 1.7} cy={y + 1} r={r} fill='var(--figure-edge)' />
    <circle
      cx={x}
      cy={y}
      r={r}
      fill='var(--surface-200)'
      stroke={active ? 'var(--indigo)' : 'var(--figure-edge)'}
      stroke-width={active ? 1.6 : 1}
    />
  </>
)

// A pull request leaves for help, the developers who match, the review
// approved, the proof that rises as a column
const steps = [
  {
    title: 'Demander',
    text:
      'Abdou ouvre la PR #81 et demande une review. Le formulaire se remplit depuis la PR.',
    Figure: () => (
      <>
        <Face points='26 66 60 85.6 60 111.6 26 92' fill='var(--surface-100)' />
        <Face points='60 85.6 94 66 94 92 60 111.6' fill='var(--side)' />
        <Face points='60 46.4 94 66 60 85.6 26 66' fill='var(--indigo-soft)' />
        <line
          x1='44'
          y1='54'
          x2='64'
          y2='65'
          stroke='var(--figure-edge)'
          stroke-width='0.9'
        />
        <line
          x1='50'
          y1='50'
          x2='78'
          y2='66'
          stroke='var(--indigo)'
          stroke-width='1.5'
        />
        <path
          d='M94 52 C 116 34, 128 30, 138 32'
          stroke='var(--indigo)'
          stroke-width='1.5'
          stroke-dasharray='4 4'
        />
        <circle
          cx='140'
          cy='32'
          r='4'
          fill='var(--surface-100)'
          stroke='var(--indigo)'
          stroke-width='1.5'
        />
      </>
    ),
  },
  {
    title: 'Matcher',
    text:
      'Pamoja trouve les 5 développeurs qui correspondent le mieux, et explique pourquoi.',
    Figure: () => (
      <>
        <path
          d='M18 70 C 50 40, 62 40, 80 52'
          stroke='var(--indigo)'
          stroke-width='1.5'
          stroke-dasharray='4 4'
        />
        <Disc x={36} y={72} r={11} />
        <Disc x={80} y={54} r={14} active />
        <Disc x={124} y={74} r={11} />
        <line
          x1='80'
          y1='68'
          x2='124'
          y2='74'
          stroke='var(--figure-edge)'
          stroke-dasharray='2 3'
        />
        <text
          x='80'
          y='31'
          text-anchor='middle'
          fill='var(--indigo)'
          class='font-mono text-[11px] font-medium'
        >
          93 / 100
        </text>
      </>
    ),
  },
  {
    title: 'Relire',
    text: 'Moussa, à Abidjan, accepte et relit la PR directement sur GitHub.',
    Figure: () => (
      <>
        <Face
          points='34 76 80 102.5 80 110.5 34 84'
          fill='var(--surface-100)'
        />
        <Face points='80 102.5 126 76 126 84 80 110.5' fill='var(--side)' />
        <Face
          points='80 49.5 126 76 80 102.5 34 76'
          fill='var(--surface-100)'
        />
        <line
          x1='58'
          y1='58'
          x2='86'
          y2='74'
          stroke='var(--figure-edge)'
          stroke-width='0.9'
        />
        <line
          x1='66'
          y1='53'
          x2='94'
          y2='69'
          stroke='var(--figure-edge)'
          stroke-width='0.9'
        />
        <polyline
          points='88,54 96,59 112,48'
          stroke='var(--verified)'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        />
      </>
    ),
  },
  {
    title: 'Prouver',
    text:
      'GitHub confirme la review : elle devient une preuve vérifiée sur son profil.',
    Figure: () => (
      <>
        <Face points='36 76 56 87.5 56 109.5 36 98' fill='var(--surface-100)' />
        <Face points='56 87.5 76 76 76 98 56 109.5' fill='var(--side)' />
        <Face points='56 64.5 76 76 56 87.5 36 76' fill='var(--indigo-soft)' />
        <Face
          points='84 48 104 59.5 104 109.5 84 98'
          fill='var(--surface-100)'
        />
        <Face points='104 59.5 124 48 124 98 104 109.5' fill='var(--side)' />
        <Face points='104 36.5 124 48 104 59.5 84 48' fill='var(--indigo)' />
        <path
          d='M56 64 C 70 40, 88 34, 104 37'
          stroke='var(--indigo)'
          stroke-width='1.5'
        />
      </>
    ),
  },
]

// The step of the story the figure is playing, lit on the same clock
const stepClocks = [
  'animate-scene-step-1',
  'animate-scene-step-2',
  'animate-scene-step-3',
  'animate-scene-step-4',
]

const toVideo = () =>
  document.getElementById(DEMO_ID)?.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
    block: 'center',
  })

const Hero = () => (
  <section class='relative isolate grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-x-8 gap-y-9 pt-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'>
    <div
      aria-hidden='true'
      class='iso-ground pointer-events-none absolute -inset-x-7 -top-12 -bottom-10 -z-10'
    />
    <div class='flex flex-col gap-[22px]'>
      <Eyebrow accent>Pour les développeurs africains</Eyebrow>
      <h1 class='font-display text-[44px] leading-[46px] font-bold tracking-[-.025em] text-balance md:text-[64px] md:leading-[64px]'>
        Your work is{' '}
        <span class='relative inline-block'>
          your profile.
          {/* The thread of the brand, drawn under what it ties together */}
          <svg
            viewBox='0 0 300 12'
            preserveAspectRatio='none'
            aria-hidden='true'
            fill='none'
            class='absolute -bottom-2 left-0 h-3 w-full'
          >
            <path
              d='M2 8 C 70 1, 160 12, 298 4'
              stroke='var(--indigo)'
              stroke-width='3'
              stroke-linecap='round'
              vector-effect='non-scaling-stroke'
              pathLength='1'
              stroke-dasharray='1'
              class='animate-thread motion-reduce:animate-none'
            />
          </svg>
        </span>
      </h1>
      <p class='max-w-[520px] text-[18px] leading-[29px] text-pretty text-ink-muted'>
        Pamoja relie les développeurs autour de leur vrai travail : reviews,
        PRs, projets. GitHub reste la source du code, Pamoja ajoute la couche
        humaine.
      </p>
      <div class='flex flex-wrap gap-3.5'>
        <Button size={48} href='login'>
          <Github class='size-[18px]' />
          Continuer avec GitHub
        </Button>
        <DemoButton size={48} />
      </div>
      <div class='flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] font-semibold'>
        <button
          type='button'
          onClick={toVideo}
          class='inline-flex cursor-pointer items-center gap-1.5 text-indigo hover:underline'
        >
          <Play class='size-4' />
          Voir la démo en vidéo
        </button>
        <A {...passportLink(sample)}>Voir un profil</A>
        <A href='feed'>Lire le fil sans compte</A>
      </div>
      <span class='text-[13px] text-ink-muted'>
        « Pamoja » signifie « ensemble » en swahili.
      </span>
    </div>
    {/* The loop told by the next section, played: read there, seen here */}
    <div aria-hidden='true' class='flex flex-col items-center gap-3.5'>
      <LandingScene />
      <ol class='flex flex-wrap justify-center gap-2'>
        {steps.map(({ title }, i) => (
          <li
            key={title}
            class={`flex items-center gap-2 rounded-md border border-line-strong px-2.5 py-1.5 font-mono text-[12px] leading-none text-ink-muted motion-reduce:animate-none ${
              stepClocks[i]
            }`}
          >
            <span>{i + 1}</span>
            {title}
          </li>
        ))}
      </ol>
    </div>
  </section>
)

/**
 * What the video shows before it plays: its thumbnail, served by Pamoja to
 * visitors for this video only, over a figure drawn here in case it fails
 */
const DemoPoster = () => {
  const [failed, setFailed] = useState(false)
  return (
    <span class='absolute inset-0 overflow-hidden bg-surface-000'>
      <span class='iso-ground absolute inset-0 [--ground-at:50%_50%]' />
      <span class='absolute top-4 left-4 md:top-6 md:left-6'>
        <Eyebrow accent>CADEV 2026</Eyebrow>
      </span>
      <span class='absolute right-[6%] bottom-[14%] hidden md:block'>
        <Plates width={230} />
      </span>
      <span class='absolute bottom-[26%] left-[6%] hidden max-w-[300px] text-left font-display text-[30px] leading-[34px] font-bold tracking-[-.015em] text-ink md:block'>
        De la PR à la preuve, pour de vrai.
      </span>
      {!failed && (
        <img
          src={`api/video/thumbnail?url=${encodeURIComponent(LANDING_VIDEO)}`}
          alt=''
          loading='lazy'
          onError={() => setFailed(true)}
          class='absolute inset-0 size-full object-cover'
        />
      )}
    </span>
  )
}

const Demo = () => (
  <section id={DEMO_ID} class='flex scroll-mt-8 flex-col gap-7'>
    <Reveal class='flex flex-col gap-2'>
      <Eyebrow>La démo</Eyebrow>
      <h2 class='font-display text-[36px] leading-[42px] font-bold tracking-[-.015em] text-balance'>
        Pamoja en vrai, en vidéo
      </h2>
      <p class='max-w-[640px] text-[17px] leading-[27px] text-pretty text-ink-muted'>
        La démo de Pamoja pour le concours CADEV 2026.
      </p>
    </Reveal>
    <Reveal delay={120}>
      <div class='slab mr-2 p-2.5 md:p-3.5'>
        <VideoEmbed
          url={LANDING_VIDEO}
          label='Démo de Pamoja'
          poster={<DemoPoster />}
        />
      </div>
    </Reveal>
  </section>
)

const Loop = () => (
  <section class='flex flex-col gap-7'>
    <Reveal class='flex flex-col gap-2'>
      <Eyebrow>La boucle</Eyebrow>
      <h2 class='font-display text-[36px] leading-[42px] font-bold tracking-[-.015em] text-balance'>
        De la PR à la preuve, en quatre étapes
      </h2>
    </Reveal>
    <div class='grid grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-6'>
      {steps.map(({ title, text, Figure }, i) => (
        <Reveal key={title} delay={i * 90} class='flex'>
          <div class='slab mr-2 flex flex-1 flex-col gap-2.5 p-[18px]'>
            <svg
              width='100%'
              height='110'
              viewBox='0 0 160 110'
              aria-hidden='true'
              fill='none'
            >
              <Figure />
            </svg>
            <div class='flex items-center gap-2.5'>
              <span class='flex size-7 flex-none items-center justify-center rounded-[5px] border border-figure-edge font-mono text-[13px] leading-none font-medium shadow-tile'>
                {i + 1}
              </span>
              <span class='font-display text-[19px] leading-6 font-semibold'>
                {title}
              </span>
            </div>
            <span class='text-[14px] leading-[22px] text-pretty text-ink-muted'>
              {text}
            </span>
          </div>
        </Reveal>
      ))}
    </div>
  </section>
)

// What a developer finds once inside, one slab per place of the app
const features = [
  {
    Icon: LifeBuoy,
    title: 'Demandes d’aide',
    text:
      'Review de PR, debug, mentorat : ta demande part aux développeurs qui correspondent, avec un score expliqué.',
  },
  {
    Icon: FolderGit2,
    title: 'Projets',
    text:
      'Importe ton repo GitHub public : board, roadmap, canaux et Pulse de la semaine.',
  },
  {
    Icon: Users,
    title: 'Communautés',
    text:
      'Par techno, pays ou domaine : des questions, des réponses acceptées, de l’entraide.',
  },
  {
    Icon: ShieldCheck,
    title: 'Réputation vérifiée',
    text:
      'Une review confirmée par GitHub devient une preuve. Des badges qui se gagnent, pas de score global.',
  },
  {
    Icon: Compass,
    title: 'Explorer',
    text:
      'Des développeurs, des projets à rejoindre et des issues pour commencer.',
  },
  {
    Icon: Sparkles,
    title: 'Assistant',
    text:
      'Un compagnon sur chaque page : il répond à partir de ton profil et de ce qui t’attend, sans rien inventer.',
  },
]

const Features = () => (
  <section class='flex flex-col gap-7'>
    <Reveal class='flex flex-col gap-2'>
      <Eyebrow>La plateforme</Eyebrow>
      <h2 class='font-display text-[36px] leading-[42px] font-bold tracking-[-.015em] text-balance'>
        Tout ce qu’il faut pour construire ensemble
      </h2>
    </Reveal>
    <div class='grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6'>
      {features.map(({ Icon, title, text }, i) => (
        <Reveal key={title} delay={(i % 3) * 90} class='flex'>
          <div class='slab mr-2 flex flex-1 flex-col gap-2.5 p-5'>
            <span class='tile flex size-10 items-center justify-center text-indigo'>
              <Icon class='size-5' />
            </span>
            <span class='font-display text-[19px] leading-6 font-semibold'>
              {title}
            </span>
            <span class='text-[14px] leading-[22px] text-pretty text-ink-muted'>
              {text}
            </span>
          </div>
        </Reveal>
      ))}
    </div>
  </section>
)

/** The five dimensions of a real profile, out of 20 proofs */
const ProfilePreview = (
  { login, filled }: {
    login: Login
    /** The bars fill once the profile is on screen */
    filled: boolean
  },
) => {
  const person = people[login]
  return (
    <div class='slab mr-2 overflow-hidden'>
      <div class='relative h-[110px] border-b border-figure-edge bg-surface-000'>
        <svg
          width='100%'
          height='110'
          viewBox='0 0 800 110'
          preserveAspectRatio='none'
          aria-hidden='true'
          class='absolute inset-0'
        >
          <path
            d='M0 86 C 220 10, 520 120, 800 24'
            stroke='var(--indigo)'
            stroke-width='1.5'
            fill='none'
            vector-effect='non-scaling-stroke'
          />
        </svg>
      </div>
      <div class='flex flex-col gap-3 px-[22px] pb-[22px]'>
        <Portrait
          name={person.name}
          src={person.avatarUrl}
          px={72}
          class='relative -mt-9 flex size-[72px] items-center justify-center rounded-full border border-figure-edge bg-surface-200 font-display text-[24px] leading-none font-bold shadow-slab'
        />
        <div class='flex flex-col gap-0.5'>
          <span class='font-display text-[24px] leading-[30px] font-bold'>
            {person.name}
          </span>
          <span class='text-[13px] text-ink-muted'>
            {placeOf(person)}
          </span>
        </div>
        <span class='text-[15px] leading-[23px] text-pretty'>
          {person.headline}
        </span>
        <div class='flex flex-col gap-2.5 pt-1.5'>
          {dimensionsOf(login).map(({ key, label, count }) => (
            <div key={key} class='flex flex-col gap-[5px]'>
              <span class='flex justify-between text-[13px]'>
                <span class='font-semibold'>{label}</span>
                <span class='font-mono leading-4 font-medium'>{count}</span>
              </span>
              <Progress
                value={filled ? count : 0}
                max={20}
                label={label}
                thin
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const Proofs = () => {
  const [ref, shown] = useShown<HTMLElement>()
  return (
    <section
      ref={ref}
      class='grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-center gap-12'
    >
      <Reveal class='flex flex-col gap-4'>
        <Eyebrow>Aperçu d’un profil</Eyebrow>
        <h2 class='font-display text-[36px] leading-[42px] font-bold tracking-[-.015em] text-balance'>
          Pas de score global. Des preuves.
        </h2>
        <p class='max-w-[480px] text-[17px] leading-[27px] text-pretty text-ink-muted'>
          Cinq dimensions : review de code, construction de projets, mentorat,
          open source, entraide. Chaque barre s’ouvre sur ses preuves, vérifiées
          par GitHub.
        </p>
        <A {...passportLink(sample)} class='self-start font-semibold'>
          {t`Voir le passeport de ${people[sample].name.split(' ')[0]}`}
        </A>
      </Reveal>
      <Reveal delay={120}>
        <ProfilePreview login={sample} filled={shown} />
      </Reveal>
    </section>
  )
}

const CallToAction = () => (
  <Reveal>
    <section class='slab-selected mr-2 flex flex-wrap items-center justify-between gap-6 p-9'>
      <div class='flex flex-col gap-1.5'>
        <span class='font-display text-[30px] leading-9 font-bold tracking-[-.01em]'>
          Prêt à construire ensemble ?
        </span>
        <span class='text-[15px] text-ink-muted'>
          Moins de 2 minutes pour créer ton profil à partir de GitHub.
        </span>
      </div>
      <div class='flex flex-wrap gap-3.5'>
        <Button size={48} href='login'>
          <Github class='size-[18px]' />
          Continuer avec GitHub
        </Button>
        <DemoButton size={48} />
      </div>
    </section>
  </Reveal>
)

/** /, seen without a session: the product in one page (§6.1) */
export const LandingPage = () => (
  <Page
    title='Your work is your profile'
    heading={false}
    class='flex min-h-screen flex-col'
  >
    <PublicHeader />
    <main class='mx-auto flex w-full max-w-[1180px] flex-col gap-24 px-7 pt-6 pb-[120px]'>
      <Hero />
      <Demo />
      <Loop />
      <Features />
      <Proofs />
      <CallToAction />
    </main>
  </Page>
)
