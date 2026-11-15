import { useState } from 'preact/hooks'
import { signal } from '@preact/signals'
import {
  profileAccents,
  profileThemes,
} from '/web/fixtures/profile-settings.ts'
import { A } from '/web/ui/link.tsx'
import { Copy, Download } from '/web/assets/icons.tsx'
import { isMe, type Login, me, people } from '/web/fixtures/people.ts'
import { language, t } from '/web/lib/language.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button, OptionButton } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { notify } from '/web/ui/toast.tsx'

/**
 * The style of the card being shared (§9.2): a theme and an accent, or
 * none for those of the profile. It travels in the shared link, so the
 * networks show the card chosen (api/og.ts)
 */
const style = signal<{ theme?: string; accent?: string }>({})

const styleParams = () => {
  const params = new URLSearchParams()
  if (style.value.theme) params.set('theme', style.value.theme)
  if (style.value.accent) params.set('accent', style.value.accent)
  return params
}

/** Address of a profile, the only one it has (§9), with the card chosen */
export const profileUrl = (login: Login) => {
  const params = styleParams()
  return `${location.origin}/@${login}${params.size ? `?${params}` : ''}`
}

/** The Share Card the server draws, the og:image of the profile (§17.2) */
export const cardUrl = (login: Login) => {
  const params = styleParams()
  return `api/user/card?login=${encodeURIComponent(login)}${
    params.size ? `&${params}` : ''
  }`
}

/** The theme and the accent of the card, as on the profile (§9.2) */
const StylePicker = () => (
  <div class='flex flex-col gap-3'>
    <div class='flex flex-wrap items-center gap-2'>
      <span class='w-16 text-[13px] text-ink-muted'>Thème</span>
      <OptionButton
        pressed={!style.value.theme}
        onClick={() => style.value = { ...style.peek(), theme: undefined }}
      >
        Celui du profil
      </OptionButton>
      {profileThemes.map(([key, label]) => (
        <OptionButton
          key={key}
          pressed={style.value.theme === key}
          onClick={() => style.value = { ...style.peek(), theme: key }}
        >
          {label}
        </OptionButton>
      ))}
    </div>
    <div class='flex flex-wrap items-center gap-2'>
      <span class='w-16 text-[13px] text-ink-muted'>Accent</span>
      <OptionButton
        pressed={!style.value.accent}
        onClick={() => style.value = { ...style.peek(), accent: undefined }}
      >
        Celui du profil
      </OptionButton>
      {profileAccents.map(([key, label]) => (
        <OptionButton
          key={key}
          pressed={style.value.accent === key}
          onClick={() => style.value = { ...style.peek(), accent: key }}
          data-ptheme='minimal'
          data-paccent={key}
        >
          <span class='size-3 rounded-full bg-indigo' />
          {label}
        </OptionButton>
      ))}
    </div>
  </div>
)

const shareLinks = (login: Login) => {
  const link = encodeURIComponent(profileUrl(login))
  const text = encodeURIComponent(
    isMe(login)
      ? 'Mon profil Pamoja : mes reviews et contributions, vérifiées par GitHub.'
      : t`Le profil Pamoja de ${people[login].name}`,
  )
  return [
    [
      'LinkedIn',
      `https://www.linkedin.com/sharing/share-offsite/?url=${link}`,
    ],
    ['X', `https://x.com/intent/post?url=${link}&text=${text}`],
    ['WhatsApp', `https://wa.me/?text=${text}%20${link}`],
  ]
}

/**
 * The share card as the networks show it: the PNG the server draws (§17.2),
 * and nothing else, so the preview is never a card the networks will not
 * show. A neutral block while it loads
 */
