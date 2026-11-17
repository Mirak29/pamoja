import { useState } from 'preact/hooks'
import { navigate } from '@01edu/signal-router'
import { CircleAlert, Play } from '/web/assets/icons.tsx'
import { startDemo } from '/web/lib/session.ts'
import { Button } from '/web/ui/button.tsx'
import { notify } from '/web/ui/toast.tsx'

/**
 * « Essayer sans GitHub » (PAM-127): one click opens the shared demo
 * account, for the jury and the visitors without a GitHub account. The
 * landing and the login page both show it.
 */
export const DemoButton = (
  { size, next = '.', class: className }: {
    size: 46 | 48
    /** The page to open once signed in */
    next?: string
    class?: string
  },
) => {
  const [loading, setLoading] = useState(false)
  const open = () => {
    if (loading) return
    setLoading(true)
    startDemo().then(
      () => navigate({ href: next, replace: true }),
      () => {
        setLoading(false)
        notify({
          title: 'Démo indisponible',
          body:
            'Le compte de démonstration n’a pas pu s’ouvrir. Réessaie dans un instant.',
          icon: CircleAlert,
          tone: 'danger',
        })
      },
    )
  }
  return (
    <Button
      size={size}
      variant='secondary'
      aria-busy={loading}
      onClick={open}
      class={className}
    >
      <Play class='size-[18px]' />
      {loading ? 'Ouverture de la démo…' : 'Essayer sans GitHub'}
    </Button>
  )
}
