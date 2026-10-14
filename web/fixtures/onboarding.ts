import {
  countries,
  me,
  peopleChanged,
  type Person,
} from '/web/fixtures/people.ts'
import { profileChanged } from '/web/fixtures/profile-settings.ts'
import { matchingModeOf } from '/api/vocabulary.ts'
import { saveMe } from '/web/lib/session.ts'
import {
  type matchingModes,
  settings,
  updateSettings,
} from '/web/fixtures/settings.ts'

export type MatchingMode = typeof matchingModes[number]

export type OnboardingDraft = {
  headline: string
  country: string
  city: string
  website: string
  domains: string[]
  skills: string[]
  intents: string[]
  matching: MatchingMode
}

/** Prefilled from GitHub and what the profile already holds (§6.1) */
export const onboardingDraft = (): OnboardingDraft => ({
  headline: me.headline,
  country: me.country,
  city: me.city,
  website: me.website ?? '',
  domains: me.domains ?? [],
  skills: [...me.skills],
  intents: [...me.intents],
  matching: settings.matching,
})

/** POST/api/onboarding/complete: the profile and the matching setting */
export const completeOnboarding = (draft: OnboardingDraft) => {
  const person: Person = me
  Object.assign(person, {
    headline: draft.headline.trim() || person.headline,
    country: draft.country,
    countryCode: countries[draft.country] ?? '',
    city: draft.city.trim() || person.city,
    website: draft.website.trim() || undefined,
    domains: draft.domains,
    skills: draft.skills.length ? draft.skills : person.skills,
    intents: draft.intents,
  })
  updateSettings((settings) => settings.matching = draft.matching)
  peopleChanged.value++
  profileChanged.value++
  saveMe({
    profile: {
      headline: draft.headline,
      // An African country by its code, another one as written
      country: countries[draft.country] ?? draft.country,
      city: draft.city,
      website: draft.website,
      matchingMode: matchingModeOf(draft.matching),
    },
    skills: { skills: draft.skills, domains: draft.domains },
    intents: draft.intents,
  })
}
