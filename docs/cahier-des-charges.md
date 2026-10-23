# Cahier des charges — Pamoja

Oct 7, 2026 · @Abdou Karim Sow

**Where developers don't just connect. They build together.** Pamoja (« ensemble » en swahili) est une plateforme communautaire et collaborative africaine, pensée pour les développeurs et par les développeurs. Elle construit la couche humaine autour du code : découvrir, s'entraider, reviewer, contribuer, et transformer ce travail réel en réputation.

Ce document est la version de référence. Les faits techniques ont été vérifiés dans le code de Tournament et dans le code source de `@01edu/api` 0.2.10 et `@01edu/db`. Ce qui n'a pas pu l'être est listé dans les points ouverts.

## 1. Vision et positionnement

L'activité d'un développeur est dispersée : le code sur GitHub, les discussions sur Discord ou Slack, les questions sur Stack Overflow, l'organisation sur Trello ou Linear, la visibilité sur LinkedIn. Aucun outil ne montre comment un développeur construit avec les autres.

Le produit s'organise autour de deux objets : **Developer** et **Project**. Toutes les interactions relient les deux.

**Promesse** : *Meet developers. Build together. Let your work speak for you.* La plateforme transforme Post / Like / Follow en Build / Help / Review / Contribute / Mentor / Ship, puis transforme ces actions en réputation, visibilité et opportunités.

**Boucle principale** : Discover → Connect → Help → Collaborate → Build → Ship → Prove → Get discovered.

**Positionnement** : *Developer Collaboration Network*, avec pour vision long terme un *Developer Collaboration OS*. Ce n'est ni un GitHub, ni un LinkedIn, ni un Trello, ni un Reddit, ni un Stack Overflow bis. GitHub reste l'infrastructure du code ; la plateforme ajoute le contexte, la découverte, le matching, la collaboration et la réputation.

**Angle africain** : il est visible dans l'expérience, pas seulement dans le branding. Développeurs par pays, communautés par pays, projets africains, collaborations transfrontalières (Collaboration Map, badge Cross-border Builder).

**Principes produit**

- **Build > Scroll** : on optimise l'aide, les reviews et les contributions, pas les likes ni le temps passé.
- **Collaboration > Connection** : une contribution commune vaut plus qu'un follow.
- **Evidence > Claims** : « 8 reviews vérifiées en Go » vaut plus que « expert Go ».
- **Realtime invisible** : l'utilisateur voit les notifications et les mises à jour arriver, sans y penser.
- **Infrastructure simple d'abord** : une instance Deno, SQLite, SSE. Pas de microservices, Kafka, Redis ni Kubernetes tant que le produit n'en a pas besoin.

## 2. Décisions arrêtées

Ces choix ne sont plus en discussion. Toute la suite du document en découle.

