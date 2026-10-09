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
- **Par** : Abdou, avec Claude Code

### 2026-10-07 · Cahier des charges de référence

Rédaction du cahier des charges en 20 sections : produit, règles métier, architecture, modèle de données, routes, sécurité, démo. Les faits techniques sont vérifiés dans le code source de `@01edu`.

- **Livrable** : `docs/cahier-des-charges.md`
- **Par** : Abdou, avec Claude Code

### 2026-10-07 · Conception de l'intégration GitHub

GitHub App en lecture seule, repos publics uniquement, aucun token utilisateur stocké, import en deux niveaux (vitrine sans installation, synchro live avec installation), webhooks dans une file qui survit aux redémarrages.

- **Livrable** : `docs/cahier-des-charges.md` §5
- **Par** : Abdou, avec Claude Code

### 2026-10-07 · Intégration d'une relecture externe

Corrections issues d'une relecture : trois contrôles de droits à l'installation de l'app, cycle de vie complet d'une demande d'aide, réputation fondée sur des preuves figées et des règles anti-abus, modération, critères d'acceptation par bloc.

- **Livrable** : `docs/cahier-des-charges.md` §4, §5, §7, §8, §10.5
- **Par** : Abdou, avec Claude Code

### 2026-10-07 · Choix d'infrastructure

Hébergement chez Systalink (imposé), Caddy comme reverse proxy, Meilisearch pour la recherche, images uploadées et vidéos intégrées par lien.

- **Livrable** : `docs/cahier-des-charges.md` §10.4, §17
- **Par** : Abdou, avec Claude Code

### 2026-10-07 · Organisation des projets en canaux

Quatre canaux imposés par projet, façon Discord : `#général`, `#suivi`, `#aide`, `#annonces`. Les alertes GitHub et CI/CD de `#suivi` mènent à la boucle d'aide (« Demander de l'aide », « Demander une review »).

- **Livrable** : `docs/cahier-des-charges.md` §6.8
- **Par** : Abdou, avec Claude Code

### 2026-10-07 · Nom et inscription au concours

Choix du nom Pamoja (« ensemble » en swahili) et rédaction des textes du formulaire CADEV : description et stack.

- **Livrable** : `docs/cadev-inscription.md`
- **Par** : Abdou

### 2026-10-07 · Mise en place du suivi de projet

Création du repo, de la todo (identifiants `PAM-xxx`, planning, critères d'acceptation, règles de mise à jour, journal des décisions) et du `CLAUDE.md` partagé avec niangoos.

- **Livrable** : `TODO.md`, `CLAUDE.md`
- **Par** : Abdou, avec Claude Code

### 2026-10-07 · Brief du prototype

Brief autonome pour Claude Design : 47 écrans, 11 parcours jouables, données fictives cohérentes, règles métier visibles, panneau de démo.

- **Livrable** : `docs/brief-prototype-claude-design.md`
- **Par** : Abdou, avec Claude Code

## Réalisé

### 2026-10-07 · PAM-001 · Fixer le calendrier

Projet sur 10 jours, du mercredi 7 au vendredi 16 octobre 2026, avec un planning par bloc.

- **Livrable** : `TODO.md` (section Planning)
- **Par** : Abdou

### 2026-10-08 · PAM-007 · Valider l'identité visuelle

Design system Pamoja (couleurs clair et sombre, typographie, logo, composants), complété par le système isométrique issu du prototype : dalles, touches, puits, formes par type d'objet.

- **Livrable** : [design system Pamoja](https://claude.ai/artifact/Gj5ox6BNFzaDpuqaCFCWhb), `docs/identite/`
- **Par** : Abdou, avec Claude Code

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

## Fermé sans réalisation

### 2026-10-07 · PAM-009 · Installer le skill Hairline

Abandonnée : remplacée par des figures maison.

### 2026-10-08 · PAM-312 · Figures isométriques maison

Abandonnée : figures décoratives qui ne disaient rien du produit. Le système isométrique du prototype porte le sens (formes par type d'objet, colonnes pour les valeurs).

### 2026-10-08 · PAM-304 · Developer Passport

Fusionnée dans PAM-301 : le passeport devient la vue publique du profil, à la même adresse `/@login`.
