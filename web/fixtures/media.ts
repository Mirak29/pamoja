import type { Media } from '/web/lib/messages.ts'

// Demo images of the fixtures (web/assets/mocks): screenshots drawn for the
// demo projects, served with the pages, never uploaded

let lastId = 0

/** A demo image, 1200 × 900, as the server would describe it */
export const demoImage = (name: string): Media => ({
  id: --lastId,
  key: `mocks/${name}.webp`,
  mime: 'image/webp',
  image: true,
  width: 1200,
  height: 900,
  bytes: 0,
  name: `${name}.webp`,
})
