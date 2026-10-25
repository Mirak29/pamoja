import { Batched } from '/web/ui/infinite-list.tsx'
import { signal } from '@preact/signals'
import { A } from '@01edu/signal-router'
import { Check, Send } from '/web/assets/icons.tsx'
import { activityChanged, logActivity } from '/web/fixtures/activity.ts'
import {
  applications,
  applicationsChanged,
  decideApplication,
} from '/web/fixtures/applications.ts'
import { pushNotification } from '/web/fixtures/notifications.ts'
import {
  type Login,
  me,
  people,
  type Person,
  personOf,
  placeOf,
} from '/web/fixtures/people.ts'
import { confirmedHelpsOf } from '/web/fixtures/reputation.ts'
import { counted } from '/web/lib/plural.ts'
import {
  needSkills,
  type Project,
  type ProjectRole,
  type ProjectSlug,
} from '/web/fixtures/projects.ts'
import { ago } from '/web/lib/time.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { SkillChip } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'
import { notify } from '/web/ui/toast.tsx'
import { t } from '/web/lib/language.ts'

const roles: [ProjectRole, string][] = [
  ['Propriétaire', 'Gère le projet, ses réglages et la synchro.'],
  ['Mainteneur', 'Merge, écrit dans #annonces, traite les candidatures.'],
  ['Contributeur', 'Écrit dans #général et #aide, prend des cartes du board.'],
  ['Reviewer', 'Relit les PRs et reçoit les demandes de review.'],
  ['Observateur', 'Lit les canaux sans écrire.'],
]

// People invited to a project during the session, by project and login
const invited = signal<Record<string, string[]>>({})

const firstName = (login: Login) => personOf(login).name.split(' ')[0]

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
  <div class='max-h-[640px] overflow-y-auto'>
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
  </div>
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

const invite = (project: Project, login: Login, need: string) => {
  invited.value = {
    ...invited.value,
    [project.slug]: [...(invited.value[project.slug] ?? []), login],
  }
  pushNotification({
    to: login,
    category: 'projects',
    kind: 'promising',
    title: t`${
      firstName(me.login)
    } pense que tu pourrais aider ${project.name}`,
    body:
      t`Besoin : ${need}. Tu peux proposer ton aide ou rejoindre le projet.`,
    href: `project/${project.slug}`,
  })
  notify({
    title: 'Invitation envoyée',
    body: t`${personOf(login).name} recevra une notification.`,
    icon: Send,
    tone: 'verified',
  })
}

/** For each need, the three developers whose skills match it best */
const Helpers = (
  { project, canManage, invitedLogins }: {
    project: Project
    canManage: boolean
    invitedLogins: string[]
  },
) => {
  const isMember = (login: string) =>
    project.members.some((m) => m.login === login)
  return (
    <section class='slab flex flex-col gap-1.5 p-[22px]'>
      <Eyebrow accent>Ils pourraient aider</Eyebrow>
      <span class='text-[13px] leading-5 text-ink-muted'>
        Pour chaque besoin du projet, les développeurs dont les skills
        correspondent.
      </span>
      {project.needs.map((need) => {
        const wanted = needSkills[need] ?? project.stack
        const candidates = Object.values(people as Record<Login, Person>)
          .filter((p) => !isMember(p.login) && p.login !== me.login)
          .map((p) => ({
            person: p,
            hits: wanted.filter((skill) => p.skills.includes(skill)),
          }))
          .filter((c) => c.hits.length)
          .sort((a, b) =>
            b.hits.length - a.hits.length ||
            confirmedHelpsOf(b.person.login as Login) -
              confirmedHelpsOf(a.person.login as Login)
          )
          .slice(0, 3)
        return (
          <div key={need} class='flex flex-col pt-4'>
            <span class='flex items-center gap-2.5 pb-1.5 font-display text-[15px] leading-[22px] font-semibold'>
              <span aria-hidden='true' class='diamond size-2 bg-indigo' />
              {need}
            </span>
            {candidates.map(({ person, hits }) => {
              const login = person.login as Login
              const done = invitedLogins.includes(login)
              return (
                <div
                  key={login}
                  class='flex flex-wrap items-center gap-3 border-t border-line py-2.5'
                >
                  <PersonLink
                    login={login}
                    size={30}
                    detail={`${hits.join(', ')} · ${
                      counted(
                        confirmedHelpsOf(person.login as Login),
                        'aide confirmée',
                        'aides confirmées',
                      )
                    } · ${person.city}`}
                  />
                  {canManage && !done && (
                    <Button
                      variant='secondary'
                      size={32}
                      aria-label={t`Inviter ${person.name} pour ${need}`}
                      onClick={() => invite(project, login, need)}
                    >
                      Inviter
                    </Button>
                  )}
                  {done && (
                    <span class='inline-flex items-center gap-1.5 text-[13px] font-semibold text-verified'>
                      <Check class='size-3.5' />
                      Invité
                    </span>
                  )}
                </div>
              )
            })}
            {!candidates.length && (
              <span class='border-t border-line py-2 text-[13px] text-ink-muted'>
                Personne ne correspond encore à ce besoin.
              </span>
            )}
          </div>
        )
      })}
    </section>
  )
}

