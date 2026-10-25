import { A } from '@01edu/signal-router'
import { issues } from '/web/fixtures/issues.ts'
import { me, personOf } from '/web/fixtures/people.ts'
import type { Project } from '/web/fixtures/projects.ts'
import { DemoBadge, SkillChip } from '/web/ui/badge.tsx'
import { Cube } from '/web/ui/shapes.tsx'

/** Open good first issues of a project */
export const beginnerIssues = (project: Project) =>
  issues.filter((issue) =>
    issue.project === project.slug && issue.state === 'open' &&
    issue.labels.includes('good first issue')
  ).length

/**
 * A project to discover: stage, activity, place, stack shared with the
 * viewer in indigo, needs and good first issues. Used by Explorer and the
 * projects of a community.
 *
 * @example
 * <ProjectCard project={projects['senegal-maps']} />
 */
export const ProjectCard = ({ project }: { project: Project }) => {
  // The owner of an imported project is often not in the fixtures
  const owner = personOf(project.owner)
  const beginner = beginnerIssues(project)
  return (
    <A
      href={`project/${project.slug}`}
      class='slab slab-lift mb-2 flex flex-col gap-3 p-[18px] text-ink no-underline hover:no-underline'
    >
      <div class='flex items-start gap-3'>
        <Cube size={40} />
        <div class='flex min-w-0 flex-1 flex-col gap-1'>
          <span class='font-display text-[17px] leading-[22px] font-semibold'>
            {project.name}
          </span>
          <span class='font-mono text-[11px] leading-4 font-medium tracking-[.06em] text-ink-muted uppercase'>
            {[
              project.stage,
              project.activity,
              [owner.city, owner.country].filter(Boolean).join(', '),
            ]
              .filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
      <span
        translate={false}
        class='wrap-anywhere text-[14px] leading-[22px] text-pretty text-ink-muted'
      >
        {project.description}
      </span>
      <div class='flex flex-wrap gap-1.5'>
        {project.stack.map((skill) => (
          <SkillChip key={skill} match={me.skills.includes(skill)}>
            {skill}
          </SkillChip>
        ))}
      </div>
      <div class='mt-auto flex flex-col gap-1.5 border-t border-line pt-2.5 text-[13px]'>
        {project.needs.length > 0 && (
          <span class='flex items-center gap-2'>
            <span aria-hidden='true' class='diamond size-1.5 bg-indigo' />
            <span class='font-semibold text-indigo'>
              On cherche {project.needs.join(', ')}
            </span>
          </span>
        )}
        {beginner > 0 && (
          <span class='flex items-center gap-2 text-verified'>
            <span aria-hidden='true' class='diamond size-1.5 bg-verified' />
            {beginner} good first issue
          </span>
        )}
        {project.demo && <DemoBadge />}
      </div>
    </A>
  )
}
