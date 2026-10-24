import { counted } from '/web/lib/plural.ts'
import { t } from '/web/lib/language.ts'
import { A } from '@01edu/signal-router'
import {
  Bell,
  Bookmark,
  CircleUser,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Settings,
  ShieldCheck,
} from '/web/assets/icons.tsx'
import { me } from '/web/fixtures/people.ts'
import { signOut } from '/web/lib/session.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button } from '/web/ui/button.tsx'
import { paletteOpen } from '/web/ui/command-palette.tsx'
import { LogoMark } from '/web/ui/logo.tsx'
import { Menu } from '/web/ui/menu.tsx'
import { unread } from '/web/ui/navigation.tsx'
import { unreadMessages } from '/web/lib/messages.ts'
import { ThemeToggle } from '/web/ui/theme-toggle.tsx'
import { LanguageToggle } from '/web/ui/language-toggle.tsx'

const isMac = /Mac|iPhone|iPad/.test(navigator.platform)

// A function: `me` is known once the session is (PAM-110)
const accountItems = () => [
  { label: 'Mon profil', icon: CircleUser, href: `@${me.login}` },
  { label: 'Enregistrés', icon: Bookmark, href: 'enregistres' },
  { label: 'Réglages', icon: Settings, href: 'reglages' },
  ...(me.moderator
    ? [{ label: 'Modération', icon: ShieldCheck, href: 'moderation' }]
    : []),
  { label: 'Se déconnecter', icon: LogOut, href: '.', onClick: signOut },
]

const AccountMenu = () => (
  <Menu id='account-menu' label='Compte' class='top-[68px] right-6 w-[252px]'>
    <div class='mb-1.5 flex items-center gap-2.5 border-b border-line px-2.5 pt-2 pb-3'>
      <Avatar name={me.name} src={me.avatarUrl} size={34} />
      <span class='flex flex-col'>
        <span class='font-display text-[15px] leading-5 font-semibold'>
          {me.name}
        </span>
        <span class='font-mono text-[12px] leading-4 text-ink-muted'>
          @{me.login}
        </span>
      </span>
    </div>
    {accountItems().map(({ label, icon: Icon, href, onClick }) => (
      <A
        key={label}
        role='menuitem'
        href={href}
        onClick={onClick}
        class='flex h-[38px] items-center gap-2.5 rounded-md px-2.5 text-[14px] text-ink no-underline hover:bg-surface-200 hover:no-underline'
      >
        <Icon />
        {label}
      </A>
    ))}
  </Menu>
)

/** Header without page title: the search sits in the middle (§6.2) */
export const Header = () => {
  const count = unread()
  const messages = unreadMessages.value
  return (
    <header class='sticky top-0 z-30 grid flex-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line bg-surface-000 px-3 py-2.5 md:grid-cols-[minmax(max-content,1fr)_minmax(0,520px)_minmax(max-content,1fr)] md:pt-4 md:pr-8 md:pb-3.5 md:pl-4'>
      <div class='flex min-w-0 items-center'>
        <A
          href='.'
          aria-label='Pamoja, accueil'
          class='flex flex-none md:hidden'
        >
          <LogoMark />
        </A>
      </div>
      <button
        type='button'
        onClick={() => paletteOpen.value = true}
        aria-label='Rechercher'
        class='well flex h-[42px] w-full min-w-[42px] cursor-text items-center gap-2.5 px-3 text-[14px] leading-none text-ink-muted'
      >
        <Search class='flex-none' />
        <span class='flex-1 truncate text-left'>
          Rechercher un dev, un projet, un skill
        </span>
        <kbd class='hidden rounded-sm border border-figure-edge bg-surface-100 px-[7px] py-[5px] font-mono text-[11px] leading-none font-medium text-ink shadow-[1.73px_1px_0_0_var(--figure-edge)] md:inline'>
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>
      <div class='flex min-w-0 items-center justify-end gap-2.5'>
        <Button
          size={40}
          square
          popovertarget='create-menu'
          aria-label='Créer'
          class='md:hidden'
        >
          <Plus />
        </Button>
        <Button
          variant='secondary'
          size={40}
          square
          href='messages'
          aria-label={messages
            ? t`Messages, ${counted(messages, 'non lu', 'non lus')}`
            : 'Messages'}
          class='relative md:hidden'
        >
          <MessageSquare class='size-5' />
          {messages > 0 && (
            <span class='absolute -top-[7px] -right-2 h-[18px] min-w-5 rounded-sm border border-indigo-edge bg-indigo px-[5px] text-center font-mono text-[10px] leading-4 font-medium text-on-indigo shadow-[1.73px_1px_0_0_var(--indigo-edge)]'>
              {messages > 9 ? '9+' : messages}
            </span>
          )}
        </Button>
        <Button
          variant='secondary'
          size={40}
          square
          href='notifications'
          aria-label={count
            ? `Notifications, ${counted(count, 'non lue', 'non lues')}`
            : 'Notifications'}
          class='relative'
        >
          <Bell class='size-5' />
          {count > 0 && (
            <span class='absolute -top-[7px] -right-2 h-[18px] min-w-5 rounded-sm border border-indigo-edge bg-indigo px-[5px] text-center font-mono text-[10px] leading-4 font-medium text-on-indigo shadow-[1.73px_1px_0_0_var(--indigo-edge)]'>
              {count}
            </span>
          )}
        </Button>
        <ThemeToggle />
        <LanguageToggle />
        <button
          type='button'
          popovertarget='account-menu'
          aria-label='Menu du compte'
          class='flex size-11 flex-none cursor-pointer items-center justify-center rounded-full'
        >
          <Avatar name={me.name} src={me.avatarUrl} size={38} />
        </button>
        <AccountMenu />
      </div>
    </header>
  )
}