| Sujet | Décision | Raison |
| --- | --- | --- |
| Périmètre | Toutes les fonctionnalités sont livrées, dans un ordre de construction, avec critères d'acceptation et deux niveaux de finition (§4) | Objectif : gagner CADEV ; stack maîtrisée grâce à Tournament |
| Repositories | Publics uniquement | Aucun accès à gérer, aucune donnée privée à protéger |
| Identité GitHub | Une GitHub App en lecture seule, pour le login et les webhooks | Permissions fines, un seul endpoint webhook |
| Tokens GitHub | Aucun token utilisateur stocké en base | Le login n'en a besoin que quelques secondes ; la synchro utilise des tokens serveur |
| Import | Deux niveaux : vitrine sans installation, synchro live avec installation | Présenter un projet en 3 clics |
| Build | esbuild + `@luca/esbuild-deno-loader`, comme Tournament | Setup déjà éprouvé en production |
| UI | Tailwind CSS v4 compilé, sans daisyUI ; système isométrique maison en utilitaires et composants Preact | Le système isométrique rend tous les composants sur mesure ; une dépendance de moins (§12.3) |
| Base de données | SQLite via `@01edu/db`, une seule instance | Suffisant pour CADEV, migration PostgreSQL seulement si nécessaire |
| Temps réel | Entries `@01edu/db/entries` + SSE, écritures en HTTP | Mécanisme déjà en production dans Tournament |
| Réputation | Calculée uniquement depuis le journal d'entries, jamais depuis une déclaration | Badges vérifiables |
| Langue de l'interface | Français par défaut, au tutoiement ; anglais au choix, dans les réglages ou par le bouton de l'en-tête, la langue du système s'appliquant tant qu'aucune n'est choisie ; les deux signatures de marque (*Your work is your profile*, *Where developers don't just connect. They build together.*) restent en anglais | Choix de l'équipe, ouvert aux développeurs non francophones. Le français est la langue du code : chaque phrase de l'interface est la clé de son anglais (`web/lib/english.ts`), une phrase avec des valeurs s'écrit ``t`…` `` et seules ses parties fixes sont traduites. Ce que les développeurs écrivent (noms, titres, posts, messages, descriptions) n'est jamais traduit. Les libellés cités en anglais dans ce document (scénario du §18, exemples) sont traduits dans l'interface française ; les canaux s'appellent `#général`, `#suivi`, `#aide`, `#annonces` (`#general`, `#tracking`, `#help`, `#announcements` en anglais) |
| Identité visuelle | Design system Pamoja + prototype Pamoja v2 : le fil indigo, une interface entièrement isométrique (dalles, touches, puits, formes par type d'objet) | Un style reconnaissable, où formes et volumes encodent les objets et leurs valeurs |
| Référence d'interface | Prototype Pamoja v2 (`docs/prototype/`) | Écrans et parcours validés ; ses écarts avec ce document sont tranchés ici |
| Routage | Vrais chemins (`/@moussa`, `/projet/openpay-africa`), jamais de `#` | Le serveur doit voir l'adresse pour servir l'aperçu de partage (§17.1) |
| IA | Utilisée, toujours avec un repli déterministe | La plateforme fonctionne sans IA |
| Matching | Score SQL déterministe et explicable, enrichi par embeddings | Chaque match affiche ses raisons |
| Organisation d'un projet | Quatre canaux imposés : `#général`, `#suivi` (alertes GitHub et CI/CD), `#aide`, `#annonces` | Lisible comme Discord, sans canaux vides ; les alertes mènent à la boucle d'aide |
| Recherche | Meilisearch auto-hébergé, alimenté depuis les entries ; SQLite reste la source de vérité | Recherche instantanée, tolérance aux fautes, filtres |
| Reverse proxy | Caddy | HTTPS automatique, HTTP/2 par défaut, SSE transmis sans tampon |
| Hébergement | Systalink : une VM avec Docker, Caddy, l'app, SQLite et Meilisearch | Imposé par CADEV ; cloud souverain, données au Sénégal |
| Calendrier et équipe | 10 jours (7 – 16 octobre 2026), deux développeurs : Abdou et niangoos | Cadre du concours |

## 3. Utilisateurs et rôles

Un compte = un utilisateur GitHub. Les rôles de projet sont portés par `ProjectMember.role`, les rôles de communauté par `CommunityMember.role`.

| Rôle | Portée | Peut |
| --- | --- | --- |
| Developer | Plateforme | Se connecter, personnaliser son profil, publier, commenter, rejoindre communautés et projets, demander et apporter de l'aide, reviewer, gagner des badges |
| Owner | Projet | Tout ce que fait un Maintainer + importer le repo, activer la synchro live, gérer les rôles, supprimer le projet |
| Maintainer | Projet | Gérer les besoins, le Board et la Roadmap, accepter les candidatures, assigner des tâches, créer des demandes d'aide pour le projet |
| Contributor | Projet | Prendre des tâches, écrire dans `#général` et `#aide`, apparaître dans l'équipe |
| Reviewer | Projet | Comme Contributor, spécialisé dans les reviews |
| Observer | Projet | Suivre le projet, lire `#suivi` et `#annonces` |
| Moderator | Communauté | Gérer les membres et les publications, appliquer les règles |

Chaque route vérifie le rôle côté serveur. Le client n'affiche ou ne masque les actions qu'à titre d'ergonomie.

## 4. Périmètre et ordre de construction

Toutes les fonctionnalités sont dans le périmètre. Elles sont construites dans un ordre imposé par leurs dépendances : presque tout lit les entries, donc les fondations passent en premier, et la boucle de démo est terminée avant les fonctionnalités qui ne font que l'enrichir.

**Cadre** : 10 jours, du mercredi 7 au vendredi 16 octobre 2026, avec deux développeurs (Abdou et niangoos) assistés de Claude Code. Le bloc 1 passe en premier ; ensuite, les blocs avancent en parallèle selon la répartition, la boucle de démo restant prioritaire ; le suivi détaillé se fait dans `TODO.md` à la racine du repo.

| Bloc | Contenu | Dépend de | Jours |
| --- | --- | --- | --- |
| 1. Fondations | Projet Deno, build esbuild + Tailwind, schéma et migrations, liste des entries et relations, flux SSE, login GitHub App, session, seed, Caddy et conteneur Meilisearch | — | J1 – J2 (7 – 8 oct.) |
| 2. Boucle de démo | Profil de base, import niveaux 1 et 2, webhooks, demande d'aide, matching, notifications temps réel, détection de review, confirmation, badges | 1 | J3 – J5 (9 – 11 oct.) |
| 3. Vitrines | Profil complet et thèmes, Passport, Share Card, OG, Pulse (déterministe + IA), Project DNA, Health, Story, Collaboration Map et Graph | 1, entries du bloc 2 | J6 – J7 (12 – 13 oct.) |
| 4. Gestion de projet | Needs, Team et candidatures, Board, Roadmap, canaux du projet et `#suivi`, présence, Collaboration Requests | 1 | J8 (14 oct.) |
| 5. Social et découverte | Accueil en fil social (republications, abonnements, réponses imbriquées), Communities, Explore, Search, Smart Contribution Discovery, messages directs, préférences et digest | 1 | J9 (15 oct.) |
| Gel | Plus de nouvelles fonctionnalités : seed final, répétitions de la démo en prod, corrections | Tout | J10 (16 oct.) |

Règles d'équipe :

- **Chaque fonctionnalité écrit ses entries dès le premier jour.** Sans entries, les vitrines, le Pulse et les badges n'ont rien à afficher.
- **Chaque page livrée a ses trois états** : vide, chargement, erreur. Le prototype n'a presque que des états vides ; le code les a tous.
- **Deux développeurs, un responsable par bloc.** La répartition est notée dans `TODO.md`. Chaque PR est relue et approuvée par l'autre développeur avant d'être mergée. Chaque soir, l'avancement est comparé au planning de `TODO.md`. Un retard sur le bloc 2 se rattrape avant de commencer le bloc suivant ; un retard sur les blocs 3 à 5 laisse leurs fonctionnalités au niveau *fonctionnel*.
- **La boucle de démo (bloc 2) est prioritaire** sur tout le reste en cas de retard.

**Deux niveaux de finition.** Rien n'est retiré du périmètre ; ce qui varie, c'est le degré de finition.

- **Fonctionnel** : la fonctionnalité fait son travail, avec les règles métier et les cas limites, sur une interface propre mais sans polish.
- **Démo** : écran maquetté, animé, responsive, testé de bout en bout. Seuls les écrans du scénario de démo (§18) visent ce niveau : profil, page projet, Pulse, demande d'aide, notification, Share Card.

En cas de retard sur un bloc, ses fonctionnalités restent au niveau *fonctionnel* ; on ne les supprime pas.

**Critères d'acceptation.** Un bloc est terminé quand tous ses critères sont vérifiés sur l'environnement de production.

| Bloc | Critères d'acceptation |
| --- | --- |
| 1. Fondations | Login GitHub de bout en bout en prod via Caddy (protocole `h2` visible) ; une entry insérée côté serveur arrive dans un autre navigateur en moins d'1 s ; `PRAGMA foreign_keys` et `busy_timeout` actifs au démarrage ; seed rejouable en une commande ; Meilisearch répond depuis l'app et n'est pas joignable depuis l'extérieur ; toutes les routes en vrais chemins, sans `#`, et `/@login` ouvert sans connexion renvoie la page avec ses balises OG |
| 2. Boucle de démo | Import niveau 1 en 3 clics ; une review GitHub réelle fait passer la demande en `review_submitted` en moins de 10 s ; un webhook reçu pendant un redémarrage est traité après la reprise ; deux acceptations simultanées n'en retiennent qu'une ; la confirmation met à jour le badge du profil sans rafraîchir |
| 3. Vitrines | Un lien `/@username` collé dans WhatsApp et LinkedIn affiche l'aperçu avec la Share Card ; chaque chiffre du profil mène à ses preuves ; le Pulse s'affiche même IA coupée |
| 4. Gestion de projet | Deux utilisateurs déplacent des cartes en même temps sans perte ; une PR mergée déplace sa carte en Done ; une candidature s'accepte depuis la notification ; une CI en échec apparaît dans `#suivi` et devient une demande d'aide en un clic |
| 5. Social et découverte | Recherche tolérante aux fautes (« postgress » trouve PostgreSQL) ; la recherche reste utilisable Meilisearch arrêté ; un contenu signalé puis masqué disparaît pour tous sauf son auteur ; une réponse à une réponse s'affiche imbriquée et se déplie à la demande ; une republication apparaît dans le fil des abonnés ; un message direct arrive chez l'autre sans rafraîchir ; le premier message d'un inconnu arrive en demande, jamais directement |

Hors périmètre : repos privés, GitLab, Bitbucket, voix, vidéo, partage d'écran, curseurs collaboratifs, application mobile native, API publique.

## 5. GitHub : authentification, import, synchronisation

Une seule GitHub App, en lecture seule, sert à la connexion et aux webhooks. Seuls les repos publics sont gérés. GitHub reste la source de vérité du code, des PRs, des issues et des releases ; la plateforme en garde une copie locale pour l'affichage.

### 5.1 Configuration de la GitHub App

- **App publique** (« Any account », onglet Advanced → Make public) : une app privée n'accepte que le compte qui la possède, pour la connexion comme pour l'installation, et GitHub répond 404 à tous les autres. Le second développeur, Moussa et le jury en ont besoin. Publique ne veut pas dire listée sur le Marketplace.
- **Permissions de repository**, toutes en lecture : Metadata, Contents, Issues, Pull requests, Actions, Checks, Commit statuses (les trois dernières pour les alertes CI/CD de `#suivi`, §6.8).
- **Permission de compte** : Email addresses en lecture, facultative (sans elle, seul l'email public est connu ; l'email n'est jamais obligatoire).
- **Événements webhook** : `installation`, `installation_repositories`, `push`, `pull_request`, `pull_request_review`, `issues`, `issue_comment`, `release`, `workflow_run`, `check_run`, `status`.
- **Callback URL** : `/connexion/github` du frontend. Avec l'option ci-dessous, GitHub désactive la **Setup URL** et renvoie aussi le retour d'installation sur la Callback URL, avec `code`, `installation_id` et `setup_action` : la page distingue les deux cas par `installation_id`.
- Option **« Request user authorization (OAuth) during installation »** activée : l'installation renvoie aussi un `code`, ce qui permet de vérifier qui a installé (§5.4).

### 5.2 Tokens et secrets

Aucun token utilisateur n'est stocké. Les appels serveur utilisent des tokens serveur.

| Usage | Moyen | Stocké en base |
| --- | --- | --- |
| Login | Token utilisateur obtenu avec le `code`, utilisé pour lire `GET /user`, puis jeté | Non |
| Import niveau 1 et rafraîchissement périodique | Token d'un compte bot de l'équipe (fine-grained, lecture des repos publics) | Non : variable d'environnement |
| Synchro niveau 2 | Token d'installation généré à la demande depuis la clé privée de l'app, valable 1 h, gardé en mémoire | Non |
| Webhooks | Signature HMAC SHA-256 vérifiée avec le secret webhook | Non |

Réglages de l'app : `GITHUB_APP_SLUG` (son nom dans l'URL, qui donne la page d'installation) et `GITHUB_APP_ID`. Secrets en variables d'environnement : `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_BOT_TOKEN`, et `SESSION_SECRET`, qui signe les cookies de session (§5.3). En dev, ils vont dans `.env-local`, ignoré par git et lu par `deno task dev` après `.env-dev`. Pourquoi un token bot : sans authentification, l'API GitHub est limitée à 60 requêtes par heure, ce qui ne suffit pas.

### 5.3 Connexion

1. Le frontend appelle `GET/api/auth/github`, qui génère un `state` et renvoie l'URL d'autorisation GitHub. Contrairement au `StateManager` de Tournament, gardé en mémoire, le `state` est signé (HMAC avec `SESSION_SECRET`) et daté, valable 10 minutes : un redémarrage du serveur pendant que le développeur est sur GitHub ne casse plus la connexion, ce qui arrivait avec `deno task dev`, qui relance le serveur à chaque modification. Un cookie `oauth_nonce` de 10 minutes le lie au navigateur qui est parti : un lien de retour avec le code d'un autre compte ne connecte personne. Un `state` ne sert qu'une fois. En cas de refus, la page dit pourquoi (expiré, autre navigateur, déjà utilisé, code refusé par GitHub) et le serveur le note (`github-state-refused`). L'installation de l'app (§5.4) suit les mêmes règles.
2. GitHub redirige vers la page frontend de callback, `/connexion/github`, avec `code` et `state`. La page demandée avant la connexion est gardée dans `sessionStorage` pendant l'aller-retour.
3. Le frontend envoie `POST/api/auth/github/callback` avec `code` et `state`.
4. Le serveur vérifie le `state`, échange le `code`, lit `GET /user`, crée ou retrouve l'utilisateur par `githubId`, jette le token. Au premier login, il crée `User` (`source = github`) et `Profile`, pré-remplis avec tout ce que GitHub donne : nom affiché (le nom GitHub, sinon le login), photo, bio, site, ville et pays lus dans la localisation (« Dakar, Senegal » donne Dakar et `SN`), e-mail principal (`GET /user/emails`, si la permission est accordée), et les langages des repos publics, hors forks, en `UserSkill` de source `github`. L'onboarding suit. Aux logins suivants, il met à jour le login et la photo, ajoute les nouveaux langages, et complète les champs encore vides tant que le développeur n'a jamais enregistré son profil : un champ vidé exprès reste vide.
5. Le serveur pose le cookie `session` : `httpOnly`, `secure`, `SameSite=Lax`, comme `createSessionResponse` dans Tournament.

**Session.** Comme dans Tournament, une session est une entry `USER_LOGIN` ; le cookie contient son id, signé en HMAC SHA-256. Tournament signe avec le sel du mot de passe ; Pamoja n'a pas de mot de passe et signe avec `SESSION_SECRET`. Une session vaut 30 jours, vérifiés côté serveur avec `createdAt` de l'entry et pas seulement par l'expiration du cookie. `POST/api/auth/logout` archive l'entry : le cookie ne vaut plus rien, même copié.

**En dev, sans GitHub App.** Si `GITHUB_CLIENT_ID` est absent hors production, `GET/api/auth/github` renvoie directement vers `/connexion/github` avec un code de démonstration, et le serveur connecte le compte `abdou` (`source = demo`) sans appeler GitHub. Chacun peut ainsi travailler sans les secrets de l'app. En production, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` et `SESSION_SECRET` sont obligatoires : le serveur refuse de démarrer sans eux.

L'utilisateur peut utiliser toute la plateforme sans jamais installer l'app.

### 5.4 Import d'un projet

**Niveau 1 — vitrine, sans installation**

1. « + Create » → « Import from GitHub ».
2. La plateforme liste les repos publics de l'utilisateur (`GET /users/{username}/repos` avec le token bot).
3. L'utilisateur en choisit un. Sont récupérés : nom, description, README, langages, topics, stars, forks, contributeurs, issues et PRs ouvertes, dernière release.
4. L'IA propose skills et besoins (§11) ; l'utilisateur valide. Le projet est en ligne.
5. Synchro par rafraîchissement toutes les 15 minutes avec requêtes conditionnelles (`syncMode = poll`).

En pratique (`api/import.ts`) : la liste exclut les forks et les repos privés ; l'aperçu (`GET/api/github/repository`) lit le repo, ses langages, son README, sa dernière release, le nombre de contributeurs et de PRs ouvertes ; tant que l'IA n'est pas branchée (PAM-310), les skills proposés sont ceux des langages et des topics, ramenés au vocabulaire par `SkillAlias`. L'import relit tout côté serveur, sans croire la page, puis crée `Project`, le membre owner, `Repository` (README et chiffres compris), les issues et PRs ouvertes, et l'entry `PROJECT_CREATED`. Le rafraîchissement (`api/sync.ts`) relit toutes les 15 minutes, en requêtes conditionnelles, le repo, ses issues et ses PRs triées par mise à jour ; une réponse 304 ne change rien, une nouveauté produit `PROJECT_UPDATED` pour que les pages ouvertes se mettent à jour. Le serveur regarde chaque minute, dès son démarrage, quels repos sont dus : 15 minutes après leur dernière lecture, une heure pour un repo live (§5.6). Un redémarrage (`deno task dev` repart à chaque fichier modifié, un déploiement) ne repousse donc plus la lecture.

Seul le propriétaire d'un repo personnel peut l'importer au niveau 1. Un repo d'organisation s'importe par le niveau 2 : l'installation, réservée aux owners de l'organisation et aux admins du repo, prouve le droit de l'importer.

**Niveau 2 — synchro live, avec installation**

1. Redirection vers la page d'installation de l'app, l'utilisateur coche le repo.
2. GitHub le renvoie sur la Setup URL avec `installation_id`, `setup_action` et `code`.
3. Le frontend envoie `POST/api/github/installation/confirm`. Le serveur échange le `code` contre un token utilisateur temporaire et vérifie **trois choses**, toutes obligatoires :
   1. **Identité** : `GET /user` renvoie le `githubId` du compte connecté sur la plateforme.
   2. **Couverture** : `GET /user/installations/{installation_id}/repositories` contient ce repo précis.
   3. **Droit** : `GET /repos/{owner}/{repo}` renvoie `permissions.admin` ou `permissions.maintain` à `true` pour cet utilisateur.
4. Le token est jeté. Si les trois contrôles passent, le repo passe en `syncMode = live` et l'installation est enregistrée (`GithubInstallation`) ; sinon, la page montre le contrôle en échec et comment y remédier.

En pratique (`api/installation.ts`) : `GET/api/github/installation/start` donne la page d'installation avec un `state` qui garde, côté serveur, le développeur et le projet ; seul le propriétaire du projet la demande. Au retour, `setup_action = request` signifie qu'un membre d'organisation a seulement demandé l'installation à ses owners : la page l'explique. Le passage automatique en live, à l'import, interroge GitHub avec un JWT de l'app (`GET /repos/{owner}/{repo}/installation`, signé par `GITHUB_APP_PRIVATE_KEY`) ; sans clé, en dev, il est sauté. Les repos en live sont relus toutes les heures en plus de leurs webhooks (§5.6). En dev sans GitHub App, le parcours est simulé comme le login (§5.3).

Pourquoi trois contrôles : `GET /user/installations` liste aussi les installations auxquelles l'utilisateur n'a qu'un accès en lecture. Y figurer ne prouve pas qu'on administre le repo.

Passage automatique en live : si le repo importé est déjà couvert par une installation connue (événements `installation` et `installation_repositories`), l'import passe directement en `syncMode = live` **seulement si** l'importeur est le propriétaire du repo personnel. Pour un repo d'organisation, les trois contrôles ci-dessus restent obligatoires.

Sur un repo d'organisation, seuls un owner de l'organisation ou un admin du repo peuvent installer l'app ; un simple membre peut seulement en faire la demande.

### 5.5 Webhooks

La route `POST/api/github/webhook` est déclarée **sans `input`** : le routeur de `@01edu/api` ne lit alors pas le corps, et le handler peut lire le corps brut avec `ctx.req.text()` (vérifié dans `router.ts`). Elle n'a pas d'`authorize`. Traitement :

1. Lire le corps brut et vérifier `X-Hub-Signature-256` (HMAC SHA-256, comparaison en temps constant). Refuser sinon.
2. Insérer la livraison dans `WebhookDelivery` avec `githubDeliveryId` (UNIQUE), l'événement, le **payload complet** et `status = received`. Une livraison déjà connue n'est pas réinsérée.
3. Répondre 202 immédiatement. GitHub attend une réponse en moins de 10 secondes.
4. Un worker prend les livraisons `received`, les passe en `processing`, met à jour SQLite et insère les entries dans **une seule transaction**, puis passe en `done`. En cas d'erreur : `attempts + 1`, `lastError`, nouvel essai avec délai croissant ; après 5 échecs, `failed` et alerte dans les logs.

`WebhookDelivery` **est la file** : elle survit aux redémarrages. Au démarrage, le worker reprend les livraisons `received` et celles restées en `processing` depuis plus de 2 minutes. Le traitement est idempotent (mise à jour par `githubId`, entries créées une seule fois par livraison), donc le rejouer est sans effet de bord. « Reçu » et « traité avec succès » sont deux statuts distincts.

En pratique (`api/webhooks.ts`) : sans `GITHUB_WEBHOOK_SECRET`, toute livraison est refusée. Le worker tourne toutes les 5 secondes et dès qu'une livraison arrive ; les nouveaux essais attendent 10, 20, 40 puis 80 secondes. Chaque événement a son handler, enregistré par `registerHandler` (PAM-205) ; `ping`, envoyé par GitHub à la configuration du webhook, n'a rien à appliquer, et un événement sans handler est marqué traité et ignoré. Un handler est synchrone, sans appel à GitHub, puisqu'il s'exécute dans la transaction de la livraison.

**Événements traités** (`api/github-events.ts`) ; un événement d'un repo absent de Pamoja est ignoré, et l'auteur n'est rattaché à une entry que s'il est sur Pamoja (par `githubId`) :

- `pull_request` : la PR, lignes ajoutées et supprimées comprises ; `PR_OPENED` (ouverte, rouverte), `PR_UPDATED` (titre, brouillon), `PR_CLOSED`, et `PR_MERGED`, preuve aux champs figés (§8.3) avec `authorIsOwner`.
- `pull_request_review` : la review et `PR_REVIEWED`. Le webhook donne le texte de la review, pas ses commentaires en ligne : un texte compte pour un commentaire, et la vérification d'une demande d'aide (PAM-211) lit le compte exact.
- `issues` : l'issue, et `ISSUE_UPDATED` à l'ouverture, la fermeture et la réouverture ; `issue_comment` met à jour le nombre de commentaires.
- `release` (publiée) : la release du repo et `RELEASE_PUBLISHED`, preuve de Project Building pour l'owner.
- `push` : `COMMITS_PUSHED`, un par push, avec le nombre de commits et les trois derniers messages ; une branche supprimée ne pousse rien.
- `workflow_run`, `check_run`, `status` : `CiRun` ; `CI_FAILED` sur un échec, `CI_FIXED` quand le même job repasse au vert sur la même branche, seulement sur la branche principale et sur les branches de PR ouvertes. Les check runs de GitHub Actions sont ignorés : `workflow_run` les couvre déjà.
- `installation`, `installation_repositories` : l'installation ; un repo personnel couvert par le compte de l'owner du projet passe en live, un repo retiré ou une installation supprimée revient à la synchro par rafraîchissement.

### 5.6 Fiabilité et quota

- **Resynchronisation** : GitHub ne garantit pas la livraison des webhooks. Une tâche périodique (`setInterval`, comme `api/matchmaking.ts`) réconcilie PRs, issues et métadonnées des projets actifs toutes les heures.
- **Quota** : 5 000 requêtes par heure et par token. Cache local, `lastSyncedAt`, ETag et requêtes conditionnelles : une réponse 304 ne compte pas dans le quota. L'import passe par l'API REST : une dizaine de requêtes par repo, et les mêmes chemins se relisent ensuite en conditionnel, ce que GraphQL ne permet pas. Jamais d'appel GitHub pendant l'affichage d'une page.
- **Board** : synchro en sens unique, GitHub → plateforme. L'app étant en lecture seule, la plateforme n'écrit jamais sur GitHub.
- **Erreurs** : une erreur de GitHub n'est pas un bug de Pamoja ; la route répond 503 quand le quota est épuisé (il revient dans l'heure), 502 sinon, jamais 500.
- **Dev local** : `deno task tunnel` (`task-tunnel.ts`) ouvre un tunnel rapide `cloudflared`, sans compte, vers le serveur de dev, et pointe le webhook de l'app sur son adresse (`PATCH /app/hook/config`, avec le JWT de l'app) ; l'adresse change à chaque démarrage. Pas smee.io : il réécrit le JSON, ce qui peut casser la signature. L'app est partagée : le dernier développeur à ouvrir un tunnel reçoit les webhooks. GitHub ne renvoie pas de lui-même un webhook qui a échoué : à l'ouverture, une fois le tunnel et le serveur de dev joignables, le tunnel renvoie les livraisons des 3 derniers jours qui ne sont jamais arrivées (aucune tentative réussie, la dernière sans réponse ou en 5xx), de la plus ancienne à la plus récente (`api/webhook-replay.ts`, le « Redeliver » des réglages de l'app). Les identifiants de livraison dépassent la précision d'un nombre JavaScript : ils sont lus comme du texte. Une fois la production en ligne, le tunnel détournerait ses webhooks : il faudra alors une app réservée au dev.

## 6. Onboarding, Home et projets

### 6.1 Onboarding (moins de 2 minutes)

1. **Continue with GitHub** (§5.3).
2. **Profil** pré-rempli depuis GitHub (avatar, nom, username, bio, localisation), à compléter : headline, pays, ville, site web.
3. **Skills** : domaines (Backend, Frontend, Mobile, DevOps, Cloud, AI/ML, Blockchain, Data, Cybersecurity, Game Development, UI Engineering) et technologies, choisies dans un vocabulaire contrôlé. Les langages GitHub sont proposés automatiquement via `SkillAlias`.
4. **Intentions** : Find projects, Find contributors, Review code, Get code reviews, Help developers, Contribute to open source, Mentor, Find a mentor, Build projects, Find collaborators. Elles alimentent le matching. C'est la seule liste d'intentions : celles choisies ici s'affichent sur les cartes développeur et servent de filtre dans Explore.
5. **Import** d'un premier projet, facultatif.

Vocabulaire contrôlé : « Postgres », « postgresql » et « PG » pointent tous vers le skill `postgresql`. Les listes (technologies avec leurs alias, dont les noms de langages GitHub, domaines, intentions, pays) vivent dans `api/vocabulary.ts`, partagé par le serveur et le web ; le serveur charge `Skill` et `SkillAlias` au démarrage. Les domaines sont des `Skill` de catégorie `domain`. `Profile.country` garde le code ISO d'un pays africain, ou le pays tel qu'écrit pour les autres. Un utilisateur ne crée pas de skill ; il en suggère un, validé par un admin.

Une compétence a trois sources possibles, affichées séparément : `declared`, `github` (langages des repos), `platform_activity` (reviews et aides confirmées).

### 6.2 Navigation et Accueil

Navigation : Accueil, Explorer, Projets, Aide, Communautés, Notifications, Profil. Action globale **+ Créer** : Post, Projet, Demande d'aide, Communauté. Recherche centrée dans l'en-tête (⌘K / Ctrl+K). **Pas d'en-tête de page qui répète la navigation** (ni fil d'Ariane, ni titre qui redit le nom de la page). Menu de l'avatar : profil, réglages, Modération (modérateurs uniquement), déconnexion.

