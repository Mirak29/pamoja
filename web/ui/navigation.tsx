import type { JSX } from 'preact'
import { A, url } from '@01edu/signal-router'
import {
  Bell,
  CircleUser,
  Compass,
  FolderGit2,
  House,
  LifeBuoy,
  PenLine,
  Plus,
  Users,
} from '/web/assets/icons.tsx'
import { me } from '/web/fixtures/people.ts'
import { notifications } from '/web/fixtures/notifications.ts'
import { Avatar } from '/web/ui/avatar.tsx'
import { Button } from '/web/ui/button.tsx'
import { LogoMark } from '/web/ui/logo.tsx'
import { Menu } from '/web/ui/menu.tsx'

type IconComponent = (props: JSX.IntrinsicElements['svg']) => JSX.Element

export const unread = () =>
  notifications.filter((n) => n.to === me.login && !n.read).length

// key: first path segment, short: label of the mobile tab bar
const navItems: {
  key: string
  href: string
  label: string
  short: string
  icon: IconComponent
}[] = [
  { key: '', href: '.', label: 'Accueil', short: 'Accueil', icon: House },
  {
    key: 'explorer',
    href: 'explorer',
    label: 'Explorer',
    short: 'Explorer',
    icon: Compass,
  },
  {
    key: 'projets',
    href: 'projets',
    label: 'Projets',
    short: 'Projets',
    icon: FolderGit2,
  },
  { key: 'aide', href: 'aide', label: 'Aide', short: 'Aide', icon: LifeBuoy },
  {
    key: 'communautes',
    href: 'communautes',
    label: 'Communautés',
    short: 'Commu.',
    icon: Users,
  },
  {
    key: 'notifications',
    href: 'notifications',
    label: 'Notifications',
    short: 'Notifs',
    icon: Bell,
  },
  {
    key: `@${me.login}`,
    href: `@${me.login}`,
    label: 'Profil',
    short: 'Profil',
    icon: CircleUser,
  },
]

// A project page belongs to Projets, a post to Communautés
const sections: Record<string, string> = {
  projet: 'projets',
  communaute: 'communautes',
  post: 'communautes',
}

const currentSection = () => {
  const [first] = url.relativePath.slice(1).split('/')
  return sections[first] ?? first
}

const createItems = [
  {
    label: 'Post',
    sub: 'Discussion, question, vitrine, release…',
    icon: PenLine,
    href: '.',
    params: { dialog: 'new-post' },
  },
  {
    label: 'Projet',
    sub: 'Importer depuis GitHub ou créer de zéro',
    icon: FolderGit2,
    href: 'projets',
    params: { dialog: 'new-project' },
  },
  {
    label: 'Demande d’aide',
    sub: 'Review, debug, architecture…',
    icon: LifeBuoy,
    href: 'aide/nouvelle',
  },
  {
    label: 'Communauté',
    sub: 'Technologie, pays ou domaine',
    icon: Users,
    href: 'communautes',
    params: { dialog: 'new-community' },
  },
]

/** Global "+ Créer" menu, opened from the sidebar or the mobile header */
export const CreateMenu = () => (
  <Menu
    id='create-menu'
    label='Créer'
    class='top-14 right-3 w-[272px] md:top-[110px] md:right-auto md:left-3'
  >
    {createItems.map(({ label, sub, icon: Icon, ...link }) => (
      <A
        key={label}
        role='menuitem'
        {...link}
        class='flex items-center gap-3 rounded-md p-2.5 text-ink no-underline hover:bg-surface-200 hover:no-underline'
      >
        <span class='tile flex size-[34px] flex-none items-center justify-center text-indigo'>
          <Icon />
        </span>
        <span class='flex flex-col'>
          <span class='text-[14px] leading-5 font-semibold'>{label}</span>
          <span class='text-[12px] leading-[18px] text-ink-muted'>{sub}</span>
        </span>
      </A>
    ))}
  </Menu>
)

