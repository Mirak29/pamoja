# Pamoja — contexte pour Codex

Pamoja (« ensemble » en swahili) est une plateforme de collaboration pour développeurs
africains, construite pour le concours **CADEV**. Un développeur importe son projet
GitHub, demande une aide précise (review de PR, debug…), la demande est envoyée
automatiquement aux bons développeurs, et l'aide vérifiée sur GitHub devient de la
réputation visible sur son profil. Promesse : *Your work is your profile.*

- **Calendrier** : 10 jours, du mercredi 7 au vendredi 16 octobre 2026.
- **Équipe** : Abdou et niangoos, assistés de Codex. Un responsable par bloc (voir `TODO.md`).
- **Hébergement imposé** : Systalink (cloud souverain sénégalais) — une VM avec Docker.
- **Langue** : échanges et documents en français.

## Sources de vérité

| Fichier | Rôle |
| --- | --- |
| `docs/cahier-des-charges.md` | **Référence** du produit et des choix techniques (sections `§1` à `§20`) |
| `TODO.md` | Suivi des tâches `PAM-xxx`, planning jour par jour, critères d'acceptation, journal des décisions |
| [Doc en ligne](https://claude.ai/code/artifact/e7a00b2e-5fef-42ba-b949-7d181200909a) | Copie partagée avec les relecteurs (accessible seulement si elle a été partagée depuis le menu Share) ; à resynchroniser après chaque changement important du fichier du repo |
| `docs/prototype/` | Prototype interactif Pamoja v2 : référence des écrans et parcours (voir son README pour ce que le code ne reprend pas) |
| `docs/brief-prototype-Codex-design.md` | Brief autonome pour le prototype interactif complet (toutes les pages, workflows, données fictives) |
| `docs/suivi-projet.md` | Journal de ce qui est réalisé, tâche par tâche ; une entrée par tâche terminée |
| `docs/cadev-inscription.md` | Textes saisis dans le formulaire d'inscription CADEV |
| [Design system Pamoja](https://claude.ai/artifact/Gj5ox6BNFzaDpuqaCFCWhb) | Identité visuelle : README (règles), tokens, composants, logo. Copie des tokens et du logo dans `docs/identite/`. À lire avant tout travail d'interface |

**Règle de cohérence** : toute décision qui change le périmètre ou une règle modifie
d'abord `docs/cahier-des-charges.md`, puis `TODO.md`, puis ajoute une ligne au journal
des décisions en bas de `TODO.md`.

## Façon de travailler

- **Périmètre complet** : l'équipe veut livrer toutes les fonctionnalités. Ne pas proposer
  d'en supprimer. Face à un retard, séquencer ou baisser le niveau de finition
  (*fonctionnel* au lieu de *démo*, voir §4). Une exception argumentée reste possible
  pour une sous-fonctionnalité coûteuse hors démo (précédent : upload vidéo natif
  remplacé par des vidéos intégrées par lien).
- **Priorité absolue** : la boucle de démo (bloc 2, scénario du §18).
- **Une tâche = une PR**, ID dans la branche et le commit, comme `TNT-xxx` dans
  Tournament : branche `PAM-204-webhook-queue`, commit `PAM-204 Add persistent webhook queue`.
  Cocher la tâche dans `TODO.md` dans la PR qui la livre.
- **Suivi de projet, obligatoire** : dès qu'une tâche est terminée, ajoute son entrée dans
  `docs/suivi-projet.md` (modèle en tête du fichier), **dans la même PR** que la tâche, à la fin
  de la section « Réalisé ». Une tâche abandonnée ou fusionnée va dans « Fermé sans réalisation »,
  avec sa raison. Une tâche n'est pas finie tant que cette entrée n'existe pas.
- **À deux** : prendre une tâche en ajoutant `— @login` sur sa ligne avant de commencer ;
  chaque PR est relue et approuvée par l'autre développeur avant le merge.
- **Vérifier avant d'affirmer** : les faits sur `@01edu` du §12.4 et du §12.5 ont été
  lus dans le code source des paquets. Tout nouveau fait technique se vérifie de la
  même façon (code de Tournament, cache Deno, documentation officielle).
- **Relecture externe** : défendre un choix argumenté, mais corriger quand le relecteur
  a raison.
- **Ce fichier est versionné** : c'est le contexte commun des sessions Codex des
  deux développeurs. Il se modifie par PR, comme le reste.

## Référence : Tournament

Même stack, en production : `C:\Users\abdou\Documents\tournament`. Avant d'écrire une
brique, regarder comment Tournament la fait :

| Besoin Pamoja | Fichier Tournament |
| --- | --- |
| `deno.json`, versions des paquets `@01edu`, fmt et lint | `deno.json` |
| Build esbuild | `build-config.ts` |
| Serveur de dev (route `/api` vers l'API) | `task-dev.ts` |
| Serveur de prod (lit `dist/index.html`) | `prod-server.ts` |
| Schéma, migrations, `initEntries` | `api/schema.ts`, `api/entries.ts`, `migrations/` |
| Routes `@01edu/api`, route SSE `GET/api/events` | `api/routes.ts` |
| Client SSE, `onEvent`, détection de déconnexion | `web/lib/session.ts` |
| OAuth (`StateManager`, cookie de session) | `api/gitea-oauth.ts`, `createSessionResponse` dans `api/routes.ts` |
| File de traitement, tâches planifiées | `api/lib/make-queue.ts`, `setInterval` de `api/matchmaking.ts` |
| Emails | `api/email.ts` |
| Seed | `task-db-seed.ts` |
| Docker multi-stage + `deno compile` | `Dockerfile` |
| Tests de bout en bout | `qa/` |

Différence volontaire : Pamoja compile son CSS avec **Tailwind v4** (`@tailwindcss/cli`),
sans twind ni daisyUI (§12.3).

Lancer le projet : `deno task dev` sur `http://localhost:8800` (port distinct de
Tournament pour faire tourner les deux). esbuild écoute en interne sur 8801 pour
le rechargement automatique : ce n'est pas l'app, elle n'y a pas d'`/api`. Build
de prod : `deno task prod` (le serveur refuse de démarrer sans `APP_ENV=prod`) ;
pour essayer le build de prod sur sa machine : `deno task prod:local`.

## Interface : conventions du socle

- **Référence visuelle** : `docs/prototype/pamoja-v2.dc.html`. Catalogue vivant des
  composants : page `/dev/socle` (comme `/dev/docs` dans Tournament).
- **Thème** : `web/assets/styles/theme.css` est généré (`deno task theme`) ; les
  utilitaires isométriques (`slab`, `key-*`, `well`, `disc`, `tile`, `rail`) sont dans
  `style.css`. Couleurs, textes et reliefs passent par les tokens (`bg-surface-100`,
  `text-ink-muted`, `shadow-slab`) ; la palette par défaut de Tailwind est désactivée.
- **Composants** dans `web/ui/` : `Button` (tailles en pixels du prototype), `Tabs`,
  `Dialog` et `Drawer` (ouverts par `?dialog=id`), `Menu` (popover), `notify()`, états
  `EmptyState`, `LoadingState`, `ErrorState`. Une page est dans `web/pages/` ; un
  composant ne va dans `web/ui/` que s'il sert à plusieurs écrans.
- **Pas de fusion de classes** : jamais deux classes Tailwind sur la même propriété
  (`h-10` et `h-12`) ; une variante passe par une prop.
- **JSX classique** (`h` global, comme Tournament) : ne jamais nommer une variable `h`.
- **Icônes** : importer le nom Lucide depuis `/web/assets/icons.tsx` puis lancer
  `deno task icon` (Lucide figé sur la 0.460 du prototype).
- **Données fictives** dans `web/fixtures/` en attendant l'API ; elles disparaissent
  quand un écran passe sur `api[...].signal()`. Les actions de session modifient les
  objets sur place puis incrémentent un signal (`helpChanged`, `projectsChanged`…).
- **Signaux et re-rendu** : avec `@preact/signals`, un composant qui lit un signal ou
  qui a des hooks ne se re-rend que si ses props ou son état changent. Lire le signal
  dans la page, et ne pas donner à un composant à hooks un objet muté sur place qu'il
  doit afficher (passer des valeurs simples, ou isoler le hook).

## Décisions clés (détail dans le cahier des charges)

- GitHub App **en lecture seule**, repos **publics uniquement**, **aucun token
  utilisateur stocké** ; import en 2 niveaux (vitrine sans installation, synchro live
  avec installation et trois contrôles de droits) — §5.
- Webhooks : `WebhookDelivery` sert de file persistante — §5.5.
- Temps réel : entries `@01edu/db/entries` + SSE ; un type sans `trigger` n'est jamais
  diffusé — §13.
- Réputation calculée uniquement depuis des entries aux `fields` figés — §8.
- Recherche : Meilisearch auto-hébergé, SQLite reste la source de vérité — §10.4.
- Reverse proxy : Caddy (HTTPS, HTTP/2, SSE sans tampon) — §17.4.
- Images uploadées ; vidéos uniquement intégrées par lien (YouTube, Loom, Vimeo) — §17.3.
- CSS : Tailwind v4 seul, sans daisyUI ; thème généré depuis `docs/identite/tokens.json` — §12.3.
- DA : interface entièrement isométrique (dalles, touches, puits, formes par type d'objet, colonnes pour les valeurs), sans illustration décorative hors des plaques (couverture de profil, landing, 404) ; référence visuelle : prototype Pamoja v2 (`docs/prototype/`) — §12.7.
- Routage en vrais chemins (`/@moussa`), jamais de `#` ; profil à une seule adresse `/@login` — §9, §12.2.
- Adresses en anglais (chemins et paramètres, l'interface reste en français) ; ce qui est privé a un id public aléatoire, jamais un numéro qui se suit ni un login (`/messages/<id public>`, `/messages/new/<id GitHub>`) — §12.2, PAM-125.
- IA toujours avec un repli déterministe ; fournisseur encore à choisir — §11, §20.

## Où on en est

Voir `TODO.md`. Au démarrage (J1, 7 octobre), le repo ne contient que la
documentation. Prochaines tâches : PAM-002 (répartir les blocs entre Abdou et niangoos), PAM-003 (valider l'offre Systalink, notamment la
sortie vers `api.github.com` et l'entrée des webhooks), PAM-004, puis PAM-101 à PAM-104
(initialisation et deux prototypes à risque à finir le soir de J1).
