import type { ComponentChildren } from 'preact'
import { useEffect } from 'preact/hooks'
import { url } from '@01edu/signal-router'
import { LifeBuoy } from '/web/assets/icons.tsx'
import { incoming } from '/web/fixtures/notifications.ts'
import { AssistantPanel } from '/web/ui/assistant-panel.tsx'
import { CommandPalette } from '/web/ui/command-palette.tsx'
import { Header } from '/web/ui/header.tsx'
import { ConnectionBanner } from '/web/ui/connection-banner.tsx'
import { CreateMenu, MobileNav, Sidebar } from '/web/ui/navigation.tsx'
import { ReportDialog } from '/web/ui/report-dialog.tsx'
import { notify, Toasts } from '/web/ui/toast.tsx'
import { translate } from '/web/lib/language.ts'

// A notification that arrives for the signed-in developer pops up as a
// toast, as the SSE entry will do (§7.4, §13)
const LiveNotifications = () => {
  useEffect(() => {
    // subscribe() calls back at once with the last value: skip it
    let first = true
    return incoming.subscribe((notification) => {
      if (first || !notification) return void (first = false)
      const here = url.peek().pathname === `/${notification.href}`
      notify({
        title: notification.title,
        body: notification.body,
        href: here ? undefined : notification.href,
        // « Ce projet a besoin de toi »: skills, score and duration (§7.4)
        match: notification.match,
        icon: notification.kind === 'help' ? LifeBuoy : undefined,
      })
    })
  }, [])
  return null
}

const focusable =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]'

/**
 * When an action replaces the focused control (Accepter becomes « Acceptée »,
 * Rejoindre becomes Quitter), the focus would fall back to the page: it
 * goes to what took the control's place instead, else to the content.
 */
const FocusKeeper = () => {
  useEffect(() => {
    let last:
      | { element: Element; x: number; y: number; path: string }
      | undefined
    // Taken just before an action runs, by a click or a key
    const remember = () => {
      const element = document.activeElement
      if (!element || element === document.body) return
      const rect = element.getBoundingClientRect()
      last = {
        element,
        x: rect.left + rect.width / 2 + scrollX,
        y: rect.top + rect.height / 2 + scrollY,
        path: location.pathname,
      }
    }
    const observer = new MutationObserver(() => {
      if (!last || last.element.isConnected) return
      // A new page starts from the top, not from where the click was
      if (location.pathname !== last.path) return void (last = undefined)
      if (document.activeElement && document.activeElement !== document.body) {
        return
      }
      const { x, y } = last
      last = undefined
      // What now stands there, else the nearest control around it
      let node = document.elementFromPoint(x - scrollX, y - scrollY)
      let target: HTMLElement | null = null
      while (node && !target && node.id !== 'contenu') {
        target = node.matches(focusable)
          ? node as HTMLElement
          : node.querySelector<HTMLElement>(focusable)
        node = node.parentElement
      }
      ;(target ?? document.getElementById('contenu'))?.focus({
        preventScroll: true,
      })
    })
    addEventListener('click', remember, true)
    addEventListener('keydown', remember, true)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      removeEventListener('click', remember, true)
      removeEventListener('keydown', remember, true)
      observer.disconnect()
    }
  }, [])
  return null
}

// Keyboard users jump over the sidebar and the header. No `#` in the URL:
// the link focuses the content itself (§12.2)
const SkipLink = () => (
  <a
    href='#contenu'
    onClick={(event) => {
      event.preventDefault()
      document.getElementById('contenu')?.focus()
    }}
    class='sr-only z-70 rounded-md bg-surface-100 px-3 py-2 text-[14px] font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:shadow-slab-pop'
  >
    Aller au contenu
  </a>
)

/**
 * Shell of the signed-in app: sidebar, header, page, mobile tab bar. A page
 * that fills the screen (`<Page fill>`, the messages) holds it to the height
 * of the window: the page no longer scrolls, its columns do.
 */
export const AppLayout = ({ children }: { children: ComponentChildren }) => (
  <div class='flex min-h-screen has-[[data-fill]]:h-dvh'>
    <SkipLink />
    <Sidebar />
    <div class='flex min-w-0 flex-1 flex-col'>
      <Header />
      <main
        id='contenu'
        tabIndex={-1}
        class='w-full max-w-[1140px] flex-1 px-4 pt-3 pb-40 outline-none has-[[data-fill]]:flex has-[[data-fill]]:min-h-0 has-[[data-fill]]:flex-col has-[[data-fill]]:pb-[84px] md:pt-2 md:pr-8 md:pb-[120px] md:pl-4 md:has-[[data-fill]]:pb-6'
      >
        {children}
      </main>
    </div>
    <MobileNav />
    <CreateMenu />
    <CommandPalette />
    <AssistantPanel />
    <ReportDialog />
    <Toasts />
    <LiveNotifications />
    <ConnectionBanner />
    <FocusKeeper />
  </div>
)

/**
 * Sets the document title of a page. No page header repeats the navigation
 * (cahier des charges §6.2): the title is a heading for screen readers only,
 * unless the page shows its own `h1` (`heading={false}`).
 *
 * @example
 * <Page title='Aide' class='flex flex-col gap-7 pt-5'>…</Page>
 */
export const Page = (
  { title, heading = true, fill = false, class: className, children }: {
    title: string
    /** False when the page renders its own h1 */
    heading?: boolean
    /** Holds the page to the height of the window, see AppLayout */
    fill?: boolean
    class?: string
    children: ComponentChildren
  },
) => {
  // Translated here: the app is rendered again when the language changes
  const shown = translate(title)
  useEffect(() => {
    document.title = `${shown} · Pamoja`
  }, [shown])
  return (
    <div data-fill={fill || undefined} class={className}>
      {heading && <h1 class='sr-only'>{title}</h1>}
      {children}
    </div>
  )
}
