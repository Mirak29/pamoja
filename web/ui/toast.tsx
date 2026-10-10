import { signal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import type { JSX } from 'preact'
import { A } from '@01edu/signal-router'
import { Bell, ShieldCheck, X } from '/web/assets/icons.tsx'

const tones = {
  indigo: 'text-indigo',
  verified: 'text-verified',
  warning: 'text-warning',
  danger: 'text-danger',
  muted: 'text-ink-muted',
} as const

type Toast = {
  id: number
  title: string
  body?: string
  icon?: (props: JSX.IntrinsicElements['svg']) => JSX.Element
  tone?: keyof typeof tones
  verified?: boolean
  /** Shows "Voir" and "Plus tard" actions */
  href?: string
  /** A help request that matches the viewer: skills, score, duration */
  match?: { skills: string[]; score: number; duration: string }
}

const toasts = signal<Toast[]>([])
let lastId = 0

const dismiss = (id: number) => {
  toasts.value = toasts.peek().filter((toast) => toast.id !== id)
}

/**
 * Real time toast, at most 4 on screen, gone after a few seconds.
 *
 * @example
 * notify({ title: 'Demande publiée', icon: Send, tone: 'verified' })
 */
export const notify = (
  toast: Omit<Toast, 'id'>,
  duration = toast.match ? 12000 : 6500,
) => {
  const id = ++lastId
  toasts.value = [...toasts.peek(), { ...toast, id }].slice(-4)
  setTimeout(() => dismiss(id), duration)
}

const ToastCard = ({ toast }: { toast: Toast }) => {
  const { icon: Icon = Bell, tone = 'indigo' } = toast
  return (
    <div class='slab-pop pointer-events-auto flex animate-enter gap-2.5 py-3 pr-3 pl-3.5'>
      <span class={`pt-0.5 ${tones[tone]}`}>
        <Icon class='size-[18px]' />
      </span>
      <div class='flex min-w-0 flex-1 flex-col gap-0.5'>
        <span class='text-[14px] leading-5 font-semibold'>{toast.title}</span>
        {toast.body && (
          <span class='text-small text-ink-muted'>{toast.body}</span>
        )}
        {toast.match && (
          <>
            <div class='mt-1 flex flex-wrap gap-1'>
              {toast.match.skills.map((skill) => (
                <span
                  key={skill}
                  class='inline-flex h-5 items-center rounded-sm bg-indigo-soft px-1.5 text-[12px] font-medium text-indigo'
                >
                  {skill}
                </span>
              ))}
            </div>
            <span class='mt-0.5 font-mono text-[13px] leading-5 font-medium'>
              {toast.match.score} / 100 · {toast.match.duration}
            </span>
          </>
        )}
        {toast.verified && (
          <span class='mt-1 inline-flex h-5 items-center gap-1 self-start rounded-sm border border-verified bg-verified-soft px-1.5 font-mono text-[10px] leading-none font-medium tracking-[.06em] text-verified uppercase'>
            <ShieldCheck class='size-3' />
            Vérifié par GitHub
          </span>
        )}
        {toast.href && (
          <div class='mt-1.5 flex gap-2'>
            <A
              href={toast.href}
              onClick={() => dismiss(toast.id)}
              class='inline-flex h-7 items-center rounded-md border border-indigo bg-indigo px-2.5 text-[13px] leading-none font-semibold text-on-indigo hover:no-underline'
            >
              {toast.match ? 'Voir la demande' : 'Voir'}
            </A>
            <button
              type='button'
              onClick={() => dismiss(toast.id)}
              class='h-7 cursor-pointer rounded-md border border-line-control px-2.5 text-[13px] leading-none font-semibold text-ink'
            >
              Plus tard
            </button>
          </div>
        )}
      </div>
      <button
        type='button'
        onClick={() => dismiss(toast.id)}
        aria-label='Fermer'
        class='flex size-6 cursor-pointer items-center justify-center rounded-sm text-ink-muted'
      >
        <X class='size-3.5' />
      </button>
    </div>
  )
}

/**
 * The toasts live in the top layer, as a manual popover: an open dialog is
 * there too, so each new toast shows the popover again to come above it.
 */
export const Toasts = () => {
  const ref = useRef<HTMLDivElement>(null)
  const list = toasts.value
  useEffect(() => {
    const element = ref.current
    if (!element?.showPopover) return
    element.matches(':popover-open') && element.hidePopover()
    element.showPopover()
  }, [list.length && list[list.length - 1].id])
  return (
    <div
      ref={ref}
      popover='manual'
      aria-live='polite'
      class='pointer-events-none fixed top-auto right-4 bottom-20 left-auto m-0 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2 overflow-visible border-0 bg-transparent p-0 md:bottom-4'
    >
      {list.map((toast) => <ToastCard key={toast.id} toast={toast} />)}
    </div>
  )
}
