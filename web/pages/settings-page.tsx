import { useState } from 'preact/hooks'
import { Download, Github, Info } from '/web/assets/icons.tsx'
import { helpTypes, matchingRequests } from '/web/fixtures/help.ts'
import { me, peopleChanged, type Person } from '/web/fixtures/people.ts'
import { posts } from '/web/fixtures/posts.ts'
import { proofsOf } from '/web/fixtures/reputation.ts'
import { matchingModeOf } from '/api/vocabulary.ts'
import { saveMe, signOut } from '/web/lib/session.ts'
import {
  matchingModes,
  notificationRows,
  settings,
  settingsChanged,
  updateSettings,
} from '/web/fixtures/settings.ts'
import { skills } from '/web/fixtures/skills.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Page } from '/web/ui/layout.tsx'
import {
  setThemePreference,
  type ThemePreference,
  themePreference,
} from '/web/ui/theme-toggle.tsx'
import { notify } from '/web/ui/toast.tsx'

const Switch = (
  { on, label, onFlip }: { on: boolean; label: string; onFlip: () => void },
) => (
  <button
    type='button'
    role='switch'
    aria-checked={on}
    aria-label={label}
    onClick={onFlip}
    class={`flex h-6 w-11 flex-none cursor-pointer rounded-full border p-0.5 inset-shadow-well transition-[background-color] duration-150 ${
      on
        ? 'justify-end border-indigo-edge bg-indigo'
        : 'justify-start border-line-control bg-surface-000'
    }`}
  >
    <span
      class={`size-[18px] rounded-full border bg-surface-100 ${
        on
          ? 'border-indigo-edge shadow-[1.73px_1px_0_0_var(--indigo-edge)]'
          : 'border-line-control shadow-[1.73px_1px_0_0_var(--line-control)]'
      }`}
    />
  </button>
)

const Choices = (
  { label, children }: {
    label: preact.ComponentChildren
    children: preact.ComponentChildren
  },
) => (
  <div class='flex flex-col gap-2 text-[13px] font-semibold'>
    <span>{label}</span>
    <div class='flex flex-wrap gap-2 pb-1'>{children}</div>
  </div>
)

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((x) => x !== value) : [...list, value]

/** Profile, proofs, posts and settings of the developer, as a JSON file */
// Session data only lives in this page until the API exists: reloading
// brings the demo back to its start, after asking
const ResetDemo = () => {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <Button variant='secondary' onClick={() => setAsking(true)}>
        Réinitialiser la démo
      </Button>
    )
  }
  return (
    <span class='flex flex-wrap items-center gap-2.5'>
      <span class='text-[14px] font-semibold'>
        Tout ce que tu as fait pendant la démo sera effacé.
      </span>
      <Button variant='danger' size={34} onClick={() => location.reload()}>
        Réinitialiser
      </Button>
      <Button variant='secondary' size={34} onClick={() => setAsking(false)}>
        Annuler
      </Button>
    </span>
  )
}

const exportData = () => {
  const data = {
    profile: me,
    proofs: proofsOf(me.login),
    posts: posts.filter((p) => p.author === me.login),
    settings,
  }
  // In the page and revoked later: some browsers drop a detached link, or a
  // file whose address is revoked before the download starts
  const link = document.createElement('a')
  link.href = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  )
  link.download = `pamoja-${me.login}.json`
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
  notify({
    title: 'Export téléchargé',
    body: `pamoja-${me.login}.json : profil, preuves, posts et réglages.`,
    icon: Download,
    tone: 'verified',
  })
}

const themes: [ThemePreference, string][] = [
  ['light', 'Clair'],
  ['dark', 'Sombre'],
  ['system', 'Système'],
]

