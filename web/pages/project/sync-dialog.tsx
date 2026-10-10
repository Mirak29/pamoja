import { useEffect, useState } from 'preact/hooks'
import { navigate } from '@01edu/signal-router'
import {
  ExternalLink,
  Github,
  Loader,
  Lock,
  ShieldCheck,
  Zap,
} from '/web/assets/icons.tsx'
import { postAlert } from '/web/fixtures/channels.ts'
import {
  type Project,
  type ProjectSlug,
  updateProject,
} from '/web/fixtures/projects.ts'
import { DemoBadge } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Dialog } from '/web/ui/dialog.tsx'
import { notify } from '/web/ui/toast.tsx'

type Step = 'intro' | 'github' | 'checks'

const Footer = ({ children }: { children: preact.ComponentChildren }) => (
  <div class='flex flex-wrap items-center gap-3.5 border-t border-line pt-[18px]'>
    {children}
  </div>
)

const Intro = (
  { repo, next }: { repo: string; next: () => void },
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
        'Tu installes l’app Pamoja Sync sur ce repo uniquement, depuis GitHub.',
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
    <Footer>
      <Button size={40} onClick={next}>
        Continuer vers GitHub
        <ExternalLink />
      </Button>
      <Button variant='secondary' size={40} params={{ dialog: null }}>
        Annuler
      </Button>
    </Footer>
  </>
)

/**
 * The GitHub installation page, simulated until the GitHub App redirects
 * back with its installation (§5.4)
 */
const GithubInstall = (
  { owner, repo, next }: { owner: string; repo: string; next: () => void },
) => (
  <div class='mr-1 overflow-hidden rounded-[8px] border border-figure-edge shadow-tile'>
    <div class='flex flex-wrap items-center gap-2 border-b border-line bg-surface-200 px-2.5 py-2'>
      <Lock class='size-3.5 text-ink-muted' />
      <span class='min-w-[200px] flex-1 rounded-sm border border-line-strong bg-surface-100 px-2 py-[5px] font-mono text-[12px] leading-4 text-ink-muted inset-shadow-well'>
        github.com/apps/pamoja-sync/installations/new
      </span>
      <span class='inline-flex h-[22px] items-center rounded-sm border border-dashed border-line-control px-2 font-mono text-[11px] leading-none font-medium tracking-[.06em] text-ink-muted uppercase'>
        Page simulée
      </span>
    </div>
    <div class='flex flex-col gap-4 bg-surface-100 p-5'>
      <span class='flex items-center gap-2.5'>
        <Github class='size-[22px]' />
        <span class='font-display text-[19px] leading-6 font-semibold'>
          Installer Pamoja Sync
        </span>
      </span>
      <span class='text-[14px]'>
        sur le compte <span class='font-mono font-medium'>@{owner}</span>
      </span>
      <div class='flex flex-col gap-2.5 rounded-md border border-line-strong bg-surface-000 px-3.5 py-3 text-[14px] inset-shadow-well'>
        <span class='flex items-center gap-2.5 text-ink-muted'>
          <span class='size-3.5 rounded-full border border-line-control' />
          Tous les repos
        </span>
        <span class='flex items-center gap-2.5 font-semibold'>
          <span class='size-3.5 rounded-full border-4 border-indigo' />
          Seulement certains repos
        </span>
        <span class='tile ml-6 inline-flex h-[26px] items-center self-start rounded-[5px] px-2.5 font-mono text-[13px] leading-none font-medium'>
          {repo}
        </span>
      </div>
      <div class='flex flex-col gap-1 text-[13px] leading-5'>
        <span class='font-semibold'>Permissions demandées</span>
        <span class='text-ink-muted'>
          Lecture : métadonnées, contenus, pull requests, checks.
        </span>
        <span class='text-ink-muted'>
          Événements : pull_request, pull_request_review, check_run, release.
        </span>
      </div>
      <div class='flex flex-wrap gap-3 pb-1'>
        <Button onClick={next}>Installer</Button>
        <Button variant='secondary' params={{ dialog: null }}>
          Annuler
        </Button>
      </div>
    </div>
  </div>
)

