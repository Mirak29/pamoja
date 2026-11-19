import type { ComponentChildren } from 'preact'
import { useErrorBoundary } from 'preact/hooks'
import { RotateCw } from '/web/assets/icons.tsx'
import { Button } from '/web/ui/button.tsx'
import { GhostSlab } from '/web/ui/states.tsx'

/**
 * A page that fails to render fails alone. Without it, one error thrown by
 * a card took the whole tree of the app down: the address still changed on
 * a click, nothing was drawn again, and only a refresh brought the app back.
 * Here the navigation, the header and the Assistant keep working, the page
 * says it failed, and the next address (keyed by app.tsx) starts afresh.
 */
export const PageBoundary = ({ children }: { children: ComponentChildren }) => {
  const [error, retry] = useErrorBoundary((err) =>
    // Kept in the console: what failed, where, for the bug report
    console.error('page-render-error', err)
  )
  if (!error) return <>{children}</>
  return (
    <div role='alert' class='max-w-[760px] pt-5'>
      <GhostSlab
        danger
        class='flex flex-col items-center gap-3.5 px-7 py-9 text-center'
      >
        <span class='font-display text-[22px] leading-7 font-semibold'>
          Cette page n’a pas pu s’afficher
        </span>
        <span class='max-w-[460px] text-pretty text-ink-muted'>
          Une erreur l’a interrompue. Tes données sont intactes ; le reste de
          Pamoja fonctionne.
        </span>
        <div class='flex flex-wrap justify-center gap-2.5 pb-1'>
          <Button size={40} onClick={retry}>
            <RotateCw />
            Réessayer
          </Button>
          <Button size={40} variant='secondary' href='.'>
            Retour à l’accueil
          </Button>
        </div>
      </GhostSlab>
    </div>
  )
}
