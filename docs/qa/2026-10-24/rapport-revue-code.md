# Revue de code complète Pamoja — 24 octobre 2026

**Verdict : le code est sain, et aucune faille de sécurité exploitable n'a été trouvée.** Le serveur tient ses règles d'accès partout : session signée, `state` OAuth à usage unique, signature des webhooks, trois contrôles de l'installation, fichiers lisibles seulement par qui y a droit, messages directs limités aux deux participants. Six défauts réels ont été corrigés. Le plus grave : une erreur dans une tâche de fond (rafraîchissement GitHub, file des webhooks, nettoyage des médias) arrêtait tout le serveur. La passe `/simplify` a retiré des duplications et ajouté les index qui manquaient sur les chemins chauds. Sept points ont été relevés hors correction (dernière section) ; tous sont corrigés depuis, avec le choix retenu pour chacun.

## Conditions

- Révision : `41a477d` (`master`, après PAM-522). Corrections sur la branche `review-2026-10-24`.
- Avant toute modification : `deno fmt --check`, `deno lint` et `deno check` propres, 143 tests verts.
- App lancée : base seedée (`deno task seed`), serveur de dev sur `http://localhost:8800`, connexion simulée, accueil, messagerie et API interrogés depuis le navigateur intégré.
- Faits sur `@01edu/api` et `@01edu/db` lus dans leur source du cache Deno : le validateur garde les champs non déclarés et ne limite pas la taille d'un `STR` ; les colonnes `join` n'ont pas d'index ; seules les tables d'entries en reçoivent.
- Lecture de tout le serveur (`api/`), des scripts racine et des modules front qui touchent la sécurité (rendu Markdown, liens, temps réel).

## Revue de sécurité (`/security-review`)

Méthode : un agent a cherché les failles dans tout le code ; chaque candidat a ensuite été vérifié à part par un autre agent, avec les règles d'exclusion de la revue. Seuls les résultats à 8/10 de confiance ou plus sont retenus.

**Résultat : aucune vulnérabilité retenue.** Trois candidats ont été écartés :

| Candidat | Pourquoi il est écarté | Suite proposée |
| --- | --- | --- |
| Aperçu de lien : le nom d'hôte est vérifié, puis résolu une seconde fois par `fetch` (rebinding DNS) | Ports 80/443 seulement, page HTML seulement, seuls titre et description reviennent, et il faut une conversation acceptée | Durcissement possible : se connecter à l'adresse vérifiée |
| Accepter une demande d'aide ouvre une conversation acceptée, qui le reste après le désistement | Conforme au §10.6 (« une demande d'aide entre eux ») ; le demandeur est prévenu et peut bloquer | Décision produit, voir R-02 |
| Le refus d'une demande de message envoie un événement temps réel au demandeur | Le flux ne porte que `[date, type, id]` ; la page relit le statut masqué (`pending`) | Décision produit, voir R-01 |

Vérifié et sain : sessions (HMAC, comparaison en temps constant, 30 jours contrôlés côté serveur, cookie `HttpOnly`, `Secure`, `SameSite=Lax`) ; OAuth (`state` signé, daté, lié au navigateur, à usage unique) ; webhooks (HMAC du corps brut, refus sans secret) ; installation (identité, couverture, droit admin) ; médias (type lu sur les octets, clé aléatoire vérifiée, pas de traversée de chemin, `nosniff`, CSP `sandbox`) ; SQL (aucune valeur d'utilisateur dans le texte d'une requête) ; Markdown rendu en éléments, liens `http(s)` seulement ; outils de dev de `@01edu/api` à 404.

## Défauts corrigés

### REV-01 · P1 · Une erreur dans une tâche de fond arrêtait le serveur

Deno arrête le processus sur une erreur non rattrapée. Cinq tâches de fond pouvaient en lever une, par exemple sur une base occupée :

- le comptage des commentaires de review ;
- la lecture des skills des PRs ;
- la boucle de rafraîchissement GitHub, qui avait un `try/finally` sans `catch` ;
- le nettoyage horaire des médias ;
- la file des webhooks.

Chaque tâche gérait aussi ses erreurs à sa façon : journalisées, ignorées en silence, ou pas gérées du tout.

**Corrigé** : `api/lib/background.ts` fournit `later()` (après le travail en cours) et `every()` (périodique, une passe à la fois). Une erreur y est journalisée, jamais relancée. Les sept points de départ passent par eux ; la lecture des skills et le minuteur de présence journalisent aussi leurs erreurs. Test : `api/background_test.ts`.

