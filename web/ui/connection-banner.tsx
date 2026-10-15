import { RotateCw } from '/web/assets/icons.tsx'
import { sourceDisconnectedAt } from '/web/lib/realtime.ts'

/**
 * Discreet notice while the realtime connection is lost (§13.4): the page
 * still works, it only stops updating by itself until the browser
 * reconnects.
 */
export const ConnectionBanner = () =>
  sourceDisconnectedAt.value
    ? (
      <div
        role='status'
        class='fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-md border border-warning bg-warning-soft px-3 py-2 text-[13px] text-warning shadow-tile md:bottom-6'
      >
        <RotateCw class='size-4 motion-safe:animate-spin' aria-hidden='true' />
        Connexion perdue : mise à jour en direct suspendue, reconnexion…
      </div>
    )
    : null
