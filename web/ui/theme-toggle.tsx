import { effect, signal } from '@preact/signals'
import { Moon, Sun } from '/web/assets/icons.tsx'
import { Button } from '/web/ui/button.tsx'

type Theme = 'light' | 'dark'

// Stored theme, or the system preference
const getInitialTheme = (): Theme => {
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light') return stored
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const themeSignal = signal<Theme>(getInitialTheme())

effect(() => {
  document.documentElement.dataset.theme = themeSignal.value
})

// Only an explicit choice is stored, otherwise the system preference wins
const toggle = () => {
  themeSignal.value = themeSignal.peek() === 'dark' ? 'light' : 'dark'
  localStorage.setItem('theme', themeSignal.peek())
}

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
      onClick={toggle}
    >
      {dark ? <Sun class='size-[18px]' /> : <Moon class='size-[18px]' />}
    </Button>
  )
}
