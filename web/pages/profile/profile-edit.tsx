import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { navigate, url } from '@01edu/signal-router'
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from '/web/assets/icons.tsx'
import { me, type Person } from '/web/fixtures/people.ts'
import {
  profileAccents,
  profileCovers,
  type ProfileDraft,
  profileSections,
  profileThemes,
  saveProfile,
  settingsOf,
} from '/web/fixtures/profile-settings.ts'
import { type ProjectSlug, projectsOf } from '/web/fixtures/projects.ts'
import { skills } from '/web/fixtures/skills.ts'
import { initials } from '/web/ui/avatar.tsx'
import { SkillChip } from '/web/ui/badge.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Field, Input, Textarea } from '/web/ui/input.tsx'
import { Page } from '/web/ui/layout.tsx'
import { UpcomingState } from '/web/ui/states.tsx'
import { notify } from '/web/ui/toast.tsx'
import { Cover } from '/web/pages/profile/cover.tsx'

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((x) => x !== value) : [...list, value]

const Section = (
  { title, gap = 'gap-4', children }: {
    title: string
    gap?: 'gap-3' | 'gap-4'
    children: ComponentChildren
  },
) => (
  <section class={`slab flex flex-col p-[22px] ${gap}`}>
    <Eyebrow>{title}</Eyebrow>
    {children}
  </section>
)

const Choices = (
  { label, children }: { label: string; children: ComponentChildren },
) => (
  <div class='flex flex-col gap-2 text-[13px] font-semibold'>
    <span>{label}</span>
    <div class='flex flex-wrap gap-2 pb-1'>{children}</div>
  </div>
)

type Draft = ProfileDraft
type Update = (patch: Partial<Draft>) => void

const Appearance = ({ draft, update }: { draft: Draft; update: Update }) => (
  <Section title='Apparence'>
    <Choices label='Thème du profil'>
      {profileThemes.map(([key, label]) => (
        <OptionButton
          key={key}
          pressed={draft.theme === key}
          onClick={() => update({ theme: key })}
        >
          {label}
        </OptionButton>
      ))}
    </Choices>
    <div class='flex flex-col gap-2 text-[13px] font-semibold'>
      <span>Couleur d’accent</span>
      <div class='flex flex-wrap gap-3 pb-[3px]'>
        {profileAccents.map(([key, label]) => (
          <button
            key={key}
            type='button'
            aria-pressed={draft.accent === key}
            onClick={() => update({ accent: key })}
            class={`inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-md border bg-surface-100 pr-3 pl-2 text-[13px] leading-none font-medium text-ink ${
              draft.accent === key
                ? 'border-ink shadow-key'
                : 'border-figure-edge'
            }`}
          >
            {/* The swatch takes the accent of the app theme */}
            <span
              data-ptheme='minimal'
              data-paccent={key}
              class='size-[18px] rounded-sm border border-ink bg-indigo'
            />
            {label}
          </button>
        ))}
      </div>
    </div>
    <Choices label='Couverture'>
      {profileCovers.map(([key, label]) => (
        <OptionButton
          key={key}
          pressed={draft.cover === key}
          onClick={() => update({ cover: key })}
        >
          {label}
        </OptionButton>
      ))}
    </Choices>
  </Section>
)

const SkillsAndProjects = (
  { draft, update }: { draft: Draft; update: Update },
) => (
  <Section title='Technologies et projets'>
    <Choices label='Technologies'>
      {skills.map((skill) => (
        <OptionButton
          key={skill}
          pressed={draft.skills.includes(skill)}
          onClick={() => update({ skills: toggle(draft.skills, skill) })}
        >
          {skill}
        </OptionButton>
      ))}
    </Choices>
    <div class='flex flex-col gap-2 text-[13px] font-semibold'>
      <span>Projets mis en avant</span>
      <div class='flex flex-wrap gap-2 pb-1'>
        {projectsOf(me.login).map((project) => {
          const slug = project.slug as ProjectSlug
          return (
            <OptionButton
              key={slug}
              pressed={draft.featured.includes(slug)}
              onClick={() => update({ featured: toggle(draft.featured, slug) })}
            >
              {project.name}
            </OptionButton>
          )
        })}
      </div>
      <span class='font-normal text-ink-muted'>
        Aucun choix : tous tes projets sont affichés.
      </span>
    </div>
  </Section>
)

const orderKey =
  'flex size-7 cursor-pointer items-center justify-center rounded-[5px] border border-line-control bg-surface-100 text-ink shadow-[1.73px_1px_0_0_var(--line-control)] disabled:cursor-default disabled:opacity-35'

const SectionOrder = ({ draft, update }: { draft: Draft; update: Update }) => {
  const [dragged, setDragged] = useState<number | null>(null)
  const move = (from: number, to: number) => {
    const order = [...draft.order]
    const [section] = order.splice(from, 1)
    order.splice(to, 0, section)
    update({ order })
  }
  const last = draft.order.length - 1
  return (
    <Section title='Ordre des sections' gap='gap-3'>
      <span class='text-[13px] text-ink-muted'>
        Glisse une ligne, ou utilise les flèches.
      </span>
      <div class='flex flex-col gap-2 rounded-lg border border-line-strong bg-surface-000 pt-2 pr-3 pb-3 pl-2 inset-shadow-well'>
        {draft.order.map((key, i) => (
          <div
            key={key}
            draggable
            onDragStart={(event) => {
              setDragged(i)
              event.dataTransfer?.setData('text/plain', key)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              if (dragged !== null && dragged !== i) move(dragged, i)
              setDragged(null)
            }}
            class='tile flex cursor-grab items-center gap-2.5 px-2.5 py-2'
          >
            <GripVertical class='text-ink-muted' />
            <span class='w-4 font-mono text-[12px] leading-none font-medium text-ink-muted'>
              {i + 1}
            </span>
            <span class='flex-1 text-[14px] font-semibold'>
              {profileSections.find(([k]) => k === key)?.[1]}
            </span>
            <button
              type='button'
              aria-label='Monter'
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
              class={orderKey}
            >
              <ChevronUp class='size-3.5' />
            </button>
            <button
              type='button'
              aria-label='Descendre'
              disabled={i === last}
              onClick={() => move(i, i + 1)}
              class={orderKey}
            >
              <ChevronDown class='size-3.5' />
            </button>
          </div>
        ))}
      </div>
    </Section>
  )
}

