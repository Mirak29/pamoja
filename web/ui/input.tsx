import type { ComponentChildren, JSX } from 'preact'

const field = 'well w-full font-normal text-ink'
const sizes = {
  default: 'h-10 px-3 text-[15px] leading-none',
  compact: 'h-9 px-2.5 text-[14px] leading-none',
}

/**
 * Fields are wells dug into the ground. `compact` is the 36px variant used
 * in filters and inline forms.
 *
 * @example
 * <Field label='Titre'><Input name='title' /></Field>
 */
export const Input = (
  { compact, class: className, ...props }:
    & { compact?: boolean }
    & JSX.IntrinsicElements['input'],
) => (
  <input
    {...props}
    class={`${field} ${sizes[compact ? 'compact' : 'default']} ${
      className ?? ''
    }`}
  />
)

export const Textarea = (
  { compact, class: className, ...props }:
    & { compact?: boolean }
    & JSX.IntrinsicElements['textarea'],
) => (
  <textarea
    {...props}
    class={`${field} px-3 py-2.5 ${
      compact ? 'text-[14px]' : 'text-[15px]'
    } leading-[22px] resize-y ${className ?? ''}`}
  />
)

export const Select = (
  { compact, class: className, ...props }:
    & { compact?: boolean }
    & JSX.IntrinsicElements['select'],
) => (
  <select
    {...props}
    class={`${field} ${sizes[compact ? 'compact' : 'default']} ${
      className ?? ''
    }`}
  />
)

/** A labelled field, label above the control */
export const Field = (
  { label, children }: {
    label: ComponentChildren
    children: ComponentChildren
  },
) => (
  <label class='flex flex-col gap-2 text-[13px] font-semibold'>
    {label}
    {children}
  </label>
)
