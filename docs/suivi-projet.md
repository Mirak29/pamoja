# Suivi de projet — Pamoja

Journal de ce qui a été réalisé, tâche par tâche, du plus ancien au plus récent. Il complète `TODO.md` (ce qui reste à faire) et son journal des décisions (ce qui a changé dans les règles).

**Règle** : chaque tâche terminée ajoute son entrée ici, **dans la même PR** que la tâche, en suivant ce modèle :

```markdown
### AAAA-MM-JJ · PAM-xxx · Titre de la tâche

Ce qui a été fait, en une à trois phrases.

- **Livrable** : fichiers, page ou PR concernés.
- **Par** : @login
```

Une tâche abandonnée ou fusionnée va dans la section « Fermé sans réalisation », avec sa raison.

## Cadrage (avant la todo)

### 2026-10-07 · Revue technique du cahier des charges initial

Vérification de la stack annoncée par rapport au code de Tournament et correction des écarts : build esbuild au lieu de Vite, routes de `@01edu/api` sans paramètre de chemin, réglages SQLite à appliquer soi-même, permissions GitHub.

- **Livrable** : retour technique transmis à l'équipe.
- **Par** : Abdou

### 2026-10-07 · Cahier des charges de référence

Rédaction du cahier des charges en 20 sections : produit, règles métier, architecture, modèle de données, routes, sécurité, démo. Les faits techniques sont vérifiés dans le code source de `@01edu`.

- **Livrable** : `docs/cahier-des-charges.md`
- **Par** : Abdou

### 2026-10-07 · Conception de l'intégration GitHub

GitHub App en lecture seule, repos publics uniquement, aucun token utilisateur stocké, import en deux niveaux (vitrine sans installation, synchro live avec installation), webhooks dans une file qui survit aux redémarrages.

- **Livrable** : `docs/cahier-des-charges.md` §5
- **Par** : Abdou

### 2026-10-07 · Intégration d'une relecture externe

Corrections issues d'une relecture : trois contrôles de droits à l'installation de l'app, cycle de vie complet d'une demande d'aide, réputation fondée sur des preuves figées et des règles anti-abus, modération, critères d'acceptation par bloc.

- **Livrable** : `docs/cahier-des-charges.md` §4, §5, §7, §8, §10.5
- **Par** : Abdou

### 2026-10-07 · Choix d'infrastructure

Hébergement chez Systalink (imposé), Caddy comme reverse proxy, Meilisearch pour la recherche, images uploadées et vidéos intégrées par lien.

- **Livrable** : `docs/cahier-des-charges.md` §10.4, §17
- **Par** : Abdou

### 2026-10-07 · Organisation des projets en canaux

Quatre canaux imposés par projet, façon Discord : `#général`, `#suivi`, `#aide`, `#annonces`. Les alertes GitHub et CI/CD de `#suivi` mènent à la boucle d'aide (« Demander de l'aide », « Demander une review »).

- **Livrable** : `docs/cahier-des-charges.md` §6.8
- **Par** : Abdou

### 2026-10-07 · Nom et inscription au concours

Choix du nom Pamoja (« ensemble » en swahili) et rédaction des textes du formulaire CADEV : description et stack.

- **Livrable** : `docs/cadev-inscription.md`
- **Par** : Abdou

### 2026-10-07 · Mise en place du suivi de projet

