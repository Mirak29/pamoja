import type { ComponentChildren } from 'preact'
import { useEffect } from 'preact/hooks'
import { CommandPalette } from '/web/ui/command-palette.tsx'
import { Header } from '/web/ui/header.tsx'
import { CreateMenu, MobileNav, Sidebar } from '/web/ui/navigation.tsx'
import { ReportDialog } from '/web/ui/report-dialog.tsx'
import { Toasts } from '/web/ui/toast.tsx'

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
