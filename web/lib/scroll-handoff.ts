// Scroll handoff (§12.7): a frame that scrolls (a section of a profile, the
// team of a project, a column of the board) gives the rest of the gesture to
// what holds it, the page in the end, once it reaches its top or its bottom.
// Without it the browser keeps the whole gesture on the frame: the wheel
// seems stuck until it is turned again. Touch screens chain by themselves,
// the frames no longer forbid it (no overscroll-contain).

// A wheel notch scrolls the page gently; a trackpad sends small steps that
// follow the fingers as they are
const NOTCH = 40

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

// A dialog, a menu or a popover keeps its gesture: the page behind it never
// moves
const modal = (element: Element) =>
  element.matches('dialog, [role="dialog"], [popover], [aria-modal="true"]')

/** The frames under the pointer, the nearest first, then the page */
const framesOf = (target: EventTarget | null) => {
  const frames: Element[] = []
  for (
    let node = target instanceof Element ? target : null;
    node && node !== document.body && node !== document.documentElement;
    node = node.parentElement
  ) {
    if (modal(node)) return null
    if (scrolls(node)) frames.push(node)
  }
  const page = document.scrollingElement
  page && frames.push(page)
  return frames
}

// Where a gliding element is going: each notch adds to the target, none is
// lost when the next one comes before the end of the glide
const targets = new WeakMap<Element, number>()

const glide = (element: Element, dy: number, smooth: boolean) => {
  if (!smooth) {
    targets.delete(element)
    return element.scrollBy({ top: dy, behavior: 'instant' })
  }
  const max = element.scrollHeight - element.clientHeight
  const from = targets.get(element) ?? element.scrollTop
  const top = Math.max(0, Math.min(max, from + dy))
  targets.set(element, top)
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
  const frames = framesOf(event.target)
  // Inside a frame only: on the page itself, the browser scrolls as usual
  if (!frames || frames.length < 2) return
  const [nearest] = frames
  const room = roomOf(nearest, dy)
  // The frame still has the whole step: the browser scrolls it as usual
  if (room >= Math.abs(dy)) return
  // The next one with room takes what the frame cannot
  const next = frames.slice(1).find((frame) => roomOf(frame, dy) > 0)
  if (!next) return
  event.preventDefault()
  const sign = Math.sign(dy)
  // The frame goes to its end, the rest of the step moves the next one
  room > 0 && nearest.scrollBy({ top: sign * room, behavior: 'instant' })
  glide(next, dy - sign * room, Math.abs(dy) >= NOTCH)
}, { passive: false })
