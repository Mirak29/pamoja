import { A, url } from '@01edu/signal-router'
import { type Login, people } from '/web/fixtures/people.ts'
import { projects } from '/web/fixtures/projects.ts'
import { dimensions, type Proof, proofsOf } from '/web/fixtures/reputation.ts'
import { ago } from '/web/lib/time.ts'
import { DemoBadge, VerifiedBadge } from '/web/ui/badge.tsx'
import { Drawer } from '/web/ui/dialog.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'

const plural = (count: number, singular: string, plural: string) =>
  `${count} ${count > 1 ? plural : singular}`

/** Project, person helped and age of a proof */
export const proofMeta = (proof: Proof, withAge = true) =>
  [
    proof.project && projects[proof.project].name,
    proof.by && `pour ${people[proof.by].name.split(' ')[0]}`,
    withAge && ago(proof.at),
  ].filter(Boolean).join(' · ')

const Row = ({ proof }: { proof: Proof }) => (
  <div
    class={`flex animate-enter flex-col gap-1.5 rounded-md border bg-surface-100 px-3.5 py-3 ${
      proof.verified ? 'border-verified' : 'border-dashed border-line-control'
    }`}
  >
    <div class='flex flex-wrap items-start justify-between gap-2'>
      <span class='text-[14px] font-semibold'>{proof.title}</span>
      {proof.verified && <VerifiedBadge />}
      {proof.demo && !proof.verified && <DemoBadge />}
    </div>
    <span class='text-[13px] text-ink-muted'>{proofMeta(proof)}</span>
    <div class='flex flex-wrap gap-3.5 text-[13px]'>
      {proof.pullRequest && (
        <A href={`projet/${proof.project}/prs`} class='font-mono'>
          PR #{proof.pullRequest}
        </A>
      )}
      {proof.project && (
        <A href={`projet/${proof.project}`}>{projects[proof.project].name}</A>
      )}
      {proof.post && <A href={`post/${proof.post}`}>Question</A>}
      {proof.help && <A href={`aide/${proof.help}`}>Demande d’aide</A>}
    </div>
  </div>
)

/**
 * Proofs behind the reputation, all of them (?dialog=preuves) or those of
 * one dimension (?dialog=preuves-review).
 */
export const ProofsDrawer = ({ login }: { login: Login }) => {
  const opened = String(url.params.dialog ?? '')
  if (!opened.startsWith('preuves')) return null
  const dimension = dimensions.find(([key]) => opened === `preuves-${key}`)
  const list = proofsOf(login).filter((p) =>
    !dimension || p.dimension === dimension[0]
  )
  const verified = list.filter((p) => p.verified).length
  return (
    <Drawer
      id={opened}
      label='Preuves'
      width={480}
      header={<Eyebrow>Preuves · {people[login].name}</Eyebrow>}
    >
      <div class='flex flex-col gap-3.5 p-[22px]'>
        <h2 class='font-display text-[23px] leading-[29px] font-semibold'>
          {dimension ? dimension[1] : 'Toutes les preuves'}
        </h2>
        <span class='text-[13px] text-ink-muted'>
          {plural(list.length, 'preuve', 'preuves')} ·{' '}
          {plural(verified, 'vérifiée', 'vérifiées')} par GitHub · {plural(
            list.length - verified,
            'donnée de démo',
            'données de démo',
          )}
        </span>
        {list.map((proof) => <Row key={proof.id} proof={proof} />)}
      </div>
    </Drawer>
  )
}