const CountBadge = ({ count }: { count: number }) => (
  <span
    aria-label={`${count} non lues`}
    class='h-5 min-w-[22px] rounded-sm bg-indigo px-1.5 text-center font-mono text-[12px] leading-5 font-medium text-on-indigo'
  >
    {count > 9 ? '9+' : count}
  </span>
)

/** Desktop navigation: a slab that stays in view */
export const Sidebar = () => {
  const section = currentSection()
  const count = unread()
  return (
    <div class='hidden w-[264px] flex-none p-4 md:block'>
      <aside class='slab sticky top-4 flex h-[calc(100vh-32px)] flex-col gap-[18px] overflow-y-auto px-3 pt-[18px] pb-3 [scrollbar-width:none]'>
        <A
          href='.'
          aria-label='Pamoja, accueil'
          class='flex h-[30px] flex-none items-center gap-2 px-2 text-ink no-underline hover:no-underline'
        >
          <LogoMark />
          <span class='font-display text-[23px] leading-none font-bold tracking-[-.01em]'>
            Pamoja
          </span>
        </A>
        <Button
          size={40}
          popovertarget='create-menu'
          class='w-[calc(100%-4px)] flex-none'
        >
          <Plus />
          Créer
        </Button>
        <nav
          aria-label='Navigation principale'
          class='flex flex-none flex-col gap-1'
        >
          {navItems.map(({ key, href, label, icon: Icon }) => {
            const active = key === section
            return (
              <A
                key={key}
                href={href}
                aria-current={active ? 'page' : undefined}
                class={`mr-1 flex h-10 items-center gap-2.5 rounded-md border px-2.5 text-[15px] no-underline transition-shadow duration-150 ease-out hover:bg-surface-200 hover:no-underline ${
                  active
                    ? 'border-indigo bg-indigo-soft font-semibold text-indigo shadow-key-selected'
                    : 'border-transparent text-ink'
                }`}
              >
                <Icon class='size-[18px]' />
                <span class='flex-1'>{label}</span>
                {key === 'notifications' && count > 0 && (
                  <CountBadge count={count} />
                )}
              </A>
            )
          })}
        </nav>
        <div class='mt-auto flex flex-none flex-col gap-3'>
          <div class='-mx-3 h-px bg-line' />
          <A
            href={`@${me.login}`}
            class='flex items-center gap-2.5 rounded-md px-2 py-1.5 text-ink no-underline hover:bg-surface-200 hover:no-underline'
          >
            <Avatar name={me.name} size={34} />
            <span class='flex min-w-0 flex-col'>
              <span class='font-display text-[14px] leading-[18px] font-semibold'>
                {me.name}
              </span>
              <span class='font-mono text-[12px] leading-4 text-ink-muted'>
                @{me.login}
              </span>
            </span>
          </A>
        </div>
      </aside>
    </div>
  )
}

/** Mobile navigation: a tab bar fixed at the bottom */
export const MobileNav = () => {
  const section = currentSection()
  const count = unread()
  return (
    <nav
      aria-label='Navigation principale'
      class='fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-7 gap-0.5 border-t border-figure-edge bg-surface-100 px-1.5 pt-1.5 pb-2 md:hidden'
    >
      {navItems.map(({ key, href, label, short, icon: Icon }) => {
        const active = key === section
        return (
          <A
            key={key}
            href={href}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            class={`relative flex flex-col items-center justify-center gap-1 rounded-md border text-[10px] leading-none font-medium no-underline hover:no-underline ${
              active
                ? 'border-indigo bg-indigo-soft text-indigo shadow-key-selected'
                : 'border-transparent text-ink-muted'
            }`}
          >
            <Icon class='size-5' />
            <span>{short}</span>
            {key === 'notifications' && count > 0 && (
              <span class='absolute top-0.5 left-[calc(50%+4px)] h-4 min-w-4 rounded-sm bg-indigo px-1 text-center font-mono text-[10px] leading-4 font-medium text-on-indigo'>
                {count > 9 ? '9+' : count}
              </span>
            )}
          </A>
        )
      })}
    </nav>
  )
}
