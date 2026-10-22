import type { ComponentChildren, JSX } from 'preact'
import { useState } from 'preact/hooks'
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
/**
 * Characters left near the limit of a field (§16): shown from 80 % on, read
 * out by screen readers. The field itself stops at the limit.
 */
export const Counter = (
  { value, limit }: { value: unknown; limit: number },
) => {
  const count = typeof value === 'string' ? value.length : 0
  if (count < limit * 0.8) return null
  return (
    <span
      aria-live='polite'
      class={`self-end font-mono text-[12px] leading-4 tabular-nums ${
        count >= limit ? 'text-danger' : 'text-ink-muted'
      }`}
    >
      {count} / {limit}
    </span>
  )
}

type Limit = {
  /** Maximum length, with a counter near it (`api/limits.ts`) */
  limit?: number
  /** Classes of the box holding the field and its counter, in a row */
  wrap?: string
}

/** The field and, when it has a limit, its counter under it */
const Limited = (
  { limit, wrap, value, children }: Limit & {
    value: unknown
    children: ComponentChildren
  },
) =>
  limit
    ? (
      <div class={`flex flex-col gap-1 ${wrap ?? 'w-full'}`}>
        {children}
        <Counter value={value} limit={limit} />
      </div>
    )
    : <>{children}</>

export const Input = (
  { compact, class: className, limit, wrap, ...props }:
    & { compact?: boolean }
    & Limit
    & JSX.IntrinsicElements['input'],
) => (
  <Limited limit={limit} wrap={wrap} value={props.value}>
    <input
      {...props}
      maxLength={limit ?? props.maxLength}
      class={`${field} ${sizes[compact ? 'compact' : 'default']} ${
        className ?? ''
      }`}
    />
  </Limited>
)

export const Textarea = (
  { compact, class: className, limit, wrap, ...props }:
    & { compact?: boolean }
    & Limit
    & JSX.IntrinsicElements['textarea'],
) => (
  <Limited limit={limit} wrap={wrap} value={props.value}>
    <textarea
      {...props}
      maxLength={limit ?? props.maxLength}
      class={`${field} px-3 py-2.5 ${
        compact ? 'text-[14px]' : 'text-[15px]'
      } leading-[22px] resize-y ${className ?? ''}`}
    />
  </Limited>
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
 * Errors of a form, each under its field. `check` shows all the errors found
 * at once and focuses the first field in error; `control(key)` gives the
 * control its id and ARIA links, `field(key)` gives `Field` its message.
 *
 * @example
 * const { check, control, field, clear } = useFieldErrors<'name'>('community')
 * if (!check({ name: !name.trim() && 'Donne un nom.' })) return
 * <Field label='Nom' {...field('name')}>
 *   <Input {...control('name')} onInput={() => clear('name')} />
 * </Field>
 */
export const useFieldErrors = <K extends string>(form: string) => {
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({})
  const id = (key: K) => `${form}-${key}`
  return {
    errors,
    /** Shows the errors found, true when there is none */
    check: (found: Partial<Record<K, string | false | undefined>>) => {
      const kept = Object.fromEntries(
        Object.entries(found).filter(([, message]) => message),
      ) as Partial<Record<K, string>>
      setErrors(kept)
      const first = Object.keys(kept)[0] as K | undefined
      first && document.getElementById(id(first))?.focus()
      return !first
    },
    clear: (key: K) => {
      errors[key] && setErrors({ ...errors, [key]: undefined })
    },
    control: (key: K) => ({
      id: id(key),
      'aria-invalid': errors[key] ? true : undefined,
      'aria-describedby': errors[key] ? `${id(key)}-error` : undefined,
    }),
    field: (key: K) => ({ error: errors[key], errorId: `${id(key)}-error` }),
  }
}

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
