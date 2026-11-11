// Scroll handoff (§12.7): a frame that scrolls (a section of a profile, the
// team of a project, a column of the board) gives the rest of the gesture to
// what holds it, the page in the end, once it reaches its top or its bottom.
// Without it the browser keeps the whole gesture on the frame: the wheel
// seems stuck until it is turned again. Touch screens chain by themselves,
// the frames no longer forbid it (no overscroll-contain).
//
// The frames say what they are (`data-scroller`, see ScrollFrame): a wheel
// over the page itself costs one lookup, never a walk through the styles.

// A wheel notch scrolls the page gently; a trackpad sends small steps that
// follow the fingers as they are
const NOTCH = 40
// A glide is over by then, even in a browser that never says it (scrollend)
const GLIDE_MS = 600

const FRAME = '[data-scroller]'
// A dialog, a menu or a popover keeps its gesture: the page behind it never
// moves
const MODAL = 'dialog, [role="dialog"], [popover], [aria-modal="true"]'

const lines = (event: WheelEvent) =>
  event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
    ? innerHeight
    : 1

/** Room left in a direction: down when `dy` is positive */
const roomOf = (element: Element, dy: number) =>
  dy > 0
    ? element.scrollHeight - element.clientHeight - element.scrollTop
    : element.scrollTop

const scrolls = (element: Element) =>
  element.scrollHeight > element.clientHeight + 1 &&
  /auto|scroll/.test(getComputedStyle(element).overflowY)

/**
 * The frames that hold the pointer, the nearest first, then the page: only
 * when the nearest one reached its end. Null when the browser keeps the
 * gesture as usual.
 */
const framesOf = (target: EventTarget | null, dy: number) => {
  if (!(target instanceof Element) || target.closest(MODAL)) return null
  let frame = target.closest(FRAME)
  // Inside a frame only: on the page itself, the browser scrolls as usual
  if (!frame) return null
  // What scrolls inside the frame (a text area, a block of code) keeps it
  for (let node: Element | null = target; node && node !== frame;) {
    if (scrolls(node)) return null
    node = node.parentElement
  }
  const frames: Element[] = []
  for (; frame; frame = frame.parentElement?.closest(FRAME) ?? null) {
    if (!scrolls(frame)) continue
    // A column that keeps its gesture (the messages), or a frame that still
    // has the whole step: the browser scrolls it
    if (!frames.length) {
      if (frame.getAttribute('data-scroller') === 'contain') return null
      if (roomOf(frame, dy) >= Math.abs(dy)) return null
    }
    frames.push(frame)
  }
  if (!frames.length) return null
  const page = document.scrollingElement
  page && frames.push(page)
  return frames
}

// Where a gliding element is going: each notch adds to the target, none is
// lost when the next one comes before the end of the glide
const targets = new WeakMap<Element, { top: number; at: number }>()

const glide = (element: Element, dy: number, smooth: boolean) => {
  if (!smooth) {
    targets.delete(element)
    return element.scrollBy({ top: dy, behavior: 'instant' })
  }
  const max = element.scrollHeight - element.clientHeight
  const known = targets.get(element)
  const now = performance.now()
  const from = known && now - known.at < GLIDE_MS
    ? known.top
    : element.scrollTop
  const top = Math.max(0, Math.min(max, from + dy))
  targets.set(element, { top, at: now })
  element.scrollTo({ top, behavior: 'smooth' })
}

// The glide is over, or the reader scrolled by other means
addEventListener('scrollend', (event) => {
  const element = event.target instanceof Document
    ? document.scrollingElement
    : event.target
  element instanceof Element && targets.delete(element)
}, { capture: true })

addEventListener('wheel', (event) => {
  // Zoom, a horizontal gesture, or a page that handled it: left alone
  if (event.ctrlKey || event.defaultPrevented) return
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
  const dy = event.deltaY * lines(event)
  if (!dy) return
  const frames = framesOf(event.target, dy)
  if (!frames || frames.length < 2) return
  const [nearest] = frames
  const room = roomOf(nearest, dy)
  // The next one with room takes what the frame cannot
  const next = frames.slice(1).find((frame) => roomOf(frame, dy) > 0)
  if (!next) return
  event.preventDefault()
  const sign = Math.sign(dy)
  // The frame goes to its end, the rest of the step moves the next one
  room > 0 && nearest.scrollBy({ top: sign * room, behavior: 'instant' })
  glide(next, dy - sign * room, Math.abs(dy) >= NOTCH)
}, { passive: false })