Sans session, `/` est la landing (le produit en une page, « Continuer avec GitHub ») et `/@login` le passeport (§9) ; les autres pages de l'app demandent d'abord la connexion, puis s'ouvrent. Une adresse qui ne mène nulle part affiche la page 404, avec ou sans session.

**L'Accueil est un fil social**, construit pour faire construire (*Build > Scroll*) :

- **Rédaction** en haut : texte, code, images, communauté, type de post. Une demande d'aide ne se publie pas ici : elle passe par son formulaire (§7.1).
- **Onglets** : Pour toi, Abonnements, Communautés, Questions.
- **Insertions** : les événements GitHub des projets de l'utilisateur, et une carte « Ce projet a besoin de toi » en 2ᵉ position quand une demande lui correspond.
- **Colonne de droite**, à défilement indépendant : demandes d'aide pour toi, PRs à relire, avec qui construire, projets qui cherchent des contributeurs.
- Le fil remplace la « discussion tendance » : les posts les plus actifs remontent dans Pour toi.

### 6.3 Page projet

En-tête : nom, description, technologies, lien GitHub, puis contributeurs, issues ouvertes, PRs ouvertes, demandes d'aide ouvertes, et les actions Follow, Offer help, Join.

Onglets : Overview, Pulse, Canaux (§6.8), Pull Requests, Issues, Team, Activity, Board, Roadmap. L'Overview répond à : qu'est-ce que c'est, que se passe-t-il, qui construit, de quoi a-t-il besoin, puis-je aider.

L'Overview affiche aussi une **galerie** (jusqu'à 8 captures d'écran) et une **vidéo de démo** intégrée par lien (§17.3).

Un projet peut aussi être créé sans repo (« Create from scratch » : nom, description, vision, technologies, visibilité, besoins) et connecté à un repo plus tard.

### 6.4 Project Pulse (feature phare)

Comprendre un projet en quelques secondes. Deux couches :

- **Pulse déterministe** (toujours affiché) : sur les 7 derniers jours, ou depuis la dernière visite, compte des PRs mergées, issues fermées, contributeurs arrivés, reviews demandées, PRs en attente de review, releases. Calculé par requêtes sur les entries et les données GitHub synchronisées.
- **Résumé IA** (3 à 5 phrases) : « Le développement est actif. Le principal goulot est la review. » Pré-calculé (§11). Absent si l'IA ne répond pas, sans casser la page.

### 6.5 Project DNA, Health et Story

- **DNA** : répartition des langages (données GitHub), domaines du projet (Backend, Frontend, Testing, DevOps, Documentation, déduits des fichiers et labels), besoins principaux.
- **Health** : indicateurs lisibles, chacun avec sa règle affichée au survol. Activité (commits et PRs sur 14 jours), vélocité des PRs (délai médian avant merge), PRs en attente de review, bloqueurs (issues label `blocked`), évolution des contributeurs, documentation (présence et taille du README). Pas de score global opaque.
- **Story** : frise des moments marquants, générée depuis les entries : création, premier contributeur, première collaboration transfrontalière, releases, paliers de contributeurs.

### 6.6 Needs, Team et candidatures

- **Needs** : chaque besoin a un type, des skills requis, une description et un statut. Ils alimentent le matching et « This project needs you ».
- **Join project** : formulaire (comment aider : Backend, Frontend, Testing, DevOps, Documentation ; disponibilité ; message). L'Owner ou un Maintainer reçoit la notification en temps réel et accepte ou refuse directement depuis elle. Si accepté : membre ajouté avec un rôle, entry `PROJECT_MEMBER_JOINED`.
- **Aucun accès GitHub à donner** : les repos sont publics, un contributeur passe par un fork et une PR.
- **People who could help** : le matching (§7) propose des développeurs pour chaque besoin ouvert.

### 6.7 Board et Roadmap

- **Board** : Kanban à 5 colonnes (Backlog, Ready, In progress, Review, Done). Une carte est une tâche interne, ou liée à une issue ou une PR GitHub (lecture seule côté GitHub). Une PR mergée déplace sa carte en Done. Ordre des cartes par rang fractionnaire (§14) pour que deux personnes puissent déplacer des cartes en même temps. Chaque déplacement produit une entry et rafraîchit le Board des autres en temps réel.
- **Roadmap** : milestones (titre, description, statut Done / Active / Planned, objectifs), auxquels on rattache tâches et issues. Progression = tâches terminées / tâches du milestone.

### 6.8 Canaux du projet et présence

Chaque projet est organisé comme un serveur Discord, avec **quatre canaux imposés**. On ne peut ni en créer, ni en supprimer, ni en renommer : un petit projet n'a pas de canaux vides, et tous les projets se lisent de la même façon.

| Canal | Qui écrit | Qui lit | Contenu |
| --- | --- | --- | --- |
| `#général` | Membres | Membres | Discussion libre de l'équipe |
| `#suivi` | La plateforme uniquement (les membres répondent en fil) | Membres et abonnés | Alertes GitHub et CI/CD, en temps réel |
| `#aide` | Membres et plateforme | Membres | Demandes d'aide du projet, leurs changements d'état et leurs échanges |
| `#annonces` | Owner et Maintainers | Membres et abonnés | Releases, nouveaux besoins, arrivées dans l'équipe |

**Messages** : Markdown avec une image ou une vidéo intégrée par lien (§17.3), réactions, réponses en **fil de discussion** sous un message ou sous une alerte. Stockés dans `ProjectMessage` ; chaque message produit une entry `MESSAGE_CREATED`. Pas de voix ni de vidéo en direct.

**`#suivi`** n'a pas de stockage propre : c'est l'affichage des entries produites par les webhooks et la synchro (§5.5, §13.3). Alertes affichées :

- PR ouverte, review soumise (approuvée ou changements demandés), PR mergée ou fermée ;
- CI en échec, puis « CI réparée » quand elle repasse au vert, sur la branche principale et sur les PRs ouvertes (GitHub Actions via `workflow_run`, autres outils via `check_run` et `status`) ;
- PR sans review depuis 2 jours (vérification planifiée) ;
- release publiée ; issue ouverte ou fermée ;
- pushes regroupés (« 3 commits sur main ») pour éviter le bruit.

**Alertes actionnables** : une alerte ne fait pas qu'informer, elle mène à la boucle d'aide (§7).

- « CI en échec » → bouton **Demander de l'aide**, qui crée une demande Debugging pré-remplie (PR, branche, lien du job en échec).
- « PR sans review depuis 2 jours » → bouton **Demander une review**, qui ouvre « Request Review » sur cette PR.

**Non lus et notifications** : compteur de messages non lus par canal. Chaque membre règle chaque canal : tout, mentions seulement, rien ; pour `#suivi`, une option « seulement mes PRs ». Par défaut, `#suivi` est réglé sur « seulement mes PRs ».

**Limite** : pour un projet en synchro par rafraîchissement (niveau 1, §5.4), `#suivi` se met à jour toutes les 15 minutes. Le temps réel suppose la synchro live.

- **Présence** : « 5 developers active », avec un état léger (viewing project, viewing PR, working on task). En mémoire uniquement (§13), jamais en entries.

## 7. Demandes d'aide, matching, notifications et reviews

C'est le cœur du produit et de la démo : un besoin précis est poussé automatiquement vers les bons développeurs, et l'aide apportée devient de la réputation vérifiée.

### 7.1 Demande d'aide

Types : Code Review, Debugging, Architecture, Security, Testing, DevOps, UI/UX, Documentation, Pair Programming, Mentorship, Contributor Search.

Champs : titre, description (Markdown), jusqu'à 4 captures d'écran, un lien vidéo facultatif (par exemple un Loom qui montre le bug), type, projet et PR GitHub optionnels, skills requis (vocabulaire contrôlé), niveau attendu, durée estimée. Depuis une PR, le bouton **Request Review** pré-remplit projet, repo, PR et skills (langages des fichiers modifiés).

Règles de la création :

- **Skills d'une PR** : le serveur lit les fichiers modifiés des PRs ouvertes après la synchro qui apporte leur commit de tête (import, rafraîchissement, webhook), jamais pendant l'affichage (§5.6). Il garde les skills avec ce commit : un push les fait relire.
- **Projet et PR** : une demande sur un projet vient d'un de ses membres ; sa PR doit être ouverte. Une seule demande en cours (`open`, `accepted`, `review_submitted`, `delivered`) par PR, pour ne pas disperser les relecteurs.
- **Vidéo** : une adresse web (`http` ou `https`) seulement.
- **Captures** : gardées dans la page jusqu'à l'envoi d'images (PAM-409).

Une demande peut aussi naître d'une alerte de `#suivi` (§6.8) : « Demander de l'aide » sur une CI en échec, « Demander une review » sur une PR qui attend.

### 7.2 Cycle de vie

| Statut | Entrée dans le statut | Sorties |
| --- | --- | --- |
| `open` | Création ou réouverture ; matching par vagues | Un aidant accepte → `accepted` ; le demandeur annule → `cancelled` ; 7 jours sans acceptation → `expired` |
| `accepted` | Acceptation atomique par un aidant ; les autres matchs sont prévenus que la demande est prise | Review GitHub détectée → `review_submitted` ; pour les types sans PR, l'aidant déclare « terminé » → `delivered` ; l'aidant se désiste → `open` ; le demandeur libère la demande après 72 h d'inactivité de l'aidant → `open` ; le demandeur annule → `cancelled` |
| `review_submitted` / `delivered` | Le demandeur reçoit « Was this helpful? » | Oui → `completed` ; Non → `closed_unhelpful` ; 7 jours sans réponse → `closed_unconfirmed` |
| `completed` | Entry `HELP_CONFIRMED` ou `REVIEW_HELP_CONFIRMED` | Final |
| `closed_unhelpful` / `closed_unconfirmed` / `expired` | — | Le demandeur rouvre → `open`, avec les mêmes données |
| `cancelled` | Le demandeur annule | Final |

Règles des transitions :

- **Acceptation atomique** : `UPDATE HelpRequest SET status = 'accepted', acceptedBy = ? WHERE id = ? AND status = 'open'`, puis vérification qu'une seule ligne a été modifiée. Sinon, le second aidant reçoit « Déjà prise ».
- **Désistement et libération** : l'aidant sorti passe en `withdrawn` ou `released` dans `HelpMatch` et est exclu des vagues suivantes de cette demande. Le matching reprend à la vague suivante ; le demandeur n'a rien à recréer.
- **Inactivité** : sans review ni message de l'aidant, relance à 24 h ; à 72 h, le bouton « Libérer la demande » apparaît pour le demandeur.
- **Fil de la demande** : dès l'acceptation, le demandeur et l'aidant échangent dans un fil attaché à la demande, sur sa page. Lui seul leur est ouvert : l'aidant n'a pas à rejoindre le projet ni ses canaux, et le fil marche pour une demande sans projet. Chaque message prévient l'autre (notification) et compte comme activité de l'aidant pour l'inactivité. Le fil reste lisible par eux deux après la clôture, sans nouveau message.
- **Réouverture** : remet la demande en `open` et relance le matching en excluant les aidants déjà sortis.
- **Délais rejoués par le serveur** : toutes les 10 minutes, une tâche expire les demandes ouvertes depuis 7 jours, relance une seule fois l'aidant silencieux (24 h) et le demandeur qui ne répond pas (24 h), et ferme en `closed_unconfirmed` une aide restée 7 jours sans réponse. Un désistement ou une libération rouvre la demande pour 7 jours.
- **Lecture** : tout développeur connecté lit une demande ; le fil n'est lu que par le demandeur et les aidants qu'elle a eus.
- Entries associées : `HELP_REQUEST_WITHDRAWN`, `HELP_REQUEST_RELEASED`, `HELP_REQUEST_REOPENED`, `HELP_REQUEST_EXPIRED`, `HELP_REQUEST_CANCELLED`, `HELP_REQUEST_DELIVERED`, `HELP_REQUEST_CLOSED` (« pas utile » ou non confirmée), `HELP_MESSAGE_CREATED`.

Seul `completed` produit de la réputation. Un rappel est envoyé au demandeur après 24 h sans confirmation. Les délais sont des valeurs initiales, regroupées dans un fichier de constantes (`api/help-rules.ts`).

### 7.3 Matching

Déterministe, en SQL, explicable. Score sur 100 :

| Critère | Poids | Source |
| --- | --- | --- |
| Skills requis possédés | 45 | `UserSkill`, pondéré par source : activité plateforme > GitHub > déclaré |
| Type d'aide accepté | 15 | Intentions et préférences (ex. « Review code » coché) |
| Aides confirmées sur ces skills | 15 | Entries `REVIEW_HELP_CONFIRMED` / `HELP_CONFIRMED` |
| Proximité sémantique | 10 | Similarité d'embeddings demande / profil (§11) ; 0 si indisponible |
| Disponibilité | 10 | `Profile.availability` et activité récente |
| Affinité | 5 | Mêmes communautés, projet suivi |

Exclus : le demandeur, les développeurs ayant mis le matching sur Off, ceux sous le seuil minimum qu'ils ont choisi. **Why this match?** affiche exactement les critères qui ont compté (« Go · SQLite · Backend · 14 reviews confirmées · Open to code reviews »).

Diffusion : les 5 meilleurs sont notifiés, dont une place réservée à un profil peu expérimenté mais bien aligné sur les skills (moins de 3 aides confirmées ; affiché « Nouveau profil prometteur » dans Why this match?). Sans acceptation après 2 h, les 5 suivants. Un utilisateur reçoit au maximum 10 notifications de matching par jour. Chaque notification crée une ligne `HelpMatch` (score, raisons, `notifiedAt`).

Précisions de calcul (`api/matching.ts`, valeurs dans `api/help-rules.ts`) :

- **Skills** : chaque skill demandé compte selon sa meilleure source, 100 % pour l'activité sur la plateforme, 85 % pour GitHub, 70 % pour une déclaration. Sans aucun des skills demandés, un développeur n'est jamais retenu.
- **Type d'aide** : accepté si le développeur l'a coché dans ses réglages, ou si une intention le dit (« Faire des reviews » pour une review, « Mentorer » pour du mentorat, « Aider des développeurs » pour tous les types).
- **Aides confirmées** : seules les preuves retenues par l'anti-abus (§8.4) et portant sur un des skills demandés comptent ; 14 aides donnent les 15 points.
- **Disponibilité** : 7 points si le profil est disponible (2 sinon), 3 de plus s'il a été actif ces 14 derniers jours.
- **Seuil** : 50 par défaut, tant que le développeur n'en a pas choisi.
- **Place « nouveau profil »** : moins de 3 aides confirmées et au moins la moitié des skills demandés.
- **Vagues** : la première part à la création ; la suivante 2 h après la précédente sans acceptation, ou tout de suite après un désistement, une libération ou une réouverture. Un développeur déjà matché n'est pas notifié à nouveau pour la même demande. En Instantané, il reçoit tout de suite une notification ; en Résumé quotidien, sa ligne `HelpMatch` attend le résumé (`notifiedAt` vide). Une collaboration request (§7.6) n'a pas de matching.
- **Visibilité** : le demandeur voit tous les matchs et leurs scores ; un développeur matché ne voit que le sien. Le formulaire montre, pendant la saisie, la première vague que le serveur enverrait, sans rien écrire.

### 7.4 Notifications

- **Temps réel** : insertion de la ligne `Notification` + entry → SSE → toast « This project needs you » sur l'écran du développeur, sans rafraîchir.
- **Centre de notifications** : catégories For you, Projects, Communities, Social, System. Exemples : match, review demandée, invitation, candidature, contribution confirmée, badge débloqué, release d'un projet suivi.
- **Préférences** : matching en Instant, Daily digest ou Off ; filtres par skills, types d'aide, score minimum, projets, communautés.
- **Digest quotidien** : tâche planifiée, envoi par email (sur le modèle de `api/email.ts`) aux utilisateurs dont l'email est connu.

