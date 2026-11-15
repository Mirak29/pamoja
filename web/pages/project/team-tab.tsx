import { JoinRequests } from '/web/pages/project/join-requests.tsx'
import { useEffect } from 'preact/hooks'
import { Batched } from '/web/ui/infinite-list.tsx'
import { A } from '/web/ui/link.tsx'
import { Check } from '/web/assets/icons.tsx'
import { activityChanged, logActivity } from '/web/fixtures/activity.ts'
import {
  applications,
  applicationsChanged,
} from '/web/fixtures/applications.ts'
import { type Login, me, personOf, placeOf } from '/web/fixtures/people.ts'
import { helpers, inviteHelper, loadHelpers } from '/web/lib/project-helpers.ts'
import { counted } from '/web/lib/plural.ts'
import {
  type Project,
  type ProjectRole,
  type ProjectSlug,
} from '/web/fixtures/projects.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { t } from '/web/lib/language.ts'
import { ScrollFrame } from '/web/ui/scroll-frame.tsx'

const roles: [ProjectRole, string][] = [
  ['Propriétaire', 'Gère le projet, ses réglages et la synchro.'],
  ['Mainteneur', 'Merge, écrit dans #annonces, traite les candidatures.'],
  ['Contributeur', 'Écrit dans #général et #aide, prend des cartes du board.'],
  ['Reviewer', 'Relit les PRs et reçoit les demandes de review.'],
  ['Observateur', 'Lit les canaux sans écrire.'],
]

const SectionHeader = (
  { label, title }: { label: string; title: string },
) => (
  <div class='flex flex-wrap items-end justify-between gap-4 px-5 pt-[18px] pb-4'>
    <div class='flex min-w-0 flex-[1_1_260px] flex-col gap-1.5'>
      <Eyebrow>{label}</Eyebrow>
      <h2 class='font-display text-heading'>{title}</h2>
    </div>
  </div>
)

const PersonLink = (
  { login, size, detail }: {
    login: Login
    size: 30 | 34 | 38
    detail: string
  },
) => (
  <A
    href={`@${login}`}
    class='flex min-w-[200px] flex-1 items-center gap-3 text-ink no-underline hover:no-underline'
  >
    <Avatar
      name={personOf(login).name}
      src={personOf(login).avatarUrl}
      size={size}
    />
    <span class='flex min-w-0 flex-col'>
      <span
        class={size === 30
          ? 'text-[14px] leading-5 font-semibold'
          : 'font-display text-[15px] leading-5 font-semibold'}
      >
        {personOf(login).name}
      </span>
      <span class='text-[12px] leading-4 text-ink-muted'>{detail}</span>
    </span>
  </A>
)

/**
 * Members and their role, which the owner changes (except their own). About
 * ten rows high: the others scroll inside, by batches (§12.7)
 */
