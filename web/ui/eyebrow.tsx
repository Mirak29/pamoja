import type { ComponentChildren } from 'preact'

/**
 * Mono label in capitals that opens a section, led by a diamond.
 * `accent` turns it indigo, for what concerns the viewer.
 *
 * @example
 * <Eyebrow>Pulse · 7 derniers jours</Eyebrow>
 * <Eyebrow accent>Pour toi</Eyebrow>
 */
export const Eyebrow = (
  { accent, children }: { accent?: boolean; children: ComponentChildren },
) => (
  <span
    class={`inline-flex items-center gap-2 font-mono text-label uppercase ${
      accent ? 'text-indigo' : 'text-ink-muted'
    }`}
  >
    <span
      aria-hidden='true'
      class={`diamond size-[7px] ${
        accent ? 'bg-current' : 'border border-current'
      }`}
    />
    {children}
  </span>
)
