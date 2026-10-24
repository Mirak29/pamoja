import { A } from '@01edu/signal-router'
import { signedIn } from '/web/lib/session.ts'
import { Button } from '/web/ui/button.tsx'
import { LogoMark } from '/web/ui/logo.tsx'
import { LanguageToggle } from '/web/ui/language-toggle.tsx'
import { ThemeToggle } from '/web/ui/theme-toggle.tsx'

/**
 * Link to the passport of a developer: /@login for a visitor; signed in,
 * /@login?vue=publique previews it.
 *
 * @example
 * <A {...passportLink('moussa')}>Voir le passeport de Moussa</A>
 */
export const passportLink = (login: string) => ({
  href: `@${login}`,
  params: signedIn.value ? { view: 'public' } : undefined,
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
    {/* One group: on a phone it goes under the logo as a whole */}
    <div class='ml-auto flex items-center gap-2.5'>
      <A
        {...passportLink('moussa')}
        class='mr-1.5 text-[14px] font-semibold'
      >
        Voir un profil
      </A>
      <ThemeToggle />
      <LanguageToggle />
      <Button variant='secondary' href='login'>Se connecter</Button>
    </div>
  </header>
)