/** The profile as it will look, in its theme, accent and section order */
const Preview = ({ draft }: { draft: Draft }) => (
  <aside class='flex min-w-0 flex-col gap-2.5 lg:sticky lg:top-24'>
    <Eyebrow>Aperçu en direct</Eyebrow>
    <div
      data-ptheme={draft.theme}
      data-paccent={draft.accent}
      class='flex flex-col gap-3 rounded-[12px] border border-figure-edge bg-surface-000 p-3.5 text-ink shadow-slab transition-[background-color] duration-200'
    >
      <div class='overflow-hidden rounded-lg border border-figure-edge bg-surface-100 shadow-tile'>
        <Cover cover={draft.cover} small />
        <div class='flex flex-col gap-2 px-3.5 pb-3.5'>
          <span class='relative -mt-6 flex size-12 items-center justify-center rounded-full border border-figure-edge bg-surface-200 font-display text-[16px] leading-none font-bold shadow-tile'>
            {initials(me.name)}
          </span>
          <span class='font-display text-[17px] leading-[22px] font-bold'>
            {me.name}
          </span>
          <span class='text-[12px] leading-[18px] text-ink-muted'>
            {me.city}, {me.country}
          </span>
          <span class='text-[13px] leading-5 text-pretty'>
            {draft.headline}
          </span>
          <div class='flex flex-wrap gap-1.5'>
            {draft.skills.slice(0, 5).map((skill) => (
              <SkillChip key={skill}>{skill}</SkillChip>
            ))}
          </div>
          <span class='inline-flex h-7 items-center self-start rounded-md border border-indigo-edge bg-indigo px-2.5 text-[12px] leading-none font-semibold text-on-indigo shadow-key-primary'>
            Proposer une collaboration
          </span>
        </div>
      </div>
      {draft.order.map((key) => (
        <div
          key={key}
          class='flex animate-enter flex-col gap-1.5 rounded-[8px] border border-figure-edge bg-surface-100 px-3 py-2.5 shadow-tile'
        >
          <span class='font-mono text-[10px] leading-[14px] font-medium tracking-[.06em] text-ink-muted uppercase'>
            {profileSections.find(([k]) => k === key)?.[1]}
          </span>
          <span class='h-1.5 w-[70%] rounded-[3px] bg-line' />
          <span class='h-1.5 w-[46%] rounded-[3px] border border-indigo bg-indigo-soft' />
        </div>
      ))}
    </div>
  </aside>
)

/** /profil/modifier: identity, appearance, skills and section order (§9.2) */
export const ProfileEditPage = () =>
  url.relativePath === '/profil/modifier'
    ? <ProfileEditor />
    : <UpcomingState path={url.relativePath.slice(1)} />

const ProfileEditor = () => {
  const person: Person = me
  const [draft, setDraft] = useState<Draft>(() => ({
    ...settingsOf(me.login),
    headline: person.headline,
    bio: person.bio,
    website: person.website ?? '',
    skills: [...person.skills],
  }))
  const update: Update = (patch) => setDraft({ ...draft, ...patch })

  const save = () => {
    saveProfile(me.login, draft)
    navigate({ href: `@${me.login}` })
    notify({
      title: 'Profil enregistré',
      body: `Thème ${
        profileThemes.find(([key]) => key === draft.theme)?.[1]
      }, sections dans le nouvel ordre.`,
      icon: Check,
      tone: 'verified',
    })
  }

  return (
    <Page
      title='Modifier le profil'
      class='mr-2 grid items-start gap-8 pt-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
    >
      <div class='flex min-w-0 flex-col gap-7'>
        <Section title='Identité'>
          <Field label='Headline'>
            <Input
              value={draft.headline}
              onInput={(event) =>
                update({ headline: event.currentTarget.value })}
            />
          </Field>
          <Field label='Bio'>
            <Textarea
              rows={3}
              value={draft.bio}
              onInput={(event) => update({ bio: event.currentTarget.value })}
            />
          </Field>
          <Field label='Site'>
            <Input
              value={draft.website}
              placeholder='ton-site.dev'
              onInput={(event) =>
                update({ website: event.currentTarget.value })}
            />
          </Field>
        </Section>
        <Appearance draft={draft} update={update} />
        <SkillsAndProjects draft={draft} update={update} />
        <SectionOrder draft={draft} update={update} />
        <div class='flex flex-wrap gap-3.5 pb-1'>
          <Button size={42} onClick={save}>Enregistrer</Button>
          <Button variant='secondary' size={42} href={`@${me.login}`}>
            Annuler
          </Button>
        </div>
      </div>
      <Preview draft={draft} />
    </Page>
  )
}
