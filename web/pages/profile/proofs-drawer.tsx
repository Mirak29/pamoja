import { counted } from '/web/lib/plural.ts'
import { A, url } from '@01edu/signal-router'
import { type Login, people, personOf } from '/web/fixtures/people.ts'
import { projects } from '/web/fixtures/projects.ts'
import {
  dimensions,
  projectNameOf,
  type Proof,
  proofsOf,
} from '/web/fixtures/reputation.ts'
import { githubUrl } from '/web/lib/links.ts'
import { ago } from '/web/lib/time.ts'
import { DemoBadge, NoticeBadge, VerifiedBadge } from '/web/ui/badge.tsx'
import { Drawer } from '/web/ui/dialog.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { t } from '/web/lib/language.ts'

/** Project, person helped and age of a proof */
export const proofMeta = (proof: Proof, withAge = true) =>
  [
    projectNameOf(proof),
    proof.by && t`pour ${personOf(proof.by).name.split(' ')[0]}`,
    withAge && ago(proof.at),
  ].filter(Boolean).join(' · ')

/** The PR of a proof on GitHub, when it has one */
const pullUrl = (proof: Proof) =>
  proof.url ||
  (proof.pullRequest && proof.project && projects[proof.project] &&
    githubUrl(projects[proof.project], 'pull', proof.pullRequest))

/**
 * Where a proof comes from (§8.3): GitHub, demo data, or Pamoja, where the
 * requester confirmed it
 */
export const ProofSource = ({ proof }: { proof: Proof }) =>
  proof.verified
    ? <VerifiedBadge />
    : proof.demo
    ? <DemoBadge />
    : <NoticeBadge>Confirmée sur Pamoja</NoticeBadge>

const Row = ({ proof }: { proof: Proof }) => {
  const pull = pullUrl(proof)
  return (
    <div
      class={`flex animate-enter flex-col gap-1.5 rounded-md border bg-surface-100 px-3.5 py-3 ${
        proof.verified ? 'border-verified' : 'border-dashed border-line-control'
      }`}
    >
      <div class='flex flex-wrap items-start justify-between gap-2'>
        <span class='text-[14px] font-semibold'>{proof.title}</span>
        <ProofSource proof={proof} />
      </div>
      <span class='text-[13px] text-ink-muted'>{proofMeta(proof)}</span>
      <div class='flex flex-wrap gap-3.5 text-[13px]'>
        {pull && proof.pullRequest && (
          <a href={pull} class='font-mono'>
            PR #{proof.pullRequest} sur GitHub
          </a>
        )}
        {pull && !proof.pullRequest && <a href={pull}>Sur GitHub</a>}
        {proof.project && (
          <A href={`project/${proof.project}`}>{projectNameOf(proof)}</A>
        )}
        {proof.post && <A href={`post/${proof.post}`}>Question</A>}
        {proof.help && <A href={`help/${proof.help}`}>Demande d’aide</A>}
      </div>
    </div>
  )
}

// The proofs behind a figure of the profile (§9.1): one dimension, the
// contributions, or the developers helped
const filters: Record<string, [string, (proof: Proof) => boolean]> = {
  ...Object.fromEntries(
    dimensions.map(([key, label]) => [
      `proofs-${key}`,
      [label, (proof: Proof) => proof.dimension === key],
    ]),
  ),
  'proofs-contributions': [
    'Contributions',
    (proof) => proof.dimension === 'oss' || proof.dimension === 'build',
  ],
  'proofs-helped': [
    'Développeurs aidés',
    (proof) => !!proof.by && proof.dimension !== 'build',
  ],
}

/**
 * Proofs behind the reputation, all of them (?dialog=preuves) or those of
 * one figure (?dialog=proofs-review, proofs-contributions…).
 */
export const ProofsDrawer = ({ login }: { login: Login }) => {
  const opened = String(url.params.dialog ?? '')
  if (!opened.startsWith('proofs')) return null
  const filter = Object.hasOwn(filters, opened) ? filters[opened] : undefined
  const list = proofsOf(login).filter((p) => !filter || filter[1](p))
  const verified = list.filter((p) => p.verified).length
  const demo = list.filter((p) => p.demo && !p.verified).length
  const confirmed = list.length - verified - demo
  return (
    <Drawer
      id={opened}
      label='Preuves'
      width={480}
      header={<Eyebrow>Preuves · {people[login].name}</Eyebrow>}
    >
      <div class='flex flex-col gap-3.5 p-[22px]'>
        <h2 class='font-display text-[23px] leading-[29px] font-semibold'>
          {filter ? filter[0] : 'Toutes les preuves'}
        </h2>
        <span class='text-[13px] text-ink-muted'>
          {[
            counted(list.length, 'preuve', 'preuves'),
            verified &&
            t`${counted(verified, 'vérifiée', 'vérifiées')} par GitHub`,
            confirmed &&
            t`${counted(confirmed, 'confirmée', 'confirmées')} sur Pamoja`,
            demo && counted(demo, 'donnée de démo', 'données de démo'),
          ].filter(Boolean).join(' · ')}
        </span>
        {list.map((proof) => <Row key={proof.id} proof={proof} />)}
      </div>
    </Drawer>
  )
}
