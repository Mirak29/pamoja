import { A } from '@01edu/signal-router'
import { Github } from '/web/assets/icons.tsx'
import { type Login, people } from '/web/fixtures/people.ts'
import { initials } from '/web/ui/avatar.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Plates } from '/web/ui/plates.tsx'
import { Progress } from '/web/ui/progress.tsx'
import { passportLink, PublicHeader } from '/web/ui/public-header.tsx'
import { dimensionsOf } from '/web/pages/profile/reputation.tsx'

// The developer shown to visitors, as in the demo scenario (§18)
const sample: Login = 'moussa'

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

const Hero = () => (
  <section class='grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-10 pt-8'>
    <div class='flex flex-col gap-[22px]'>
      <Eyebrow accent>Pour les développeurs africains</Eyebrow>
      <h1 class='font-display text-[60px] leading-[62px] font-bold tracking-[-.025em] text-balance'>
        Your work is your profile.
      </h1>
      <p class='max-w-[520px] text-[18px] leading-[29px] text-pretty text-ink-muted'>
        Pamoja relie les développeurs autour de leur vrai travail : reviews,
        PRs, projets. GitHub reste la source du code, Pamoja ajoute la couche
        humaine.
      </p>
      <div class='flex flex-wrap gap-3.5 pb-1.5'>
        <Button size={48} href='connexion'>
          <Github class='size-[18px]' />
          Continuer avec GitHub
        </Button>
        <Button size={48} variant='secondary' {...passportLink(sample)}>
          Voir un profil
        </Button>
      </div>
      <span class='text-[13px] text-ink-muted'>
        « Pamoja » signifie « ensemble » en swahili.
      </span>
    </div>
    <div class='flex justify-center'>
      <Plates width={440} />
    </div>
  </section>
)

const Loop = () => (
  <section class='flex flex-col gap-7'>
    <div class='flex flex-col gap-2'>
      <Eyebrow>La boucle</Eyebrow>
      <h2 class='font-display text-[36px] leading-[42px] font-bold tracking-[-.015em] text-balance'>
        De la PR à la preuve, en quatre étapes
      </h2>
    </div>
    <div class='grid grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-6'>
      {steps.map(({ title, text, Figure }, i) => (
        <div key={title} class='slab mr-2 flex flex-col gap-2.5 p-[18px]'>
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
      ))}
    </div>
  </section>
)

/** The five dimensions of a real profile, out of 20 proofs */
const ProfilePreview = ({ login }: { login: Login }) => {
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
        <span class='relative -mt-9 flex size-[72px] items-center justify-center rounded-full border border-figure-edge bg-surface-200 font-display text-[24px] leading-none font-bold shadow-slab'>
          {initials(person.name)}
        </span>
        <div class='flex flex-col gap-0.5'>
          <span class='font-display text-[24px] leading-[30px] font-bold'>
            {person.name}
          </span>
          <span class='text-[13px] text-ink-muted'>
            {person.city}, {person.country}
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
              <Progress value={count} max={20} label={label} thin />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const Proofs = () => (
  <section class='grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-center gap-12'>
    <div class='flex flex-col gap-4'>
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
        Voir le passeport de {people[sample].name.split(' ')[0]}
      </A>
    </div>
    <ProfilePreview login={sample} />
  </section>
)

const CallToAction = () => (
  <section class='slab-selected mr-2 flex flex-wrap items-center justify-between gap-6 p-9'>
    <div class='flex flex-col gap-1.5'>
      <span class='font-display text-[30px] leading-9 font-bold tracking-[-.01em]'>
        Prêt à construire ensemble ?
      </span>
      <span class='text-[15px] text-ink-muted'>
        Moins de 2 minutes pour créer ton profil à partir de GitHub.
      </span>
    </div>
    <Button size={48} href='connexion'>
      <Github class='size-[18px]' />
      Continuer avec GitHub
    </Button>
  </section>
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
      <Loop />
      <Proofs />
      <CallToAction />
    </main>
  </Page>
)
