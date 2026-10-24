import { useEffect, useRef, useState } from 'preact/hooks'
import { A, navigate, url } from '@01edu/signal-router'
import {
  CircleAlert,
  Loader,
  RotateCw,
  ShieldCheck,
  Zap,
} from '/web/assets/icons.tsx'
import { api, type ApiOutput } from '/web/lib/api.ts'
import { loadProjects } from '/web/lib/session.ts'
import { Button } from '/web/ui/button.tsx'
import { Page } from '/web/ui/layout.tsx'
import { LogoMark } from '/web/ui/logo.tsx'
import { notify } from '/web/ui/toast.tsx'

type Result = ApiOutput['POST/api/github/installation/confirm']

const labels = {
  identity: [
    'Identité',
    'Le compte GitHub qui installe l’app est celui connecté à Pamoja.',
  ],
  coverage: [
    'Repo couvert',
    'Le repo du projet fait partie de l’installation.',
  ],
  admin: [
    'Droit admin',
    'Ce compte administre ou maintient le repo sur GitHub.',
  ],
} as const

// What to do when a check fails
const fixes = {
  identity:
    'Installe l’app depuis le compte GitHub avec lequel tu te connectes à Pamoja.',
  coverage:
    'Dans GitHub, ajoute ce repo aux repos de l’installation, puis recommence.',
  admin: 'Seul un admin ou un maintainer du repo peut activer la synchro live.',
} as const

/**
 * /login/github with an installation_id: GitHub sends the developer back
 * here after installing the app (§5.4). The server runs its three checks;
 * the page shows each one, and the live sync is on only if all pass.
 */
export const InstallationReturn = () => {
  const { code, installation_id, state, setup_action } = url.params
  const [result, setResult] = useState<Result>()
  const [error, setError] = useState('')
  const done = useRef(false)

  useEffect(() => {
    // A member of an organization only asks its owners to install the app
    if (done.current || setup_action === 'request') return
    done.current = true
    if (!code || !installation_id || !state) {
      setError(
        'GitHub n’a pas renvoyé l’installation. Recommence depuis le projet.',
      )
      return
    }
    api['POST/api/github/installation/confirm'].fetch({
      code,
      installationId: installation_id,
      state,
    }).then(async (answer) => {
      setResult(answer)
      if (!answer.live) return
      await loadProjects()
      notify({
        title: 'Synchro live active',
        body: 'Les PRs, reviews et CI arrivent maintenant en temps réel.',
        icon: Zap,
        tone: 'verified',
      })
    }, (err) => {
      // The state is checked as for the login (§5.3)
      const reason = (err as { data?: { reason?: string } })?.data?.reason
      setError(
        reason === 'expired'
          ? 'Le retour de GitHub a expiré : plus de 10 minutes ont passé. Relance la synchro live depuis le projet.'
          : reason === 'browser'
          ? 'L’installation a commencé dans un autre navigateur ou une fenêtre privée. Relance-la d’ici, depuis le projet.'
          : 'Pamoja n’a pas pu vérifier l’installation. Relance la synchro live depuis le projet.',
      )
    })
  }, [])

  const failed = result?.checks.find((check) => !check.ok)
  return (
    <Page
      title='Synchro live'
      heading={false}
      class='flex min-h-screen items-center justify-center px-5 py-8'
    >
      <div class='slab mr-2 flex w-full max-w-[520px] flex-col gap-5 p-7'>
        <div class='flex items-center gap-3'>
          <LogoMark size={36} />
          <h1 class='font-display text-[22px] leading-7 font-bold'>
            {setup_action === 'request'
              ? 'Demande envoyée'
              : 'Retour sur Pamoja'}
          </h1>
        </div>

        {setup_action === 'request' && (
          <span class='text-[14px] leading-[22px] text-ink-muted'>
            Sur un repo d’organisation, seuls ses owners installent l’app.
            GitHub leur a transmis ta demande ; la synchro live s’active dès
            qu’ils l’acceptent et que tu relances depuis le projet.
          </span>
        )}

        {setup_action !== 'request' && !error && (
          <>
            <span role='status' class='text-[14px] text-ink-muted'>
              {!result
                ? 'Trois contrôles avant d’activer la synchro live…'
                : result.live
                ? 'Les trois contrôles sont passés : la synchro live est active.'
                : 'La synchro live reste désactivée : un contrôle n’est pas passé.'}
            </span>
            <div class='flex flex-col gap-2.5'>
              {(['identity', 'coverage', 'admin'] as const).map((name) => {
                const check = result?.checks.find((c) => c.name === name)
                const [label, description] = labels[name]
                const tone = !check
                  ? 'border-dashed border-line-control bg-surface-100'
                  : check.ok
                  ? 'border-verified bg-verified-soft'
                  : 'border-danger bg-danger-soft'
                return (
                  <div
                    key={name}
                    class={`flex items-start gap-3 rounded-[8px] border p-3.5 ${tone}`}
                  >
                    <span
                      class={`flex pt-0.5 ${
                        !check
                          ? 'text-ink-muted motion-safe:animate-blink'
                          : check.ok
                          ? 'text-verified'
                          : 'text-danger'
                      }`}
                    >
                      {!check
                        ? <Loader />
                        : check.ok
                        ? <ShieldCheck />
                        : <CircleAlert />}
                    </span>
                    <span class='flex flex-1 flex-col gap-0.5'>
                      <span class='flex flex-wrap justify-between gap-2'>
                        <span class='text-[14px] font-semibold'>{label}</span>
                        <span class='font-mono text-[11px] leading-[18px] font-medium tracking-[.06em] uppercase'>
                          {!check
                            ? 'Vérification…'
                            : check.ok
                            ? 'Vérifié'
                            : 'Refusé'}
                        </span>
                      </span>
                      <span class='text-[13px] leading-5 text-ink-muted'>
                        {check && !check.ok ? fixes[name] : description}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {error && (
          <div
            role='alert'
            class='flex items-center gap-2 text-[14px] text-danger'
          >
            <CircleAlert />
            {error}
          </div>
        )}

        <div class='flex flex-wrap items-center gap-3 border-t border-line pt-[18px]'>
          {result && (
            <Button
              size={40}
              onClick={() =>
                navigate({ href: `project/${result.slug}`, replace: true })}
            >
              {result.live ? <Zap /> : <RotateCw />}
              {result.live ? 'Ouvrir le projet' : 'Retour au projet'}
            </Button>
          )}
          {(error || setup_action === 'request') && (
            <A href='projects' class='text-[14px] font-semibold'>
              Mes projets
            </A>
          )}
          {failed && (
            <span class='text-[13px] text-ink-muted'>
              Tu peux relancer la synchro live depuis le projet.
            </span>
          )}
        </div>
      </div>
    </Page>
  )
}