const Checks = ({ project }: { project: Project }) => {
  const [done, setDone] = useState(0)
  useEffect(() => {
    const timers = [1, 2, 3].map((i) => setTimeout(() => setDone(i), 750 * i))
    return () => timers.forEach(clearTimeout)
  }, [])
  const repo = `${project.owner}/${project.slug}`
  const checks = [
    [
      'Identité',
      `Le compte GitHub qui installe l’app est bien @${project.owner}, connecté à Pamoja.`,
    ],
    ['Repo couvert', `${repo} fait partie des repos de l’installation.`],
    ['Droit admin', `@${project.owner} est administrateur du repo sur GitHub.`],
  ]

  const finish = () => {
    updateProject(
      project,
      { sync: 'live', appInstalled: true },
      'Synchro live activée',
    )
    postAlert(
      project.slug as ProjectSlug,
      'sync',
      'Synchro live activée : identité, repo couvert et droit admin vérifiés. Les PRs, reviews, CI et releases arrivent ici en temps réel.',
    )
    navigate({ params: { dialog: null } })
    notify({
      title: 'Synchro live active',
      body:
        `${project.name} reçoit maintenant les événements GitHub en temps réel.`,
      icon: Zap,
      tone: 'verified',
    })
  }

  return (
    <>
      <h2 class='font-display text-heading'>Retour sur Pamoja</h2>
      <span class='text-[14px] text-ink-muted'>
        Trois contrôles avant d’activer la synchro live.
      </span>
      <div class='flex flex-col gap-2.5'>
        {checks.map(([label, description], i) => {
          const ok = done > i
          const current = done === i
          return (
            <div
              key={label}
              class={`flex items-start gap-3 rounded-[8px] border p-3.5 transition-[background-color,border-color] duration-200 ease-out ${
                ok
                  ? 'border-verified bg-verified-soft'
                  : 'border-dashed border-line-control bg-surface-100'
              }`}
            >
              <span
                class={`flex pt-0.5 ${
                  ok ? 'text-verified' : 'text-ink-muted'
                } ${current ? 'animate-blink' : ''}`}
              >
                {ok ? <ShieldCheck /> : <Loader />}
              </span>
              <span class='flex flex-1 flex-col gap-0.5'>
                <span class='flex flex-wrap justify-between gap-2'>
                  <span class='text-[14px] font-semibold'>{label}</span>
                  <span
                    class={`font-mono text-[11px] leading-[18px] font-medium tracking-[.06em] uppercase ${
                      ok ? 'text-verified' : 'text-ink-muted'
                    }`}
                  >
                    {ok ? 'Vérifié' : current ? 'Vérification…' : 'En attente'}
                  </span>
                </span>
                <span class='text-[13px] leading-5 text-ink-muted'>
                  {description}
                </span>
              </span>
            </div>
          )
        })}
      </div>
      {done >= 3 && (
        <div class='flex animate-enter flex-wrap items-center gap-3 border-t border-line pt-[18px]'>
          <DemoBadge />
          <span class='flex-1' />
          <Button size={40} onClick={finish}>
            <Zap />
            Activer la synchro live
          </Button>
        </div>
      )}
    </>
  )
}

const SyncFlow = ({ project }: { project: Project }) => {
  const [step, setStep] = useState<Step>('intro')
  const repo = `${project.owner}/${project.slug}`
  return (
    <div class='flex flex-col gap-[18px] px-6 pt-[22px] pb-6'>
      {step === 'intro' && <Intro repo={repo} next={() => setStep('github')} />}
      {step === 'github' && (
        <GithubInstall
          owner={project.owner}
          repo={repo}
          next={() => setStep('checks')}
        />
      )}
      {step === 'checks' && <Checks project={project} />}
    </div>
  )
}

/** Live sync: GitHub App installation and its three checks (§5.4) */
export const SyncDialog = ({ project }: { project: Project }) => (
  <Dialog id='sync' title={`Synchro live · ${project.name}`} width={600}>
    <SyncFlow project={project} />
  </Dialog>
)
