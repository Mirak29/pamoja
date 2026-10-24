import { effect, signal } from '@preact/signals'
import { Moon, Sun } from '/web/assets/icons.tsx'
import { Button } from '/web/ui/button.tsx'

type Theme = 'light' | 'dark'
export type ThemePreference = Theme | 'system'

const system = matchMedia('(prefers-color-scheme: dark)')
const systemTheme = (): Theme => system.matches ? 'dark' : 'light'

// Stored choice, or the system preference when nothing is stored
const stored = localStorage.getItem('theme')
export const themePreference = signal<ThemePreference>(
  stored === 'dark' || stored === 'light' ? stored : 'system',
)

export const themeSignal = signal<Theme>(
  themePreference.peek() === 'system'
    ? systemTheme()
    : themePreference.peek() as Theme,
)

effect(() => {
  document.documentElement.dataset.theme = themeSignal.value
})

// The system theme is followed live until an explicit choice
system.addEventListener('change', () => {
  if (themePreference.peek() === 'system') themeSignal.value = systemTheme()
})

/** Light, dark or the system one; only an explicit choice is stored */
export const setThemePreference = (preference: ThemePreference) => {
  themePreference.value = preference
  if (preference === 'system') {
    localStorage.removeItem('theme')
    themeSignal.value = systemTheme()
  } else {
    localStorage.setItem('theme', preference)
    themeSignal.value = preference
  }
}

export const toggleTheme = () =>
  setThemePreference(themeSignal.peek() === 'dark' ? 'light' : 'dark')

export const ThemeToggle = () => {
  const dark = themeSignal.value === 'dark'
  const label = dark ? 'Passer au thème clair' : 'Passer au thème sombre'
  return (
    <Button
      variant='secondary'
      size={40}
      square
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {dark ? <Sun class='size-[18px]' /> : <Moon class='size-[18px]' />}
    </Button>
  )
}
