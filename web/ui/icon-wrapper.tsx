import type { JSX } from 'preact'

/** Lucide stroke icon, 16px by default, drawn with the 1.5px line of Pamoja */
export function Icon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      aria-hidden
      width={16}
      height={16}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      stroke-width={1.5}
      stroke-linecap='round'
      stroke-linejoin='round'
      {...props}
      xmlns='http://www.w3.org/2000/svg'
    />
  )
}
