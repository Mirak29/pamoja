import type { JSX } from 'preact'
import { A, type LinkProps } from '@01edu/signal-router'

const variants = {
  primary: 'key-primary',
  secondary: 'key-secondary',
  danger: 'key-danger',
} as const

/** Heights in pixels, as used by the prototype */
const sizes = {
  32: 'h-8 px-3 text-[13px]',
  34: 'h-[34px] px-3 text-[13px]',
  36: 'h-9 px-4 text-[14px]',
  38: 'h-[38px] px-4 text-[14px]',
  40: 'h-10 px-4 text-[14px]',
  42: 'h-[42px] px-4 text-[14px]',
  46: 'h-[46px] px-4 text-[15px]',
  48: 'h-12 px-[22px] text-[16px]',
} as const

/** Icon only keys are square */
const squares = {
  32: 'size-8',
  34: 'size-[34px]',
  36: 'size-9',
  38: 'size-[38px]',
  40: 'size-10',
  42: 'size-[42px]',
  46: 'size-[46px]',
  48: 'size-12',
} as const

export type ButtonVariant = keyof typeof variants

type ButtonProps =
  & {
    variant?: ButtonVariant
    size?: keyof typeof sizes
    square?: boolean
  }
  & JSX.IntrinsicElements['button']
  & Partial<LinkProps>

/**
 * A key of the isometric system: it rises on hover and sinks when pressed.
 * With `href` or `params` it renders a router link.
 *
 * @example
 * <Button>Demander une review</Button>
 * <Button variant='secondary'>Plus tard</Button>
 * <Button variant='danger' size={34}>Se désister</Button>
 * <Button variant='secondary' size={40} square aria-label='Notifications'>
 *   <Bell class='size-5' />
 * </Button>
 */
export function Button(
  { variant = 'primary', size = 38, square, class: className, ...props }:
    ButtonProps,
) {
  const classes = [
    'key rounded-md',
    variants[variant],
    square ? squares[size] : sizes[size],
    className,
  ].filter(Boolean).join(' ')

  if (props.href || props.params) {
    return <A {...(props as LinkProps)} class={classes} />
  }

  return <button type='button' {...props} class={classes} />
}

type OptionButtonProps = { pressed: boolean } & JSX.IntrinsicElements['button']

/**
 * A choice that stays down once picked: filters, types, levels, durations.
 *
 * @example
 * <OptionButton pressed={type === 'Debug'} onClick={() => pick('Debug')}>
 *   Debug
 * </OptionButton>
 */
export const OptionButton = (
  { pressed, class: className, ...props }: OptionButtonProps,
) => (
  <button
    type='button'
    aria-pressed={pressed}
    {...props}
    class={`key-option inline-flex items-center gap-1.5 h-[34px] px-3 rounded-md text-[13px] font-medium leading-none whitespace-nowrap ${
      className ?? ''
    }`}
  />
)
