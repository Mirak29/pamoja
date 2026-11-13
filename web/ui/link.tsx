import { h } from 'preact'
import { A as RouterLink, type LinkProps, navigate } from '@01edu/signal-router'

// The link of the app (§12.7). The router navigates as soon as a pointer
// goes down: snappy with a mouse, but on a touch screen the finger that
// lands on a card to scroll the page opened it. Here only a mouse goes at
// once; a finger or a pen goes at the click, which the browser sends for a
// tap and never after a scroll; the keyboard goes at the click too.

// The pointer of the last press, whatever it pressed: a click says only
// where it is, not what made it
let lastPointer = 'mouse'
addEventListener('pointerdown', (event) => lastPointer = event.pointerType, {
  capture: true,
  passive: true,
})

/** A press the router follows: the main button, no key held */
export const plainPress = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey &&
  !event.shiftKey && !event.altKey

export type Props = LinkProps & {
  /**
   * Called as the link is about to navigate, the page it leaves still
   * shown; `false` keeps the page where it is
   */
  onNavigate?: () => unknown
}

/**
 * A link of the app, as the router's `A`, that waits for a tap on a touch
 * screen
 *
 * @example
 * <A href='projects' onNavigate={fromMenu}>Projets</A>
 */
export const A = ({ onNavigate, onPointerDown, onClick, ...props }: Props) => {
  // Another site, or a file of the server: the browser's own link, as the
  // router leaves it
  if (!routed(props.href)) {
    return h(RouterLink, { ...props, onPointerDown, onClick })
  }
  return h(RouterLink, {
    ...props,
    onPointerDown: (
      event: PointerEvent & { currentTarget: HTMLAnchorElement },
    ) => {
      typeof onPointerDown === 'function' && onPointerDown(event)
      if (event.defaultPrevented || !plainPress(event)) return
      // A finger or a pen: not yet, it may be a scroll. The router leaves
      // a prevented press alone.
      if (event.pointerType !== 'mouse') return event.preventDefault()
      onNavigate?.() === false && event.preventDefault()
    },
    onClick: (event: MouseEvent & { currentTarget: HTMLAnchorElement }) => {
      typeof onClick === 'function' && onClick(event)
      if (event.defaultPrevented || !plainPress(event)) return
      // The mouse went at its press, and the router prevents its click
      const fromKey = event.detail === 0
      if (!fromKey && lastPointer === 'mouse') return
      event.preventDefault()
      if (onNavigate?.() === false) return
      const { href, hash, params, replace } = props
      navigate({ href, hash, params, replace })
    },
  })
}

// As the router decides: same site, not under /api/
const routed = (href: string | undefined) => {
  if (!href) return true
  const target = new URL(href, document.baseURI)
  return target.origin === location.origin &&
    !target.pathname.startsWith('/api/')
}