const Applications = ({ project }: { project: Project }) => {
  const mine = applications.filter((a) => a.project === project.slug)
  const pending = mine.filter((a) => a.status === 'pending')
  const past = mine.filter((a) => a.status !== 'pending')
  return (
    <section class='slab overflow-hidden'>
      <SectionHeader
        label='Candidatures'
        title={pending.length
          ? counted(
            pending.length,
            'candidature en attente',
            'candidatures en attente',
          )
          : 'Aucune candidature en attente'}
      />
      {pending.map((application) => (
        <div
          key={application.id}
          class='flex animate-enter flex-col gap-2.5 border-t border-line px-5 py-4'
        >
          <PersonLink
            login={application.login}
            size={34}
            detail={`${application.availability} · ${ago(application.at)}`}
          />
          <div class='flex flex-wrap gap-1.5'>
            {application.areas.map((area) => (
              <SkillChip key={area} match>{area}</SkillChip>
            ))}
          </div>
          <p class='rounded-md border border-line-strong bg-surface-000 px-3 py-2.5 text-[14px] leading-[22px] text-pretty inset-shadow-well'>
            « {application.message} »
          </p>
          <div class='flex flex-wrap gap-3 pb-1'>
            <Button
              size={36}
              aria-label={t`Accepter la candidature de ${
                personOf(application.login).name
              }`}
              onClick={() => decideApplication(application, true)}
            >
              Accepter
            </Button>
            <Button
              variant='secondary'
              size={36}
              aria-label={t`Refuser la candidature de ${
                personOf(application.login).name
              }`}
              onClick={() => decideApplication(application, false)}
            >
              Refuser
            </Button>
          </div>
        </div>
      ))}
      {past.length > 0 && (
        <div class='flex flex-col gap-2 border-t border-line bg-surface-000 px-5 py-3.5'>
          {past.map((application) => (
            <span
              key={application.id}
              class='flex justify-between gap-2 text-[13px]'
            >
              <span>{personOf(application.login).name}</span>
              <span
                class={`font-semibold ${
                  application.status === 'accepted'
                    ? 'text-verified'
                    : 'text-ink-muted'
                }`}
              >
                {application.status === 'accepted' ? 'Acceptée' : 'Refusée'}
              </span>
            </span>
          ))}
        </div>
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
        <Helpers
          project={project}
          canManage={canManage}
          invitedLogins={invited.value[project.slug] ?? []}
        />
      </div>
      <div class='flex min-w-0 flex-col gap-8'>
        {canManage && <Applications project={project} />}
        {!role && <Join project={project} applied={applied} />}
        <Roles />
      </div>
    </div>
  )
}
