import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { X } from '/web/assets/icons.tsx'
import { skills as vocabulary } from '/web/fixtures/skills.ts'
import { fuzzyMatch } from '/web/lib/fuzzy.ts'
import { FieldError, Input } from '/web/ui/input.tsx'

/**
 * A value already chosen, pressed down, with its remove button.
 *
 * @example
 * <RemovableChip onRemove={() => remove('Go')}>Go</RemovableChip>
 */
export const RemovableChip = (
  { onRemove, children }: { onRemove: () => void; children: ComponentChildren },
) => (
  <span class='inline-flex h-[30px] items-center gap-1 rounded-[5px] border border-indigo bg-indigo-soft pr-1 pl-2.5 text-[13px] leading-none font-medium text-indigo shadow-key-selected'>
    {children}
    <button
      type='button'
      onClick={onRemove}
      aria-label='Retirer'
      class='flex size-[22px] cursor-pointer items-center justify-center rounded-sm text-indigo'
    >
      <X class='size-3' />
    </button>
  </span>
)

/**
 * A value that can be added, outlined in dashes.
 *
 * @example
 * <SuggestionChip onClick={() => add('Tests')}>Tests</SuggestionChip>
 */
export const SuggestionChip = (
  { onClick, children }: { onClick: () => void; children: ComponentChildren },
) => (
  <button
    type='button'
    onClick={onClick}
    class='h-[30px] cursor-pointer rounded-[5px] border border-dashed border-indigo px-2.5 text-[13px] leading-none font-medium text-indigo'
  >
    + {children}
  </button>
)

/**
 * Skills from the controlled vocabulary: typing « postgres » proposes
 * PostgreSQL, Entrée adds the first suggestion (§6.1).
 *
 * @example
 * <SkillPicker
 *   label='Skills'
 *   inputLabel='Ajouter un skill'
 *   placeholder='Ajouter un skill (essaie « postgres »)'
 *   note='Vocabulaire contrôlé : Pamoja propose le nom exact du skill.'
 *   skills={skills}
 *   onChange={setSkills}
 * />
 */
export const SkillPicker = (
  {
    label,
    inputLabel,
    placeholder,
    note,
    empty,
    limit = 5,
    skills,
    onChange,
    id,
    error,
  }: {
    label: string
    inputLabel: string
    placeholder: string
    note: string
    /** Shown when nothing in the vocabulary looks like the query */
    empty?: string
    limit?: number
    skills: string[]
    onChange: (skills: string[]) => void
    /** Id of the input, to focus it from a form error */
    id?: string
    error?: string
  },
) => {
  const [query, setQuery] = useState('')
  const suggestions = query.trim()
    ? vocabulary
      .filter((skill) => !skills.includes(skill) && fuzzyMatch(query, skill))
      .slice(0, limit)
    : []
  const add = (skill: string) => {
    onChange([...skills, skill])
    setQuery('')
  }
  return (
    <div class='flex flex-col gap-2 text-[13px] font-semibold'>
      <span>{label}</span>
      <div class='flex flex-wrap gap-2'>
        {skills.map((skill) => (
          <RemovableChip
            key={skill}
            onRemove={() => onChange(skills.filter((s) => s !== skill))}
          >
            {skill}
          </RemovableChip>
        ))}
      </div>
      <Input
        value={query}
        onInput={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          suggestions[0] && add(suggestions[0])
        }}
        placeholder={placeholder}
        aria-label={inputLabel}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
      />
      {error && <FieldError id={id && `${id}-error`}>{error}</FieldError>}
      <div class='flex flex-wrap gap-2'>
        {suggestions.map((skill) => (
          <SuggestionChip
            key={skill}
            onClick={() => add(skill)}
          >
            {skill}
          </SuggestionChip>
        ))}
      </div>
      {empty && query.trim() && !suggestions.length && (
        <span class='font-normal text-ink-muted'>{empty}</span>
      )}
      <span class='font-normal text-ink-muted'>{note}</span>
    </div>
  )
}