### REV-02 · P2 · Deux Preact dans le bundle de dev

`web/debug.ts` importait `npm:preact/debug` sans version, ce qui chargeait Preact 11.0.1 à côté du Preact 10.29.8 de l'app. Les contrôles de `preact/debug` s'accrochaient à la copie inutilisée et ne faisaient donc rien, pour un bundle plus lourd.

**Corrigé** : `import 'preact/debug'`, résolu par l'import map. Vérifié après rebuild : `dist/index.js` ne contient plus que `preact@10.29.8`.

### REV-03 · P2 · Outils de build non épinglés

Avec `"lock": false`, `task-dev.ts` et `task-prod.ts` importaient `npm:esbuild` sans version. C'est esbuild 0.28.2 qui tournait, alors que `build-config.ts` est écrit pour la 0.25.5 et que son commentaire demande de rester dessus. Même problème pour `@std/http` (`prod-server.ts`), `@luca/esbuild-deno-loader` et `@std/fs`.

**Corrigé** : versions écrites dans chaque import (esbuild `0.25.5`, `@std/http@^1.0.20`, loader `^0.11.1`, `@std/fs@^1.0.24`). Activer `deno.lock` reste une décision d'équipe.

### REV-04 · P2 · Recherche dans les messages privés et commentaire de signalement dans les logs