export const MemberRows = (
  { project, isOwner }: { project: Project; isOwner: boolean },
) => (
  <ScrollFrame class='max-h-[640px]'>
    <Batched
      items={project.members}
      reset={project.slug}
      row={(member) => {
        const person = personOf(member.login)
        return (
          <div
            key={member.login}
            class='flex flex-wrap items-center gap-3.5 border-t border-line px-5 py-3.5'
          >
            <PersonLink
              login={member.login}
              size={38}
              detail={`@${member.login} · ${placeOf(person)}`}
            />
            {isOwner && member.role !== 'Propriétaire'
              ? (
                <select
                  aria-label={t`Rôle de ${person.name}`}
                  value={member.role}
                  onChange={(event) => {
                    member.role = event.currentTarget.value as ProjectRole
                    logActivity(
                      project.slug as ProjectSlug,
                      `${person.name} devient ${member.role}`,
                    )
                  }}
                  class='well h-9 px-2.5 text-[14px] leading-none text-ink'
                >
                  {roles.slice(1).map(([role]) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              )
              : (
                <span class='tile inline-flex h-7 items-center rounded-[5px] px-2.5 text-[13px] leading-none font-semibold whitespace-nowrap'>
                  {member.role}
                </span>
              )}
          </div>
        )
      }}
    />
  </ScrollFrame>
)

const Members = (
  { project, isOwner }: { project: Project; isOwner: boolean },
) => {
  const count = project.members.length
  return (
    <section class='slab overflow-hidden'>
      <SectionHeader
        label='Membres'
        title={t`${counted(count, 'membre')} sur Pamoja · ${
          counted(project.contributors, 'contributeur')
        } sur GitHub`}
      />
      <MemberRows project={project} isOwner={isOwner} />
    </section>
  )
}

/**
 * For each open need, who could help: the matching of the server (§6.6),
 * among every developer, members aside. A manager invites one
 */
const Helpers = ({ project }: { project: Project }) => {
  useEffect(() => {
    loadHelpers(project.slug)
  }, [project.slug])
  const data = helpers.value[project.slug]
  if (!data) return null
  return (
    <section class='slab flex flex-col gap-1.5 p-[22px]'>
      <Eyebrow accent>Ils pourraient aider</Eyebrow>
      <span class='text-[13px] leading-5 text-ink-muted'>
        Pour chaque besoin du projet, les développeurs que le matching propose :
        leurs skills, leurs aides confirmées, leur disponibilité.
      </span>
      {data.needs.map((need) => (
        <div key={need.title} class='flex flex-col pt-4'>
          <span class='flex items-center gap-2.5 pb-1.5 font-display text-[15px] leading-[22px] font-semibold'>
            <span aria-hidden='true' class='diamond size-2 bg-indigo' />
            {need.title}
          </span>
          {need.helpers.map((helper) => {
            const login = helper.login as Login
            return (
              <div
                key={login}
                class='flex flex-wrap items-center gap-3 border-t border-line py-2.5'
              >
                <PersonLink
                  login={login}
                  size={30}
                  detail={[
                    helper.skills.join(', '),
                    counted(
                      helper.confirmed,
                      'aide confirmée',
                      'aides confirmées',
                    ),
                    helper.city,
                  ].filter(Boolean).join(' · ')}
                />
                {data.canInvite && !helper.invited && (
                  <Button
                    variant='secondary'
                    size={36}
                    aria-label={t`Inviter ${helper.name} pour ${need.title}`}
                    onClick={() =>
                      inviteHelper(project.slug, helper, need.title)}
                  >
                    Inviter
                  </Button>
                )}
                {helper.invited && (
                  <span class='inline-flex items-center gap-1.5 text-[13px] font-semibold text-verified'>
                    <Check class='size-3.5' />
                    Invité
                  </span>
                )}
              </div>
            )
          })}
          {!need.helpers.length && (
            <span class='border-t border-line py-2 text-[13px] text-ink-muted'>
              Personne ne correspond encore à ce besoin.
            </span>
          )}
        </div>
      ))}
      {!data.needs.length && (
        <span class='pt-2 text-[13px] text-ink-muted'>
          Aucun besoin ouvert pour l’instant.
        </span>
      )}
    </section>
  )
}

const Join = ({ project, applied }: { project: Project; applied: boolean }) => (
  <section class='slab-selected flex flex-col gap-3 p-[22px]'>
    <Eyebrow accent>Rejoindre</Eyebrow>
    <span class='font-display text-[18px] leading-[25px] font-semibold'>
      Envie de construire {project.name} ?
    </span>
    <span class='text-[14px] leading-[22px] text-ink-muted'>
      Backend, Frontend, Tests, DevOps ou Documentation : dis comment tu veux
      aider.
    </span>
    {applied
      ? (
        <span class='text-[14px] font-semibold text-indigo'>
          Candidature envoyée, en attente de réponse.
        </span>
      )
      : (
        <Button params={{ dialog: 'join' }} class='mt-1 self-start'>
          Rejoindre le projet
        </Button>
      )}
  </section>
)

const Roles = () => (
  <section class='slab flex flex-col p-[22px]'>
    <span class='pb-2.5'>
      <Eyebrow>Rôles</Eyebrow>
    </span>
    {roles.map(([role, description]) => (
      <div
        key={role}
        class='flex flex-col gap-0.5 border-t border-line py-2.5'
      >
        <span class='text-[14px] font-semibold'>{role}</span>
        <span class='text-[13px] leading-5 text-ink-muted'>{description}</span>
      </div>
    ))}
  </section>
)

/** Members and their roles, possible helpers, join requests (§6.6) */
export const TeamTab = ({ project }: { project: Project }) => {
  activityChanged.value
  applicationsChanged.value
  const isOwner = project.owner === me.login
  const role = project.members.find((m) => m.login === me.login)?.role
  const canManage = isOwner || role === 'Mainteneur'
  const applied = applications.some((a) =>
    a.project === project.slug && a.login === me.login &&
    a.status === 'pending'
  )
  return (
    <div class='mr-2 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
      <div class='flex min-w-0 flex-col gap-8'>
        <Members project={project} isOwner={isOwner} />
        <Helpers project={project} />
      </div>
      <div class='flex min-w-0 flex-col gap-8'>
        {canManage && <JoinRequests project={project} />}
        {!role && <Join project={project} applied={applied} />}
        <Roles />
      </div>
    </div>
  )
}
