/**
 * A progress bar dug into the ground, filled with indigo.
 *
 * @example
 * <Progress value={15} max={20} label='Reviewer de confiance' />
 * <Progress value={2} max={3} label='Mentor' thin />
 */
export const Progress = (
  { value, max, label, thin }: {
    value: number
    max: number
    label: string
    /** 8px instead of 10px, under a badge */
    thin?: boolean
  },
) => (
  <span
    role='progressbar'
    aria-label={label}
    aria-valuenow={value}
    aria-valuemax={max}
    class={`block ${
      thin ? 'h-2' : 'h-2.5'
    } overflow-hidden rounded-full border border-line-strong bg-surface-000 shadow-[inset_1.73px_1px_0_0_var(--line)]`}
  >
    <span
      class='block h-full rounded-full border-r border-indigo-edge bg-indigo transition-[width] duration-250 ease-out'
      style={{ width: `${Math.min(value / max, 1) * 100}%` }}
    />
  </span>
)