Le router journalise les paramètres de chaque route (`in-params`). `q` (recherche dans ses messages directs) et `comment` (signalement d'un message) n'étaient pas masqués, contre la règle de QA-33.

**Corrigé** : ajoutés aux `sensitiveKeys` de `api/routes.ts`. Vérifié dans le journal du serveur : `{ q: undefined }`, le texte cherché n'apparaît plus.

### REV-05 · P2 · L'import d'un projet n'avait aucune limite de taille

`LIMITS.projectName`, `projectDescription` et `projectVision` existaient, et la page les décompte, mais le serveur ne les vérifiait pas. Les besoins étaient du texte libre, sans limite de nombre (QA-19, §16).

**Corrigé** : la route d'import vérifie les trois champs avec `tooLong`, comme le profil. Elle accepte 10 besoins au plus, de 80 caractères chacun (`MAX_NEEDS`, `LIMITS.projectNeed`). Test ajouté dans `api/import_test.ts`.

### REV-06 · P3 · Un appel GitHub sans réponse bloquait le rafraîchissement

Aucun `fetch` vers GitHub n'avait de délai maximal. Une connexion pendue gardait la boucle de rafraîchissement « en cours » : plus aucun repo n'était relu jusqu'au redémarrage.

**Corrigé** : les lectures du bot (`github()`) s'arrêtent après 30 s et renvoient un 502, comme les autres échecs de GitHub.

## Simplifications et efficacité (`/simplify`)

Quatre agents ont relu le serveur, chacun sous un angle : réutilisation, simplification, efficacité, et profondeur des correctifs. Appliqué, sans changement de comportement :

- **Une seule source** pour :
  - les en-têtes GitHub (`githubHeaders`, `appHeaders`), qui étaient recopiés 5 fois ;
  - le SQL d'une installation (`recordInstallation`, `setSyncMode`), en double entre `installation.ts` et `github-events.ts` ;
  - la clé HMAC (`hmacKey`, `sessionKey`), construite deux fois ;
  - le développeur d'un compte GitHub (`userIdOfGithubId`), écrit trois fois ;
  - les filtres de matching (`matchingFiltersOf`, réutilisé par `matching.ts`) ;
  - les listeners temps réel (`listeners`, qui remplace deux exports morts et deux casts) ;
  - le message d'une erreur (`errorMessage`).
- **Code plus simple** :
  - `getProjectRepo` faisait deux recherches en une, avec des valeurs factices ; il est coupé en deux requêtes ;
  - la longueur d'un message direct était vérifiée deux fois, elle l'est une seule ;
  - le helper `mine()` est réutilisé partout ;
  - `explain()` n'a plus neuf conversions de type ;
  - les badges sont lus par une seule requête ;
  - dans `routes.ts`, l'en-tête « Profile » vide est enlevé, l'import en double fusionné, les champs du profil public partagés avec `currentUser`, et « login ou 404 » écrit une seule fois ;
  - la suppression des médias tient en une seule boucle.
- **Efficacité** :
  - 13 index sur les recherches répétées : limites de débit, membres d'un projet ou d'une communauté, « Pour moi », reviews d'une PR, fichiers servis par clé, détenteurs d'un skill. Ce sont des `CREATE INDEX IF NOT EXISTS`, sans migration.
  - Ouvrir une conversation lit une ligne au lieu de toute la liste des conversations.
  - Le rafraîchissement écrit issues et PRs dans une seule transaction.
  - L'import interroge l'installation de l'app en même temps que les issues et les PRs.

Écarté, parce que la correction change un comportement ou dépasse une simple remise en ordre : limite de débit par défaut sur toutes les routes d'écriture, évaluation partielle des badges à chaque push, file unique pour la lecture des skills des PRs, déplacement de toutes les limites de taille dans une seule couche. Écarté aussi pour un gain faible à l'échelle de la démo : audience temps réel mise en cache par entry, requêtes par conversation dans la liste, N+1 de « Pour moi », cache des noms de skills.

## Relevés hors correction, corrigés depuis

### R-01 · Le refus d'une demande de message se devine — corrigé

`declineConversation` insérait `CONVERSATION_UPDATED`, envoyé aux deux participants, alors que le §10.6 dit que l'expéditeur n'apprend jamais un refus. **Corrigé** : un refus n'est envoyé qu'aux onglets de celui qui refuse ; test ajouté dans `api/entry_triggers_test.ts`.

### R-02 · Accepter une demande d'aide ouvre une conversation directe — corrigé

N'importe quel développeur pouvait accepter une demande ouverte, ouvrir une conversation acceptée d'office (sans demande de message, avec fichiers et statut en ligne), puis se désister. **Corrigé** : seule une aide livrée (`HELP_REQUEST_DELIVERED` ou `REVIEW_SUBMITTED`, lus dans le journal, qu'un désistement n'efface pas) ou une demande de collaboration adressée à l'autre ouvre la conversation directe ; §10.6 mis à jour, test ajouté.

### R-03 · Upload sans `Content-Length` — corrigé

Un corps envoyé par morceaux (sans `Content-Length`) était lu en entier en mémoire avant le contrôle de taille. **Corrigé** : le corps est lu par morceaux et refusé (413) dès qu'il dépasse la limite ; test ajouté. La limite de corps de Caddy (PAM-114) reste une protection de plus.

### R-04 · Pas de limite de débit sur la plupart des écritures — corrigé

Seuls les messages directs et l'upload avaient une limite. **Corrigé**, avec des limites comptées en base : 10 demandes d'aide par 24 heures, 20 messages par minute et 1 000 par jour dans le fil d'une demande, 10 imports de projet par heure. Les pages disent quand réessayer sans perdre le texte ; §16 mis à jour, tests ajoutés.

### R-05 · `unsuspend` d'une installation n'est pas traité — corrigé

Une installation suspendue repasse ses repos en rafraîchissement toutes les 15 min. Sa réactivation (`unsuspend`) ne les remettait pas en synchro live. **Corrigé** : `unsuspend` est traité comme `created` (la documentation de GitHub confirme qu'il porte `repositories`), test ajouté dans `api/github-events_test.ts`.

### R-06 · La production n'impose pas `APP_ENV=prod` — corrigé

Sans `APP_ENV=prod`, le serveur démarrait avec le secret de session de dev et la connexion simulée. **Corrigé** : `prod-server.ts` importe d'abord `api/lib/production.ts`, qui refuse le démarrage sans `APP_ENV=prod`, avant que l'API ne se charge ; `deno task prod:local` essaie le build sur sa machine.

### R-07 · Test intermittent — corrigé

`web/lib/language_test.ts` attendait un nouveau rendu avec un délai fixe de 50 ms. Il a échoué deux fois sur sept passages de la suite complète, machine chargée, et passait seul. **Corrigé** : le test récupère les rendus en attente par `options.debounceRendering` et les exécute lui-même, sans minuteur ; ses vérifications sont inchangées.

## Après correction

- `deno fmt --check`, `deno lint` et `deno check api web *.ts` sont propres ; 146 tests verts (3 nouveaux, plus le cas suspendu puis réactivé ajouté à un test existant).
- App relancée : accueil, connexion simulée, messagerie (une conversation créée, ouverte, recherchée, un message trop long refusé). Aucune erreur dans le journal du serveur.

## Corrigé aussi pendant la relecture de PAM-316

- **En-tête mobile** : depuis le bouton Messages (PAM-522), les boutons de l'en-tête passaient sur la recherche à 375 px. Sur téléphone, le thème et la langue vont dans le menu du compte ; la recherche garde environ 100 px.