Précisions :

- **Ce que dit une notification** : le serveur garde le type, l'auteur de l'action et ce dont elle parle (demande, titre, score, skills, durée, début du message) ; la page en écrit la phrase dans sa langue. Une notification a lieu à chaque étape d'une demande qui concerne l'autre côté : match, acceptation, désistement, libération, annulation, aide livrée, « pas utile », message du fil, demande expirée, relances (§7.2).
- **Toast** : il arrive par l'entry `NOTIFICATION_CREATED` du destinataire ; un match montre skills, score et durée, et mène à la demande.
- **Lecture** : seul le destinataire marque sa notification lue.
- **Préférences** : mode, score minimum et types d'aide acceptés sont enregistrés (`Profile.matchingFilters`) et appliqués par le matching ; les filtres par skills, projets et communautés suivent (PAM-223).

### 7.5 Vérification d'une review

La review se fait sur GitHub. La plateforme la détecte via le webhook `pull_request_review` (synchro live) ou la resynchronisation (synchro par rafraîchissement).

Une review valide une demande d'aide si toutes ces conditions sont vraies :

1. La demande est `accepted` et porte sur cette PR.
2. Le `githubId` du reviewer est celui de l'aidant qui a accepté.
3. Le reviewer n'est ni l'auteur de la PR ni le demandeur.
4. La review est postérieure à l'acceptation.
5. La review est de type `approved`, `changes_requested` ou `commented` avec au moins un commentaire.

La demande passe en `review_submitted`. Elle ne devient `completed` qu'après confirmation du demandeur. GitHub n'a pas de notion de « review acceptée » : notre événement de confiance est `REVIEW_HELP_CONFIRMED`.

Précisions (`api/review-check.ts`) :

- **Commentaires** : le webhook porte le texte de la review, pas ses commentaires de ligne. Le texte compte pour un commentaire ; une review `commented` sans texte voit ses commentaires de ligne lus sur GitHub juste après le webhook, hors de sa transaction (§5.5), puis est vérifiée à nouveau.
- **Resynchronisation** : pour les PRs dont une demande est acceptée, elle relit les reviews ; un webhook perdu ne perd pas la review.
- **Effets** : la review est rattachée à la demande (`Review.helpRequestId`, une demande par review), l'entry `REVIEW_SUBMITTED` est créée, le demandeur est notifié, et `deliveredAt` prend l'heure de la détection : les relances et la fermeture sans réponse en partent (§7.2). Côté projet, une PR qui a reçu une review n'est plus « en attente de review ».

### 7.6 Collaboration Requests

Depuis un profil, **Request collaboration** : Review my PR, Help me debug, Architecture advice, Join my project, Pair programming, Mentor me, Build something together. C'est une demande d'aide adressée à une seule personne : même cycle de vie, sans matching.

## 8. Réputation, badges et anti-abus

