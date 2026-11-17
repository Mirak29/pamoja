import { navigate } from '@01edu/signal-router'
import { CircleAlert } from '/web/assets/icons.tsx'
import { currentUser, signOut } from '/web/lib/session.ts'
import { Button } from '/web/ui/button.tsx'
import { notify } from '/web/ui/toast.tsx'

/**
 * Shown on every page of the shared demo account (PAM-127): who the visitor
 * is, that what they publish is public, and the way out.
 */
export const DemoBanner = () =>
  currentUser.value?.demoAccount
    ? (
      <div
        role='status'
        class='mx-auto flex w-full max-w-[1140px] flex-wrap items-center justify-between gap-3 px-4 pt-3 md:pr-8 md:pl-4'
      >
        <div class='flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-indigo bg-indigo-soft px-3.5 py-2.5 text-[14px]'>
          <span class='min-w-0 flex-1'>
            Tu explores Pamoja avec Fatou, un compte de démonstration partagé.
            Ce que tu publies est visible par tous.
          </span>
          <Button
            size={32}
            variant='secondary'
            // The landing shows the demo button: it comes once signed out
            onClick={() =>
              signOut().then((left) => {
                left || notify({
                  title: 'Déconnexion non confirmée',
                  body:
                    'Le serveur n’a pas répondu : la session de démo est peut-être encore ouverte. Recharge la page pour vérifier.',
                  icon: CircleAlert,
                  tone: 'danger',
                })
                navigate({ href: '.', replace: true })
              })}
          >
            Quitter la démo
          </Button>
        </div>
      </div>
    )
    : null
