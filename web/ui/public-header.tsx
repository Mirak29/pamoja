import { A } from '@01edu/signal-router'
import { signedIn } from '/web/lib/session.ts'
import { Button } from '/web/ui/button.tsx'
import { LogoMark } from '/web/ui/logo.tsx'

/**
 * Link to the passport of a developer: /@login for a visitor; signed in,
 * /@login?vue=publique previews it.
 *
 * @example
 * <A {...passportLink('moussa')}>Voir le passeport de Moussa</A>
 */
export const passportLink = (login: string) => ({
  href: `@${login}`,
  params: signedIn.value ? { vue: 'publique' } : undefined,
})

/** Header of the pages seen without a session: landing and passport */
export const PublicHeader = () => (
  <header class='mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-4 px-7 py-[18px]'>
    <A
      href='.'
      class='flex items-center gap-2.5 text-ink no-underline hover:no-underline'
    >
      <LogoMark size={34} />
      <span class='font-display text-[24px] leading-none font-bold tracking-[-.01em]'>
        Pamoja
      </span>
    </A>
    <span class='flex-1' />
    <A {...passportLink('moussa')} class='text-[14px] font-semibold'>
      Voir un profil
    </A>
    <Button variant='secondary' href='connexion'>Se connecter</Button>
  </header>
)
