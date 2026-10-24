import type { ComponentChildren } from 'preact'

/**
 * Floating menu built on the popover API: its trigger only needs
 * `popovertarget={id}`, a click outside or Escape closes it.
 * Picking an entry closes it too.
 *
 * @example
 * <button popovertarget='account-menu'>…</button>
 * <Menu id='account-menu' label='Compte' class='top-[68px] right-6 w-[252px]'>
 *   <a href='settings'>Réglages</a>
 * </Menu>
 */
export const Menu = (
  { id, label, class: position, children }: {
    id: string
    label: string
    class: string
    children: ComponentChildren
  },
) => (
  <div
    id={id}
    popover='auto'
    role='menu'
    aria-label={label}
    onClick={(event) =>
      (event.target as HTMLElement).closest('a, button') &&
      event.currentTarget.hidePopover()}
    class={`slab-pop fixed inset-auto m-0 p-2 text-ink open:animate-enter-fast ${position}`}
  >
    {children}
  </div>
)
