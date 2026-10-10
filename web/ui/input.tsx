import type { ComponentChildren, JSX } from 'preact'
import { CircleAlert } from '/web/assets/icons.tsx'

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

/**
 * The message under a field in error. Give the control
 * `aria-describedby` with the same id, and `aria-invalid`.
 */
export const FieldError = (
  { id, children }: { id?: string; children: ComponentChildren },
) => (
  <span
    id={id}
    class='flex items-center gap-1.5 text-[13px] font-normal text-danger'
  >
    <CircleAlert class='size-3.5 flex-none' />
    {children}
  </span>
)

/**
 * A labelled field, label above the control, and its error below. The
 * wrapper stays the same with or without error, so the control keeps focus.
 *
 * @example
 * <Field label='Titre' error={error} errorId='title-error'>
 *   <Input aria-invalid={!!error} aria-describedby='title-error' />
 * </Field>
 */
export const Field = (
  { label, children, error, errorId }: {
    label: ComponentChildren
    children: ComponentChildren
    error?: string
    errorId?: string
  },
) => (
  <div class='flex flex-col gap-1.5'>
    <label class='flex flex-col gap-2 text-[13px] font-semibold'>
      {label}
      {children}
    </label>
    {error && <FieldError id={errorId}>{error}</FieldError>}
  </div>
)
