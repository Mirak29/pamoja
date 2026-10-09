import { useState } from 'preact/hooks'
import { A, navigate, url } from '@01edu/signal-router'
import { Github } from '/web/assets/icons.tsx'
import { me } from '/web/fixtures/people.ts'
import { signIn } from '/web/fixtures/session.ts'
import { NoticeBadge } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Page } from '/web/ui/layout.tsx'
import { LogoMark } from '/web/ui/logo.tsx'

// Read only GitHub App: what the authorization lets Pamoja read (§5.1)
const scopes = [
  'Lire ton profil public : nom, avatar, bio, ville',
  'Lire tes repos publics',
  'Lire ton adresse e-mail principale',
]

/**
 * /connexion, and any app page seen without a session: the GitHub
 * authorization, simulated until the login exists (PAM-110). Once
 * authorized, the page asked for opens.
 */
export const ConnexionPage = () => {
  const [loading, setLoading] = useState(false)
  const authorize = () => {
    if (loading) return
    setLoading(true)
    setTimeout(() => {
      signIn()
      if (url.relativePath === '/connexion') navigate({ href: '.' })
    }, 900)
  }
  return (
    <Page
      title='Connexion'
      class='flex min-h-screen items-center justify-center px-5 py-8'
    >
      <div class='slab mr-2 flex w-full max-w-[460px] flex-col gap-5 p-7'>
        <div class='flex items-center justify-between'>
          <NoticeBadge>Page GitHub simulée</NoticeBadge>
          <A href='.' class='text-[13px]'>Annuler</A>
        </div>
        <div class='flex items-center justify-center gap-2.5 py-2'>
          <LogoMark size={44} />
          <svg width='90' height='20' viewBox='0 0 90 20' aria-hidden='true'>
            <path
              d='M4 10 C 30 -2, 60 22, 86 10'
              stroke='var(--indigo)'
              stroke-width='1.5'
              stroke-dasharray='4 4'
              fill='none'
            />
          </svg>
          <span class='flex size-11 flex-none items-center justify-center rounded-md border border-figure-edge bg-surface-100 text-ink shadow-tile'>
            <Github class='size-[22px]' />
          </span>
        </div>
        <div class='flex flex-col gap-1.5 text-center'>
          <h1 class='font-display text-[24px] leading-[30px] font-bold'>
            Autoriser Pamoja
          </h1>
          <span class='text-[14px] text-ink-muted'>
            Pamoja demande l’accès au compte GitHub{' '}
            <span class='font-mono text-ink'>@{me.login}</span>
          </span>
        </div>
        <ul class='flex flex-col gap-2.5 rounded-lg border border-line-strong bg-surface-000 px-4 py-3.5 text-[14px] inset-shadow-well'>
          {scopes.map((scope) => (
            <li key={scope} class='flex items-center gap-2.5'>
              <span aria-hidden='true' class='diamond size-[7px] bg-indigo' />
              {scope}
            </li>
          ))}
        </ul>
        <span class='text-[13px] leading-5 text-ink-muted'>
          Pamoja n’écrit jamais dans tes repos. La synchro live s’active plus
          tard, projet par projet.
        </span>
        <Button
          size={46}
          aria-busy={loading}
          onClick={authorize}
          class='w-[calc(100%-4px)]'
        >
          {loading ? 'Connexion…' : 'Autoriser Pamoja'}
        </Button>
      </div>
    </Page>
  )
}
