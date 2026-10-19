import { language, setLanguagePreference } from '/web/lib/language.ts'
import { Button } from '/web/ui/button.tsx'

/** Quick language switch for both public pages and the signed-in app. */
export const LanguageToggle = () => {
  const current = language.value
  return (
    <Button
      variant='secondary'
      size={40}
      square
      aria-label='Changer de langue'
      title='Changer de langue'
      onClick={() => setLanguagePreference(current === 'fr' ? 'en' : 'fr')}
    >
      <span class='font-mono text-[12px] font-semibold uppercase'>
        {current}
      </span>
    </Button>
  )
}
