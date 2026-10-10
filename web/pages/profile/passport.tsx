import { useEffect } from 'preact/hooks'
import { A } from '@01edu/signal-router'
import { Github } from '/web/assets/icons.tsx'
import { type Login, people } from '/web/fixtures/people.ts'
import { profileStats, proofsOf } from '/web/fixtures/reputation.ts'
import { plural } from '/web/lib/plural.ts'
import { initials } from '/web/ui/avatar.tsx'
import {
  DemoBadge,
  NoticeBadge,
  SkillChip,
  VerifiedBadge,
} from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { PublicHeader } from '/web/ui/public-header.tsx'
import { proofMeta } from '/web/pages/profile/proofs-drawer.tsx'
import { BadgeList, DimensionBars } from '/web/pages/profile/reputation.tsx'

// A visitor sees what someone did: a figure at zero is left out
const stats = (login: Login) => {
  const figures = profileStats(login)
  return ([
    [figures.reviews, plural(figures.reviews, 'review', 'reviews')],
    [
      figures.helped,
      plural(figures.helped, 'développeur aidé', 'développeurs aidés'),
    ],
    [figures.collaborations, plural(figures.collaborations, 'collaboration')],
    [figures.projects, plural(figures.projects, 'projet')],
  ] as const).filter(([count]) => count > 0)
}

/**
 * Developer Passport: the public, read only view of /@login that a visitor
 * without a session sees (§9.3). Signed in, /@login?vue=publique previews
 * it.
 */
export const Passport = ({ login }: { login: Login }) => {
  const person = people[login]
  const mine = proofsOf(login)
  const recent = [
    ...mine.filter((p) => p.verified),
    ...mine.filter((p) => !p.verified),
  ].slice(0, 4)
  useEffect(() => {
    document.title = `${person.name} · Pamoja`
  }, [person.name])
  return (
    <div class='flex min-h-screen flex-col'>
      <PublicHeader />
      <main class='mx-auto flex w-full max-w-[820px] flex-col gap-6 px-6 pt-4 pb-[120px]'>
        <div class='flex flex-wrap items-center gap-3'>
          <Eyebrow>Passeport développeur</Eyebrow>
          <NoticeBadge>Vue publique · lecture seule</NoticeBadge>
        </div>
        <section class='slab mr-2 overflow-hidden'>
          <div class='relative h-[120px] border-b border-figure-edge bg-surface-000'>
            <svg
              width='100%'
              height='120'
              viewBox='0 0 800 120'
              preserveAspectRatio='none'
              aria-hidden='true'
              class='absolute inset-0'
            >
              <path
                d='M0 96 C 220 12, 520 130, 800 26'
                stroke='var(--indigo)'
                stroke-width='1.5'
                fill='none'
                vector-effect='non-scaling-stroke'
              />
            </svg>
          </div>
          <div class='flex flex-col gap-3.5 px-[26px] pb-[26px]'>
            <div class='relative -mt-11 flex flex-wrap items-end justify-between gap-4'>
              <span class='flex size-[88px] items-center justify-center rounded-full border border-figure-edge bg-surface-200 font-display text-[30px] leading-none font-bold shadow-slab'>
                {initials(person.name)}
              </span>
              <Button size={40} href='connexion'>
                Collaborer avec {person.name}
              </Button>
            </div>
            <div class='flex flex-col gap-0.5'>
              <h1 class='font-display text-display-l'>{person.name}</h1>
              <span class='flex items-center gap-2 text-[14px] text-ink-muted'>
                <span>{person.role}</span>
                <span>·</span>
                <span>{person.city}, {person.country}</span>
              </span>
            </div>
            <p class='text-[18px] leading-[27px] text-pretty'>
              {person.headline}
            </p>
            <div class='flex flex-wrap gap-1.5'>
              {person.skills.map((skill) => (
                <SkillChip key={skill}>{skill}</SkillChip>
              ))}
            </div>
            <div class='grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3.5 pt-1.5 pr-1 pb-1'>
              {stats(login).map(([count, label]) => (
                <div
                  key={label}
                  class='flex flex-col gap-0.5 rounded-[8px] border border-figure-edge px-3.5 py-3 shadow-tile'
                >
                  <span class='font-mono text-[26px] leading-[30px] font-medium'>
                    {count}
                  </span>
                  <span class='text-[13px] text-ink-muted'>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div class='mr-2 grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-7'>
          <section class='slab flex flex-col gap-3 p-[22px]'>
            <Eyebrow>Réputation</Eyebrow>
            <DimensionBars login={login} readOnly />
          </section>
          <div class='flex flex-col gap-7'>
            <section class='slab flex flex-col gap-3 p-[22px]'>
              <Eyebrow>Badges</Eyebrow>
              <BadgeList login={login} compact />
            </section>
            <section class='slab flex flex-col gap-2.5 p-[22px]'>
              <Eyebrow>Preuves récentes</Eyebrow>
              {recent.map((proof) => (
                <div
                  key={proof.id}
                  class='flex flex-col gap-1 border-t border-line py-2.5'
                >
                  <span class='text-[14px] font-semibold'>{proof.title}</span>
                  <span class='flex flex-wrap items-center gap-2 text-[12px] text-ink-muted'>
                    {proofMeta(proof, false)}
                    {proof.verified && <VerifiedBadge />}
                    {proof.demo && !proof.verified && <DemoBadge />}
                  </span>
                </div>
              ))}
            </section>
          </div>
        </div>
        <div class='flex flex-wrap items-center justify-between gap-3 pt-2'>
          <span class='inline-flex items-center gap-2 font-mono text-[13px] leading-none text-ink-muted'>
            <Github />
            {location.host}/@{login}
          </span>
          <A href='connexion' class='text-[14px] font-semibold'>
            Rejoindre Pamoja
          </A>
        </div>
      </main>
    </div>
  )
}
