import { useEffect } from 'preact/hooks'
import { Download, RefreshCw } from '/web/assets/icons.tsx'
import {
  browser,
  device,
  install,
  installed,
  installPrompt,
  reloadNow,
  updated,
} from '/web/lib/pwa.ts'
import { Button } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { notify } from '/web/ui/toast.tsx'

// « Installer l'app » (PWA), on any device: the browser's own offer where
// it has one (Chrome, Edge, Samsung Internet), else the steps of this
// device and browser, since Safari and Firefox never offer it themselves.

const steps = (): string[] => {
  if (device === 'ios') {
    return [
      'Touche le bouton Partager (le carré et sa flèche), en bas ou en haut de l’écran.',
      'Choisis « Sur l’écran d’accueil », puis « Ajouter ».',
      'Pamoja s’ouvre ensuite depuis son icône, en plein écran.',
    ]
  }
  if (device === 'android') {
    return browser === 'firefox'
      ? [
        'Ouvre le menu ⋮ de Firefox.',
        'Choisis « Installer » ou « Ajouter à l’écran d’accueil ».',
      ]
      : [
        'Ouvre le menu ⋮ du navigateur.',
        'Choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
      ]
  }
  if (browser === 'safari') {
    return [
      'Dans la barre des menus, ouvre « Fichier ».',
      'Choisis « Ajouter au Dock », puis « Ajouter ».',
    ]
  }
  if (browser === 'firefox') {
    return [
      'Firefox n’installe pas les applications web sur ordinateur.',
      'Ouvre pamoja-tech.duckdns.org dans Chrome ou Edge, puis « Installer l’app ».',
    ]
  }
  return [
    'Clique sur l’icône d’installation, à droite de la barre d’adresse.',
    'Ou ouvre le menu ⋮ du navigateur, puis « Installer Pamoja ».',
  ]
}

/** Opened by `?dialog=install`, from the header or the account menu */
export const InstallDialog = () => (
  <Dialog id='install' title='Installer Pamoja' width={540}>
    <div class='flex flex-col gap-4 p-[22px] text-[15px] leading-6'>
      {installed.value ? <p>Pamoja est déjà installé sur cet appareil.</p> : (
        <>
          <p class='text-pretty'>
            Pamoja s’installe comme une application, sur téléphone comme sur
            ordinateur : une icône, une fenêtre à lui, et les mises à jour se
            font toutes seules.
          </p>
          {installPrompt.value
            ? (
              <Button
                variant='primary'
                class='self-start'
                onClick={async () => {
                  if (await install()) {
                    notify({
                      title: 'Pamoja est installé',
                      body: 'Retrouve-le parmi tes applications.',
                      icon: Download,
                      tone: 'verified',
                    })
                  }
                }}
              >
                <Download class='size-[18px]' />
                Installer l’app
              </Button>
            )
            : (
              <ol class='flex list-decimal flex-col gap-2 pl-5 marker:font-mono marker:text-ink-muted'>
                {steps().map((step) => <li key={step}>{step}</li>)}
              </ol>
            )}
        </>
      )}
    </div>
  </Dialog>
)

/** Tells once that a new version arrived, and lets it apply at once */
export const UpdateNotice = () => {
  useEffect(() =>
    updated.subscribe((value) => {
      if (value) {
        notify({
          title: 'Nouvelle version de Pamoja',
          body:
            'Elle s’applique dès que tu quittes la page, ou maintenant avec « Recharger ».',
          icon: RefreshCw,
        }, 15000)
      }
    }), [])
  return updated.value
    ? (
      <div class='fixed right-4 bottom-[88px] z-50 md:bottom-6'>
        <Button variant='primary' onClick={reloadNow}>
          <RefreshCw class='size-[16px]' />
          Recharger
        </Button>
      </div>
    )
    : null
}
