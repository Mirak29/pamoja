import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { navigate, url } from '@01edu/signal-router'
import { X } from '/web/assets/icons.tsx'
import { Button } from '/web/ui/button.tsx'
import { Eyebrow } from '/web/ui/eyebrow.tsx'

/** Dialog widths of the prototype, in pixels */
const widths = {
  540: 'max-w-[540px]',
  560: 'max-w-[560px]',
  600: 'max-w-[600px]',
  640: 'max-w-[640px]',
  680: 'max-w-[680px]',
  720: 'max-w-[720px]',
} as const

const drawerWidths = {
  460: 'w-[min(460px,calc(100vw-40px))]',
  480: 'w-[min(480px,calc(100vw-40px))]',
} as const

// Closing also clears the params that belong to the dialog (?report=)
const close = (clear: string[] = []) =>
  navigate({
    params: {
      dialog: null,
      ...Object.fromEntries(clear.map((key) => [key, null])),
    },
  })

// The URL carries the open dialog (?dialog=id), like in Tournament
const useModal = (id: string) => {
  const ref = useRef<HTMLDialogElement>(null)
  const isOpen = url.params.dialog === id
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])
  return { ref, isOpen }
}

type ModalProps = {
  id: string
  label: string
  clear?: string[]
  children: ComponentChildren
}

const ModalFrame = (
  { id, label, clear, children }: ModalProps,
) => {
  const { ref, isOpen } = useModal(id)
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={() => url.params.dialog === id && close(clear)}
      onPointerDown={(event) => event.target === ref.current && close(clear)}
      class='fixed inset-0 m-0 size-full max-h-none max-w-none overflow-auto bg-transparent px-4 pt-[7vh] pb-6 backdrop:bg-scrim'
    >
      {isOpen && children}
    </dialog>
  )
}

const Header = (
  { clear, children }: { clear?: string[]; children: ComponentChildren },
) => (
  <div class='flex items-center gap-2 border-b border-line py-3.5 pr-4 pl-5'>
    <span class='flex-1'>{children}</span>
    <Button
      variant='secondary'
      size={34}
      square
      onClick={() => close(clear)}
      aria-label='Fermer'
    >
      <X class='size-[18px]' />
    </Button>
  </div>
)

/**
 * Modal dialog opened with `?dialog=<id>`, closed by Escape, a click on the
 * scrim or its close key.
 *
 * @example
 * <Button params={{ dialog: 'join' }}>Rejoindre</Button>
 * <Dialog id='join' title='Rejoindre le projet' width={600}>…</Dialog>
 */
export const Dialog = (
  { id, title, width = 600, clear, children }: {
    id: string
    title: string
    width?: keyof typeof widths
    /** URL params cleared on close, with `dialog` */
    clear?: string[]
    children: ComponentChildren
  },
) => (
  <ModalFrame id={id} label={title} clear={clear}>
    {/* The panel takes the initial focus, not the close key */}
    <div
      tabIndex={-1}
      autofocus
      class={`slab-pop mx-auto mb-3 w-full animate-enter outline-none ${
        widths[width]
      }`}
    >
      <Header clear={clear}>
        <Eyebrow>{title}</Eyebrow>
      </Header>
      {children}
    </div>
  </ModalFrame>
)

/**
 * Side panel on the right, for the detail of a pull request or of proofs.
 *
 * @example
 * <Drawer id='pr' label='Détail de la pull request' header={<span>PR #81</span>}>
 *   …
 * </Drawer>
 */
export const Drawer = (
  { id, label, header, width = 460, children }: {
    id: string
    label: string
    header: ComponentChildren
    width?: keyof typeof drawerWidths
    children: ComponentChildren
  },
) => (
  <ModalFrame id={id} label={label}>
    <aside
      tabIndex={-1}
      autofocus
      class={`slab-pop fixed top-4 right-6 bottom-6 flex animate-enter flex-col overflow-auto outline-none ${
        drawerWidths[width]
      }`}
    >
      <Header>{header}</Header>
      {children}
    </aside>
  </ModalFrame>
)
