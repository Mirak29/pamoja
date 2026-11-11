import { signal } from '@preact/signals'
import type { NotificationCategory } from '/web/fixtures/notifications.ts'

// Settings of the signed-in developer (§7.4, §7.3), what
// POST/api/user/settings/update will store

export type Channel = { app: boolean; mail: boolean }

export const notificationRows: [NotificationCategory, string, string][] = [
  ['for-you', 'Pour toi', 'Demandes d’aide qui te correspondent, relances.'],
  ['projects', 'Projets', 'PRs, reviews, CI, candidatures de tes projets.'],
  ['communities', 'Communautés', 'Réponses à tes posts et questions.'],
  ['social', 'Social', 'Abonnements, republications, collaborations.'],
  ['system', 'Système', 'Sécurité du compte et modération.'],
]

export const matchingModes = [
  'Instantané',
  'Résumé quotidien',
  'Désactivé',
] as const

export const settings = {
  notifications: Object.fromEntries(
    notificationRows.map(([key]) => [key, {
      app: true,
      mail: key === 'for-you' || key === 'system',
    }]),
  ) as Record<NotificationCategory, Channel>,
  matching: 'Instantané' as typeof matchingModes[number],
  /** Help requests below this score are not proposed (§7.3) */
  minScore: 50,
  /**
   * Only the requests on one of these skills, of these projects (slugs) and
   * by a member of these communities (slugs); empty, all of them (§7.4)
   */
  onlySkills: [] as string[],
  onlyProjects: [] as string[],
  onlyCommunities: [] as string[],
}

export const settingsChanged = signal(0)

export const updateSettings = (change: (current: typeof settings) => void) => {
  change(settings)
  settingsChanged.value++
}