Création du repo, de la todo (identifiants `PAM-xxx`, planning, critères d'acceptation, règles de mise à jour, journal des décisions) et du `CLAUDE.md` partagé avec niangoos.

- **Livrable** : `TODO.md`, `CLAUDE.md`
- **Par** : Abdou

### 2026-10-07 · Brief du prototype

Brief autonome pour Claude Design : 47 écrans, 11 parcours jouables, données fictives cohérentes, règles métier visibles, panneau de démo.

- **Livrable** : `docs/brief-prototype-claude-design.md`
- **Par** : Abdou

## Réalisé

### 2026-10-07 · PAM-001 · Fixer le calendrier

Projet sur 10 jours, du mercredi 7 au vendredi 16 octobre 2026, avec un planning par bloc.

- **Livrable** : `TODO.md` (section Planning)
- **Par** : Abdou

### 2026-10-08 · PAM-007 · Valider l'identité visuelle

Design system Pamoja (couleurs clair et sombre, typographie, logo, composants), complété par le système isométrique issu du prototype : dalles, touches, puits, formes par type d'objet.

- **Livrable** : [design system Pamoja](https://claude.ai/artifact/Gj5ox6BNFzaDpuqaCFCWhb), `docs/identite/`
- **Par** : Abdou

### 2026-10-08 · PAM-008 · Produire le prototype complet

Prototype interactif Pamoja v2 réalisé avec Claude Design : pages, parcours, données fictives et panneau de démo. Ses écarts validés sont reportés dans le cahier des charges.

- **Livrable** : `docs/prototype/` (avec la liste de ce que le code ne reprend pas)
- **Par** : Abdou, avec Claude Design

### 2026-10-08 · PAM-101 · Initialiser le projet Deno

`deno.json` repris de Tournament (fmt, lint, `compilerOptions`, imports `@01edu` aux mêmes versions), squelette `api/` (serveur `@01edu/api` avec `GET/api/health`) et `web/`. Le dossier `migrations/` arrivera avec PAM-105 : un dossier vide n'est pas versionné. `docs/` et les fichiers Markdown sont exclus de `deno fmt` pour ne pas réécrire la prose.

- **Livrable** : `deno.json`, `api/`, `web/`, `.gitignore`, `.env-dev`, `.env-test`
- **Par** : @niangoos

### 2026-10-08 · PAM-102 · Build esbuild, serveur de dev et serveur de prod

`build-config.ts`, `task-dev.ts` et `prod-server.ts` calqués sur Tournament : esbuild en watch avec rechargement automatique, `/api` routé vers l'API, toutes les autres adresses servent la SPA (vrais chemins comme `/@moussa`). `deno task dev` écoute sur le port 8800 pour cohabiter avec Tournament ; `deno task prod` construit puis sert le build minifié.

- **Livrable** : `build-config.ts`, `task-dev.ts`, `task-prod.ts`, `prod-server.ts`, `web/debug.ts`
- **Par** : @niangoos

### 2026-10-08 · PAM-103 · Prototype à risque : Tailwind compilé sans twind

La CLI Tailwind v4 (`npm:@tailwindcss/cli`) tourne sous Deno : en watch dans `task-dev.ts`, minifiée et intégrée à `index.html` dans `task-prod.ts`. Seul `web/` est lu pour trouver les classes. daisyUI est écarté : le système isométrique rend tous les composants sur mesure (cahier des charges §12.3, journal du 8 octobre).

- **Livrable** : `web/assets/styles/style.css`, `task-dev.ts`, `task-prod.ts`, `docs/cahier-des-charges.md` §2, §12.3, §20
- **Par** : @niangoos

### 2026-10-08 · PAM-111 · Socle UI

Thème généré depuis `docs/identite/tokens.json` (`deno task theme`), polices Google, système isométrique en utilitaires CSS (dalles, touches, puits, disques, tuiles, rail d'onglets), composants communs, coquille de l'app (barre latérale, en-tête avec recherche centrée, barre mobile, menus, palette ⌘K, toasts), routage en vrais chemins, thèmes clair et sombre. Données fictives partagées dans `web/fixtures/`. Rendu comparé au prototype à 1280 px et 390 px, dans les deux thèmes. Les figures Hairline du prototype ne sont pas reprises (§12.7).

- **Livrable** : `web/ui/`, `web/assets/styles/`, `web/fixtures/`, `task-generate-theme.ts`, `task-generate-icons.js`, page `/dev/socle`
- **Par** : @niangoos

### 2026-10-08 · PAM-413 · Page projet : en-tête, onglets, Aperçu

En-tête du projet (synchro, chiffres, Suivre, Proposer mon aide, Rejoindre), rail des dix onglets en vrais chemins (`/projet/openpay-africa/pulse`), onglet Aperçu (à propos, vision, captures, vidéo de démo, activité récente, milestone en cours, besoins, équipe, dernière release) et dialogue Rejoindre avec sa validation. Les autres onglets affichent « Écran à venir » jusqu'à leur tâche.

- **Livrable** : `web/pages/project/`, `web/fixtures/` (PRs, issues, canaux), `web/lib/time.ts`
- **Par** : @niangoos

### 2026-10-08 · PAM-414 · Onglet Pulse

Résumé IA (squelette puis texte, comme à l'arrivée de `PULSE_READY`), six métriques en colonnes isométriques dont la hauteur suit la valeur, événements de la semaine, bloqueurs, Health avec la règle de chaque indicateur au survol, DNA et Story. Les données viennent de `web/fixtures/pulse.ts`, à la forme des futures routes `GET/api/project/pulse`, `health` et `story`.

- **Livrable** : `web/pages/project/pulse-tab.tsx`, `event-list.tsx`, `web/fixtures/pulse.ts`, `prism()` dans `web/ui/shapes.tsx`
- **Par** : @niangoos

### 2026-10-08 · PAM-415 · Onglet Canaux

Les quatre canaux imposés en vrais chemins (`/projet/openpay-africa/canaux/suivi`) :
- messages et alertes de la plateforme ;
- alertes actionnables : « Demander une review » sur une PR en attente, « Demander de l'aide » sur une CI en échec, vers le formulaire d'aide pré-rempli ;
- fils de discussion (`?thread=`), réactions, signalement, réglage des notifications par canal (`#suivi` sur « Seulement mes PRs » par défaut) ;
- droits d'écriture par canal, présence.

Les messages envoyés restent en mémoire pendant la session, en attendant l'API.

- **Livrable** : `web/pages/project/channels-tab.tsx`, `web/ui/rich-text.tsx`
- **Par** : @niangoos

### 2026-10-08 · PAM-416 · Onglets Pull requests et Issues

Liste des PRs (état de review et de CI), panneau latéral de détail (`?dialog=pr-81`) avec « Demander une review » pré-rempli et le lien vers GitHub ; liste des issues avec labels, filtre `good first issue` (`?filtre=good-first-issue`), place sur le Board et « Ajouter au board ».

- **Livrable** : `web/pages/project/pull-requests-tab.tsx`, `issues-tab.tsx`, `web/fixtures/board.ts`
- **Par** : @niangoos

### 2026-10-08 · PAM-216 · Écrans Aide

Trois écrans d'aide sur données fictives :
- **Liste** : onglets Pour moi (avec le score de matching), Mes demandes, Acceptées par moi, Demandes des projets.
- **Nouvelle demande** : pré-remplie depuis une PR (`?pr=`) ou une alerte CI (`?ci=`), skills en vocabulaire contrôlé tolérant aux fautes, captures, aperçu « Qui sera notifié ».
- **Détail** : frise du cycle de vie, actions selon le rôle et l'état, panneau de matching par vague avec « Pourquoi ce match ? ».

Le matching et les transitions de §7.2 sont joués par `web/fixtures/` (matching, publication, actions), comme le feront les routes `POST/api/help/*`.

- **Livrable** : `web/pages/help/`, `web/ui/help-request-card.tsx`, `web/fixtures/matching.ts`, `web/lib/fuzzy.ts`
- **Par** : @niangoos

### 2026-10-08 · PAM-217 · Écran Notifications

Centre de notifications sur données fictives :
- catégories en onglets (`?categorie=`) avec leurs non lus ;
- notification non lue sur fond indigo doux et marquée d'un losange ;
- ouverture qui marque comme lue ;
- « Tout marquer comme lu » ;
- acceptation ou refus d'une candidature depuis la notification.

Le toast gagne la variante « Ce projet a besoin de toi » (skills, score, durée, Voir la demande / Plus tard), visible dans `/dev/socle`. Les compteurs de la navigation suivent les lectures.

- **Livrable** : `web/pages/notifications.tsx`, `web/ui/toast.tsx`, `web/fixtures/notifications.ts`
- **Par** : @niangoos

### 2026-10-08 · PAM-313 · Écran Profil

Profil `/@login` sur données fictives :
- **Vue complète** : hero (cover « fil », Suivre, Proposer une collaboration, Partager, Signaler ; Partager et Modifier le profil sur son propre profil), chiffres d'activité, puis les sections dans l'ordre par défaut : en train de construire, contributions réelles, réputation en cinq dimensions, badges avec progression, activité, communautés, Collaboration Map, Collaboration Graph.
- **Preuves** : tiroir de toutes les preuves (`?dialog=preuves`) ou d'une dimension (`?dialog=preuves-review`), ouvert depuis les contributions, les barres de réputation et les badges.
- **Carte de partage** (`?dialog=partage`) : aperçu de l'image Open Graph, liens de partage LinkedIn, X et WhatsApp réels, aperçu du lien dans WhatsApp et LinkedIn.
- **Proposer une collaboration** (`?dialog=collaboration`) : type, projet et PR, message ; la proposition arrive dans les notifications du destinataire.
- **Passeport** : la vue publique, sans la coquille de l'app, affichée à `/@login?vue=publique` tant que les sessions n'existent pas (PAM-110).

La réputation, les badges et les liens de travail sont calculés depuis les preuves de `web/fixtures/reputation.ts`, comme le feront `GET/api/user` et `GET/api/user/badges`. Le passeport reprend le même calcul que la vue complète. La Collaboration Map n'ajoute jamais le pays du profil aux pays reliés (§9.3) ; sa vue s'agrandit vers le haut pour ne pas couper la plus haute colonne. Pas de figure décorative dans la carte de partage (§12.7). Le téléchargement du PNG arrive avec PAM-305.

- **Livrable** : `web/pages/profile/`, `web/fixtures/reputation.ts`
- **Par** : @niangoos

### 2026-10-08 · PAM-314 · Écran Modifier le profil

`/profil/modifier` sur données fictives :
- **Identité** : headline, bio, site.
- **Apparence** : thème (Minimal, Terminal, Cyber, Clair, Sombre), couleur d'accent (Indigo, Vert, Ambre, Corail), couverture (Le fil, Grille, Plaques, Uni).
- **Technologies et projets** : technologies du vocabulaire contrôlé, projets mis en avant.
- **Ordre des sections** : glisser-déposer ou flèches.
- **Aperçu en direct** dans le thème choisi ; « Enregistrer » applique le tout au profil.

Les thèmes et accents sont définis dans `docs/identite/tokens.json` et générés par `deno task theme` : ils redéfinissent les variables de couleur sur le profil seulement. Sur un thème sombre, l'accent prend sa valeur sombre.

- **Livrable** : `web/pages/profile/profile-edit.tsx`, `web/pages/profile/cover.tsx`, `web/fixtures/profile-settings.ts`, `task-generate-theme.ts`
- **Par** : @niangoos

### 2026-10-08 · PAM-417 · Onglets Équipe et Activité

Deux onglets du projet sur données fictives :
- **Équipe** : membres et rôles (le propriétaire change un rôle), « Ils pourraient aider » par besoin du projet avec invitation, candidatures acceptées ou refusées sur place, encart « Rejoindre » pour un non-membre, définition des rôles.
- **Activité** : journal du projet groupé par jour, filtré par GitHub, Équipe ou Aide (`?filtre=`).

Les candidatures ont maintenant une seule source, `web/fixtures/applications.ts`, utilisée par l'onglet Équipe, le dialogue « Rejoindre » et la notification de candidature. Accepter ajoute le membre et l'inscrit au journal (`web/fixtures/activity.ts`).

- **Livrable** : `web/pages/project/team-tab.tsx`, `web/pages/project/activity-tab.tsx`, `web/fixtures/applications.ts`, `web/fixtures/activity.ts`
- **Par** : @niangoos

### 2026-10-08 · PAM-418 · Onglets Board et Roadmap

Deux onglets du projet sur données fictives :
- **Board** : cinq colonnes, cartes liées à une PR (CI, mergée), à une issue (blocked) ou internes ; un membre les déplace par glisser-déposer ou par flèches et en ajoute au Backlog ; lecture seule pour un non-membre.
- **Roadmap** : chaque milestone est une colonne qui grandit avec la roadmap, pleine si terminée, en pointillé si prévue, avec sa progression.

Déplacer ou ajouter une carte s'inscrit au journal du projet ; « Ajouter au board » depuis une issue crée maintenant une vraie carte.

- **Livrable** : `web/pages/project/board-tab.tsx`, `web/pages/project/roadmap-tab.tsx`, `web/fixtures/board.ts`
- **Par** : @niangoos

### 2026-10-08 · PAM-419 · Réglages du projet

Onglet Réglages sur données fictives, réservé au propriétaire :
- **Informations** : nom, description, vision, besoins (ajout libre ou suggestions) ; « Enregistrer » ne s'active qu'après une modification.
- **Mode de synchro** : Live ou toutes les 15 min ; repasser en Live sans GitHub App ouvre le dialogue d'activation (PAM-420).
- **Rôles** : les membres et leur rôle, partagés avec l'onglet Équipe.

Un non-propriétaire qui ouvre l'adresse voit « Réservé au Propriétaire ». Les changements mettent à jour l'en-tête et s'inscrivent au journal.

- **Livrable** : `web/pages/project/settings-tab.tsx`, `updateProject` dans `web/fixtures/projects.ts`
- **Par** : @niangoos

### 2026-10-08 · PAM-420 · Écran Projets

Écran `/projets` sur données fictives :
- **Tes projets** (propriétaire ou membre) et **projets suivis**, avec « Ne plus suivre » ; suivre depuis la page d'un projet l'ajoute ici.
- **Nouveau projet** (`?dialog=new-project`) : importer un repo public (liste, aperçu, skills et besoins proposés par l'IA à valider) ou créer de zéro (nom, description, vision, technologies, visibilité, besoins).
- **Synchro live** (`?dialog=sync`, depuis la page du projet ou ses réglages) : présentation, page d'installation GitHub simulée, trois contrôles (identité, repo couvert, droit admin), puis passage en Live avec un message dans #suivi.

Un projet importé arrive avec ses issues, sa release et un message dans #suivi ; un projet créé de zéro est « Sans repo ». L'Aperçu affiche maintenant les actions de la session dans « Activité récente ».

- **Livrable** : `web/pages/projects/`, `web/pages/project/sync-dialog.tsx`, `web/fixtures/repos.ts`
- **Par** : @niangoos

### 2026-10-08 · PAM-513 · Écran Accueil

Accueil (`/`) sur données fictives :
- **Rédaction** : texte, images, bloc de code, communauté et type ; Ctrl + Entrée publie.
- **Fil** : onglets Pour toi, Abonnements, Communautés, Questions (`?fil=`) ; posts et republications, événements GitHub des projets suivis, et dans Pour toi la demande d'aide qui correspond le mieux (« Plus tard » la met de côté).
- **Posts** : réagir (J'aime, Utile), republier, enregistrer, partager le lien, signaler ; les réponses s'ouvrent sous le post, en fil imbriqué avec ses lignes de rattachement, repliées sous le premier niveau.
- **Colonne « Pour toi »** (dès 1100 px, sinon deux raccourcis en haut) : demandes qui correspondent, PRs à relire, développeurs avec qui construire, projets qui cherchent des contributeurs.
- **Nouveau post** (`?dialog=new-post`, depuis le menu Créer) : type, communauté (la rejoindre au passage), titre, contenu, images, lien vidéo.

La carte de post, le fil de réponses et le dialogue « Nouveau post » sont dans `web/ui/`, pour les écrans Communauté et Post (PAM-515).

- **Livrable** : `web/pages/home/`, `web/ui/post.tsx`, `web/ui/new-post-dialog.tsx`, actions de `web/fixtures/posts.ts`
- **Par** : @niangoos

### 2026-10-09 · PAM-514 · Écrans Explorer et Recherche

Sur données fictives :
- **Explorer** : développeurs (skill, pays, communauté, intention, disponibilité), projets (techno, stade, pays, activité, cherche des contributeurs, beginner friendly), « Sur quoi puis-je travailler ? » (demandes qui correspondent, besoins de projets, good first issues). Les filtres sont dans l'URL, ce qui permet de partager une recherche et de venir d'un skill (`/explorer?skill=Go`).
- **Recherche** (`/recherche?q=`) : tous les résultats de la recherche globale, par catégorie, tolérante aux fautes.

Les cartes Développeur et Projet sont dans `web/ui/`, pour les onglets de la page Communauté (PAM-515).

- **Livrable** : `web/pages/explore/`, `web/pages/search-page.tsx`, `web/ui/developer-card.tsx`, `web/ui/project-card.tsx`
- **Par** : @niangoos

### 2026-10-09 · PAM-515 · Écrans Communautés, communauté et post

Sur données fictives :
- **Communautés** : par technologie, pays et domaine ; rejoindre ou quitter ; nouvelle communauté (`?dialog=new-community`, aussi depuis le menu Créer).
- **Communauté** (`/communaute/:slug`) : Fil, Membres, Projets, Demandes d'aide, À propos (règles et modération) ; « Nouveau post » ouvre le dialogue avec la communauté et le type Question déjà choisis.
- **Post** (`/post/:id`) : fil parent quand c'est une réponse, contenu, réactions +1, Utile et Merci, enregistrer, signaler, toutes les réponses, réponse en bas de page.
- **Réponse acceptée** : l'auteur d'une question accepte une réponse ; son auteur gagne une preuve d'Entraide, visible sur son profil, et une notification.

- **Livrable** : `web/pages/communities/`, `web/pages/post-page.tsx`, `ParentChain` et l'acceptation dans `web/ui/post.tsx`, actions de `web/fixtures/communities.ts` et `web/fixtures/posts.ts`
- **Par** : @niangoos

### 2026-10-09 · PAM-516 · Écrans Réglages et Modération, dialogue Signaler

Sur données fictives :
- **Réglages** (`/reglages`) : compte GitHub, notifications par catégorie (app et e-mail), matching (mode, score minimum avec le nombre de demandes qui passent le seuil, skills, types d'aide acceptés), thème (Clair, Sombre, Système, qui suit le système en direct), données (export JSON réel, réinitialisation de la démo ; la suppression du compte arrive avec l'API).
- **Signaler** (`?dialog=report&report=type:id`) : un post, un message de canal, une demande d'aide ou un profil ; motif obligatoire, commentaire facultatif, anonyme pour l'auteur ; les modérateurs sont notifiés.
- **Modération** (`/moderation`, réservée aux modérateurs) : file des signalements, action (ignorer, masquer, avertir, suspendre, retirer la preuve) avec un motif obligatoire envoyé à l'auteur, historique des décisions.

- **Livrable** : `web/pages/settings-page.tsx`, `web/pages/moderation-page.tsx`, `web/ui/report-dialog.tsx`, `web/fixtures/settings.ts`, `web/fixtures/reports.ts`
- **Par** : @niangoos

### 2026-10-09 · PAM-119 · Écrans publics : landing, connexion, 404

Sur données fictives, avec une session simulée (`web/fixtures/session.ts`) en attendant le login GitHub (PAM-110) :
- **Landing** (`/` sans session) : accroche, boucle en quatre étapes, aperçu du profil de Moussa avec ses cinq dimensions, appel « Continuer avec GitHub ».
- **Connexion** (`/connexion`, et toute page de l'app ouverte sans session) : page d'autorisation GitHub simulée, droits en lecture seule ; une fois autorisée, la page demandée s'ouvre.
- **404** : toute adresse qui ne mène nulle part, avec ou sans session.
- « Se déconnecter » (menu du compte, réglages) ramène à la landing ; sans session, `/@login` est le passeport.

- **Livrable** : `web/pages/public/`, `web/ui/plates.tsx`, `web/ui/public-header.tsx`, `web/fixtures/session.ts`, routage de `web/app.tsx`
- **Par** : @niangoos

### 2026-10-09 · PAM-215 · Écran Onboarding

Sur données fictives, après « Autoriser Pamoja » sur `/connexion` : cinq étapes avec frise et barre de progression, sous les 2 minutes.
- **Profil** : ce qui vient de GitHub (avatar, nom, bio), puis headline, pays, ville et site.
- **Skills** : les 11 domaines du §6.1, puis les technologies du vocabulaire contrôlé (« postgres » propose PostgreSQL).
- **Intentions** : les 10 du §6.1, la même liste que les cartes développeur et le filtre d'Explore.
- **Matching** : instantané, résumé quotidien ou désactivé, repris dans les réglages.
- **Premier projet** : un repo public à importer, ou « Passer ». « Terminer » enregistre le profil et ouvre l'accueil, ou le projet importé.

Le sélecteur de skills et ses puces passent dans `web/ui/chips.tsx` (nouvelle demande d'aide, réglages du projet, onboarding).

- **Livrable** : `web/pages/public/onboarding-page.tsx`, `web/fixtures/onboarding.ts`, `web/ui/chips.tsx`, vocabulaires de `web/fixtures/skills.ts`
- **Par** : @niangoos

### 2026-10-10 · PAM-218 · Boucle de démo jouable de bout en bout

Sur données fictives, une demande publiée par Abdou reçoit maintenant sa réponse : le meilleur développeur notifié accepte, puis sa review est détectée sur la PR, chaque étape arrive en notification et en toast. La confirmation ajoute la preuve et l'aide confirmée au profil de l'aidant. « Pour toi » reçoit les demandes qui correspondent, les notifications sont triées par date et ouvrent l'objet exact (panneau de la PR), et le rail « PRs à relire » n'affiche plus ses propres PRs.

- **Livrable** : `web/fixtures/help.ts`, `web/fixtures/notifications.ts`, `web/ui/layout.tsx`, `web/pages/home/home-page.tsx`, `web/pages/notifications.tsx`, `web/pages/help/help-detail.tsx`
- **Par** : @Mirak29

### 2026-10-10 · PAM-219 · Matching fictif crédible

Le score suit la formule du §7.3 : les points de skills ne comptent que les skills possédés, la proximité ne relie que des skills qui se recoupent vraiment (SQLite et PostgreSQL, Go et Backend), sans le faux « React ≈ TypeScript ». Un développeur sous le score minimum n'est plus notifié, la liste des notifiés est triée par score et seul le demandeur la voit : un développeur notifié voit seulement pourquoi la demande lui arrive. « Sur quoi travailler » applique le seuil des réglages, et ses besoins de projets ne s'appuient plus sur des skills sans rapport.

- **Livrable** : `web/fixtures/matching.ts`, `web/fixtures/projects.ts`, `web/pages/help/help-detail.tsx`, `web/pages/help/new-help.tsx`, `web/pages/explore/explore-page.tsx`
- **Par** : @Mirak29

### 2026-10-10 · PAM-220 · Demande d'aide : formulaire et cycle de vie

Le formulaire affiche toutes ses erreurs d'un coup, sous chaque champ, reliées au champ (`aria-invalid`, `aria-describedby`), et pose le focus sur le premier en erreur. Choisir une PR remplit ce qui est encore vide, comme le lien « Request Review ». « Se désister » pose la question avant d'agir, prévient le demandeur, puis n'affiche plus « Accepter ». Une demande acceptée propose d'écrire dans `#aide` du projet (ou le profil de l'autre, sans projet). `Field` et `SkillPicker` gagnent un emplacement d'erreur réutilisable (`FieldError`).

- **Livrable** : `web/pages/help/new-help.tsx`, `web/pages/help/help-detail.tsx`, `web/fixtures/help.ts`, `web/ui/input.tsx`, `web/ui/chips.tsx`
- **Par** : @Mirak29

### 2026-10-10 · PAM-423 · Alerte « CI en échec » dans #suivi

Sur données fictives, la PR #79 d'OpenPay Africa a sa CI en échec : l'alerte arrive dans `#suivi` (et dans le fil et l'activité du projet), et « Demander de l'aide » ouvre une demande Debug pré-remplie depuis l'alerte (`?ci=79`). L'option « Seulement mes PRs » n'est plus proposée que dans `#suivi`.

- **Livrable** : `web/fixtures/channels.ts`, `web/fixtures/pull-requests.ts`, `web/fixtures/projects.ts`, `web/pages/project/channels-tab.tsx`
- **Par** : @Mirak29

### 2026-10-10 · PAM-421 · Page projet vue du propriétaire

Le propriétaire et les membres voient « Demander de l'aide » (pré-rempli avec le projet) au lieu de « Suivre » et « Proposer mon aide ». Un projet importé reprend exactement les issues et PRs de l'aperçu et ne reçoit plus de milestone inventée ; accepter un membre ne change plus les contributeurs GitHub, et « + 0 contributeurs » disparaît. Les chiffres de l'en-tête s'accordent au singulier et passent en grille de deux sur mobile, où ils ne restent que sur l'Aperçu. Ajout de `web/lib/plural.ts` (`plural`, `counted`).

- **Livrable** : `web/pages/project/project-page.tsx`, `web/pages/project/overview-tab.tsx`, `web/fixtures/repos.ts`, `web/fixtures/applications.ts`, `web/lib/plural.ts`
- **Par** : @Mirak29

### 2026-10-10 · PAM-422 · Liens vers l'objet exact et données cohérentes

Chaque ligne du journal d'un projet (Aperçu, Pulse, Activité) mène à son objet : le panneau d'une PR ouverte, GitHub pour une PR mergée, une issue ou une release, `#aide` pour une demande, le board pour une carte. Les issues s'ouvrent sur GitHub, comme les good first issues de « Sur quoi travailler », dont les besoins mènent à « Voir l'équipe ». La colonne Review du board montre aussi les PRs #81 et #80 en attente, et le post de Fatou ne contredit plus la CI verte de la PR #84. Ajout de `web/lib/links.ts`.

- **Livrable** : `web/lib/links.ts`, `web/pages/project/event-list.tsx`, `web/pages/project/activity-tab.tsx`, `web/pages/project/issues-tab.tsx`, `web/pages/explore/explore-page.tsx`, `web/fixtures/board.ts`, `web/fixtures/posts.ts`
- **Par** : @Mirak29

### 2026-10-10 · PAM-315 · Profil, passeport et partage

Les chiffres viennent d'une seule source, les preuves : « aides confirmées » (cartes, matching, équipe) compte les reviews et l'entraide confirmées par quelqu'un d'autre, et le profil, le passeport et la carte de partage partagent `profileStats`. Le passeport et la carte n'affichent plus de chiffre à zéro, le profil met ses propres projets en dernier. Chaque preuve d'une PR ouvre la PR sur GitHub. Le partage gagne « Copier le lien », une proposition de collaboration exige un message (et la PR pour une review), et sur mobile le nom passe avant les actions.

- **Livrable** : `web/fixtures/reputation.ts`, `web/fixtures/people.ts`, `web/fixtures/matching.ts`, `web/pages/profile/`, `web/ui/developer-card.tsx`, `web/pages/project/team-tab.tsx`, `web/assets/icons.tsx`
- **Par** : @Mirak29

### 2026-10-10 · PAM-120 · Accessibilité du socle

Un dialogue rend le focus à ce qui l'a ouvert. Quand une action remplace le bouton qui avait le focus (Rejoindre, Accepter), le focus va à ce qui le remplace ou au contrôle le plus proche ; une carte déplacée sur le board garde le focus et le déplacement est annoncé. Lien « Aller au contenu » sans `#` dans l'URL, un `h1` par page (masqué quand la page n'en montre pas), erreurs de formulaire reliées à leur champ avec `useFieldErrors` (nouvelle communauté, candidature, nouveau projet, nouveau post), boutons répétés nommés avec leur objet, et toasts annoncés une seule fois.

- **Livrable** : `web/ui/layout.tsx`, `web/ui/dialog.tsx`, `web/ui/input.tsx`, `web/ui/toast.tsx`, `web/ui/chips.tsx`, formulaires et listes concernés
- **Par** : @Mirak29

### 2026-10-10 · PAM-121 · Textes et cohérence

Tous les compteurs passent par `plural` et `counted` (`web/lib/plural.ts`) ; les copies locales disparaissent et les milestones s'accordent au féminin. « Accroche » remplace « Headline », les filtres disent « toutes » pour un nom féminin, les posts ont partout les mêmes réactions (J'aime, Utile, Merci), et les modes de synchro ont un seul nom (« Synchro live », « Synchro toutes les 15 min »). Le pays est écrit en entier, sans code « CI » ou « SN » à côté, et la landing garde sa signature en anglais (« Your work is your profile. »).

- **Livrable** : `web/lib/plural.ts` et ses usages, `web/pages/profile/`, `web/pages/explore/explore-page.tsx`, `web/pages/project/`, `web/ui/post.tsx`, `web/pages/public/landing-page.tsx`
- **Par** : @Mirak29

### 2026-10-10 · PAM-517 · Communautés

Quitter une communauté demande maintenant confirmation, dans la liste comme sur la page (le bouton « Membre » ne fait plus quitter en un clic) : un seul composant `Membership`. Une communauté au nom déjà pris n'est plus créée : le formulaire le dit sous le champ et propose d'ouvrir l'existante. L'onglet Membres précise combien de membres il affiche sur le total.

- **Livrable** : `web/pages/communities/membership.tsx`, `web/pages/communities/communities-page.tsx`, `web/pages/communities/community-page.tsx`, `web/pages/communities/new-community-dialog.tsx`, `web/fixtures/communities.ts`
- **Par** : @Mirak29

### 2026-10-10 · PAM-518 · Accueil et posts

La rédaction de l'Accueil ne choisit plus la communauté à ta place : par défaut le post reste sur ton profil (« Sans communauté »), et le focus revient dans le champ après publication. « Commenter » et « Répondre à … » posent le focus dans le champ de réponse. « Enregistrer » confirme par un toast qui mène à la nouvelle page `/enregistres`, aussi dans le menu du compte.

- **Livrable** : `web/pages/saved-page.tsx`, `web/app.tsx`, `web/ui/header.tsx`, `web/ui/post.tsx`, `web/pages/post-page.tsx`, `web/pages/home/home-page.tsx`, `web/fixtures/posts.ts`
- **Par** : @Mirak29

### 2026-10-10 · PAM-519 · Palette de recherche

Les lettres tapées juste après ⌘K ou Ctrl K ne se perdent plus avant l'affichage du champ. Les flèches choisissent un résultat, mis en avant, et Entrée ouvre celui-là. La palette suit le modèle combobox (`role`, `aria-activedescendant`, liste de résultats `listbox`), et un post sans communauté n'affiche plus « undefined ».

- **Livrable** : `web/ui/command-palette.tsx`
- **Par** : @Mirak29

### 2026-10-10 · PAM-520 · Réglages

L'export télécharge le fichier JSON de façon fiable : le lien est posé dans la page et son adresse n'est libérée qu'après le début du téléchargement. « Réinitialiser la démo » demande confirmation avant d'effacer la session.

- **Livrable** : `web/pages/settings-page.tsx`
- **Par** : @Mirak29

### 2026-10-10 · PAM-221 · Onboarding

L'onboarding propose les 54 pays d'Afrique, plus « Autre » qui ouvre un champ libre. L'étape courante est dans l'URL (`?etape=2`) : le bouton retour et le rechargement la gardent. La connexion ramène à la page d'origine passée en `?retour=` (un chemin du site uniquement) : depuis le passeport, « Collaborer avec Moussa » rouvre son profil avec le dialogue de collaboration ; sans retour, l'onboarding suit.

- **Livrable** : `web/fixtures/people.ts`, `web/fixtures/onboarding.ts`, `web/pages/public/onboarding-page.tsx`, `web/pages/public/connexion-page.tsx`, `web/pages/profile/passport.tsx`
- **Par** : @Mirak29

### 2026-10-10 · Audit QA front — seconde passe de validation

Application lancée et parcours testés dans le navigateur sur données fictives :
onboarding, aide, import et création de projet, synchro simulée, canaux, board,
profil, recherche, communautés, notifications, réglages et vues mobiles. Le
[rapport QA](qa/2026-10-10/rapport-qa-front.md) documente la couverture, les limites
et 14 défauts reproduits, dont deux prioritaires : communication inaccessible à
l'aidant accepté et review non répercutée sur le projet. **Le front n'est pas
encore validé pour gel avant le back.** Aucun correctif applicatif livré par cet
audit ; les tâches de validation en production restent ouvertes.

- **Livrable** : `docs/qa/2026-10-10/rapport-qa-front.md` et captures associées
- **Par** : Codex, à la demande d'Abdou

### 2026-10-10 · PAM-222 · Boucle d'aide, retours QA 2

Le demandeur et l'aidant accepté échangent dans le fil de la demande, sur sa page, visible d'eux deux seulement : « Écrire à … » y mène au lieu d'un canal `#aide` fermé à l'aidant, et chaque message prévient l'autre. Dans la simulation, l'aidant y écrit après avoir accepté. Une review détectée met à jour la PR (review reçue, reviewer), le Pulse (3 → 2 PRs en attente), `#suivi` et l'activité du projet. Une demande dont on s'est désisté sort des recommandations.

- **Livrable** : `web/fixtures/help.ts`, `web/pages/help/help-detail.tsx`, `docs/cahier-des-charges.md` §7.2 et §14.4
- **Par** : @Mirak29

### 2026-10-10 · PAM-424 · Projet sans données et provenance, retours QA 2

L'événement de synchro de l'Accueil garde son projet. Un projet créé ou importé n'a plus d'historique inventé : semaine à zéro, Health « Pas encore mesuré », good first issues comptées pour de vrai, langages lus sur le repo (plus de skills présentés comme langages), et un résumé automatique déterministe au lieu d'un chargement sans fin. Sans repo, plus de faux lien GitHub, et les réglages proposent de lier un de ses repos publics (issues, PRs et langages suivent). Les non-lus des canaux restent lus et ne comptent plus ses propres messages. Tout ce que fait la simulation est marqué Démo, jamais « Vérifié par GitHub ».

- **Livrable** : `web/fixtures/pulse.ts`, `web/fixtures/channels.ts`, `web/fixtures/repos.ts`, `web/fixtures/projects.ts`, `web/lib/links.ts`, `web/pages/project/`, `web/pages/home/home-page.tsx`, `web/pages/help/help-detail.tsx`, `web/pages/public/onboarding-page.tsx`
- **Par** : @Mirak29

### 2026-10-10 · PAM-521 · Nouveau post, retour QA 2

Le dialogue « Nouveau post » (menu Créer) a la même audience par défaut que l'Accueil : « Sans communauté », le post reste sur le profil. La communauté n'est préremplie que si le dialogue s'ouvre depuis sa page.

- **Livrable** : `web/ui/new-post-dialog.tsx`
- **Par** : @Mirak29

### 2026-10-10 · PAM-122 · Socle, retours QA 2

Les toasts passent dans la couche supérieure (popover manuel ré-affiché à chaque toast) : ils restent visibles au-dessus d'un dialogue ouvert. La recherche de l'en-tête garde 42 px et son icône à 320 px, et la page n'y déborde plus : raccourcis courts sur l'Accueil, sélecteur de communauté, adresse GitHub tronquée dans un post, galerie du projet sur deux colonnes. Connexion, onboarding et 404 n'ont plus qu'un `h1`, et la liste des PRs accorde « 1 PR ouverte ». Un `.gitattributes` impose LF, ce que `deno fmt` attend.

- **Livrable** : `web/ui/toast.tsx`, `web/ui/header.tsx`, `web/pages/public/`, `web/pages/project/pull-requests-tab.tsx`, `web/pages/project/overview-tab.tsx`, `web/pages/home/home-page.tsx`, `web/ui/post.tsx`, `.gitattributes`
- **Par** : @Mirak29

### 2026-10-14 · PAM-105 · Schéma initial et migrations

Les 38 tables du §14 sont déclarées dans `api/schema.ts` avec `createTable`, leurs clés étrangères (`join`) et 40 index, dont les contraintes d'unicité. Au démarrage, le serveur active `PRAGMA foreign_keys = ON` et `busy_timeout = 5000`, puis lance les migrations avant de créer les tables. Les clés primaires portent le nom de leur table (`userId`), comme dans Tournament. Le cahier (§12.5, §14) a été aligné sur le code : champs optionnels, colonne `source` des lignes racines, `Task.boardColumn`.

- **Livrable** : `api/schema.ts`, `api/schema_test.ts` (8 tests : pragmas, 38 tables, clés étrangères, unicité, champs optionnels), `migrations/001-initial.js`, `DATABASE_PATH` dans `.env-dev`
- **Par** : @Mirak29

### 2026-10-14 · PAM-106 · Entries et relations

`api/entries.ts` déclare les 38 types d'entries du §13.3, numérotés de 1 à 38, et les 10 relations du §14.6. Chaque entry porte sa `source` ; les preuves de réputation figent leurs champs (demandeur, skills, PR, review, éligibilité, version des règles). Chaque type diffusé a son `trigger` : membres, abonnés, communautés et modérateurs viennent du listener, le demandeur et les développeurs matchés d'une vérification SQL. Le cahier passe les dates en secondes, l'unité réelle de Tournament et des entries. Le commentaire faux de `api/schema.ts` sur `sql` est corrigé.

- **Livrable** : `api/entries.ts` (types, relations, champs, triggers, type `EntryListener`, `maybe`), `api/entries_test.ts` (10 tests : numérotation, table `type`, champs figés, relation absente, archivage, diffusion par type)
- **Par** : @Mirak29

### 2026-10-14 · PAM-110 · Login GitHub et session

Routes `GET/api/auth/github`, `POST/api/auth/github/callback`, `POST/api/auth/logout` et `GET/api/user/me` (§15). Le premier login crée `User` et `Profile` depuis GitHub, les suivants mettent à jour le login et l'avatar. La session est une entry `USER_LOGIN` signée en HMAC avec `SESSION_SECRET`, valable 30 jours ; la déconnexion l'archive, si bien qu'un cookie copié ne vaut plus rien. Côté web, `web/lib/session.ts` remplace la session fictive : la page demandée est gardée pendant l'aller-retour, le premier login mène à l'onboarding. Sans GitHub App en dev, la connexion est simulée. Parcours vérifié dans le navigateur en mode simulé ; l'échange réel avec GitHub sera testé dès que la GitHub App (PAM-109) existera.

- **Livrable** : `api/routes.ts`, `api/session.ts`, `api/github-oauth.ts`, `api/user.ts`, `api/lib/env.ts`, `api/auth_test.ts` (7 tests), `web/lib/api.ts`, `web/lib/session.ts`, `web/pages/public/connexion-page.tsx`
- **Par** : @Mirak29

### 2026-10-14 · PAM-201 · Profil pré-rempli depuis GitHub et onboarding enregistré

Au premier login, le profil reprend tout ce que GitHub donne : photo, nom, bio, site, ville et pays lus dans la localisation, e-mail principal, langages des repos publics en skills de source `github`. Les logins suivants complètent les champs vides tant que le profil n'a jamais été enregistré. Le vocabulaire (technologies et alias, domaines, intentions, pays) est partagé dans `api/vocabulary.ts` et chargé en base au démarrage. Routes `POST/api/user/profile/update`, `skills/update`, `intents/update` (§15) : l'onboarding, l'édition du profil et le mode de matching des réglages enregistrent sur le serveur. Côté web, le développeur connecté devient le `me` des pages et sa photo GitHub s'affiche partout (`Avatar`, `Portrait`, initiales en repli). Vérifié dans le navigateur avec la connexion simulée : onboarding pré-rempli puis enregistré, photo dans le profil, la barre latérale et l'en-tête.

- **Livrable** : `api/vocabulary.ts`, `api/skills.ts`, `api/user.ts`, `api/github-oauth.ts`, `api/routes.ts`, `api/profile_test.ts` (7 tests), `web/lib/session.ts`, `web/fixtures/people.ts`, `web/ui/avatar.tsx`
- **Par** : @Mirak29

### 2026-10-14 · PAM-107 · Route temps réel GET/api/events

`GET/api/events` exige une session et l'en-tête `Accept: text/event-stream`, comme dans Tournament. Le serveur calcule lui-même ce que le développeur reçoit : projets dont il est membre, projets suivis, communautés, communautés modérées, développeurs suivis ; le client ne choisit rien. Un `ack` part à l'ouverture puis toutes les 15 s ; le listener est retiré à la fermeture ou dès qu'un envoi échoue. `refreshListeners(userId)` met à jour les connexions ouvertes après une adhésion, un suivi ou un changement de rôle (§13.2).

- **Livrable** : `api/events.ts`, route dans `api/routes.ts`, `api/events_test.ts` (4 tests : session et type exigés, ack puis entries de ses projets seulement, adhésion prise en compte sans reconnexion, aucun listener après fermeture)
- **Par** : @Mirak29

### 2026-10-14 · PAM-108 · Client temps réel web/lib/realtime.ts

Le navigateur ouvre `api/events` dès que la session est connue et le ferme à la déconnexion. `onEvent(types, handler)` et `useEvent` abonnent un écran à des types d'entries ; `onReconnect` relit les données critiques après une reconnexion. Sans `ack` pendant 20 s, `sourceDisconnectedAt` passe à l'heure de la coupure et un bandeau discret l'indique. Une connexion refusée est relancée toutes les 5 s. Les numéros de types sont sortis dans `api/entry-types.ts`, importable par le web. Vérifié dans le navigateur avec le bundle de production : bandeau 20 s après l'arrêt du serveur, disparition à son redémarrage, sans recharger la page. La réception d'une entry dans un autre navigateur sera visible dès qu'une route en produira une pour l'utilisateur (notifications, PAM-210) ; la diffusion côté serveur est testée par PAM-107.

- **Livrable** : `web/lib/realtime.ts`, `web/ui/connection-banner.tsx`, `api/entry-types.ts`
- **Par** : @Mirak29

### 2026-10-15 · PAM-112 · Seed rejouable

`deno task seed` recrée la base de zéro puis la remplit avec les données des fixtures du web : 8 développeurs de plusieurs pays avec profil, skills, intentions et abonnements, 8 communautés et leurs membres et modérateurs, 4 projets avec rôles, besoins, jalons et abonnés, et les entries de création et d'adhésion, antidatées. Tout est en `source = demo`. Les comptes fictifs ont un `githubId` négatif ; `SEED_GITHUB_IDS` relie Abdou (et bientôt Moussa) à leur vrai compte, dont la connexion ouvre le profil seedé. Le seed refuse de tourner en production sans `--prod` et explique qu'il faut arrêter le serveur quand la base est ouverte. Vérifié : deux exécutions de suite, refus en production, refus sur une base ouverte. Les reviews confirmées de Moussa et le reste de l'histoire de la démo viennent avec PAM-901.

- **Livrable** : `task-db-seed.ts`, `api/seed.ts`, `api/seed_test.ts` (5 tests), tâche `seed` dans `deno.json`, `SEED_GITHUB_IDS` dans `.env-dev`
- **Par** : @Mirak29

### 2026-10-15 · PAM-202 · Import d'un projet GitHub, niveau 1

« Créer » → « Importer depuis GitHub » liste les repos publics du développeur (hors forks), lus sur GitHub. L'aperçu montre le README, les chiffres, les langages et les skills lus dans les langages et topics. L'import, réservé au propriétaire d'un repo personnel, crée le projet, son repo, ses issues et PRs ouvertes ; l'onboarding propose aussi d'en importer un. Le serveur relit chaque repo toutes les 15 minutes en requêtes conditionnelles (ETag) et prévient les pages ouvertes d'un changement. La migration 002 ajoute README, chiffres, stack, auteurs et branches ; `api/migrate.ts` remplace `runMigrations`, qui plantait sous Windows dès qu'une migration devait tourner. Vérifié contre le vrai GitHub sur le compte Mirak29 : 21 repos listés, aperçu, import, puis 304 au second rafraîchissement ; et dans le navigateur jusqu'à la page du projet importé.

- **Livrable** : `api/github.ts`, `api/import.ts`, `api/sync.ts`, `api/projects.ts`, `api/migrate.ts`, `migrations/002-import-fields.js`, routes dans `api/routes.ts`, `api/import_test.ts` (5 tests avec un faux GitHub), dialogue d'import et étape « Premier projet » de l'onboarding
- **Par** : @Mirak29

### 2026-10-15 · PAM-203 · Synchro live : installation et trois contrôles

« Activer la synchro live » envoie vers la page d'installation de l'app, avec un `state` qui garde côté serveur le développeur et le projet. GitHub revient sur `/connexion/github` avec `code` et `installation_id` ; `POST/api/github/installation/confirm` échange le code contre un token temporaire et vérifie l'identité, la couverture du repo (sur toutes les pages) et le droit admin ou maintain. Si tout passe, l'installation est enregistrée et le repo passe en live ; la page montre chaque contrôle et, en cas d'échec, comment y remédier. Un import passe en live tout de suite quand l'app couvre déjà le repo, vérifié avec un JWT de l'app signé par sa clé privée (PKCS#1 converti en PKCS#8). Les repos en live sont relus toutes les heures en plus de leurs webhooks. Les erreurs de GitHub remontent en 502 ou 503, plus en 500. Vérifié dans le navigateur avec la connexion simulée : intro, retour, trois contrôles, projet en live.

- **Livrable** : `api/installation.ts`, `api/github-app.ts`, `api/installation_test.ts` (7 tests : contrôles, pagination, accès en lecture refusé, parcours complet, propriétaire seul, JWT), `web/pages/public/installation-return.tsx`, dialogue de synchro, `GITHUB_APP_SLUG`
- **Par** : @Mirak29

### 2026-10-15 · PAM-204 · Webhooks : file persistante et worker

`POST/api/github/webhook` lit le corps brut, vérifie `X-Hub-Signature-256` en temps constant, garde la livraison dans `WebhookDelivery` (une seule fois par `X-GitHub-Delivery`) et répond 202 tout de suite. Un worker la traite dans une seule transaction : handler de l'événement et passage en `done`. En cas d'erreur, il réessaie après 10, 20, 40 puis 80 secondes, puis la passe en `failed` avec une alerte dans les logs. Au démarrage, il reprend les livraisons reçues et celles restées en cours plus de 2 minutes. Les événements eux-mêmes se branchent avec `registerHandler` (PAM-205) ; `ping` est traité, les autres sont pour l'instant ignorés.

- **Livrable** : `api/webhooks.ts`, route dans `api/routes.ts`, démarrage du worker dans `api/server.ts`, `GITHUB_WEBHOOK_SECRET`, `api/webhooks_test.ts` (7 tests : signature, double livraison, événement inconnu, réessais puis échec, transaction annulée, reprise d'une livraison bloquée)
- **Par** : @Mirak29

### 2026-10-15 · PAM-116 · Tunnel HTTPS pour les webhooks en dev

`deno task tunnel` ouvre un tunnel rapide `cloudflared`, sans compte, vers le serveur de dev, et pointe lui-même le webhook de l'app sur son adresse, qui change à chaque démarrage (`PATCH /app/hook/config` avec le JWT de l'app). cloudflared est cherché sur le `PATH` puis à son emplacement d'installation Windows. Vérifié de bout en bout avec la vraie app : le `ping` renvoyé par GitHub est arrivé par le tunnel, signature acceptée, gardé dans `WebhookDelivery` et traité (`done`). Le webhook de l'app est actif et abonné aux événements du §5.1.

- **Livrable** : `task-tunnel.ts`, tâche `tunnel` dans `deno.json`
- **Par** : @Mirak29

### 2026-10-16 · PAM-205 · Traitement des événements GitHub

Chaque événement GitHub a son handler, branché sur la file de PAM-204 : PRs (ouverte, mergée, fermée, lignes modifiées), reviews, issues et commentaires, releases, pushes regroupés, CI (`workflow_run`, `check_run`, `status` dans `CiRun`, avec CI en échec puis réparée), installations (passage en live et retour). Les tables sont mises à jour et les entries de `#suivi` créées, `PR_MERGED` et `RELEASE_PUBLISHED` en preuves aux champs figés (`RULES_VERSION`). Vérifié avec le vrai GitHub : une issue ouverte puis fermée sur Mirak29/memeZgen arrive en quelques secondes par le tunnel, traitée, issue en base et deux entries `ISSUE_UPDATED` rattachées au compte de son auteur.

- **Livrable** : `api/github-events.ts`, `api/reputation.ts`, `api/github-events_test.ts` (9 tests avec de vrais webhooks signés)
- **Par** : @Mirak29

### 2026-10-16 · PAM-207 · Demande d'aide : création et « Demander une review »

`POST/api/help/create` publie une demande, ouverte 7 jours. Le serveur revérifie tout le formulaire : titre, skills du vocabulaire, type, niveau, durée, lien vidéo en http(s). Sur un projet, le demandeur doit en être membre et la PR doit y être ouverte, avec une seule demande en cours par PR. La demande garde son entry `HELP_REQUEST_CREATED`. `GET/api/help` liste celles que le développeur a écrites ou acceptées, et celles de ses projets ; le web les montre dans Aide, sur le projet et sur la PR, et les relit à chaque entry de leur cycle de vie. « Demander une review » sur une vraie PR pré-remplit projet, PR, branche, titre et skills. Ces skills sont les langages des fichiers modifiés, lus par le serveur après la synchro de la PR et relus après un push (migration 003). Le bouton reste occupé pendant l'envoi ; un refus du serveur est expliqué. La réponse simulée d'un aidant est retirée : l'acceptation réelle vient avec PAM-208, le matching réel avec PAM-209. Vérifié dans le navigateur avec la connexion simulée : demande depuis une PR (skills Go et SQL tirés de ses fichiers), demande sans projet, doublon refusé, état juste après rechargement.

- **Livrable** : `api/help.ts`, `api/help-rules.ts`, `api/pull-skills.ts`, `migrations/003-help-request-fields.js`, routes `GET/api/help` et `POST/api/help/create`, `api/help_test.ts` (8 tests), formulaire `web/pages/help/new-help.tsx` branché sur l'API, `web/lib/live-data.ts`
- **Par** : @Mirak29

## Audits QA

### 2026-10-19 · QA de régression front

Retest transversal après les livraisons du 10 au 16 octobre. Les défauts QA-01, 07–14 sont corrigés ou corrigés pour la session ; QA-02 attend le cycle de vie serveur et la vérification de review. QA-15 relève une contradiction entre « Contributions réelles » et les badges « Donnée de démo » sur le profil. La validation front reste partielle ; voir le [rapport complet](qa/2026-10-19/rapport-qa-front.md).

### 2026-10-22 · PAM-124 · Interface en anglais au choix

L'interface suit par défaut la langue du système et se règle sur français ou anglais dans les réglages ou par le bouton de l'en-tête, qui affiche la langue cible ; le choix vaut pour tous les onglets ouverts. Le français reste la langue du code : `web/lib/english.ts` donne l'anglais de chaque phrase de l'interface, que le rendu traduit en entier, textes et attributs lus (libellés, aides, titres de l'onglet). Une phrase avec des valeurs (« Écrire à Moussa ») s'écrit ``t`Écrire à ${name}` `` : seules ses parties fixes sont traduites. Une première version traduisait par motifs à l'affichage et réécrivait le début des messages de membres (« Tu as vu la démo ? » devenait « You know vu la démo ? ») ; ce que les développeurs écrivent n'est plus jamais touché. Vérifié dans le navigateur, page par page, en anglais : 45 écrans et dialogues relevés jusqu'à ce que seul le contenu de démonstration reste en français ; le texte en cours de saisie survit au changement de langue. Les pages publiques (accueil, passeport) ont aussi leurs boutons de thème et de langue, regroupés sous le logo sur téléphone.

- **Livrable** : `web/lib/language.ts`, `web/lib/english.ts`, `web/ui/language-toggle.tsx`, en-tête public (`web/ui/public-header.tsx`), réglage de langue, ``t`…` `` dans les écrans, `web/lib/language_test.ts` (traduction exacte, contenu de membre intact, phrases à valeurs, changement d'onglet)
- **Par** : @Mirak29

## Fermé sans réalisation

### 2026-10-07 · PAM-009 · Installer le skill Hairline

Abandonnée : remplacée par des figures maison.

### 2026-10-08 · PAM-312 · Figures isométriques maison

Abandonnée : figures décoratives qui ne disaient rien du produit. Le système isométrique du prototype porte le sens (formes par type d'objet, colonnes pour les valeurs).

### 2026-10-08 · PAM-304 · Developer Passport

Fusionnée dans PAM-301 : le passeport devient la vue publique du profil, à la même adresse `/@login`.
