import type { ComponentChildren } from 'preact'
import { RotateCw } from '/web/assets/icons.tsx'
import { Button } from '/web/ui/button.tsx'

/**
 * Dashed slab with a dashed thickness: something that does not exist yet
 * (a page, a link, an empty list) or that failed.
 *
 * @example
 * <GhostSlab class='px-6 py-7'>Personne ne correspond à ces filtres.</GhostSlab>
 */
export const GhostSlab = (
  { danger, class: className, children }: {
    danger?: boolean
    class?: string
    children: ComponentChildren
  },
) => {
  const border = danger ? 'border-danger' : 'border-line-control'
  return (
    <div class='relative mr-2 mb-1.5'>
      <div
        aria-hidden='true'
        class={`absolute inset-0 translate-x-[6.93px] translate-y-1 rounded-lg border border-dashed ${border}`}
      />
      <div
        class={`relative rounded-lg border border-dashed bg-surface-100 ${border} ${
          className ?? ''
        }`}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * A clear sentence and, when useful, the action that fills the list.
 * No decorative figure (cahier des charges §12.7).
 *
 * @example
 * <EmptyState action={<Button href='aide/nouvelle'>Demander de l’aide</Button>}>
 *   Aucune demande pour l’instant.
 * </EmptyState>
 */
export const EmptyState = (
  { action, children }: {
    action?: ComponentChildren
    children: ComponentChildren
  },
) => (
  <div class='flex flex-col items-center gap-3 px-6 py-10 text-center text-ink-muted'>
    <span class='max-w-[520px] text-pretty'>{children}</span>
    {action}
  </div>
)

const Bar = ({ class: width }: { class: string }) => (
  <span class={`block rounded-sm bg-surface-200 animate-skeleton ${width}`} />
)

const SkeletonRow = () => (
  <div class='flex items-start gap-3.5 border-t border-line px-5 py-4'>
    <span class='size-[38px] flex-none rounded-full border border-line bg-surface-200 animate-skeleton' />
    <span class='flex flex-1 flex-col gap-[9px]'>
      <Bar class='h-3 w-[42%]' />
      <Bar class='h-2.5 w-[88%]' />
      <Bar class='h-2.5 w-[64%]' />
    </span>
  </div>
)

/** Page skeleton while its data loads */
export const LoadingState = () => (
  <div
    aria-busy='true'
    aria-label='Chargement'
    class='mr-2 flex flex-col gap-7 pt-5'
  >
    <div class='slab flex flex-col gap-3 p-[22px]'>
      <Bar class='h-2.5 w-[30%]' />
      <Bar class='h-[26px] w-[56%]' />
      <Bar class='h-3 w-[78%]' />
    </div>
    <div class='slab overflow-hidden'>
      <div class='px-5 py-[18px]'>
        <Bar class='h-2.5 w-[24%]' />
      </div>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
    <span class='inline-flex items-center gap-2 font-mono text-label text-ink-muted uppercase'>
      <span
        aria-hidden='true'
        class='diamond size-[7px] bg-indigo animate-blink'
      />
      Chargement de la page…
    </span>
  </div>
)

/**
 * The page could not load. Nothing is lost: say it, and offer to retry.
 *
 * @example
 * <ErrorState code='ERR_NETWORK · /aide' onRetry={() => help.fetch()} />
 */
export const ErrorState = (
  { code, onRetry }: { code?: string; onRetry: () => void },
) => (
  <div role='alert' class='max-w-[760px] pt-5'>
    <GhostSlab
      danger
      class='flex flex-col items-center gap-3.5 px-7 py-9 text-center'
    >
      <span class='font-display text-[22px] leading-7 font-semibold'>
        Impossible de charger cette page
      </span>
      <span class='max-w-[460px] text-pretty text-ink-muted'>
        Pamoja n’arrive pas à joindre le serveur. Tes données sont intactes :
        rien n’est perdu.
      </span>
      {code && (
        <code class='font-mono text-[12px] leading-[18px] text-ink-muted'>
          {code}
        </code>
      )}
      <div class='pb-1'>
        <Button size={40} onClick={onRetry}>
          <RotateCw />
          Réessayer
        </Button>
      </div>
    </GhostSlab>
  </div>
)
