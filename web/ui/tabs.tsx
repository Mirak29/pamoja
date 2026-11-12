import { useEffect, useRef, useState } from 'preact/hooks'
import { A, type LinkProps } from '@01edu/signal-router'

export type Tab = Pick<LinkProps, 'href' | 'params'> & {
  key: string
  label: string
  /** Muted count after the label */
  count?: number
  /** Unread count, in indigo */
  unread?: number
  /** Filled badge, for unread messages */
  badge?: number
}

// How far an edge fades when tabs go on beyond it
const FADE = '36px'

/**
 * Tabs sit in a rail dug into the ground; the current one is a raised tile.
 * Each tab is a link: a path (`href`) or a query param (`params`), so the URL
 * keeps the current tab.
 *
 * On a narrow screen the rail scrolls sideways: the current tab is brought
 * into view, and an edge fades out while tabs go on beyond it, so that one
 * sees there are more.
 *
 * @example
 * <Tabs
 *   label='Demandes d’aide'
 *   current={tab}
 *   tabs={[{ key: 'for-me', label: 'Pour moi', params: { tab: null }, count: 3 }]}
 * />
 */
export const Tabs = (
  { tabs, current, label, wide, roomy }: {
    tabs: Tab[]
    current: string
    label: string
    /** Sized to its tabs instead of the start of a column */
    wide?: boolean
    /** 14px on each side instead of 12px, for the feed */
    roomy?: boolean
  },
) => {
  const rail = useRef<HTMLElement>(null)
  const [more, setMore] = useState({ left: false, right: false })
  useEffect(() => {
    const box = rail.current
    if (!box) return
    const measure = () => {
      const left = box.scrollLeft > 4
      const right = box.scrollLeft + box.clientWidth < box.scrollWidth - 4
      setMore((was) =>
        was.left === left && was.right === right ? was : { left, right }
      )
    }
    measure()
    box.addEventListener('scroll', measure, { passive: true })
    addEventListener('resize', measure)
    return () => {
      box.removeEventListener('scroll', measure)
      removeEventListener('resize', measure)
    }
  }, [tabs.length])
  // The current tab is never left out of sight, beyond an edge
  useEffect(() => {
    const box = rail.current
    const tab = box?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!box || !tab) return
    const before = tab.offsetLeft - 24
    const after = tab.offsetLeft + tab.offsetWidth + 24
    if (before < box.scrollLeft) box.scrollTo({ left: before })
    else if (after > box.scrollLeft + box.clientWidth) {
      box.scrollTo({ left: after - box.clientWidth })
    }
  }, [current])
  const fade = more.left || more.right
    ? `linear-gradient(to right, ${more.left ? 'transparent' : '#000'}, #000 ${
      more.left ? FADE : '0px'
    }, #000 calc(100% - ${more.right ? FADE : '0px'}), ${
      more.right ? 'transparent' : '#000'
    })`
    : undefined
  return (
    <nav
      ref={rail}
      aria-label={label}
      style={fade && { maskImage: fade, WebkitMaskImage: fade }}
      class={`rail ${wide ? 'w-max' : 'self-start'}`}
    >
      {tabs.map(({ key, label, count, unread, badge, ...link }) => {
        const active = key === current
        return (
          <A
            key={key}
            {...link}
            aria-current={active ? 'page' : undefined}
            class={`flex h-[34px] flex-none cursor-pointer items-center gap-1.5 rounded-[5px] border ${
              roomy ? 'px-3.5' : 'px-3'
            } text-[13px] leading-none font-semibold whitespace-nowrap no-underline transition-shadow duration-150 ease-out hover:text-ink hover:no-underline ${
              active
                ? 'border-figure-edge bg-surface-100 text-ink shadow-tile'
                : 'border-transparent text-ink-muted'
            }`}
          >
            {label}
            {count != null && (
              <span class='font-mono text-[12px] leading-none font-medium text-ink-muted'>
                {count}
              </span>
            )}
            {!!unread && (
              <span class='font-mono text-[12px] leading-none font-medium text-indigo'>
                {unread}
              </span>
            )}
            {!!badge && (
              <span class='h-[18px] min-w-[18px] rounded-sm bg-indigo px-[5px] text-center font-mono text-[11px] leading-[18px] font-medium text-on-indigo'>
                {badge}
              </span>
            )}
          </A>
        )
      })}
    </nav>
  )
}