Toute réputation est calculée à partir du journal d'entries, jamais d'une déclaration. Chaque chiffre affiché est cliquable et mène aux preuves (PR, projet, demande d'aide).

### 8.1 Réputation par dimensions

Pas de score global de type « 93/100 ». Cinq dimensions affichées en barres : Code Review, Project Building, Mentoring, Open Source, Community Help. Chaque barre se déplie en preuves, par exemple : 18 reviews réalisées, 14 confirmées utiles, dont Go 8, TypeScript 4, Rust 2.

| Dimension | Entries prises en compte |
| --- | --- |
| Code Review | `REVIEW_HELP_CONFIRMED` |
| Project Building | `PROJECT_CREATED` avec au moins 2 membres actifs, `RELEASE_PUBLISHED`, `PR_MERGED` sur ses projets |
| Mentoring | `HELP_CONFIRMED` de type Mentorship ou Pair Programming |
| Open Source | `PR_MERGED` dont l'auteur n'est pas Owner du projet |
| Community Help | `HELP_CONFIRMED` (autres types), `ANSWER_ACCEPTED` |

Précisions (`api/proofs.ts`, lu par `GET/api/user/proofs`, public comme le passeport) : seules les preuves éligibles sont listées ; un membre actif est un membre qui n'est pas Observateur ; une PR mergée sur le projet d'un autre est rendue « pour » son propriétaire. Chaque preuve porte ce qui la prouve (PR et lien GitHub, demande d'aide, réponse ou projet), la personne aidée avec son nom et son pays (pour la Collaboration Map), et sa source : `github` porte « vérifié par GitHub », `demo` « donnée de démonstration », `platform` « confirmée sur Pamoja » (aide livrée sur Pamoja puis confirmée par le demandeur). Le profil, le passeport et la carte lisent ces preuves et les badges de `GET/api/user/badges`, et se mettent à jour en direct à chaque nouvelle preuve.

### 8.2 Badges

Chaque badge a quatre niveaux. Les seuils sont des valeurs initiales, ajustables dans un fichier de constantes.

| Badge | Mesure | Bronze | Silver | Gold | Platinum |
| --- | --- | --- | --- | --- | --- |
| Trusted Reviewer | Reviews confirmées utiles | 3 | 10 | 20 | 50 |
| First Responder | Demandes d'aide complétées | 3 | 10 | 25 | 50 |
| Mentor | Aides Mentorship / Pair Programming complétées | 2 | 5 | 15 | 30 |
| Open Source Contributor | PRs mergées sur des projets d'autres | 3 | 10 | 25 | 50 |
| Builder | Projets avec au moins 2 contributeurs et une release | 1 | 3 | 5 | 10 |
| Maintainer | Mois consécutifs de projet actif en tant qu'Owner ou Maintainer | 1 | 3 | 6 | 12 |
| Cross-border Builder | Pays distincts des collaborateurs confirmés | 2 | 3 | 5 | 8 |
| Community Pillar | Réponses acceptées dans les communautés | 5 | 15 | 40 | 100 |

Le profil affiche la progression (« 15 / 20 »). Le passage d'un niveau produit l'entry `BADGE_UNLOCKED` et une notification.

Précisions de calcul (`api/badges.ts`, lu par `GET/api/user/badges`) :

- **Ce qui est compté** : Trusted Reviewer, les `REVIEW_HELP_CONFIRMED` ; First Responder, toutes les aides confirmées ; Mentor, les `HELP_CONFIRMED` de type mentorat ou pair programming ; Open Source Contributor, les `PR_MERGED` dont l'auteur n'est pas propriétaire ; Builder, les projets du développeur qui ont une release et au moins un contributeur autre que lui (auteur d'une PR mergée) ; Maintainer, la plus longue suite de mois où un projet dont il est propriétaire ou mainteneur a eu de l'activité GitHub ; Cross-border Builder, les pays (autres que le sien) des personnes aidées ou qui l'ont aidé ; Community Pillar, les `ANSWER_ACCEPTED`. Seules les preuves éligibles comptent.
- **Quand** : après une confirmation (l'aidant et le demandeur), une PR mergée (son auteur, les propriétaires et mainteneurs du projet), une release ou un push (propriétaires et mainteneurs), et à chaque connexion, pour la suite de mois. Une baisse (preuve retirée par la modération) est enregistrée sans notification.

### 8.3 Preuves et calcul

**Chaque preuve est autosuffisante.** Une entry de réputation (`REVIEW_HELP_CONFIRMED`, `HELP_CONFIRMED`, `PR_MERGED`…) fige dans ses `fields` (mécanisme natif de `@01edu/db/entries`) tout ce qui a servi à la décision :

- demandeur et aidant ;
- skills au moment de l'aide (ids et noms) et type d'aide ;
- référence GitHub : repo, numéro de PR, id de la review, URL ;
- résultat (état de la review, réponse du demandeur) ;
- `eligible` et, sinon, `exclusionReason` ;
- `rulesVersion` : version des règles appliquées ;
- `source` : `github`, `platform` ou `demo` ; seule `github` porte « vérifié par GitHub ».

Une modification de profil ou la suppression d'une demande ne change donc aucun résultat passé.

**L'éligibilité est décidée une fois, à la confirmation, puis figée.** Un changement de règles ne réécrit jamais l'historique en silence : appliquer de nouvelles règles au passé est une migration explicite et versionnée.

**À la confirmation** (`POST/api/help/confirm`, `api/help-lifecycle.ts`) : une review vue sur GitHub donne `REVIEW_HELP_CONFIRMED` (`source = github`, avec repo, numéro de PR, URL, id et état de la review) ; une aide livrée sur Pamoja donne `HELP_CONFIRMED` (`source = platform`). Les deux figent demandeur, aidant, skills (ids, slugs et noms) et type d'aide. Si la preuve compte, ses skills passent en `platform_activity` pour l'aidant, la source qui pèse le plus dans le matching (§7.3). L'aidant est notifié, et la notification dit si la preuve compte.

**Les entries de réputation ne sont jamais archivées**, sauf par une sanction de modération (§10.5), qui retire volontairement la preuve. L'évaluateur de badges s'exécute après chaque entry concernée et recalcule `BadgeProgress` à partir des seules entries éligibles : entry → évaluateur → `BadgeProgress` → stats du profil.

### 8.4 Anti-abus

Objectif : empêcher que « A reviewe B, B reviewe A, 100 fois » fabrique de la réputation.

- **Plafond par paire** : au plus 2 confirmations comptabilisées par paire demandeur / aidant sur 30 jours glissants. Au-delà, la preuve est créée avec `eligible = 0` et `exclusionReason = pair_limit` (`api/reputation.ts`).
- **Pas d'auto-review** : le reviewer n'est ni l'auteur de la PR ni le demandeur.
- **Une seule confirmation** par demande d'aide.
- **Confirmation du demandeur** obligatoire.
- **Pas de seuil de taille de PR** : une correction d'une ligne peut être décisive, et la taille ne prouve pas la qualité. Les règles ci-dessus et la diversité ci-dessous suffisent contre la triche.
- **Diversité par badge** pour les niveaux Gold et Platinum :

| Badge | Gold | Platinum |
| --- | --- | --- |
| Trusted Reviewer | 3 demandeurs et 2 projets distincts | 6 demandeurs et 4 projets distincts |
| First Responder, Mentor | 3 demandeurs distincts | 6 demandeurs distincts |
| Community Pillar | Réponses acceptées par 5 auteurs distincts | 10 auteurs distincts |
| Open Source Contributor | PRs mergées dans 3 projets distincts | 5 projets distincts |
| Builder | Chaque projet compté a au moins 3 contributeurs autres que l'Owner | au moins 5 |
| Maintainer | Un mois compte si au moins 2 autres contributeurs y ont été actifs | au moins 4 |
| Cross-border Builder | Au moins 2 collaborateurs distincts par pays compté | au moins 3 |

Une action qui ne passe pas ces règles reste visible dans l'activité, mais ne compte pas dans la réputation.

## 9. Profil développeur et partage

Le profil est un produit à part entière : public, partageable, indexable, servi à **une seule adresse, `/@username`** : sans connexion, la version publique en lecture seule (qui tient lieu de passeport) ; connecté, la version complète. Il n'existe pas d'autre adresse de profil. Il doit pouvoir servir de portfolio, de carte de visite et de preuve de collaboration. Principe : *Your work is your profile.*

### 9.1 Contenu

- **Hero** : cover, avatar, nom et drapeau du pays, headline, ville et pays, technologies mises en avant, bio, boutons GitHub, Website, Follow, Request collaboration.
- **Currently Building** : projets actifs avec le rôle et le travail de l'utilisateur (commits, PRs mergées, reviews).
- **Real Contributions** : par projet, le rôle, les faits marquants et les liens vers les preuves.
- **Activity stats** : projets, reviews vérifiées, contributions mergées, développeurs aidés, collaborations.
- **Réputation et badges** (§8).
- **Sections** : Overview, Projects, Contributions, Reviews, Activity, Badges, Communities, GitHub. Une seule colonne, dans l'ordre choisi par le développeur.

Précisions (`api/profile.ts`, lu par `GET/api/user`, public) : le profil ne donne jamais l'email ni les réglages de matching ; les projets montrés sont les projets publics dont le développeur est membre (pas Observateur) ; l'activité (dernières demandes d'aide écrites ou acceptées) n'est donnée qu'à un visiteur connecté, qui peut ouvrir ces demandes (§7.2). L'adresse ne tient pas compte de la casse du login. Chaque chiffre mène à ses preuves : reviews, contributions et développeurs aidés ouvrent les preuves correspondantes ; collaborations et projets mènent au Collaboration Graph et aux projets du profil.

### 9.2 Personnalisation

Cover (Le fil, Grille, Plaques, Uni), couleur d'accent (Indigo, Vert, Ambre, Corail), thème (Minimal, qui suit le thème de l'app, Clair, Sombre, Terminal, Cyber), headline, bio, technologies, projets et badges mis en avant, ordre des sections, liens. Pas de CSS libre : tout reste dans le design system.

### 9.3 Vitrines visuelles

- **Developer Passport** : c'est la vue publique de `/@username` (sans connexion) : projets actifs, contributions, reviews, développeurs aidés, pays des collaborateurs, top skills.
- **Share Card** : image générée côté serveur (nom, pays, headline, 3 chiffres clés, technologies). C'est aussi l'image Open Graph du profil (§17). Bouton de partage LinkedIn, X, WhatsApp, et téléchargement PNG.
- **Collaboration Map** : « Collaborations à travers l'Afrique » : une colonne par pays posée sur une grille isométrique, sa hauteur selon le nombre de collaborations, un fil indigo vers le pays du profil. Pas de contour de l'Afrique, pour ne pas dessiner une carte approximative. Le pays du profil n'est jamais compté parmi les pays reliés. Calculée depuis les collaborations confirmées et le pays des profils.
- **Collaboration Graph** : réseau développeurs ↔ projets ↔ communautés, construit uniquement sur des liens de travail (projets communs, aides, reviews, contributions), jamais sur les follows.

Les données de pays viennent du profil déclaré ; un utilisateur sans pays n'apparaît pas sur la carte.

## 10. Communautés, feed, exploration et recherche

### 10.1 Feed

Le fil est l'Accueil (§6.2). Types de publication : Discussion, Question, Mise à jour de projet, Vitrine, Ressource, Opportunité, Release (une demande d'aide passe par son formulaire, §7.1). Contenu en Markdown avec blocs de code (sous-ensemble lu en éléments, jamais en HTML : gras, italique, `code`, liens `http`/`https`, listes, citations, titres, blocs de code ; les liens nus, `@login` et `#hashtag` deviennent cliquables ; les retours à la ligne sont gardés ; au-delà de 600 caractères ou 8 lignes, un post se replie dans le fil avec « … voir plus »), jusqu'à 4 images, vidéos intégrées par lien (YouTube, Loom, Vimeo), liens vers un repo, une issue, une PR ou un projet. **Une réponse est un post** rattaché à un autre, avec les mêmes actions (réagir, republier, répondre, signaler). Imbrication sans limite, avec des lignes de rattachement ; à l'ouverture, seules les réponses directes s'affichent, les suivantes se déplient à la demande. Interactions : réactions (dont « Utile »), republication, bookmark, partage par lien, abonnement à une personne, un projet ou une communauté. Une question peut avoir une réponse acceptée (entry `ANSWER_ACCEPTED`). Pagination par curseur.

### 10.2 Communautés

Types : technologie (Go, Rust, React, Deno, AI, DevOps…), pays (Senegal Developers, Côte d'Ivoire Developers, Cameroon Developers…), domaine (Open Source, Architecture, Code Review, Cybersecurity…). Une communauté a un feed, des membres, des projets, des demandes d'aide et une page About. Les communautés de pays sont créées d'office par le seed.

### 10.3 Explore

- **Développeurs** : filtres technologie, pays, intentions, disponibilité, type de contribution, communauté. Carte : nom et pays, technologies, projets, reviews, contributions, « Open to ».
- **Projets** : filtres technologie, stade, cherche des contributeurs, beginner friendly (issues `good first issue`), pays, activité.
- **What can I work on?** : liste personnalisée de choses concrètes à faire, triées par match : reviews demandées, issues `good first issue`, besoins de projets, documentation.

### 10.4 Recherche

Recherche globale sur développeurs, projets, communautés, publications, demandes d'aide et skills, avec **Meilisearch** auto-hébergé : résultats pendant la frappe, tolérance aux fautes (« postgress » trouve PostgreSQL), filtres combinés (pays, skill, disponibilité).

- **Index** : `developers`, `projects`, `communities`, `posts`, `help_requests`. Chaque document contient l'`id` SQLite, les champs cherchables et les champs filtrables.
- **SQLite reste la source de vérité.** Meilisearch n'est qu'un index : on peut le reconstruire entièrement à partir de la base.
- **Synchronisation pilotée par les entries** : un worker écoute les entries concernées (`PROFILE_UPDATED`, `PROJECT_UPDATED`, `POST_CREATED`, `HELP_REQUEST_CREATED`…), relit la ligne en SQLite et envoie le document à Meilisearch, par lots. Une réindexation complète tourne chaque nuit et au démarrage si un index est vide.
- **Contenu non public** jamais indexé : projets `unlisted`, messages des canaux.
- **Accès** uniquement via `GET/api/search` côté serveur. La clé de Meilisearch ne quitte jamais le serveur.
- **Repli** : si Meilisearch ne répond pas, `GET/api/search` bascule sur une recherche SQL `LIKE` et la page reste fonctionnelle. Toute la recherche passe par une seule fonction `search(query, filters)`.

### 10.5 Signalement et modération

Tout contenu publié par un utilisateur peut être signalé : post, réponse, message d'un canal, message direct, demande d'aide, profil, projet.

1. **Signaler** : bouton sur chaque contenu, motif (spam, harcèlement, contenu inapproprié, usurpation, triche à la réputation, autre) et commentaire facultatif. Un utilisateur ne signale qu'une fois le même contenu.
2. **Traiter** : les signalements arrivent dans une file de modération. Un contenu de communauté est traité par ses Moderators ; le reste par les admins de la plateforme.
3. **Agir** : ignorer, masquer le contenu, avertir l'auteur, suspendre le compte (durée choisie), retirer une preuve de réputation (fraude avérée). Chaque action exige un motif.
4. **Tracer** : chaque signalement et chaque action produisent une entry et une ligne `ModerationAction` (qui, quoi, pourquoi, quand). L'auteur est notifié de l'action et de son motif.

Un contenu masqué disparaît pour tous sauf les modérateurs et son auteur, qui le voit avec un bandeau indiquant qu'il est masqué et pourquoi. Un compte suspendu ne peut plus écrire ; son profil affiche « compte suspendu ». Au-delà de 3 signalements distincts, un contenu est masqué en attendant la décision d'un modérateur.

### 10.6 Messages directs

Une conversation à deux, comme la messagerie de LinkedIn : on écrit à un développeur depuis son profil (« Écrire »), on retrouve ses conversations dans **Messages**. Les échanges à plusieurs passent par les canaux de projet (§6.8) ; une demande d'aide garde son propre fil (§7.2).

- **Qui écrit à qui** : deux développeurs qui ont déjà travaillé ensemble (un projet en commun, hors Observateur, ou une demande d'aide entre eux) s'écrivent directement. Sinon, le premier message arrive en **demande de message** : le destinataire l'accepte, et la conversation s'ouvre, ou la refuse, et l'expéditeur ne peut plus lui écrire. Tant que la demande attend, l'expéditeur n'envoie que ce premier message. Il n'est pas prévenu d'un refus.
- **Bloquer** : depuis une conversation ou un profil. Un développeur bloqué ne peut plus écrire à celui qui l'a bloqué ni ouvrir de conversation avec lui ; il n'en est pas prévenu. Débloquer rend la conversation possible à nouveau.
- **Messages** : même Markdown réduit que le fil (§10.1), 2 000 caractères au plus (§16), jamais traduits, jamais écrits dans les journaux du serveur. Chaque message peut être signalé (§10.5). Les 50 derniers s'affichent, les plus anciens à la demande.
- **Non lus et temps réel** : chaque conversation compte ses messages non lus depuis la dernière lecture ; le menu affiche le total, demandes comprises. Un message arrive chez l'autre sans rafraîchir (entry `DIRECT_MESSAGE_CREATED`), avec un toast s'il n'a pas la conversation ouverte. Les messages ne créent pas de notification : ils ont leur propre compteur, comme sur LinkedIn.
- **Confidentialité** : seuls les deux participants lisent une conversation. Un modérateur ne voit que le message signalé.
- **Limites de débit** (§16) : au plus 10 demandes de message à des inconnus par 24 heures, 20 messages par minute et 1 000 par jour, 30 signalements par jour. Au-delà, le serveur répond 429 et dit quand réessayer ; la page l'explique sans perdre le texte écrit.

À la manière de Discord, la messagerie s'enrichit ensuite, dans cet ordre :

1. **Modifier et supprimer son message** : seul l'auteur, dans une conversation acceptée. Un message modifié porte « modifié » ; un message supprimé laisse « Message supprimé » à sa place, sans son texte ni ses réactions, et ne compte plus comme non lu. Dans la page : modifier sur place (Entrée enregistre, Échap annule, ↑ dans un champ vide modifie son dernier message), supprimer après une confirmation.
2. **« En train d'écrire… » et statut en ligne** : éphémères, par la présence en mémoire (§13.6), jamais enregistrés.
3. **Répondre à un message précis** de la même conversation, pas à un message supprimé : le début du message cité (120 caractères, en texte simple) s'affiche au-dessus de la réponse et y mène. **Réactions** : six emoji (👍 ❤️ 😂 🎉 🙏 👀), une fois chacun par développeur, un second clic la retire ; au plus 60 réactions par minute.
4. **Séparateur « Nouveaux messages »** avant le premier message reçu depuis la dernière lecture, qui reste en place tant que la conversation est ouverte. **Marquer comme non lu** à partir d'un message reçu : la conversation se ferme et le compte repart de ce message. **Sourdine** : plus de toast, et la conversation sort du compteur du menu (son propre compte reste, en gris). **Archiver** : la conversation passe dans « Archives », en bas de la liste, jusqu'au prochain message, d'un côté ou de l'autre.
5. **Recherche** dans ses conversations : de 2 à 100 caractères, sans tenir compte de la casse, dans les messages non supprimés ; les 30 plus récents, avec les mots autour. Un résultat ouvre la conversation sur ce message, avec un retour aux derniers messages. Au plus 30 recherches par minute.
6. **Images et fichiers** (après l'envoi d'images, §17.3) et **aperçu des liens** (titre et image d'une page, lus par le serveur).

## 11. IA

L'IA améliore le produit mais n'en est jamais une condition : chaque usage a un repli déterministe, et la page s'affiche normalement si l'IA ne répond pas.

| Usage | Entrée | Sortie | Déclenchement | Repli sans IA |
| --- | --- | --- | --- | --- |
| Résumé Pulse | Entries du projet sur la période, besoins, demandes d'aide ouvertes | 3 à 5 phrases | En tâche de fond après des entries du projet, au plus une fois toutes les 10 min par projet | Pulse déterministe seul |
| Extraction skills et besoins | README, langages, topics, issues ouvertes | JSON validé contre la liste de skills | À l'import et à la resynchronisation | Langages GitHub via `SkillAlias` |
| Embeddings de matching | Texte de la demande d'aide ; profil (headline, bio, skills, activité) | Vecteur stocké en BLOB SQLite | À la création d'une demande ; à la mise à jour d'un profil | Critère « proximité sémantique » à 0 |
| Description de projet | README | Texte proposé, éditable | Sur clic de l'utilisateur | Champ vide |
| Recommandations | Profil, historique, besoins des projets | Liste ordonnée pour « What can I work on? » | En tâche de fond, quotidienne | Tri par score de matching SQL |

Règles :

- **Appels côté serveur uniquement**, clé API en variable d'environnement.
- **Jamais de calcul pendant l'affichage d'une page.** Le résultat est stocké, puis une entry signale au client qu'il est prêt.
- **Sorties structurées** (JSON) pour tout ce qui va en base, validées avant l'écriture ; une sortie invalide est rejetée et le repli s'applique.
- **Le contenu GitHub est une donnée, pas une instruction** : un README ou une issue peut contenir du texte conçu pour détourner le modèle. Le prompt l'encadre comme donnée, et la sortie est validée.
- **Budget** : nombre d'appels par jour plafonné dans un fichier de constantes, et mise en cache par empreinte de l'entrée.
- **Fournisseur et modèles** : à fixer par l'équipe (points ouverts). Le modèle de génération et le modèle d'embeddings peuvent être différents.

Pour la démo, les résumés et embeddings du seed sont pré-calculés.

## 12. Architecture technique

Une seule instance Deno sert l'API, le flux SSE et les fichiers statiques, avec SQLite comme unique base. Le setup reprend celui de Tournament partout, sauf pour le CSS.

### 12.1 Stack

| Couche | Choix | Version de référence (Tournament) |
| --- | --- | --- |
| Runtime | Deno 2.x, TypeScript | — |
| API | `@01edu/api` | ^0.2.11 |
| Client API | `@01edu/api-client` (signals) | ^0.2.6 |
| Base | `@01edu/db` + `@01edu/db/entries`, SQLite | ^0.2.6 |
| Routage SPA | `@01edu/signal-router` | ^0.2.3 |
| UI | Preact, `@preact/signals` | ^10.29, ^2.9 |
| Build JS | esbuild + `@luca/esbuild-deno-loader` | comme `build-config.ts` |
| CSS | Tailwind CSS v4 compilé (`@tailwindcss/cli`) | nouveau par rapport à Tournament |
| Temps réel | Server-Sent Events | — |
| GitHub | GitHub App, REST, GraphQL, webhooks | — |
| Déploiement | Dockerfile multi-stage + binaire `deno compile` | comme Tournament |
| Recherche | Meilisearch (conteneur séparé) | nouveau par rapport à Tournament |
| Reverse proxy | Caddy | — |

### 12.2 Build et développement

- **Dev** : comme `task-dev.ts`, esbuild en mode watch sert `dist/` et le serveur Deno route `/api` vers l'API et le reste vers esbuild. Il n'y a pas de `@01edu/api-proxy` dans Tournament et il n'en faut pas.
- **Prod** : comme `prod-server.ts`, le serveur lit `dist/index.html` au démarrage et le sert pour toutes les routes de la SPA (ce qui permet d'y injecter les balises OG, §17).
- **Routage** : vrais chemins (`/@moussa`, `/projet/openpay-africa`) avec `@01edu/signal-router`, **jamais de `#`** : le serveur doit voir l'adresse pour injecter l'aperçu de partage. Le prototype utilise des `#` ; le code ne les reprend pas.

### 12.3 CSS : Tailwind v4 compilé, sans twind ni daisyUI

Tournament utilise `@twind/preact`, qui génère le CSS dans le navigateur. Pamoja compile son CSS avec Tailwind v4. daisyUI a été écarté : le système isométrique (§12.7) rend tous les composants sur mesure, et ses composants auraient tous été restylés. Conséquences :

- Pas de twind. La CLI Tailwind (`npm:@tailwindcss/cli`, lancée par Deno) compile `web/assets/styles/style.css` : en watch pendant le dev (`task-dev.ts`), minifiée dans le build (`task-prod.ts`, donc aussi dans le Dockerfile). Seul `web/` est lu pour trouver les classes.
- Tailwind trouve les classes en lisant les fichiers source : les noms de classes doivent apparaître en entier dans le code. Une classe construite par concaténation (`'bg-' + color`) n'est pas générée.
- Les couleurs du design system sont des variables CSS générées depuis `docs/identite/tokens.json` (clair et sombre), exposées à Tailwind par `@theme`. Les thèmes et accents de profil (§9.2), définis dans le même fichier, redéfinissent ces variables sur le profil seulement. Le système isométrique (dalles, touches, puits) est écrit en utilitaires CSS, et les composants maison (ProjectCard, DeveloperCard, HelpRequestCard, ProjectPulse, Badge, ProfileHero, ContributionCard, NotificationItem) sont construits par-dessus.

### 12.4 Faits vérifiés sur `@01edu/api`

Lus dans `router.ts` (0.2.10) :

- **Pas de paramètres de chemin.** Une route est une clé `'METHODE/chemin'` et le routeur cherche le chemin exact. `/api/projects/:slug` est impossible ; on écrit `GET/api/project` avec `slug` en entrée.
- **Entrée** : pour `GET`, les paramètres de l'URL ; pour les autres méthodes, le corps JSON (un JSON invalide devient `{}`). L'entrée est validée par le schéma `input` avant `authorize` et le handler.
- **Route sans `input`** : le corps n'est pas lu, le handler y accède lui-même. C'est ce qui rend possible la vérification HMAC des webhooks.

### 12.5 Faits vérifiés sur `@01edu/db`

- **PRAGMA appliqués par la librairie** : `temp_store = memory`, `synchronous = NORMAL`, `encoding = UTF-8`, et `journal_mode = WAL` **seulement si `APP_ENV === 'prod'`**.
- **Non appliqués** : `busy_timeout` (présent en commentaire seulement) et `foreign_keys`. À exécuter nous-mêmes au démarrage : `PRAGMA foreign_keys = ON` et `PRAGMA busy_timeout = 5000`. Sans `foreign_keys = ON`, les clés étrangères déclarées avec `join` ne sont pas appliquées par SQLite.
- **Clé primaire** : une seule colonne, de type `INTEGER`, créée en `PRIMARY KEY AUTOINCREMENT`. Pas de clé composite : on utilise une clé technique + `CREATE UNIQUE INDEX` via `sql`. Son nom est libre : comme Tournament, on la nomme d'après la table (`userId`, `helpRequestId`), du même nom que la relation d'entries, pour qu'aucune jointure ne mélange plusieurs colonnes `id`.
- **Clé étrangère** : `join` référence une table déjà créée. Une table ne peut donc pas pointer vers elle-même : ces colonnes (`Post.parentId`, `ProjectMessage.parentMessageId`…) restent des `INTEGER` sans contrainte, vérifiés par le code. Les cibles polymorphes (`targetType` + `targetId`) n'ont pas de contrainte non plus.
- **Mise à jour** : `update` écrit `COALESCE(:col, col)` ; il ne remet jamais une colonne à `NULL`. Pour vider une colonne, passer par `sql`.
- **Types de colonnes** : `TEXT`, `JSON`, `BLOB`, `INTEGER`, `REAL`.
- **Migrations** : `api/migrate.ts` reprend `runMigrations` de `@01edu/db`, qui importe `file://` suivi du chemin et casse donc sous Windows (`C:\…`) : toute migration d'une base existante y faisait planter le serveur. Mêmes règles sinon : la version suit `PRAGMA user_version`. Elles s'exécutent avant `createTable`, qui vérifie que la table existante correspond au schéma déclaré (voir le commentaire en tête de `api/schema.ts` dans Tournament). Sur une base neuve, aucune migration ne s'exécute : `runMigrations` note la dernière version et ce sont les `createTable` qui créent les tables. Le schéma initial vit donc dans `api/schema.ts` ; une migration ne sert qu'à faire évoluer une base existante, dans une transaction (`BEGIN IMMEDIATE`).

### 12.6 Arborescence

Calquée sur Tournament :

- `api/` : `server.ts`, `routes.ts`, `schema.ts`, `entries.ts`, et un fichier par domaine (`auth.ts`, `github.ts`, `project.ts`, `help.ts`, `matching.ts`, `notification.ts`, `badge.ts`, `community.ts`, `ai.ts`), plus `api/lib/` (env, log, queue, encoding).
- `web/` : `app.tsx`, `pages/`, `ui/` (design system), `lib/` (`api.ts`, `session.ts`, `realtime.ts`).
- `migrations/`, `task-dev.ts`, `task-prod.ts`, `task-db-seed.ts`, `prod-server.ts`, `build-config.ts`, `Dockerfile`.
- Tests Deno à côté des fichiers (`*.test.ts`), comme dans Tournament.

### 12.7 Direction artistique et responsive

Objectif : un produit pour développeurs haut de gamme. Références : Linear, GitHub, Raycast, Vercel, Arc.

- Thèmes sombre et clair, typographie forte, bordures discrètes, espacements généreux, forte densité d'information, peu de bruit visuel.
- Animations courtes et utiles : arrivée d'une notification, progression d'un badge, mise à jour du Pulse.
- Responsive obligatoire. Priorité au desktop, mais Feed, Notifications, demandes d'aide, Profil et Explore doivent être confortables sur mobile. La gestion de projet (Board, Roadmap) reste pensée pour le desktop.
- Les écrans de la démo (profil, page projet, Pulse, notification, demande d'aide) sont maquettés avant d'être développés.

**Identité visuelle** : définie par le [design system Pamoja](https://claude.ai/artifact/Gj5ox6BNFzaDpuqaCFCWhb) (tokens, typographie, logo, composants, avec une copie des tokens et du logo dans `docs/identite/`) et par le **prototype Pamoja v2** (`docs/prototype/`), référence des écrans. L'idée centrale : *des personnes reliées par un fil*.

- Le fil qui relie les personnes est **indigo**, seule couleur de marque ; tout le reste est en gris.
- Trait plein = vérifié par GitHub ; trait pointillé = donnée de démonstration ou lien pas encore créé.
- Typographie : Bricolage Grotesque (titres), IBM Plex Sans (texte), IBM Plex Mono (chiffres, IDs, code).

**Système isométrique** : toute l'interface est en isométrie à 30°, sans ombre floue. L'épaisseur est faite de couches décalées vers le bas à droite (pas de 0,87 × 0,5 px), en CSS (`box-shadow` empilées), sans image. Valeurs exactes dans le design system et le prototype.

- **Dalles** : cartes, barre latérale, menus, dialogues. Épaisseur de 8px (faces `side`, arête `figure-edge`) ; 12px au survol ; sélectionnée, faces `indigo-soft-side` et arête `indigo`.
- **Touches** : boutons, puces, onglets actifs. Épaisseur de 4px ; au survol la touche monte (5px) ; au clic elle s'enfonce entièrement (translation de 3,46 × 2px, épaisseur nulle), en 120 ms. Primaire : faces `indigo-side`, arête `indigo-edge` ; secondaire : `side` et `line-control` ; danger : `side` et `danger`.
- **Puits** : champs, recherche, rails d'onglets, creusés dans le sol (ombre intérieure `line` puis `surface-200`).
- **Formes par type d'objet** : personne = disque, projet = cube, événement = tuile, état = losange.
- **Colonnes** : les métriques du Pulse, les badges et la Collaboration Map sont des colonnes dont la hauteur suit la valeur. Le volume encode une donnée réelle, jamais une décoration.
- **Fond uni** (`surface-000`) : la grille isométrique au sol a été essayée puis retirée, elle gênait la lecture.
- **Pas d'illustration décorative** : un état vide montre une phrase claire, une action et, au besoin, la forme de l'objet attendu. Exceptions : la couverture « Plaques » d'un profil, que le développeur choisit lui-même (§9.2), et les pages publiques (landing et 404), qui présentent le produit avec les figures du système isométrique (plaques reliées par le fil, figures des quatre étapes de la boucle).

### 12.8 Tests

Comme Tournament : tests Deno à côté du code, lancés en continu pendant le dev. Couverture obligatoire sur ce qui casserait la démo ou la réputation :

- vérification de signature, déduplication et reprise après redémarrage de la file de webhooks ;
- cycle de vie d'une demande d'aide (dont l'acceptation simultanée, le désistement et la réouverture) et règles de validation d'une review (§7.5) ;
- règles anti-abus et calcul des badges ;
- score de matching et ses raisons ;
- `trigger` de chaque type d'entry (qui reçoit quoi) ; les trois contrôles d'installation GitHub (§5.4) ; le calcul des badges à partir des seules preuves éligibles.

Un test de bout en bout du scénario de démo, sur le modèle du dossier `qa/` de Tournament, est rejoué avant chaque répétition.

## 13. Temps réel : entries et SSE

Le client écrit en HTTP ; le serveur prévient en SSE qu'un état a changé, et le client relit la donnée. SQLite reste la seule source de vérité. Principe : *Something changed. Fetch the current truth.* C'est le mécanisme de Tournament, sans changement.

### 13.1 Fonctionnement vérifié de `@01edu/db/entries`

- `initEntries(entries, relations, définitions)` crée la table `entryInternal` et la vue `entry` (qui exclut les entries archivées via `archivedAt`).
- `entries` est une liste fermée de types numérotés (comme `api/entries.ts`). **Un numéro n'est jamais réutilisé ni renuméroté.**
- `relations` fixe les colonnes de liaison. Chaque type peut déclarer des `fields` supplémentaires et un `trigger(entry, sub)`.
- À l'insertion d'un type qui a un `trigger`, la librairie parcourt `insertListeners` et envoie `data: [createdAt,type,id]` à chaque listener pour lequel `trigger` renvoie vrai. **Un type sans `trigger` n'est jamais diffusé** : le comportement par défaut est sûr.

### 13.2 Route SSE

`GET/api/events`, sur le modèle de Tournament (`api/routes.ts`) :

1. Exige une session et l'en-tête `Accept: text/event-stream`.
2. Calcule côté serveur ce que l'utilisateur peut recevoir : `userId`, projets dont il est membre, projets qu'il suit, communautés dont il est membre, communautés qu'il modère, développeurs qu'il suit. Membres et abonnés restent séparés : `TASK_UPDATED` ne va qu'aux membres. **Le client ne choisit jamais ses abonnements.**
3. Ajoute le listener (`{ userId, projectIds, followedProjectIds, communityIds, moderatedCommunityIds, followedUserIds, connectionId, controller }`, type `EntryListener` de `api/entries.ts`) à `insertListeners`.
4. Envoie un événement `ack` toutes les 15 secondes (heartbeat).
5. Retire le listener à la fermeture ou dès qu'un envoi échoue.

Quand l'utilisateur rejoint ou quitte un projet, son listener est mis à jour en mémoire.

### 13.3 Qui reçoit quoi

| Entry | Relations | `trigger` : reçu par |
| --- | --- | --- |
| `NOTIFICATION_CREATED` | userId, notificationId | Le destinataire |
| `HELP_REQUEST_MATCHED` | userId, helpRequestId | Le développeur matché |
| `HELP_REQUEST_ACCEPTED` | userId, helpRequestId, projectId | L'aidant, le demandeur, les développeurs matchés (la demande est prise) et les membres du projet |
| `REVIEW_SUBMITTED` | userId, helpRequestId, projectId | Le demandeur et les membres du projet |
| `REVIEW_HELP_CONFIRMED`, `HELP_CONFIRMED` | userId, helpRequestId, projectId | L'aidant et les membres du projet |
| `BADGE_UNLOCKED` | userId | L'utilisateur |
| `PROJECT_UPDATED`, `PROJECT_MEMBER_JOINED`, `PR_UPDATED`, `PR_MERGED`, `ISSUE_UPDATED`, `RELEASE_PUBLISHED` | projectId (+ userId) | Membres et abonnés du projet ; pour `PROJECT_MEMBER_JOINED`, le nouveau membre aussi, dont les événements du projet commencent aussitôt |
| `TASK_UPDATED` | projectId, taskId | Membres du projet |
| `MESSAGE_CREATED` | projectId, messageId | Membres du projet ; abonnés aussi pour `#annonces` |
| `PR_OPENED`, `PR_REVIEWED`, `PR_CLOSED`, `CI_FAILED`, `CI_FIXED`, `PR_REVIEW_STALE`, `COMMITS_PUSHED` | projectId, pullRequestId (+ userId) | Membres et abonnés du projet ; alimentent `#suivi` |
| `POST_CREATED`, `POST_REPLIED`, `POST_REPOSTED` | communityId, postId | Membres de la communauté ; abonnés de l'auteur pour les republications |
| `PULSE_READY` | projectId | Membres et abonnés du projet |
| `USER_LOGIN`, `PROJECT_CREATED`, `ANSWER_ACCEPTED` | userId, projectId ou postId | Personne (journal et réputation uniquement) |
| PROFILE\_UPDATED, POST\_UPDATED, HELP\_REQUEST\_CREATED | userId, postId ou helpRequestId | Personne en SSE ; lues par le worker de réindexation Meilisearch |
| HELP\_REQUEST\_WITHDRAWN, HELP\_REQUEST\_RELEASED, HELP\_REQUEST\_REOPENED, HELP\_REQUEST\_EXPIRED, HELP\_REQUEST\_CANCELLED, HELP\_REQUEST\_DELIVERED, HELP\_REQUEST\_CLOSED, HELP\_MESSAGE\_CREATED | userId, helpRequestId | Le demandeur, l'aidant concerné et les développeurs matchés |
| CONTENT\_REPORTED, MODERATION\_ACTION | userId, communityId ou postId | Les modérateurs concernés ; l'auteur pour une action le visant |
| DIRECT\_MESSAGE\_CREATED, CONVERSATION\_UPDATED | userId (+ data : conversationId) | Les deux participants de la conversation, sauf un participant bloqué |

Chaque ligne est vérifiée par `api/entry_triggers_test.ts`, qui échoue si un type d'entry n'y figure pas. `userId` désigne le développeur dont parle l'entry : l'auteur de l'action, ou le propriétaire de la preuve pour une entry de réputation (l'aidant, l'auteur de la PR). Les autres destinataires viennent des ensembles du listener ou d'une vérification SQL (`sqlCheck`, comme Tournament) : le demandeur et les développeurs matchés d'une demande d'aide, le canal d'un message.

### 13.4 Client

`web/lib/realtime.ts`, écrit à partir de `web/lib/session.ts` de Tournament :

- Ouvre un `EventSource` sur `api/events` une fois la session connue.
- `onEvent(types, handler)` abonne un composant à des types d'entries ; le handler appelle le `.fetch()` du signal concerné (`notifications.fetch()`, `project.fetch()`, `board.fetch()`, `profile.fetch()`).
- Si aucun `ack` n'arrive pendant 20 secondes, la connexion est considérée perdue (signal `sourceDisconnectedAt`) et un bandeau discret l'indique.
- À la reconnexion, les signals critiques sont relus (notifications, page courante) : chaque écran s'inscrit avec `onReconnect`. Le navigateur reconnecte seul après une coupure réseau ; une connexion refusée (serveur qui redémarre, réponse d'erreur) est fermée pour de bon par le navigateur, `realtime.ts` la relance donc toutes les 5 s.
- Les numéros de types viennent de `api/entry-types.ts`, module sans base de données que le web peut importer ; `api/entries.ts` déclare les entries elles-mêmes.

### 13.5 Plusieurs onglets

Chaque onglet ouvre sa propre connexion. En HTTP/1.1, un navigateur limite à 6 connexions simultanées par domaine : au-delà de quelques onglets, les requêtes restent bloquées. Le reverse proxy de production doit servir en **HTTP/2**. En complément, un `BroadcastChannel` peut faire partager une seule connexion entre onglets.

### 13.6 Présence

La présence est éphémère et n'utilise pas les entries (elles sont persistées). Elle est tenue en mémoire dans une `Map` indexée par **connexion SSE** (pas par utilisateur, sinon fermer un onglet efface la présence des autres). Le client déclare son état par `POST/api/presence`. Le serveur envoie un événement SSE `presence` aux membres du projet, au plus une fois toutes les 5 secondes par projet.

## 14. Modèle de données

Conventions : clé primaire `INTEGER` nommée d'après la table (`userId`, `helpRequestId`, §12.5), unicité par `CREATE UNIQUE INDEX`, dates en `REAL` (timestamp en secondes, avec décimales, donné par `now()` de `@01edu/time` : c'est l'unité de Tournament et de `createdAt` des entries), données structurées en colonne `JSON` validée à l'écriture, clés étrangères déclarées avec `join` (appliquées grâce à `PRAGMA foreign_keys = ON`). Il n'y a **pas de table Activity** : l'activité est une requête sur les entries.

**Données de démonstration.** Toute entry et toute ligne racine créées par le seed portent `source = demo`. Les lignes racines sont `User`, `Project`, `Repository`, `PullRequest`, `Issue`, `Review`, `ProjectMessage`, `HelpRequest`, `Community`, `Post` et `Media` ; leur colonne `source` vaut `demo`, `github` (synchronisée) ou `platform` (écrite sur Pamoja). Une ligne qui en dépend (profil, membre, tâche, match…) suit la source de son parent. `UserSkill.source` et `CiRun.source` gardent leur sens propre, décrit dans leur ligne.

**Seed.** `deno task seed` recrée la base de zéro puis la remplit (`task-db-seed.ts`, `api/seed.ts`) : il est donc rejouable avant chaque répétition. Il exige le serveur arrêté, qui garde la base ouverte, et refuse de tourner en production sans `--prod`. Ses données sont celles des fixtures du web (développeurs, communautés, projets, rôles, besoins, jalons, abonnements), pour que les écrans montrent le même monde une fois branchés sur l'API ; les entries sont antidatées. Un développeur fictif reçoit un `githubId` négatif, qu'aucun compte GitHub ne porte. `SEED_GITHUB_IDS` (`login:githubId`) relie les développeurs de la démo à leurs vrais comptes : à la connexion, le compte retrouve le profil seedé par son `githubId` (§5.3). Ce compte garde le login de la démo (son adresse `/@login`) ; son login GitHub réel est gardé à part (`User.githubLogin`), pour le lien vers GitHub et la lecture de ses repos. Un login ne désigne qu'un compte, sans tenir compte de la casse : un compte GitHub qui prend un login tenu par un autre (renommé ou libéré sur GitHub) le reçoit, l'ancien devient `login~githubId` jusqu'à sa prochaine connexion. En dev, la connexion simulée entre dans le compte seedé « abdou ». L'interface les affiche avec la mention « donnée de démonstration » ; seules les preuves issues d'une action GitHub réelle portent « vérifié par GitHub ». Les deux ne sont jamais confondues.

### 14.1 Identité et profil

| Table | Champs | Contraintes |
| --- | --- | --- |
| `User` | userId, githubId, githubUsername, avatarUrl, email?, suspendedUntil?, source, createdAt, updatedAt | UNIQUE(githubId). On identifie par `githubId`, jamais par le username, qui peut changer |
| `Profile` | profileId, userId, displayName, headline?, bio?, country?, city?, website?, coverUrl?, theme, accent, availability, sectionOrder? (JSON), featured? (JSON), matchingMode (instant / digest / off), matchingFilters? (JSON), createdAt, updatedAt | UNIQUE(userId) |
| `Skill` | skillId, slug, name, category | UNIQUE(slug) |
| `SkillAlias` | skillAliasId, alias, skillId | UNIQUE(alias) ; ex. `postgres` → `postgresql` |
| `UserSkill` | userSkillId, userId, skillId, source (declared / github / platform\_activity), createdAt | UNIQUE(userId, skillId, source) |
| `UserIntent` | userIntentId, userId, intent | UNIQUE(userId, intent) |
| `Follow` | followId, followerId, targetType (user / project / community), targetId, createdAt | UNIQUE(followerId, targetType, targetId) |

### 14.2 GitHub

| Table | Champs | Contraintes |
| --- | --- | --- |
| `GithubInstallation` | installationId, githubInstallationId, accountLogin, accountType (User / Organization), installedByUserId?, createdAt, updatedAt | UNIQUE(githubInstallationId) |
| `Repository` | repositoryId, projectId, githubId, installationId?, owner, name, fullName, defaultBranch, syncMode (poll / live), etag? (JSON), lastSyncedAt?, source, readme?, stats? (JSON : étoiles, forks, topics, langages, contributeurs, issues et PRs ouvertes, release) | UNIQUE(githubId) |
| `PullRequest` | pullRequestId, repositoryId, githubId, number, title, state (open / merged / closed), authorGithubId, additions, deletions, mergedAt?, source, createdAt, updatedAt, authorLogin?, branch?, headSha?, skills? (JSON d'ids : langages des fichiers modifiés), skillsSha? (commit auquel ils ont été lus) | UNIQUE(repositoryId, number) |
| `Issue` | issueId, repositoryId, githubId, number, title, state, labels (JSON), authorGithubId, source, createdAt, updatedAt, authorLogin?, comments? | UNIQUE(repositoryId, number) |
| `Review` | reviewId, pullRequestId, githubReviewId, reviewerGithubId, reviewerUserId?, state, commentCount, submittedAt, helpRequestId?, source | UNIQUE(githubReviewId) |
| `WebhookDelivery` | deliveryId, githubDeliveryId, event, repositoryId?, payload (JSON), status (received / processing / done / failed), attempts, lastError?, receivedAt, processingStartedAt?, processedAt? | UNIQUE(githubDeliveryId) ; index (status, receivedAt). Sert de file persistante |

Aucune table de tokens : aucun token utilisateur n'est stocké (§5.2).

### 14.3 Projets

| Table | Champs | Contraintes |
| --- | --- | --- |
| `Project` | projectId, ownerId, name, slug, description, vision?, visibility (public / unlisted), status, source, createdAt, updatedAt, skills? (JSON d'ids : la stack) | UNIQUE(slug) |
| `ProjectMember` | projectMemberId, projectId, userId, role (owner / maintainer / contributor / reviewer / observer), joinedAt | UNIQUE(projectId, userId) |
| `JoinRequest` | joinRequestId, projectId, userId, areas (JSON), availability, message, status, createdAt | Index (projectId, status) |
| `ProjectNeed` | projectNeedId, projectId, type, title, description?, skills (JSON d'ids), status, createdAt, updatedAt | Index (projectId, status) |
| `Milestone` | milestoneId, projectId, title, description?, status (planned / active / done), position, createdAt | — |
| `Task` | taskId, projectId, milestoneId?, boardColumn (backlog / ready / in\_progress / review / done), title, description?, priority?, assigneeId?, issueId?, pullRequestId?, rank (TEXT), createdAt, updatedAt | Index (projectId, boardColumn, rank). `boardColumn` et non `column`, mot réservé SQL que `createTable` n'échappe pas |
| `ProjectMessage` | messageId, projectId, channel (general / help / announcements), authorId, body, parentMessageId?, parentEntryId? (fil sous une alerte de `#suivi`), hiddenAt?, source, createdAt | Index (projectId, channel, createdAt) |
| `ChannelState` | channelStateId, userId, projectId, channel (general / tracking / help / announcements), lastReadAt?, notify (all / mentions / mine / none) | UNIQUE(userId, projectId, channel) |
| `CiRun` | ciRunId, repositoryId, githubId, source (actions / checks / status), name, headSha, branch, pullRequestId?, conclusion?, url, completedAt? | UNIQUE(repositoryId, source, githubId) ; sert à détecter « CI réparée » |
| `MessageReaction` | messageReactionId, messageId, userId, emoji | UNIQUE(messageId, userId, emoji) |
| `ProjectSummary` | projectSummaryId, projectId, period, content, inputHash, createdAt | Résumés IA du Pulse |

Les colonnes ajoutées après le schéma initial (`readme`, `stats`, `skills`, `authorLogin`, `branch`, `comments`) viennent de `migrations/002-import-fields.js` ; SQLite n'ajoutant une colonne obligatoire qu'avec une valeur par défaut, elles sont facultatives.

`Task.rank` est un rang fractionnaire en texte : insérer une carte entre deux autres ne renumérote pas la colonne.

### 14.4 Aide, matching, réputation

| Table | Champs | Contraintes |
| --- | --- | --- |
| `HelpRequest` | helpRequestId, authorId, targetUserId? (collaboration request), projectId?, pullRequestId?, category, title, description, skills (JSON d'ids), expectedLevel?, estimatedMinutes?, status, acceptedBy?, acceptedAt?, deliveredAt? (aide livrée ou review vue sur GitHub), confirmedAt?, expiresAt, source, createdAt, updatedAt, videoUrl?, helperRemindedAt?, confirmRemindedAt?, lastWaveAt? (dernière vague du matching) | Index (status), (authorId) |
| `HelpMatch` | helpMatchId, helpRequestId, userId, score, reasons (JSON), wave, newcomerSlot, notifiedAt?, status (notified / accepted / declined / withdrawn / released) | UNIQUE(helpRequestId, userId) |
| `HelpMessage` | helpMessageId, helpRequestId, authorId, body (Markdown), createdAt | Index (helpRequestId, createdAt) ; seuls le demandeur et l'aidant accepté écrivent et lisent |
| `Notification` | notificationId, userId, type, category, entryId?, actorId?, payload (JSON), readAt?, createdAt | Index (userId, readAt, createdAt) |
| `BadgeProgress` | badgeProgressId, userId, badge, level, count, updatedAt | UNIQUE(userId, badge) |
| `Embedding` | embeddingId, targetType (user / help\_request), targetId, model, vector (BLOB), inputHash, createdAt | UNIQUE(targetType, targetId, model) |

Les badges sont définis dans le code (constantes, §8.2), pas en base.

### 14.5 Communautés et feed

| Table | Champs | Contraintes |
| --- | --- | --- |
| `Community` | communityId, slug, name, type (technology / country / domain), description, countryCode?, source, createdAt | UNIQUE(slug) |
| `CommunityMember` | communityMemberId, communityId, userId, role (member / moderator), joinedAt | UNIQUE(communityId, userId) |
| `Post` | postId, authorId, communityId?, projectId?, type, title?, body, attachments? (JSON), parentId? (réponse à un post), rootId? (premier post du fil), repostOfId? (republication), acceptedReplyId?, hiddenAt?, source, createdAt, updatedAt | Index (communityId, createdAt), (parentId, createdAt), (rootId) |
| `Reaction` | reactionId, userId, targetType, targetId, kind (like / useful) | UNIQUE(userId, targetType, targetId, kind) |
| `Bookmark` | bookmarkId, userId, postId, createdAt | UNIQUE(userId, postId) |
| Report | reportId, reporterId, targetType, targetId, reason, comment?, status (open / resolved / dismissed), createdAt, resolvedAt? | UNIQUE(reporterId, targetType, targetId) ; index (status, createdAt) |
| ModerationAction | moderationActionId, moderatorId, reportId?, targetType, targetId, action (dismiss / hide / warn / suspend / revoke\_evidence), reason, until?, createdAt | Historique immuable |
| `Conversation` | conversationId, startedBy, status (pending / accepted / declined), createdAt, updatedAt (dernier message) | Une seule par paire de développeurs |
| `ConversationMember` | conversationMemberId, conversationId, userId, lastReadAt? | UNIQUE(conversationId, userId) ; index (userId) |
| `DirectMessage` | directMessageId, conversationId, authorId, body, createdAt | Index (conversationId, createdAt) |
| `UserBlock` | userBlockId, blockerId, blockedId, createdAt | UNIQUE(blockerId, blockedId) |
| Media | mediaId, ownerId, storageKey, mime, width, height, bytes, targetType? (profile\_cover / project\_gallery / post / help\_request / message), targetId?, position, hiddenAt?, source, createdAt | Index (targetType, targetId) ; sans cible après 24 h → supprimée. Les vidéos intégrées sont stockées en JSON dans le contenu qui les porte (provider, videoId, url, title, thumbnailUrl) |

### 14.6 Entries

Relations déclarées dans `initEntries` dès le départ : `userId`, `projectId`, `helpRequestId`, `pullRequestId`, `issueId`, `taskId`, `messageId`, `postId`, `communityId`, `notificationId`. Les types et leurs destinataires sont listés au §13.3. Liste complète des types à maintenir dans `api/entries.ts`, en ajoutant toujours à la fin.

- **Numéros continus** : au démarrage, la librairie insère les types manquants dans la table `type` et vérifie que l'id obtenu est le numéro déclaré. Les numéros vont donc de 1 à N sans trou.
- **`source` sur chaque entry** : `demo`, `github` ou `platform`, en champ (`fields`) pour pouvoir le filtrer en SQL.
- **Champs figés des preuves** (§8.3) : `REVIEW_HELP_CONFIRMED` et `HELP_CONFIRMED` gardent `requesterId`, `skills` (ids, slugs et noms au moment de l'aide), `helpCategory` ; `REVIEW_HELP_CONFIRMED` y ajoute `repository`, `prNumber`, `githubReviewId`, `reviewState`, `url`. `PR_MERGED` garde `repository`, `prNumber`, `url`, `authorGithubId`, `authorIsOwner` ; `ANSWER_ACCEPTED` garde `askerId` ; `RELEASE_PUBLISHED` garde `repository`, `tag`, `url`. Toutes y ajoutent `eligible`, `exclusionReason` et `rulesVersion`.
- **Pas de champ vide** : chaque champ est une table `entry<Champ>` dont la valeur est `NOT NULL`. Un champ sans objet n'est pas déclaré sur ce type ; `exclusionReason` vaut `''` quand la preuve est éligible.
- **Pas de suppression** : une ligne citée par une relation d'entry ne peut plus être supprimée (clé étrangère). On change son statut ou on la masque ; l'historique reste intact.

## 15. Routes API

Format `@01edu/api` : clé `'METHODE/chemin'` sans paramètre de chemin ; identifiants en query string pour `GET`, en corps JSON pour `POST`. Lecture en `GET`, toute écriture en `POST`. Chaque route déclare `input`, `output`, `authorize` et `description` (la doc est générée à partir de ces déclarations, comme dans Tournament).

| Domaine | Routes |
| --- | --- |
| Auth | `GET/api/auth/github` · `POST/api/auth/github/callback` · `POST/api/auth/logout` · `GET/api/user/me` |
| Profil | `GET/api/user` (username) · `POST/api/user/profile/update` · `POST/api/user/skills/update` · `POST/api/user/intents/update` · `GET/api/user/activity` (username) · `GET/api/user/badges` (username) · `GET/api/user/proofs` (username) · `GET/api/user/card` (username) |
| GitHub | `GET/api/github/repositories` · `GET/api/github/repository` (name : l'aperçu de l'import) · `GET/api/github/installation/start` (project) · `POST/api/github/installation/confirm` · `POST/api/github/webhook` |
| Projets | `GET/api/project` (slug) · `GET/api/projects` (filtres ; sans filtre, les projets dont on est membre) · `POST/api/project/import` · `POST/api/project/create` · `POST/api/project/update` · `GET/api/project/pulse` · `GET/api/project/health` · `GET/api/project/story` |
| Équipe | `POST/api/project/join` · `GET/api/project/join-requests` · `POST/api/project/join-request/decide` · `POST/api/project/member/role` · `POST/api/project/member/remove` |
| Besoins | `GET/api/project/needs` · `POST/api/project/need/create` · `POST/api/project/need/update` · `GET/api/project/recommended-contributors` |
| Board, Roadmap | `GET/api/project/board` · `POST/api/task/create` · `POST/api/task/update` · `POST/api/task/move` · `POST/api/task/delete` · `GET/api/project/roadmap` · `POST/api/milestone/create` · `POST/api/milestone/update` |
| Canaux, présence | `GET/api/project/channel` (projectId, channel, curseur) · `GET/api/project/channel/thread` · `POST/api/project/message/create` (channel, parent facultatif) · `POST/api/project/message/react` · `POST/api/project/channel/read` · `POST/api/project/channel/notify` · `POST/api/presence` |
| Aide | `GET/api/help` (filtres) · `GET/api/help/detail` (id) · `POST/api/help/create` · `POST/api/help/accept` · `POST/api/help/deliver` · `POST/api/help/confirm` · `POST/api/help/cancel` · `GET/api/help/for-me` |
| Notifications | `GET/api/notifications` · `POST/api/notification/read` · `POST/api/notifications/read-all` · `POST/api/notification/preferences` |
| Communautés, feed | `GET/api/communities` · `GET/api/community` (slug) · `POST/api/community/create` · `POST/api/community/join` · `GET/api/feed` (onglet, curseur) · `POST/api/post/create` · `POST/api/post/reply` · `POST/api/post/repost` · `GET/api/post/thread` (id, profondeur) · `POST/api/post/accept-answer` · `POST/api/reaction/toggle` · `POST/api/bookmark/toggle` · `POST/api/follow/toggle` |
| Messages | `GET/api/conversations` · `GET/api/conversation` (id, avant) · `POST/api/conversation/start` (username, body) · `POST/api/conversation/message` · `POST/api/conversation/read` · `POST/api/conversation/accept` · `POST/api/conversation/decline` · `POST/api/user/block` (username, blocked) · `POST/api/conversation/report` (message, motif) |
| Découverte | `GET/api/explore/developers` · `GET/api/explore/projects` · `GET/api/explore/work` · `GET/api/search` |
| Temps réel | `GET/api/events` |
| Modération | POST/api/report/create · GET/api/moderation/queue · POST/api/moderation/action · GET/api/moderation/history |
| Aide (suite) | POST/api/help/withdraw · POST/api/help/release · POST/api/help/reopen · POST/api/help/decline · POST/api/help/message · GET/api/help/preview (type, skills, projet : la vague que le formulaire annonce) |

## 16. Sécurité

L'app GitHub est en lecture seule : dans le pire des cas, une faille côté GitHub expose des données déjà publiques, sans possibilité de modifier le code. Les risques réels sont sur la plateforme elle-même.

| Risque | Conséquence | Parade |
| --- | --- | --- |
| Webhook falsifié | Faux « PR merged » ou fausse review, badges fabriqués | Vérification HMAC SHA-256 de `X-Hub-Signature-256` sur le corps brut, comparaison en temps constant, avant tout traitement |
| Rejeu de webhook | Double comptage | `WebhookDelivery` avec UNIQUE(githubDeliveryId) |
| `installation_id` forgé dans la Setup URL | Rattacher l'installation d'un autre | Trois contrôles : identité, repo couvert par l'installation, droit admin ou maintain sur le repo (§5.4) |
| CSRF au login | Victime connectée sur le compte de l'attaquant | `state` signé, à usage unique, valable 10 min, lié au navigateur par le cookie `oauth_nonce` (§5.3) |
| Vol de session | Prise de compte | Cookie `httpOnly`, `secure`, `SameSite=Lax` ; toutes les écritures en `POST` JSON |
| Fuite de secrets | Usurpation de l'app ou du bot | Variables d'environnement uniquement, jamais dans le repo ni côté client, rotation documentée |
| XSS par Markdown | Script exécuté chez les visiteurs (README importés, posts, messages) | Rendu Markdown avec HTML désactivé ou sanitizer, liens externes en `rel="noopener nofollow"` |
| Lien externe ouvert dans l'onglet de Pamoja | La page ouverte peut rediriger l'onglet d'origine vers un faux Pamoja (tabnabbing) | Tout lien qui sort de Pamoja s'ouvre dans un nouvel onglet, en `rel="noopener noreferrer"`, par une règle unique (`web/lib/external-links.ts`) ; la connexion et l'installation vont sur GitHub dans le même onglet, puisqu'elles en reviennent |
| Usurpation d'identité GitHub | Un username libéré puis repris | Identification par `githubId` |
| Fuite par SSE | Recevoir les événements d'un projet non public | Abonnements calculés côté serveur, `trigger` explicite sur chaque type (§13) |
| Contournement de rôle | Actions d'Owner par un Contributor | `authorize` + vérification du rôle dans chaque route d'écriture |
| Spam et abus | Flood de demandes, de messages ou de matching | Limite de débit par utilisateur sur les routes d'écriture ; plafonds de matching (§7.3). Messages directs : comptés en base, donc tenus après un redémarrage (§10.6) |
| Message direct non sollicité | Spam ou harcèlement en privé | Demande de message pour un inconnu, un seul message avant acceptation, refus définitif, blocage, signalement (§10.6) |
| Contenu démesuré | Un texte de 100 000 caractères, ou un mot sans espace, casse le fil et la page | Taille maximale par champ, vérifiée par le serveur et décomptée par la page (`api/limits.ts`, ci-dessous) ; tout mot trop long se coupe dans sa colonne ; un long post se replie |
| Injection SQL | Lecture ou écriture arbitraire | Paramètres liés uniquement (`?` ou `:nom`) : le tag `sql` de `@01edu/db` recopie ses valeurs dans le texte de la requête, donc aucune valeur venue d'un utilisateur n'y entre (§12.5) |
| Outils de dev de `@01edu/api` | Hors production, `POST/api/sql/execute` exécute n'importe quel SQL sans session, depuis le réseau local, le tunnel ou une page piégée | Pamoja ne sert ni `POST/api/sql/execute`, ni `GET/api/sql/metrics`, ni `GET/api/router/metrics`, quel que soit `APP_ENV` (404) ; le serveur de dev n'écoute que sur `127.0.0.1` ; le tunnel de dev ne laisse passer que `POST/api/github/webhook` (§5.6) |
| Détournement de l'IA | Sortie manipulée par un README | Contenu encadré comme donnée, sortie JSON validée (§11) |
| Meilisearch exposé | Lecture ou modification de l'index par n'importe qui | Conteneur joignable uniquement depuis l'app, clé maître côté serveur, aucun contenu non public indexé |
| Photo publiée avec sa position GPS | Fuite du lieu de vie d'un utilisateur | Réencodage dans le navigateur avant l'envoi, qui supprime les métadonnées EXIF (§17.3) |
| Iframe vidéo malveillante | Contenu tiers arbitraire dans la page | Liste fermée de fournisseurs, URL du lecteur construite par le serveur, \`frame-src\` limité à ces domaines |

**Taille de ce qu'un membre écrit** (`api/limits.ts`, en caractères, proche de LinkedIn). Le serveur refuse au-delà avec un message clair ; la page bloque la saisie à la limite et affiche un compteur à l'approche.

| Champ | Limite |
| --- | --- |
| Nom affiché · accroche · bio · ville · pays écrit à la main · site | 70 · 220 · 2 600 · 80 · 80 · 200 |
| Post : titre · texte · réponse | 150 · 3 000 · 1 250 |
| Message d'un canal de projet | 2 000 |
| Demande d'aide : titre · description · message du fil | 140 · 8 000 · 4 000 |
| Projet : nom · description · vision | 80 · 300 · 1 000 |
| Communauté : nom · description | 60 · 500 |
| Signalement, proposition de collaboration, candidature, note de modération | 1 000 |

Les journaux du serveur ne gardent ni le texte des messages, ni les bios et descriptions, ni le `code` et le `state` de la connexion GitHub (`sensitiveKeys` du routeur).

## 17. Pages publiques, médias, déploiement et sauvegardes

### 17.1 Aperçus de partage et SEO

Une SPA seule renvoie un `index.html` vide de contenu : un lien `/@abdou` collé sur LinkedIn, X, WhatsApp, Discord ou Slack n'aurait aucun aperçu. Le serveur de production lit déjà `dist/index.html` au démarrage (comme `prod-server.ts`) ; pour `/@username` et `/projet/slug`, il y injecte avant de répondre :

- `<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card = summary_large_image` ;
- valeurs lues en base et **échappées en HTML** (un nom de profil peut contenir du HTML).

Toutes les autres routes reçoivent les balises par défaut. Un `sitemap.xml` liste les profils et projets publics.

### 17.2 Share Card et images OG

Image PNG 1200 × 630 générée côté serveur : composant JSX → SVG avec `satori`, puis SVG → PNG avec `@resvg/resvg-wasm`, polices embarquées dans le binaire. Mise en cache sur disque, clé = empreinte des données affichées ; régénérée quand elles changent. Servie par `GET/api/user/card` et utilisée comme `og:image`.

### 17.3 Images et vidéos

Les images sont uploadées et hébergées par la plateforme. Les vidéos ne le sont pas : elles sont intégrées par lien.

**Images**

| Usage | Limite |
| --- | --- |
| Cover de profil | 1 |
| Galerie de la page projet | 8 captures d'écran |
| Post du feed | 4 |
| Demande d'aide (capture d'une erreur, d'un écran) | 4 |
| Message d'un canal | 1 |
| Share Card et images OG | Générées par le serveur (§17.2) |

Les avatars restent ceux de GitHub.

- **Préparation dans le navigateur** : avant l'envoi, l'image est redimensionnée (2 000 px maximum sur le plus grand côté) et réencodée en WebP ou JPEG via un canvas. L'upload est plus léger et les métadonnées EXIF disparaissent, dont les **coordonnées GPS** que contiennent souvent les photos prises au téléphone.
- **Upload** : route `POST/api/media/upload`, déclarée sans `input` (lecture du `FormData` dans le handler). Formats JPEG, PNG, WebP ; type vérifié sur les premiers octets du fichier, pas sur l'extension ; 2 Mo maximum ; 20 uploads par utilisateur et par heure.
- **Rattachement** : l'upload crée une ligne `Media` sans cible ; elle est rattachée au post, à la demande ou au projet à l'enregistrement. Une image jamais rattachée est supprimée au bout de 24 h.
- **Stockage** : jamais dans SQLite. Volume disque persistant de la VM Systalink ; stockage objet seulement si Systalink en propose un. Le nom du fichier est un identifiant aléatoire. Les images sont servies avec leur vrai type MIME et un cache long.
- **Modération** : une image se signale comme le contenu qui la porte (§10.5) ; masquer le contenu masque ses images.

**Vidéos intégrées par lien**

Un lien YouTube, Loom ou Vimeo collé dans un post, une page projet (vidéo de démo), une demande d'aide (par exemple un Loom qui montre le bug) ou un message de canal s'affiche en lecteur intégré.

- **Fournisseurs autorisés** : YouTube (lecteur `youtube-nocookie.com`), Loom, Vimeo. Tout autre lien reste un lien simple.
- **Stockage** : uniquement les métadonnées (`provider`, identifiant de la vidéo, URL, titre, miniature), récupérées une fois côté serveur via oEmbed et mises en cache.
- **Affichage** : la miniature s'affiche d'abord ; le lecteur (iframe) ne se charge qu'au clic. La page reste rapide et aucun tiers n'est contacté tant que la vidéo n'est pas lancée.
- **Sécurité** : iframes limitées à ces domaines par la politique de sécurité de contenu (`frame-src`).

L'upload vidéo natif est hors périmètre CADEV : il exige la conversion des formats (un iPhone filme en HEVC, que beaucoup de navigateurs ne lisent pas), du stockage lourd et du streaming. Si le besoin apparaît ensuite, il passera par un service spécialisé (Cloudflare Stream, Mux, Bunny Stream).

### 17.4 Déploiement

- Dockerfile multi-stage et binaire `deno compile`, comme Tournament ; l'étape de build compile aussi le CSS Tailwind.
- **`APP_ENV=prod` obligatoire** : c'est cette variable qui active le mode WAL dans `@01edu/db`.
- Hébergement chez Systalink (cloud souverain, datacenters à Dakar) : une VM avec Docker. Une seule instance de l'app. Fichier SQLite sur un volume persistant. Meilisearch dans un second conteneur avec son propre volume, version fixée, joignable uniquement depuis l'app (jamais exposé par Caddy), clé maître en variable d'environnement.
- Caddy en reverse proxy : HTTPS automatique et **HTTP/2** (§13.5), sans mise en tampon des réponses SSE.
- Les logs passent par l'équivalent de `api/lib/log.ts`.

### 17.5 Sauvegardes

La réputation est la donnée la plus précieuse du produit.

- Snapshot toutes les heures avec `VACUUM INTO` (copie cohérente de la base sans arrêt du service), conservé 7 jours.
- Copie quotidienne hors de la VM, sur un autre stockage Systalink (les données restent au Sénégal), en complément des sauvegardes proposées par Systalink.
- Une restauration testée au moins une fois avant la démo.

### 17.6 Évolution

Passage à PostgreSQL et à un bus d'événements distribué seulement si l'un de ces besoins apparaît : plusieurs instances backend, écritures concurrentes très nombreuses, workers distribués, haute disponibilité. Rien de cela n'est nécessaire pour CADEV.

## 18. Démo CADEV

La démo raconte une seule histoire continue, en conditions réelles : vrai login GitHub, vraie PR, vraie review, vrai webhook, sur l'environnement de production.

### 18.1 Prérequis

- [ ] **Repo public OpenPay Africa** sous le compte GitHub perso d'Abdou (pas sous une organisation : l'installation de l'app est alors immédiate).
- [ ] **App installée** sur ce repo avant la démo, webhook testé vers l'URL de prod.
- [ ] **Deux vrais comptes GitHub** : Abdou, auteur de la PR #81, et Moussa, reviewer. GitHub interdit d'approuver sa propre PR, et nos règles excluent l'auto-review.
- [ ] **PR #81 ouverte par Abdou**, sans review.
- [ ] **Deux machines ou navigateurs** côte à côte : écran d'Abdou et écran de Moussa, tous deux connectés.
- [ ] **Seed** : développeurs de plusieurs pays, projets, communautés, historique d'entries. Moussa (Côte d'Ivoire) a les skills Go, SQLite, Backend, le matching en Instant et 14 reviews confirmées seedées (source = demo) venant d'au moins 3 demandeurs et 2 projets. Les `githubId` des vrais comptes d'Abdou et de Moussa sont dans `SEED_GITHUB_IDS`, pour que leur connexion ouvre leur profil seedé. Les autres profils seedés ont un score plus bas, pour que Moussa soit dans les 5 premiers.
- [ ] **Résumés IA et embeddings du seed** pré-calculés.
- [ ] **Plan B webhook** : si la review n'apparaît pas après 10 secondes, relancer la livraison depuis les paramètres de l'app GitHub (« Recent deliveries » → Redeliver) ou déclencher la resynchronisation du repo.
- [ ] **Trois répétitions complètes** en prod pendant le gel, chronométrées.

### 18.2 Scénario

1. **Login** — Abdou clique « Continue with GitHub ». Son profil est initialisé depuis GitHub.
2. **Profil** — ABDOU SOW, Backend Engineer, Dakar, Go · TypeScript · Deno.
3. **Import** — « + Create » → « Import from GitHub » → OpenPay Africa. Trois clics. Le repo étant déjà couvert par l'installation, il passe directement en synchro live.
4. **Pulse** — 3 PRs en attente de review, 1 bloqueur, 2 contributeurs actifs. Le résumé IA s'affiche quelques secondes après, sans rafraîchir.
5. **Demande** — Abdou ouvre la PR #81 et clique « Request Review ». Skills pré-remplis : Go, SQLite, Backend.
6. **Matching** — la plateforme affiche les développeurs trouvés et, pour Moussa, « Why this match? » : Go, SQLite, Backend, 14 reviews confirmées.
7. **Temps réel** — sur l'écran de Moussa apparaît, sans rafraîchir : « THIS PROJECT NEEDS YOU — OpenPay Africa — PR #81 — Go · SQLite », avec le score.
8. **Acceptation** — Moussa accepte ; l'écran d'Abdou se met à jour.
9. **Review sur GitHub** — Moussa fait une vraie review de la PR #81.
10. **Détection** — le webhook `pull_request_review` arrive ; « Review submitted » s'affiche sur les deux écrans, et l'alerte apparaît en direct dans `#suivi`.
11. **Confirmation** — Abdou répond « Was this helpful? → Yes ».
12. **Réputation** — entry `REVIEW_HELP_CONFIRMED`. Profil de Moussa : reviews 14 → 15, Trusted Reviewer 15 / 20 vers le niveau Gold. La 15e review porte « vérifiée par GitHub », les 14 précédentes « donnée de démonstration » : le jury voit la différence entre une preuve réelle et une donnée de démo.
13. **Pulse** — « Review reçue » sur la PR #81 ; PRs en attente de review : 3 → 2. Le bloqueur reste affiché tant qu'aucune action explicite ne le lève.
14. **Profil** — le jury ouvre le profil de Moussa : reviews vérifiées, contributions, développeurs aidés, Collaboration Map (Côte d'Ivoire, Sénégal, Cameroun), puis sa Share Card.

**Variante, si le temps le permet** : une PR dont la CI échoue apparaît dans `#suivi` ; Abdou clique « Demander de l'aide » et la demande Debugging est créée, pré-remplie avec le job en échec.

**Message final** : *Developers shouldn't only connect. They should build together. Every collaboration becomes part of their story. Your work is your profile.*

## 19. Métriques et définition du succès

**North Star** : nombre de collaborations réussies par semaine. Une collaboration réussie = une demande d'aide `completed` (dont les reviews confirmées), une PR mergée d'un contributeur externe, ou une tâche terminée par un membre arrivé via la plateforme.

**Métriques secondaires** : développeurs actifs, projets actifs, demandes d'aide créées, taux de demandes acceptées, délai médian avant première réponse, reviews confirmées, collaborations entre pays différents, rétention des contributeurs. Toutes se calculent par requêtes sur les entries.

**Le produit est réussi si un développeur peut :**

1. Se connecter avec GitHub.
2. Créer une vraie identité de développeur.
3. Importer un projet en quelques clics.
4. Comprendre immédiatement l'état d'un projet.
5. Demander une aide précise.
6. Atteindre automatiquement les bonnes personnes.
7. Recevoir cette aide.
8. Voir la collaboration vérifiée grâce à GitHub.
9. La voir transformée en réputation.
10. Partager un profil qui montre ce qu'il a réellement fait.

## 20. Points ouverts

Ce qui reste à décider ou à vérifier avant ou pendant le bloc 1.

- [ ] **Nom et identifiants** : nom retenu, Pamoja. Vérifier la disponibilité du domaine, de l'organisation GitHub et du nom de la GitHub App (unique sur tout GitHub).
- [ ] **Fournisseur IA** : modèle de génération, modèle d'embeddings, budget.
- [ ] **Hébergement Systalink**, à valider avant la fin de J2 : VM avec Docker ; IP publique et ports 80/443 ouverts (certificat HTTPS automatique de Caddy) ; sortie autorisée vers `api.github.com` et le fournisseur IA ; entrée des webhooks GitHub ; taille de disque ; offre de sauvegarde ; nom de domaine et DNS.
- [ ] **Reverse proxy** : Caddy retenu (HTTP/2 actif par défaut avec HTTPS, réponses SSE transmises sans tampon). À vérifier une fois en prod : protocole h2 dans l'onglet Réseau et arrivée instantanée des notifications.
- [ ] **Meilisearch** : version à fixer, emplacement du conteneur chez l'hébergeur, réglages de pertinence (champs cherchables et leur ordre) à ajuster après le seed.
- [x] **daisyUI** : écarté le 8 octobre, Tailwind v4 seul (§12.3).
- [ ] **Seuils** de badges et poids du matching : ajuster après le seed.
- [ ] **Mentions légales** : conditions d'utilisation et politique de confidentialité (données GitHub, emails).
