import { A } from '@01edu/signal-router'
import { Button } from '/web/ui/button.tsx'
import { Page } from '/web/ui/layout.tsx'
import { LogoMark } from '/web/ui/logo.tsx'
import { Plates } from '/web/ui/plates.tsx'

/** Any address that leads to no page, with or without a session */
export const NotFoundPage = () => (
  <Page
    title='Page introuvable'
    heading={false}
    class='flex min-h-screen flex-col items-center justify-center gap-[18px] px-6 py-12 text-center'
  >
    <A
      href='.'
      aria-label='Pamoja'
      class='flex items-center gap-2.5 text-ink no-underline hover:no-underline'
    >
      <LogoMark size={34} />
      <span class='font-display text-[24px] leading-none font-bold'>
        Pamoja
      </span>
    </A>
    <Plates width={320} height={262} />
    <span class='font-mono text-[14px] leading-none font-medium tracking-[.2em] text-indigo'>
      404
    </span>
    <h1 class='max-w-[640px] font-display text-[40px] leading-[46px] font-bold tracking-[-.02em] text-balance'>
      Ce lien ne mène nulle part
    </h1>
    <p class='max-w-[460px] text-[16px] leading-[26px] text-pretty text-ink-muted'>
      La page a peut-être été déplacée, ou le lien est incomplet. Le fil, lui,
      est toujours là.
    </p>
    <div class='flex flex-wrap justify-center gap-3.5 pb-1'>
      <Button size={42} href='.'>Retourner à l’accueil</Button>
      <Button size={42} variant='secondary' href='explore/projects'>
        Explorer les projets
      </Button>
    </div>
  </Page>
)
