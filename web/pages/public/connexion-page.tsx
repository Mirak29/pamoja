import { useEffect, useRef, useState } from 'preact/hooks'
import { A, navigate, url } from '@01edu/signal-router'
import { CircleAlert, Github } from '/web/assets/icons.tsx'
import { finishLogin, startLogin, takeBack } from '/web/lib/session.ts'
import { Button } from '/web/ui/button.tsx'
import { Page } from '/web/ui/layout.tsx'
import { LogoMark } from '/web/ui/logo.tsx'

// Read only GitHub App: what the authorization lets Pamoja read (§5.1)
const scopes = [
  'Lire ton profil public : nom, avatar, bio',
  'Lire tes repos publics',
  'Lire ton adresse e-mail, si tu l’autorises',
]

const failed = 'La connexion n’a pas abouti. Recommence : rien n’est perdu.'

/**
 * /connexion, and any app page seen without a session: sends the browser to
 * GitHub (§5.3). /connexion/github is the page GitHub sends back to, with
 * `code` and `state`: the first login goes on to the onboarding, the next
 * ones to the page asked for.
 */
export const ConnexionPage = () => {
  const callback = url.relativePath === '/connexion/github'
  const [loading, setLoading] = useState(callback)
  const [error, setError] = useState('')

  // Once per page: a state works only once on the server
  const done = useRef(false)
  useEffect(() => {
    if (!callback || done.current) return
    done.current = true
    const { code, state } = url.params
    if (!code || !state) {
      setLoading(false)
      setError(failed)
      return
    }
    finishLogin(code, state).then(
      (created) =>
        // Replace: the code must not stay in the history. Without a page to
        // go back to, the home page: an empty href would stay right here.
        navigate({
          href: created ? 'onboarding' : takeBack() || '.',
          replace: true,
        }),
      () => {
        setLoading(false)
        setError(failed)
      },
    )
  }, [callback])

  const authorize = () => {
    if (loading) return
    setLoading(true)
    setError('')
    // /connexion?retour=… comes from a link; another page asked for itself.
    // After a failed callback, the page kept from the first attempt stays.
    const back = url.relativePath === '/connexion'
      ? (url.params.retour ?? '')
      : callback
      ? `/${takeBack()}`
      : `${url.relativePath}${location.search}`
    startLogin(back).catch(() => {
      setLoading(false)
      setError(failed)
    })
  }

  return (
    <Page
      title='Connexion'
      heading={false}
      class='flex min-h-screen items-center justify-center px-5 py-8'
    >
      <div class='slab mr-2 flex w-full max-w-[460px] flex-col gap-5 p-7'>
        <div class='flex items-center justify-end'>
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
            Se connecter avec GitHub
          </h1>
          <span class='text-[14px] text-ink-muted'>
            Ton compte Pamoja est ton compte GitHub : pas de mot de passe en
            plus.
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
        {error && (
          <div
            role='alert'
            class='flex items-center gap-2 text-[14px] text-danger'
          >
            <CircleAlert />
            {error}
          </div>
        )}
        <Button
          size={46}
          aria-busy={loading}
          onClick={authorize}
          class='w-[calc(100%-4px)]'
        >
          {loading ? 'Connexion…' : 'Continuer avec GitHub'}
        </Button>
      </div>
    </Page>
  )
}
