import type { ComponentChildren } from 'preact'
import { useEffect } from 'preact/hooks'
import { url } from '@01edu/signal-router'
import { incoming } from '/web/fixtures/notifications.ts'
import { CommandPalette } from '/web/ui/command-palette.tsx'
import { Header } from '/web/ui/header.tsx'
import { CreateMenu, MobileNav, Sidebar } from '/web/ui/navigation.tsx'
import { ReportDialog } from '/web/ui/report-dialog.tsx'
import { notify, Toasts } from '/web/ui/toast.tsx'

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
      })
    })
  }, [])
  return null
}

/** Shell of the signed-in app: sidebar, header, page, mobile tab bar */
export const AppLayout = ({ children }: { children: ComponentChildren }) => (
  <div class='flex min-h-screen'>
    <Sidebar />
    <div class='flex min-w-0 flex-1 flex-col'>
      <Header />
      <main class='w-full max-w-[1140px] flex-1 px-4 pt-3 pb-40 md:pt-2 md:pr-8 md:pb-[120px] md:pl-4'>
        {children}
      </main>
    </div>
    <MobileNav />
    <CreateMenu />
    <CommandPalette />
    <ReportDialog />
    <Toasts />
    <LiveNotifications />
  </div>
)

/**
 * Sets the document title of a page. No page header repeats the navigation
 * (cahier des charges §6.2).
 *
 * @example
 * <Page title='Aide' class='flex flex-col gap-7 pt-5'>…</Page>
 */
export const Page = (
  { title, class: className, children }: {
    title: string
    class?: string
    children: ComponentChildren
  },
) => {
  useEffect(() => {
    document.title = `${title} · Pamoja`
  }, [title])
  return <div class={className}>{children}</div>
}