/** Account, notifications, matching, theme and data (§7.3, §7.4) */
export const SettingsPage = () => {
  settingsChanged.value
  peopleChanged.value
  const person: Person = me
  const passing = matchingRequests(me, settings.minScore).length
  const setPerson = (change: () => void) => {
    change()
    peopleChanged.value++
  }
  return (
    <Page title='Réglages' class='flex max-w-[880px] flex-col gap-7 pt-5'>
      <section class='slab mr-2 flex flex-wrap items-center gap-4 p-[22px]'>
        <Avatar name={me.name} src={me.avatarUrl} size={48} />
        <div class='flex min-w-[200px] flex-1 flex-col gap-1'>
          <span class='font-display text-[18px] leading-6 font-semibold'>
            {me.name}
          </span>
          <span class='flex items-center gap-2 font-mono text-[13px] leading-[18px] text-ink-muted'>
            <Github class='size-[18px]' />
            <span>@{me.login} · connecté via GitHub</span>
          </span>
        </div>
        <Button variant='secondary' href='.' onClick={signOut}>
          Se déconnecter
        </Button>
      </section>
      <section class='slab mr-2 px-[22px] pt-2 pb-3.5'>
        <div class='flex items-center gap-4 pt-3.5 pb-2.5'>
          <span class='flex-1'>
            <Eyebrow>Notifications</Eyebrow>
          </span>
          {['App', 'E-mail'].map((label) => (
            <span
              key={label}
              class='w-[60px] text-center font-mono text-[11px] leading-[14px] font-medium tracking-[.06em] text-ink-muted uppercase'
            >
              {label}
            </span>
          ))}
        </div>
        {notificationRows.map(([key, label, description]) => {
          const channel = settings.notifications[key]
          return (
            <div
              key={key}
              class='flex flex-wrap items-center gap-4 border-t border-line py-3.5'
            >
              <span class='flex min-w-[200px] flex-1 flex-col'>
                <span class='text-[15px] font-semibold'>{label}</span>
                <span class='text-[13px] leading-5 text-ink-muted'>
                  {description}
                </span>
              </span>
              <span class='flex w-[60px] justify-center'>
                <Switch
                  on={channel.app}
                  label={`${label} dans l’app`}
                  onFlip={() =>
                    updateSettings(() => channel.app = !channel.app)}
                />
              </span>
              <span class='flex w-[60px] justify-center'>
                <Switch
                  on={channel.mail}
                  label={`${label} par e-mail`}
                  onFlip={() =>
                    updateSettings(() => channel.mail = !channel.mail)}
                />
              </span>
            </div>
          )
        })}
      </section>
      <section class='slab mr-2 flex flex-col gap-[18px] p-[22px]'>
        <Eyebrow>Matching</Eyebrow>
        <Choices label='Quand une demande te correspond'>
          {matchingModes.map((mode) => (
            <OptionButton
              key={mode}
              pressed={settings.matching === mode}
              onClick={() => {
                updateSettings((s) => s.matching = mode)
                saveMe({ profile: { matchingMode: matchingModeOf(mode) } })
              }}
            >
              {mode}
            </OptionButton>
          ))}
        </Choices>
        <div class='flex flex-col gap-2 text-[13px] font-semibold'>
          <span>
            Score minimum ·{' '}
            <span class='font-mono text-indigo'>
              {settings.minScore} / 100
            </span>
          </span>
          <input
            type='range'
            min='30'
            max='90'
            step='5'
            value={settings.minScore}
            aria-label='Score minimum'
            onInput={(event) =>
              updateSettings((s) =>
                s.minScore = Number(event.currentTarget.value)
              )}
            class='m-0.5 w-full accent-indigo'
          />
          <span class='font-normal text-ink-muted'>
            {passing}{' '}
            {passing > 1
              ? 'demandes ouvertes passent'
              : 'demande ouverte passe'} ce seuil aujourd’hui
          </span>
        </div>
        <Choices label='Tes skills'>
          {skills.map((skill) => (
            <OptionButton
              key={skill}
              pressed={person.skills.includes(skill)}
              onClick={() =>
                setPerson(() => person.skills = toggle(person.skills, skill))}
            >
              {skill}
            </OptionButton>
          ))}
        </Choices>
        <Choices label='Types d’aide que tu acceptes'>
          {helpTypes.map((type) => (
            <OptionButton
              key={type}
              pressed={person.helpTypes.includes(type)}
              onClick={() =>
                setPerson(() =>
                  person.helpTypes = toggle(person.helpTypes, type)
                )}
            >
              {type}
            </OptionButton>
          ))}
        </Choices>
      </section>
      <section class='slab mr-2 flex flex-col gap-3.5 p-[22px]'>
        <Eyebrow>Thème</Eyebrow>
        <div class='flex flex-wrap gap-2 pb-1'>
          {themes.map(([key, label]) => (
            <OptionButton
              key={key}
              pressed={themePreference.value === key}
              onClick={() => setThemePreference(key)}
            >
              {label}
            </OptionButton>
          ))}
        </div>
      </section>
      <section class='slab mr-2 flex flex-col gap-3.5 p-[22px]'>
        <Eyebrow>Données</Eyebrow>
        <span class='text-[14px] text-ink-muted'>
          Ton profil, tes preuves, tes posts et tes réglages t’appartiennent.
        </span>
        <div class='flex flex-wrap gap-3.5 pb-1'>
          <Button variant='secondary' onClick={exportData}>
            Exporter mes données
          </Button>
          <ResetDemo />
          <Button
            variant='danger'
            onClick={() =>
              notify({
                title: 'Suppression du compte',
                body:
                  'Elle arrive avec l’API : rien n’est supprimé pour l’instant.',
                icon: Info,
                tone: 'muted',
              })}
          >
            Supprimer mon compte
          </Button>
        </div>
      </section>
    </Page>
  )
}
