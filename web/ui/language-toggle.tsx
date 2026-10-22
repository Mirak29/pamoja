import { language, setLanguagePreference } from '/web/lib/language.ts'
import { Button } from '/web/ui/button.tsx'

/** Quick language switch for both public pages and the signed-in app. */
export const LanguageToggle = () => {
  const current = language.value
  const target = current === 'fr' ? 'en' : 'fr'
  const label = target === 'en' ? 'Passer en anglais' : 'Passer en français'
  return (
    <Button
      variant='secondary'
      size={40}
      square
      aria-label={label}
      title={label}
      onClick={() => setLanguagePreference(target)}
    >
      <span class='font-mono text-[12px] font-semibold uppercase'>
        {target}
      </span>
    </Button>
  )
}
