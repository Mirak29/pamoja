import { useEffect, useState } from 'preact/hooks'
import { Plus, X } from '/web/assets/icons.tsx'
import { boardChanged, boards } from '/web/fixtures/board.ts'
import { isMe } from '/web/fixtures/people.ts'
import type { Milestone, Project, ProjectSlug } from '/web/fixtures/projects.ts'
import { LIMITS } from '/api/limits.ts'
import { loadBoard } from '/web/lib/board.ts'
import { counted } from '/web/lib/plural.ts'
import {
  addMilestone,
  attachCard,
  canPlan,
  cardsOf,
  loadRoadmap,
  type MilestoneDraft,
  milestonesOf,
  saveMilestone,
} from '/web/lib/roadmap.ts'
import { StatusBadge } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Field, Input, Select, Textarea } from '/web/ui/input.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { Progress } from '/web/ui/progress.tsx'
import { prism } from '/web/ui/shapes.tsx'

// A planned milestone is drawn dashed and empty, a done one filled
const looks: Record<
  Milestone['state'],
  { top: string; topLine: string; left: string; right: string; line: string }
> = {
  done: {
    top: 'var(--indigo)',
    topLine: 'var(--indigo-edge)',
    left: 'var(--surface-100)',
    right: 'var(--side)',
    line: 'var(--ink)',
  },
  active: {
    top: 'var(--indigo-soft)',
    topLine: 'var(--indigo)',
    left: 'var(--surface-100)',
    right: 'var(--side)',
    line: 'var(--ink)',
  },
  planned: {
    top: 'none',
    topLine: 'var(--line-control)',
    left: 'none',
    right: 'none',
    line: 'var(--line-control)',
  },
}

/** Each milestone is a column that grows with the roadmap (§6.7) */
const Column = (
  { milestone, index }: { milestone: Milestone; index: number },
) => {
  const look = looks[milestone.state]
  const dash = milestone.state === 'planned' ? '3 3' : '0'
  const { top, left, right } = prism(
    60,
    118,
    44,
    25,
    Math.min(80, 14 + index * 20),
  )
  return (
    <svg
      width='100%'
      height='130'
      viewBox='0 0 120 130'
      aria-hidden='true'
      class='block overflow-visible'
    >
      <polygon
        points={left}
        fill={look.left}
        stroke={look.line}
        stroke-width='0.9'
        stroke-dasharray={dash}
        stroke-linejoin='round'
      />
      <polygon
        points={right}
        fill={look.right}
        stroke={look.line}
        stroke-width='0.9'
        stroke-dasharray={dash}
        stroke-linejoin='round'
      />
      <polygon
        points={top}
        fill={look.top}
        stroke={look.topLine}
        stroke-width='1'
        stroke-dasharray={dash}
        stroke-linejoin='round'
      />
    </svg>
  )
}

const states: [Milestone['state'], string][] = [
  ['planned', 'Prévue'],
  ['active', 'En cours'],
  ['done', 'Terminée'],
]

