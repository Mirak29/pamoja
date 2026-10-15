import { useState } from 'preact/hooks'
import { ExternalLink } from '/web/assets/icons.tsx'
import type { Project } from '/web/fixtures/projects.ts'
import { api } from '/web/lib/api.ts'
import { repoPath } from '/web/lib/links.ts'
import { Button } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'

const Footer = ({ children }: { children: preact.ComponentChildren }) => (
  <div class='flex flex-wrap items-center gap-3.5 border-t border-line pt-[18px]'>
    {children}
  </div>
)

const Intro = (
  { repo, next, leaving, failed }: {
    repo: string
    next: () => void
    leaving: boolean
    failed: boolean
  },
) => (
  <>
    <h2 class='font-display text-heading'>Recevoir GitHub en temps réel</h2>
    <span class='text-[14px] leading-[22px] text-ink-muted'>
      Aujourd’hui, Pamoja lit {repo}{' '}
      toutes les 15 minutes. Avec la synchro live, les PRs, reviews, CI et
      releases arrivent dans #suivi en quelques secondes.
    </span>
    <div class='flex flex-col gap-3'>
      {[
        'Tu installes l’app Pamoja sur ce repo uniquement, depuis GitHub.',
        'GitHub te renvoie sur Pamoja.',
        'Pamoja vérifie trois choses : ton identité, le repo couvert et ton droit admin.',
      ].map((text, i) => (
        <div key={text} class='flex items-center gap-3'>
          <span class='tile flex size-8 flex-none items-center justify-center font-mono text-[14px] leading-none font-medium'>
            {i + 1}
          </span>
          <span class='text-[14px] leading-[22px]'>{text}</span>
        </div>
      ))}
    </div>
    {failed && (
      <span role='alert' class='text-[14px] text-danger'>
        Pamoja n’a pas pu préparer l’installation. Réessaie dans un instant.
      </span>
    )}
    <Footer>
      <Button
        size={40}
        onClick={next}
        aria-busy={leaving}
        aria-disabled={leaving}
        class={leaving ? 'pointer-events-none' : ''}
      >
        {leaving ? 'Ouverture de GitHub…' : 'Continuer vers GitHub'}
        <ExternalLink />
      </Button>
      <Button variant='secondary' size={40} params={{ dialog: null }}>
        Annuler
      </Button>
    </Footer>
  </>
)

const SyncFlow = ({ project }: { project: Project }) => {
  const [leaving, setLeaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const repo = repoPath(project).replace('github.com/', '')
  // The server keeps who installs and for which project in the state it
  // gives GitHub; the return page runs the three checks (§5.4)
  const start = () => {
    if (leaving) return
    setLeaving(true)
    setFailed(false)
    api['GET/api/github/installation/start'].fetch({ project: project.slug })
      .then(({ url }) => {
        location.href = new URL(url, document.baseURI).href
      }, () => {
        setLeaving(false)
        setFailed(true)
      })
  }
  return (
    <div class='flex flex-col gap-[18px] px-6 pt-[22px] pb-6'>
      <Intro repo={repo} next={start} leaving={leaving} failed={failed} />
    </div>
  )
}

/** Live sync: GitHub App installation and its three checks (§5.4) */
export const SyncDialog = ({ project }: { project: Project }) => (
  <Dialog id='sync' title={`Synchro live · ${project.name}`} width={600}>
    <SyncFlow project={project} />
  </Dialog>
)
