import type { ComponentChildren } from 'preact'

/**
 * A section that scrolls inside the page (§12.7): a list by batches, a
 * column of the board or of the messages. `class` gives its height and its
 * gutters, never its position nor its overflow:
 * - positioned, nothing hidden inside it (« Charger plus » for the screen
 *   readers) goes out of it and makes the page longer;
 * - marked (`data-scroller`), the lists find what they scroll in, and the
 *   page takes over the wheel at its ends (scroll-handoff.ts), unless it
 *   keeps its gesture (`contain`, a column of the messages).
 *
 * @example
 * <ScrollFrame class='max-h-[440px] -mr-2 pr-3'>
 *   <Batched items={projects} row={(p) => <ProjectRow project={p} />} />
 * </ScrollFrame>
 */
export const ScrollFrame = (
  { class: className = '', contain = false, children }: {
    class?: string
    contain?: boolean
    children: ComponentChildren
  },
) => (
  <div
    data-scroller={contain ? 'contain' : ''}
    class={`relative overflow-y-auto ${
      contain ? 'overscroll-contain' : ''
    } ${className}`}
  >
    {children}
  </div>
)
