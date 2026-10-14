import { useState } from 'preact/hooks'

/** Disc sizes in pixels with their initials size, as in the prototype */
const sizes = {
  26: 'size-[26px] text-[9px]',
  28: 'size-7 text-[10px]',
  30: 'size-[30px] text-[11px]',
  32: 'size-8 text-[12px]',
  34: 'size-[34px] text-[12px]',
  36: 'size-9 text-[13px]',
  38: 'size-[38px] text-[14px]',
  42: 'size-[42px] text-[15px]',
  44: 'size-11 text-[16px]',
  46: 'size-[46px] text-[17px]',
  48: 'size-12 text-[17px]',
  52: 'size-13 text-[19px]',
} as const

export const initials = (name: string) =>
  name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

// GitHub serves its avatars at the size asked: twice the disc, for sharp
// screens
const sized = (src: string, px: number) => {
  try {
    const url = new URL(src)
    if (url.hostname !== 'avatars.githubusercontent.com') return src
    url.searchParams.set('s', String(px * 2))
    return url.href
  } catch {
    return src
  }
}

/**
 * The face of a person in a disc styled by `class`: the GitHub photo
 * (§17.3), or the initials without it or when it does not load.
 *
 * @example
 * <Portrait name={person.name} src={person.avatarUrl} px={96} class='…' />
 */
export const Portrait = (
  { name, src, px, class: className }: {
    name: string
    src?: string
    /** Displayed size, to ask GitHub for the right one */
    px: number
    class: string
  },
) => {
  const [failed, setFailed] = useState<string>()
  const photo = src && failed !== src
  return (
    <span class={`${className} overflow-hidden`} aria-hidden='true'>
      {photo
        ? (
          <img
            src={sized(src, px)}
            alt=''
            loading='lazy'
            referrerpolicy='no-referrer'
            class='size-full object-cover'
            onError={() => setFailed(src)}
          />
        )
        : initials(name)}
    </span>
  )
}

/**
 * A person is a disc: their GitHub photo, or their initials.
 *
 * @example
 * <Avatar name='Moussa Diallo' size={44} />
 */
export const Avatar = (
  { name, src, size = 38 }: {
    name: string
    src?: string
    size?: keyof typeof sizes
  },
) => <Portrait name={name} src={src} px={size} class={`disc ${sizes[size]}`} />
