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

/**
 * A person is a disc carrying their initials (avatars stay those of GitHub
 * once the API exists).
 *
 * @example
 * <Avatar name='Moussa Diallo' size={44} />
 */
export const Avatar = (
  { name, size = 38 }: { name: string; size?: keyof typeof sizes },
) => (
  <span class={`disc ${sizes[size]}`} aria-hidden='true'>
    {initials(name)}
  </span>
)
