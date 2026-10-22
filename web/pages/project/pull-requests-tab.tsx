import { A, url } from '@01edu/signal-router'
import {
  Github,
  GitMerge,
  GitPullRequest,
  LifeBuoy,
} from '/web/assets/icons.tsx'
import { helpChanged, helpRequests } from '/web/fixtures/help.ts'
import { me, nameOf } from '/web/fixtures/people.ts'
import type { Project } from '/web/fixtures/projects.ts'
import { type PullRequest, pullRequests } from '/web/fixtures/pull-requests.ts'
import { ago } from '/web/lib/time.ts'
import { type Status, StatusBadge, statusLabel } from '/web/ui/badge.tsx'
import { githubUrl } from '/web/lib/links.ts'
import { counted } from '/web/lib/plural.ts'
import { Button } from '/web/ui/button.tsx'
import { Drawer } from '/web/ui/dialog.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { t, translate } from '/web/lib/language.ts'

const reviewStatus = (pr: PullRequest): Status =>
  pr.state === 'merged' ? 'merged' : `review-${pr.review}`

const firstName = (login: string) => nameOf(login).split(' ')[0]

const closedHelp = [
  'cancelled',
  'expired',
  'closed_unhelpful',
  'closed_unconfirmed',
]

const PullRequestDetail = (
  { project, pr }: { project: Project; pr: PullRequest },
) => {
  // Its own subscription: the requests may arrive after the projects, and a
  // child with the same props is not rendered again
  helpChanged.value
  const help = helpRequests.find((h) =>
    h.project === pr.project && h.pullRequest === pr.number &&
    !closedHelp.includes(h.status)
  )
  const isMember = project.owner === me.login ||
    project.members.some((m) => m.login === me.login)
  // A demo PR is not on GitHub: no request can be made on it
  const canRequest = !pr.demo && pr.state === 'open' &&
    pr.review === 'waiting' && isMember && !help
  const reviewers = pr.reviewers?.length
    ? pr.reviewers.map(firstName).join(', ')
    : pr.review === 'approved'
    ? 'Approuvée par Abdou'
    : 'Aucune review pour l’instant'
  return (
    <div class='flex flex-col gap-[18px] p-[22px]'>
      <h2 class='font-display text-[23px] leading-[29px] font-semibold'>
        {pr.title}
      </h2>
      <div class='flex flex-wrap gap-1.5'>
        <StatusBadge status={reviewStatus(pr)} />
        <StatusBadge status={pr.ci === 'ok' ? 'ci-ok' : 'ci-failed'} />
      </div>
      <dl class='grid grid-cols-[auto_1fr] gap-x-[18px] gap-y-2.5 rounded-md border border-line-strong bg-surface-000 p-3.5 text-[14px] inset-shadow-well'>
        <dt class='text-ink-muted'>Auteur</dt>
        <dd class='font-semibold'>{nameOf(pr.author)}</dd>
        <dt class='text-ink-muted'>Branche</dt>
        <dd>
          <code class='font-mono text-[13px] leading-5'>{pr.branch}</code>
        </dd>
        <dt class='text-ink-muted'>Ouverte</dt>
        <dd>{ago(pr.at)}</dd>
        <dt class='text-ink-muted'>Reviews</dt>
        <dd>{reviewers}</dd>
      </dl>
      {help && (
        <A
          href={`aide/${help.id}`}
          class='tile flex items-center gap-2.5 p-3 text-[14px] font-semibold text-ink no-underline hover:no-underline'
        >
          <span class='text-indigo'>
            <LifeBuoy />
          </span>
          {t`Demande d’aide : ${translate(statusLabel(help.status))}`}
          {help.helper ? ` · ${firstName(help.helper)}` : ''}
        </A>
      )}
      {canRequest && (
        <div class='flex flex-col gap-2'>
          <Button
            size={42}
            href='aide/nouvelle'
            params={{ project: pr.project, pr: pr.number }}
          >
            Demander une review
          </Button>
          <span class='text-[12px] text-ink-muted'>
            Le formulaire est pré-rempli depuis cette PR.
          </span>
        </div>
      )}
      <Button
        variant='secondary'
        size={40}
        href={githubUrl(project, 'pull', pr.number)}
      >
        <Github class='size-3.5' />
        Voir sur GitHub
      </Button>
    </div>
  )
}

/** Pull requests synced from GitHub, with their review and CI state */
export const PullRequestsTab = ({ project }: { project: Project }) => {
  const prs = pullRequests
    .filter((pr) => pr.project === project.slug)
    .sort((a, b) =>
      Number(a.state === 'merged') - Number(b.state === 'merged') ||
      b.number - a.number
    )
  const open = prs.filter((pr) => pr.state === 'open')
  const waiting = open.filter((pr) => pr.review === 'waiting').length
  const opened = prs.find((pr) => url.params.dialog === `pr-${pr.number}`)
  return (
    <section class='slab mr-2 overflow-hidden'>
      <div class='flex px-5 pt-[18px] pb-4'>
        <Eyebrow>
          {counted(open.length, 'PR ouverte', 'PRs ouvertes')} · {waiting}{' '}
          en attente de review
        </Eyebrow>
      </div>
      {prs.map((pr) => (
        <A
          key={pr.number}
          params={{ dialog: `pr-${pr.number}` }}
          class='flex w-full flex-wrap items-start gap-3.5 border-t border-line px-5 py-3.5 text-left text-ink no-underline hover:bg-surface-000 hover:no-underline'
        >
          <span
            class={`tile flex size-[34px] flex-none items-center justify-center ${
              pr.state === 'merged' ? 'text-indigo' : 'text-verified'
            }`}
          >
            {pr.state === 'merged'
              ? <GitMerge class='size-[18px]' />
              : <GitPullRequest class='size-[18px]' />}
          </span>
          <span class='flex min-w-[220px] flex-1 flex-col gap-1'>
            <span class='font-semibold'>
              <span class='font-mono text-[14px] leading-5 font-medium text-ink-muted'>
                #{pr.number}
              </span>{' '}
              {pr.title}
            </span>
            <span class='text-[13px] leading-5 text-ink-muted'>
              {firstName(pr.author)} · {pr.branch} ·{' '}
              {pr.state === 'merged' ? 'mergée' : t`ouverte ${ago(pr.at)}`}
            </span>
          </span>
          <span class='flex flex-wrap gap-1.5'>
            <StatusBadge status={reviewStatus(pr)} />
            <StatusBadge status={pr.ci === 'ok' ? 'ci-ok' : 'ci-failed'} />
          </span>
        </A>
      ))}
      {!prs.length && (
        <p class='border-t border-line px-6 py-10 text-center text-ink-muted'>
          Aucune pull request sur ce projet pour l’instant.
        </p>
      )}
      {opened && (
        <Drawer
          id={`pr-${opened.number}`}
          label='Détail de la pull request'
          header={
            <span class='font-mono text-[14px] leading-5 font-medium text-ink-muted'>
              PR #{opened.number}
            </span>
          }
        >
          <PullRequestDetail project={project} pr={opened} />
        </Drawer>
      )}
    </section>
  )
}
