import { assertEquals } from 'jsr:@std/assert@^1.0.13'
import { englishAddress } from '/web/lib/addresses.ts'

Deno.test('addresses: the French ones lead to their English address (PAM-125)', () => {
  const cases: [string, string | undefined][] = [
    ['/aide', '/help'],
    [
      '/aide/nouvelle?project=openpay-africa&pr=81',
      '/help/new?project=openpay-africa&pr=81',
    ],
    ['/aide/h3', '/help/h3'],
    ['/aide?tab=mes-demandes', '/help?tab=mine'],
    [
      '/projet/openpay-africa/canaux/suivi',
      '/project/openpay-africa/channels/updates',
    ],
    ['/projet/openpay-africa/equipe', '/project/openpay-africa/team'],
    [
      '/projet/openpay-africa/activite?filtre=equipe',
      '/project/openpay-africa/activity?filter=team',
    ],
    ['/projets', '/projects'],
    ['/communaute/go/apropos', '/community/go/about'],
    ['/explorer/travail', '/explore/work'],
    [
      '/explorer?pays=S%C3%A9n%C3%A9gal&disponible=1',
      '/explore?country=S%C3%A9n%C3%A9gal&available=1',
    ],
    ['/profil/modifier', '/profile/edit'],
    ['/reglages', '/settings'],
    ['/enregistres', '/saved'],
    ['/notifications?categorie=systeme', '/notifications?category=system'],
    ['/?fil=abonnements', '/?feed=following'],
    ['/onboarding?etape=3', '/onboarding?step=3'],
    ['/@moussa?dialog=preuves-review', '/@moussa?dialog=proofs-review'],
    ['/@moussa?vue=publique', '/@moussa?view=public'],
    // The page to come back to after the login is read too
    ['/connexion?retour=%2Fprojet%2Fkora', '/login?next=%2Fproject%2Fkora'],
    [
      '/connexion/github?code=abc&state=xyz',
      '/login/github?code=abc&state=xyz',
    ],
    // English already: nothing to do
    ['/help/new', undefined],
    ['/@moussa', undefined],
    ['/messages/k3P9xQ2mT7aB', undefined],
    ['/', undefined],
  ]
  for (const [old, english] of cases) {
    assertEquals(englishAddress(old), english, old)
  }
})