/** Title, description and status of a milestone, written by a maintainer */
const MilestoneForm = (
  { initial, onSave, onCancel }: {
    initial: MilestoneDraft
    onSave: (draft: MilestoneDraft) => Promise<boolean>
    onCancel: () => void
  },
) => {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const set = (change: Partial<MilestoneDraft>) =>
    setDraft({ ...draft, ...change })
  return (
    <form
      class='slab mr-2 flex flex-col gap-3 p-4'
      onSubmit={async (event) => {
        event.preventDefault()
        if (!draft.title.trim() || saving) return
        setSaving(true)
        const saved = await onSave(draft)
        setSaving(false)
        saved && onCancel()
      }}
    >
      <Field label='Titre'>
        <Input
          value={draft.title}
          limit={LIMITS.milestoneTitle}
          required
          onInput={(e) => set({ title: e.currentTarget.value })}
        />
      </Field>
      <Field label='Description'>
        <Textarea
          rows={2}
          value={draft.description}
          limit={LIMITS.milestoneDescription}
          onInput={(e) => set({ description: e.currentTarget.value })}
        />
      </Field>
      <Field label='Statut'>
        <Select
          value={draft.state}
          onChange={(e) =>
            set({ state: e.currentTarget.value as Milestone['state'] })}
        >
          {states.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
      </Field>
      <div class='flex flex-wrap gap-2'>
        <Button type='submit' size={36} aria-busy={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button type='button' variant='secondary' size={36} onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

/** The cards of the board a milestone counts, and one to attach */
const MilestoneTasks = (
  { project, milestoneId, title, canAttach }: {
    project: Project
    milestoneId: number
    title: string
    canAttach: boolean
  },
) => {
  const cards = cardsOf(project.slug, milestoneId)
  const free = (boards[project.slug as ProjectSlug] ?? []).filter((c) =>
    !c.milestone
  )
  if (!cards.length && !canAttach) return null
  return (
    <div class='flex flex-col gap-2 border-t border-line pt-2.5'>
      {cards.map((card) => (
        <div key={card.id} class='flex items-center gap-2 text-[13px]'>
          <span class='min-w-0 flex-1 truncate'>{card.title}</span>
          {canAttach && (
            <Button
              variant='secondary'
              size={36}
              square
              aria-label={`Détacher « ${card.title} »`}
              title='Détacher'
              onClick={() => attachCard(project.slug, card, 0)}
            >
              <X class='size-4' />
            </Button>
          )}
        </div>
      ))}
      {canAttach && free.length > 0 && (
        <Select
          compact
          aria-label={`Rattacher une tâche à ${title}`}
          value=''
          onChange={(e) => {
            const card = free.find((c) => c.id === e.currentTarget.value)
            card && attachCard(project.slug, card, milestoneId)
          }}
        >
          <option value=''>Rattacher une tâche…</option>
          {free.map((card) => (
            <option key={card.id} value={card.id}>{card.title}</option>
          ))}
        </Select>
      )}
    </div>
  )
}

export const RoadmapTab = ({ project }: { project: Project }) => {
  boardChanged.value
  // The roadmap and the board of the server: the progress counts its cards
  useEffect(() => {
    loadRoadmap(project.slug)
    loadBoard(project.slug)
  }, [project.slug])
  const milestones = milestonesOf(project)
  const canManage = canPlan(project)
  // A member attaches the cards, as they move them on the board
  const canAttach = canManage ||
    project.members.some((member) => isMe(member.login))
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const count = (state: Milestone['state']) =>
    milestones.filter((m) => m.state === state).length
  return (
    <div class='mr-2 flex flex-col gap-5'>
      <div class='flex flex-wrap items-end justify-between gap-3'>
        <div class='flex flex-col gap-1.5'>
          <Eyebrow>Roadmap</Eyebrow>
          <h2 class='font-display text-heading'>
            {counted(milestones.length, 'milestone')} ·{' '}
            {counted(count('done'), 'terminée')} · {count('active')} en cours ·
            {' '}
            {counted(count('planned'), 'prévue')}
          </h2>
        </div>
        {canManage && editing !== 'new' && (
          <Button
            size={36}
            onClick={() => setEditing('new')}
          >
            <Plus />
            Nouvelle milestone
          </Button>
        )}
      </div>
      {editing === 'new' && (
        <MilestoneForm
          initial={{ title: '', description: '', state: 'planned' }}
          onSave={(draft) => addMilestone(project.slug, draft)}
          onCancel={() => setEditing(null)}
        />
      )}
      <div class='grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-end gap-x-6 gap-y-7'>
        {milestones.map((milestone, index) => {
          const id = milestone.id
          return (
            <div key={id ?? milestone.title} class='flex flex-col gap-3.5'>
              <Column milestone={milestone} index={index} />
              {id && editing === id
                ? (
                  <MilestoneForm
                    initial={{
                      title: milestone.title,
                      description: milestone.description,
                      state: milestone.state,
                    }}
                    onSave={(draft) => saveMilestone(project.slug, id, draft)}
                    onCancel={() => setEditing(null)}
                  />
                )
                : (
                  <div class='slab mr-2 flex flex-col gap-2.5 p-4'>
                    <div class='flex flex-wrap items-center justify-between gap-2'>
                      <StatusBadge status={`milestone-${milestone.state}`} />
                      {milestone.date && (
                        <span class='font-mono text-[12px] leading-4 font-medium text-ink-muted'>
                          {milestone.date}
                        </span>
                      )}
                    </div>
                    <span class='font-display text-[16px] leading-[22px] font-semibold text-pretty'>
                      {milestone.title}
                    </span>
                    {milestone.description && (
                      <span class='text-[13px] leading-5 text-ink-muted'>
                        {milestone.description}
                      </span>
                    )}
                    {milestone.total > 0
                      ? (
                        <>
                          <Progress
                            value={milestone.done}
                            max={milestone.total}
                            label={milestone.title}
                          />
                          <span class='font-mono text-[13px] leading-[18px] font-medium text-ink-muted'>
                            {milestone.done} / {milestone.total} tâches
                          </span>
                        </>
                      )
                      : (
                        <span class='text-[13px] leading-5 text-ink-muted'>
                          Aucune tâche rattachée
                        </span>
                      )}
                    {id && (
                      <MilestoneTasks
                        project={project}
                        milestoneId={id}
                        title={milestone.title}
                        canAttach={canAttach}
                      />
                    )}
                    {canManage && id && (
                      <Button
                        variant='secondary'
                        size={36}
                        class='self-start'
                        onClick={() => setEditing(id)}
                      >
                        Modifier
                      </Button>
                    )}
                  </div>
                )}
            </div>
          )
        })}
      </div>
      {!milestones.length && (
        <span class='text-[14px] text-ink-muted'>
          Aucune milestone pour l’instant.
        </span>
      )}
    </div>
  )
}
