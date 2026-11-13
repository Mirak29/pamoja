import { url } from '@01edu/signal-router'
import { ArrowLeft } from '/web/assets/icons.tsx'
import { me } from '/web/fixtures/people.ts'
import { backInApp } from '/web/lib/scroll-position.ts'
import { Button } from '/web/ui/button.tsx'

// The way back from a page that is not one of the menu (§12.7): a project,
// a community, a post, a request for help, someone's profile, the settings.
// Opened from the app, it goes back where one came from, scroll included;
// opened from a link or a bookmark, there is nothing before it in the app,
// and it goes up to the section the page belongs to.

// The first pages of the menu: no way back, the menu is the way
const MENU = ['', 'explore', 'projects', 'help', 'communities', 'notifications']

// The section of a page, by the first part of its path
const SECTIONS: Record<string, string> = {
  project: 'projects',
  community: 'communities',
  help: 'help',
  '@': 'explore',
}

/** Where the way back leads without history, or none on a page of the menu */
export const parentOf = (path: string): string | undefined => {
  const page = path.replace(/^\/+|\/+$/g, '')
  if (MENU.includes(page) || page === `@${me.login}`) return
  // The conversations have their own way back to the list, on a phone
  if (page === 'messages' || page.startsWith('messages/')) return
  if (page === 'profile/edit') return `@${me.login}`
  const section = page.startsWith('@') ? '@' : page.split('/')[0]
  return SECTIONS[section] ?? '.'
}

/** The way back, in the header of the pages that have one */
export const BackButton = ({ class: className }: { class?: string }) => {
  const parent = parentOf(url.relativePath)
  if (parent === undefined) return null
  return (
    <Button
      variant='secondary'
      size={40}
      square
      href={parent}
      aria-label='Retour'
      title='Retour'
      // Back in the history when it is the app's: the page before comes
      // back as it was left. Otherwise the link goes to the section.
      onNavigate={() => {
        if (!backInApp()) return
        history.back()
        return false
      }}
      class={className}
    >
      <ArrowLeft class='size-5' />
    </Button>
  )
}
