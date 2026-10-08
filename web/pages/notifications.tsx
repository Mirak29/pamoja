import type { JSX } from 'preact'
import { navigate, url } from '@01edu/signal-router'
import {
  Check,
  CheckCheck,
  GitPullRequest,
  Handshake,
  LifeBuoy,
  MessageSquare,
  Repeat2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Zap,
} from '/web/assets/icons.tsx'
import {
  applications,
  applicationsChanged,
  decideApplication,
} from '/web/fixtures/applications.ts'
import {
  markAllRead,
  markRead,
  type Notification,
  type NotificationCategory,
  type NotificationKind,
  notifications,
  notificationsChanged,
} from '/web/fixtures/notifications.ts'
import { me } from '/web/fixtures/people.ts'
import { ago } from '/web/lib/time.ts'
import { DemoBadge } from '/web/ui/badge.tsx'
import { Button } from '/web/ui/button.tsx'
import { Page } from '/web/ui/layout.tsx'
import { Tabs } from '/web/ui/tabs.tsx'

type IconComponent = (props: JSX.IntrinsicElements['svg']) => JSX.Element

// URL key, category and label of each tab (§7.4)
const categories: [string, NotificationCategory | null, string][] = [
  ['toutes', null, 'Toutes'],
  ['pour-toi', 'for-you', 'Pour toi'],
  ['projets', 'projects', 'Projets'],
  ['communautes', 'communities', 'Communautés'],
  ['social', 'social', 'Social'],
  ['systeme', 'system', 'Système'],
]

const categoryLabels = Object.fromEntries(
  categories.map(([, category, label]) => [category, label]),
)

const icons: Record<NotificationKind, IconComponent> = {
  'pull-request': GitPullRequest,
  follow: UserPlus,
  sync: Zap,
  help: LifeBuoy,
  community: Users,
  moderation: ShieldCheck,
  promising: Sparkles,
  application: UserPlus,
  collaboration: Handshake,
  reply: MessageSquare,
  repost: Repeat2,
}

const open = (notification: Notification) => {
  markRead(notification)
  navigate({ href: notification.href })
}

const Row = ({ notification }: { notification: Notification }) => {
  const Icon = icons[notification.kind]
  const application = applications.find((a) =>
    a.id === notification.application
  )
  return (
    <div
      class={`-mt-px flex gap-3.5 border-t border-line px-5 py-4 ${
        notification.read ? 'bg-surface-100' : 'bg-indigo-soft'
      }`}
    >
      <span class='tile flex size-[38px] flex-none items-center justify-center text-indigo'>
        <Icon />
      </span>
      <div class='flex min-w-0 flex-1 flex-col gap-1'>
        <button
          type='button'
          onClick={() => open(notification)}
          class='cursor-pointer p-0 text-left text-[15px] leading-6 font-semibold text-pretty text-ink hover:text-indigo'
        >
          {notification.title}
        </button>
        <span class='text-[14px] leading-[22px] text-pretty text-ink-muted'>
          {notification.body}
        </span>
        <div class='flex flex-wrap items-center gap-2 text-[13px] leading-5 text-ink-muted'>
          <span>{ago(notification.at)}</span>
          <span>·</span>
          <span>{categoryLabels[notification.category]}</span>
          {notification.demo && <DemoBadge />}
        </div>
        {application?.status === 'pending' && (
          <div class='flex flex-wrap gap-2.5 pt-2 pb-1'>
            <button
              type='button'
              onClick={() => decideApplication(application, true)}
              class='key key-primary h-[34px] rounded-md px-3.5 text-[13px]'
            >
              Accepter
            </button>
            <button
              type='button'
              onClick={() => decideApplication(application, false)}
              class='key key-secondary h-[34px] rounded-md px-3.5 text-[13px]'
            >
              Refuser
            </button>
          </div>
        )}
        {application && application.status !== 'pending' &&
          (
            <span class='inline-flex items-center gap-1.5 text-[13px] font-semibold text-verified'>
              <Check class='size-3.5' />
              {application.status === 'accepted'
                ? 'Candidature acceptée'
                : 'Candidature refusée'}
            </span>
          )}
      </div>
      {!notification.read && (
        <span aria-label='Non lue' class='pt-2.5'>
          <span aria-hidden='true' class='diamond block size-[9px] bg-indigo' />
        </span>
      )}
    </div>
  )
}

/** Notification center by category, with direct actions (§7.4) */
export const NotificationsPage = () => {
  notificationsChanged.value
  applicationsChanged.value
  const mine = notifications.filter((n) => n.to === me.login)
  const current = categories.find(([key]) => key === url.params.categorie) ??
    categories[0]
  const list = mine.filter((n) => !current[1] || n.category === current[1])
  const unread = mine.filter((n) => !n.read).length
  return (
    <Page title='Notifications' class='flex flex-col gap-6 pt-5'>
      <div class='flex flex-wrap items-end justify-end gap-4'>
        <Button
          variant='secondary'
          disabled={!unread}
          onClick={() => markAllRead(me.login)}
        >
          <CheckCheck />
          Tout marquer comme lu
        </Button>
      </div>
      <Tabs
        label='Catégories de notifications'
        current={current[0]}
        tabs={categories.map(([key, category, label], i) => ({
          key,
          label,
          params: { categorie: i ? key : null },
          unread:
            mine.filter((n) =>
              !n.read && (!category || n.category === category)
            ).length,
        }))}
      />
      <div class='slab mr-2 overflow-hidden'>
        {list.map((notification) => (
          <Row key={notification.id} notification={notification} />
        ))}
        {!list.length && (
          <div class='flex flex-col items-center gap-3 px-6 py-10 text-center'>
            <span class='font-display text-[17px] leading-[22px] font-semibold'>
              Rien de neuf ici
            </span>
            <span class='text-[14px] text-ink-muted'>
              Les reviews, candidatures et demandes qui te concernent arriveront
              ici en temps réel.
            </span>
          </div>
        )}
      </div>
    </Page>
  )
}