const Card = ({ login }: { login: Login }) => {
  const [state, setState] = useState<'loading' | 'shown' | 'failed'>(
    'loading',
  )
  return (
    <div class='relative aspect-[1200/630] w-full overflow-hidden rounded-lg border border-figure-edge bg-surface-200 shadow-slab'>
      {state === 'failed' && (
        <span class='absolute inset-0 flex items-center justify-center text-[14px] text-ink-muted'>
          Carte indisponible pour l’instant.
        </span>
      )}
      {state !== 'failed' && (
        <img
          src={cardUrl(login)}
          alt={t`Carte de partage de ${people[login].name}`}
          width={1200}
          height={630}
          onLoad={() => setState('shown')}
          onError={() => setState('failed')}
          class={`absolute inset-0 size-full ${
            state === 'shown' ? '' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}

const previews = [['whatsapp', 'WhatsApp'], ['linkedin', 'LinkedIn']] as const

const LinkPreview = ({ login }: { login: Login }) => {
  const [current, setCurrent] = useState<string>('whatsapp')
  const person = people[login]
  return (
    <div class='flex flex-col gap-3 border-t border-line pt-4'>
      <div class='flex flex-wrap items-center justify-between gap-3'>
        <Eyebrow>Aperçu du lien</Eyebrow>
        <div
          role='tablist'
          class='flex gap-1 rounded-[8px] border border-line-strong bg-surface-000 pt-1 pr-2 pb-2 pl-1 inset-shadow-well'
        >
          {previews.map(([key, label]) => (
            <button
              key={key}
              type='button'
              role='tab'
              aria-selected={key === current}
              onClick={() => setCurrent(key)}
              class={`h-[30px] cursor-pointer rounded-[5px] border px-3 text-[12px] leading-none font-semibold ${
                key === current
                  ? 'border-figure-edge bg-surface-100 text-ink shadow-tile'
                  : 'border-transparent text-ink-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {current === 'whatsapp'
        ? (
          <div class='flex flex-col items-end rounded-lg border border-line-strong bg-surface-000 p-4 inset-shadow-well'>
            <div class='flex w-full max-w-[320px] flex-col gap-1.5 rounded-[10px_10px_2px_10px] border border-figure-edge bg-surface-100 p-2 shadow-tile'>
              <div class='overflow-hidden rounded-md border border-line'>
                <img
                  src={cardUrl(login)}
                  alt=''
                  class='aspect-[1200/630] w-full bg-surface-000 object-cover'
                />
                <div class='flex flex-col gap-0.5 bg-surface-200 p-2'>
                  <span class='text-[13px] font-semibold'>
                    {person.name} · Pamoja
                  </span>
                  <span
                    translate={false}
                    class='wrap-anywhere text-[12px] leading-[17px] text-ink-muted'
                  >
                    {person.headline}
                  </span>
                  <span class='font-mono text-[11px] leading-none text-ink-muted'>
                    {location.host}
                  </span>
                </div>
              </div>
              <span class='text-[13px] break-all text-indigo'>
                {profileUrl(login)}
              </span>
              <span class='self-end text-[10px] text-ink-muted'>
                {new Date().toLocaleTimeString(
                  language.peek() === 'en' ? 'en-US' : 'fr-FR',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  },
                )}
              </span>
            </div>
          </div>
        )
        : (
          <div class='rounded-lg border border-line-strong bg-surface-000 p-4 inset-shadow-well'>
            <div class='flex flex-col gap-2.5 rounded-[8px] border border-figure-edge bg-surface-100 p-3.5 shadow-tile'>
              <div class='flex items-center gap-2.5'>
                <Avatar name={me.name} src={me.avatarUrl} size={34} />
                <span class='flex flex-col'>
                  <span class='text-[14px] leading-6 font-semibold'>
                    {me.name}
                  </span>
                  <span class='text-[11px] leading-4 text-ink-muted'>
                    à l’instant
                  </span>
                </span>
              </div>
              <span class='text-[14px] leading-[21px]'>
                Mon profil Pamoja : mes reviews et contributions, vérifiées par
                GitHub.
              </span>
              <div class='overflow-hidden rounded-md border border-line'>
                <img
                  src={cardUrl(login)}
                  alt=''
                  class='aspect-[1200/630] w-full bg-surface-000 object-cover'
                />
                <div class='flex flex-col gap-0.5 p-2.5'>
                  <span class='text-[14px] leading-6 font-semibold'>
                    {person.name} · Your work is your profile
                  </span>
                  <span class='font-mono text-[11px] leading-none text-ink-muted'>
                    {location.host}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      <A
        params={{ dialog: null, view: 'public' }}
        class='self-start text-[13px] font-semibold'
      >
        Ouvrir le passeport développeur
      </A>
    </div>
  )
}

/** Share card with its links (?dialog=partage) */
export const ShareDialog = ({ login }: { login: Login }) => (
  <Dialog id='share' title='Carte de partage' width={720}>
    <div class='flex flex-col gap-[18px] px-6 pt-5 pb-6'>
      <Card key={cardUrl(login)} login={login} />
      <StylePicker />
      <div class='flex flex-wrap gap-3 pb-1'>
        {shareLinks(login).map(([network, href]) => (
          <a
            key={network}
            href={href}
            target='_blank'
            rel='noopener noreferrer'
            class='key key-secondary h-9 rounded-md px-4 text-[14px]'
          >
            {network}
          </a>
        ))}
        <Button
          variant='secondary'
          size={36}
          onClick={() =>
            navigator.clipboard.writeText(profileUrl(login)).then(() =>
              notify({
                title: 'Lien copié',
                body: profileUrl(login),
                icon: Copy,
                tone: 'verified',
              })
            )}
        >
          <Copy />
          Copier le lien
        </Button>
        <span class='flex-1' />
        <a
          href={cardUrl(login)}
          download={`pamoja-${login}.png`}
          class='key key-primary inline-flex h-9 items-center gap-2 rounded-md px-4 text-[14px] no-underline hover:no-underline'
        >
          <Download class='size-4' />
          Télécharger
        </a>
      </div>
      <LinkPreview login={login} />
    </div>
  </Dialog>
)
