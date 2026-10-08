/**
 * A progress bar dug into the ground, filled with indigo.
 *
 * @example
 * <Progress value={15} max={20} label='Reviewer de confiance' />
 */
export const Progress = (
  { value, max, label }: { value: number; max: number; label: string },
) => (
  <span
    role='progressbar'
    aria-label={label}
    aria-valuenow={value}
    aria-valuemax={max}
    class='block h-2.5 overflow-hidden rounded-full border border-line-strong bg-surface-000 shadow-[inset_1.73px_1px_0_0_var(--line)]'
  >
    <span
      class='block h-full rounded-full border-r border-indigo-edge bg-indigo transition-[width] duration-250 ease-out'
      style={{ width: `${Math.min(value / max, 1) * 100}%` }}
    />
  </span>
)
