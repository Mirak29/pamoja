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

/**
 * Tabs sit in a rail dug into the ground; the current one is a raised tile.
 * Each tab is a link: a path (`href`) or a query param (`params`), so the URL
 * keeps the current tab.
 *
 * @example
 * <Tabs
 *   label='Demandes d’aide'
 *   current={tab}
 *   tabs={[{ key: 'pour-moi', label: 'Pour moi', params: { tab: null }, count: 3 }]}
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
) => (
  <nav aria-label={label} class={`rail ${wide ? 'w-max' : 'self-start'}`}>
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
