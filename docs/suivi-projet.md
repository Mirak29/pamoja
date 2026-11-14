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
- **Par** : @Mirak29

### 2026-10-07 · Cahier des charges de référence

Rédaction du cahier des charges en 20 sections : produit, règles métier, architecture, modèle de données, routes, sécurité, démo. Les faits techniques sont vérifiés dans le code source de `@01edu`.

- **Livrable** : `docs/cahier-des-charges.md`
- **Par** : @Mirak29

### 2026-10-07 · Conception de l'intégration GitHub

GitHub App en lecture seule, repos publics uniquement, aucun token utilisateur stocké, import en deux niveaux (vitrine sans installation, synchro live avec installation), webhooks dans une file qui survit aux redémarrages.

- **Livrable** : `docs/cahier-des-charges.md` §5
- **Par** : @Mirak29

### 2026-10-07 · Intégration d'une relecture externe

Corrections issues d'une relecture : trois contrôles de droits à l'installation de l'app, cycle de vie complet d'une demande d'aide, réputation fondée sur des preuves figées et des règles anti-abus, modération, critères d'acceptation par bloc.

- **Livrable** : `docs/cahier-des-charges.md` §4, §5, §7, §8, §10.5
- **Par** : @Mirak29

### 2026-10-07 · Choix d'infrastructure

Hébergement chez Systalink (imposé), Caddy comme reverse proxy, Meilisearch pour la recherche, images uploadées et vidéos intégrées par lien.

- **Livrable** : `docs/cahier-des-charges.md` §10.4, §17
- **Par** : @Mirak29

### 2026-10-07 · Organisation des projets en canaux

Quatre canaux imposés par projet, façon Discord : `#général`, `#suivi`, `#aide`, `#annonces`. Les alertes GitHub et CI/CD de `#suivi` mènent à la boucle d'aide (« Demander de l'aide », « Demander une review »).

- **Livrable** : `docs/cahier-des-charges.md` §6.8
- **Par** : @Mirak29

### 2026-10-07 · Nom et inscription au concours

Choix du nom Pamoja (« ensemble » en swahili) et rédaction des textes du formulaire CADEV : description et stack.

- **Livrable** : `docs/cadev-inscription.md`
- **Par** : @Mirak29

### 2026-10-07 · Mise en place du suivi de projet

Création du repo, de la todo (identifiants `PAM-xxx`, planning, critères d'acceptation, règles de mise à jour, journal des décisions) et du `CLAUDE.md` partagé avec niangoos.

- **Livrable** : `TODO.md`, `CLAUDE.md`
- **Par** : @Mirak29

### 2026-10-07 · Brief du prototype

Brief autonome pour Claude Design : 47 écrans, 11 parcours jouables, données fictives cohérentes, règles métier visibles, panneau de démo.

- **Livrable** : `docs/brief-prototype-claude-design.md`
- **Par** : @Mirak29

## Réalisé

### 2026-10-07 · PAM-001 · Fixer le calendrier

Projet sur 10 jours, du mercredi 7 au vendredi 16 octobre 2026, avec un planning par bloc.

- **Livrable** : `TODO.md` (section Planning)
- **Par** : @Mirak29

### 2026-10-08 · PAM-007 · Valider l'identité visuelle

Design system Pamoja (couleurs clair et sombre, typographie, logo, composants), complété par le système isométrique issu du prototype : dalles, touches, puits, formes par type d'objet.

- **Livrable** : [design system Pamoja](https://claude.ai/artifact/Gj5ox6BNFzaDpuqaCFCWhb), `docs/identite/`
- **Par** : @Mirak29

### 2026-10-08 · PAM-008 · Produire le prototype complet

Prototype interactif Pamoja v2 réalisé avec Claude Design : pages, parcours, données fictives et panneau de démo. Ses écarts validés sont reportés dans le cahier des charges.

- **Livrable** : `docs/prototype/` (avec la liste de ce que le code ne reprend pas)
- **Par** : @Mirak29

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
- **Par** : @Mirak29

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

### 2026-10-22 · PAM-316 · Vitrine du profil : badges, réputation, Collaboration Map et Graph

Les badges deviennent des médaillons à la manière des succès GitHub : un emblème par badge (y compris Mainteneur et Pilier de communauté, calculés par le serveur), un anneau dans la teinte métal du niveau (douze tokens ajoutés au thème), une pastille « x2 » à « x4 », un arc indigo en route vers le Bronze ; la section met en avant le prochain palier avec l'action qui le fait grandir sur son propre profil, et montre les badges à découvrir. La réputation passe des barres à cinq colonnes isométriques. La Collaboration Map devient un globe qu'on fait tourner, aux couleurs de Pamoja, avec un arc par pays relié et un vol vers un pays de la liste ; le Graph devient une étoile à deux niveaux qui met les projets en avant : le développeur, ses cinq lieux principaux, puis les personnes près du lieu qu'elles partagent le plus, nommées avec leur nombre de liens, et un panneau de détail à côté (survol, clic ou clavier) ; le panneau « Réseau de travail » montre tout avec une recherche, et le mobile garde un classement en barres. Des colonnes, des orbites et un simple classement ont été essayés sur le profil chargé avant ce choix. Un profil de démo chargé, Wanjiru Kamau (260 preuves, 70 collaborateurs, 14 pays, généré avec une graine fixe), sert à le vérifier sans l'API. Le badge Cross-border compte, dans les fixtures, les mêmes pays que la carte. Vérifié dans le navigateur en clair, en sombre et sur mobile, avec la connexion simulée.

Corrigé après la relecture du 24 octobre :

- Les preuves générées de Wanjiru ne se disent plus « vérifiées par GitHub » : ce sont des données de démo (§8.3, QA-10).
- Le globe ne peint plus la mer en terre. Les terres sont coupées à l'horizon, puis refermées le long du bord du côté de ce que chaque contour entoure (terre ou lac). Rabattre les points cachés sur le bord remplissait jusqu'à 90 % du disque quand l'Afrique-Eurasie ou les Amériques passaient derrière. Vérifié sur trois rotations complètes : la part de terre varie sans saut.
- Une colonne au dernier niveau affiche son nombre seul au lieu de « 84 / 50 ».
- Sur téléphone, la réputation passe à trois colonnes par ligne, pour ne plus couper « Construction » ni « Mentorat ».
- Le détail du graphe passe sous le graphe en dessous de 1 280 px : à 1 024 px, les noms passent de 6,5 à 11,3 px.
- Le panneau de détail n'est lu par les lecteurs d'écran qu'une fois gardé, plus à chaque survol.
- Les terres du globe (53 Ko) sont chargées au premier globe affiché, plus avec chaque page, grâce au découpage du bundle par esbuild (§12.2).
- « personnes » est traduit en anglais.
- Le globe zoome aussi en pinçant (écran tactile ou trackpad) et avec Ctrl ou Cmd + molette ; la molette seule fait toujours défiler la page.
- Pendant un glisser, il ne recalcule plus les pays reliés ni les badges : 3,4 ms par image au lieu de 7,1 ms en médiane.
- Wanjiru a son premier projet, Nairobi Pay : son profil ne dit plus « 0 projet », et le graphe montre son cube plein.

- **Livrable** : `web/pages/profile/reputation.tsx`, `web/pages/profile/collaboration-map.tsx` (globe), `web/pages/profile/collaboration-graph.tsx`, `web/pages/profile/land.ts`, `web/fixtures/reputation.ts` et `web/fixtures/people.ts` (profil chargé), `docs/identite/tokens.json` et `web/assets/styles/theme.css` (teintes métal), `web/lib/english.ts` ; après relecture, `build-config.ts` (`splitting`)
- **Par** : @niangoos, relecture @Mirak29

### 2026-10-25 · Une seule Preact dans le bundle, des pages qui tiennent avec de vrais utilisateurs

Trouvé pendant le test de charge (5 000 développeurs, 1 200 conversations, 3 000 demandes d'aide). Deux corrections :

- **Une seule Preact** : l'app pouvait rester blanche après une reconstruction du serveur de dev. Le loader esbuild lance un `deno info` par lot de paquets, sans `deno.json` quand on ne lui donne pas : interrogé seul, `@preact/signals` prenait Preact 11 comme pair et repointait vers elle son lien dans `node_modules`, que suit esbuild. Le bundle portait alors deux Preact, et les composants ne suivaient plus les signaux. Le loader reçoit maintenant `configPath` (option documentée de `@luca/esbuild-deno-loader`). Vérifié en reconstruction, lien amorcé sur Preact 11 : deux Preact à chaque build avant, une seule après, et le lien reste sur la 10.
- **Des personnes que les fixtures ne connaissent pas** : l'accueil, Explorer › Projets et l'aide d'une communauté lisaient `people[login]` pour l'auteur d'une demande ou le propriétaire d'un projet venus de l'API. Avec un vrai utilisateur, la page plantait, puis toutes les pages suivantes restaient vides jusqu'au rechargement. Ces lectures passent par `personOf`, qui nomme quand même la personne. Vérifié dans le navigateur sur 20 écrans avec les données de charge.

- **Livrable** : `build-config.ts`, `web/fixtures/matching.ts`, `web/pages/home/home-page.tsx`, `web/pages/explore/explore-page.tsx`, `web/pages/communities/community-page.tsx`, `web/pages/project/join-dialog.tsx`, `web/ui/project-card.tsx`
- **Par** : @Mirak29

### 2026-10-25 · Messagerie fluide et pages qui tiennent avec de vrais volumes

Suite du test de charge, avec des données réalistes (demandes `platform`, projets dont on n'est pas membre). Tout a été vérifié dans le navigateur, en ordinateur et à 375 px.

- **Messagerie à hauteur d'écran** : la page ne défile plus, la liste et le fil défilent chacun de leur côté ; la zone d'écriture reste visible, sur téléphone au-dessus de la barre du bas. Une page s'y prête avec `<Page fill>`, que la mise en page lit par `:has([data-fill])`.
- **Envoi immédiat** : le message s'affiche à la frappe d'Entrée (« Envoi… »), le champ se vide et garde le focus, les messages tapés d'affilée partent dans l'ordre. Avant, le champ restait désactivé le temps de relire le fil et toute la liste des conversations (200 ms de calcul pour 1 200 conversations, deux fois par message). Un échec retire le message et rend le texte.
- **« Afficher les messages précédents »** garde le message lu en place : en haut du fil, le navigateur ne garde pas d'ancrage de défilement (CSS Scroll Anchoring §2.1).
- **Lien vers la PR d'une demande** : chaque demande donne le dépôt de sa PR (`repository`) ; l'aidant, souvent pas membre du projet, ouvrait une page blanche après avoir accepté.
- **Projets inconnus des pages** : le nom d'un projet dont on n'est pas membre est remplacé par son slug, au lieu de faire planter Explorer, l'aide d'une communauté et la recherche.
- **Pages figées** : Explorer › Projets et Sur quoi travailler, l'aide et les projets d'une communauté et la recherche lisent les signaux des données de l'API et se mettent à jour quand elles arrivent.
- **Cartes de demande** : plus de « · · » quand la durée ou le niveau manquent.

- **Livrable** : `api/help.ts`, `api/routes.ts`, `web/ui/layout.tsx`, `web/lib/messages.ts`, `web/pages/messages-page.tsx`, `web/pages/help/help-detail.tsx`, `web/pages/explore/explore-page.tsx`, `web/pages/communities/community-page.tsx`, `web/pages/search-page.tsx`, `web/pages/home/home-page.tsx`, `web/ui/help-request-card.tsx`, `web/ui/command-palette.tsx`, `web/fixtures/help.ts`, `web/fixtures/reports.ts`
- **Par** : @Mirak29

### 2026-10-25 · Corrections après relecture du test de charge

Relecture de la branche du test de charge, quatre corrections et un outil rendu rejouable :

- **Une conversation en remplaçait une autre** : envoyer un message puis ouvrir tout de suite une autre conversation pouvait laisser un cadre vide, quand la relecture de la première arrivait en dernier. Une réponse arrivée après un changement de conversation est maintenant ignorée (lecture du fil comme saut vers un résultat de recherche). Vérifié en retardant exprès la réponse de 2,5 s.
- **Un envoi refusé restait dans la liste** : la liste affichait « Toi : … » pour un message refusé (limite, réseau). Elle reprend l'état du serveur après un échec, et le texte revient dans le champ.
- **L'anglais des cartes** : les lignes « type · date · durée · niveau » étaient jointes en une seule chaîne, qu'aucune entrée de traduction ne reconnaissait. `dotted` (`web/lib/language.ts`) garde les morceaux séparés : chacun est traduit, et les noms de personnes et de projets restent tels quels. Vérifié : « 5 h ago · Intermediate · ~30 min », « Beta · Very active ».
- **« Envoi… »** : un message en route disait « Uploading… » en anglais, la clé de l'envoi d'un fichier ; il dit « Envoi en cours… », « Sending… ».
- **Test de charge rejouable** : `deno task stress` remplit la base de dev après le seed, une seule fois, et refuse la production avant d'ouvrir la base ; `?stress` ajoute les fixtures en volume dans le bundle de dev seulement, jusqu'à `?stress=0`. Le script est formaté : la CI bloquait dessus.
- **Contexte des agents de code** : `AGENTS.md` et `.claude/launch.json` sortent du repo (gardés sur le disque, ignorés par git), comme `CLAUDE.md`.

- **Livrable** : `web/lib/messages.ts`, `web/pages/messages-page.tsx`, `web/lib/language.ts` (`dotted`), `web/ui/help-request-card.tsx`, `web/ui/project-card.tsx`, `web/pages/home/home-page.tsx`, `web/pages/help/help-detail.tsx`, `web/pages/communities/community-page.tsx`, `task-db-stress.ts`, `api/stress.ts`, `web/stress-fixtures.ts`, `web/debug-app.ts`, `deno.json`, `.gitignore`, `web/lib/english.ts` ; §14
- **Par** : @Mirak29

### 2026-10-26 · PAM-425 · Galerie du projet

Le propriétaire et les mainteneurs d'un projet gèrent ses captures depuis l'Aperçu : ajout de plusieurs images d'un coup, par clic ou glisser-déposer (réduites et nettoyées de leurs métadonnées dans le navigateur, comme les messages), ordre, suppression, puis enregistrement de toute la galerie ; 8 captures au plus, la première mise en avant. Tout développeur connecté les voit, et une visionneuse les ouvre en grand (flèches, clavier, vignettes). Côté serveur, `setMediaOf` remplace les médias d'un contenu dans l'ordre et supprime ceux retirés. Vérifié dans le navigateur avec la connexion simulée sur une base seedée : ajout de trois images, ordre, enregistrement, visionneuse, rechargement.

- **Livrable** : `api/project-gallery.ts`, `setMediaOf` dans `api/media.ts`, route `POST/api/project/gallery`, galerie dans `GET/api/projects`, `api/project-gallery_test.ts` (3 tests), `web/pages/project/gallery.tsx`, Aperçu du projet
- **Par** : @niangoos

### 2026-10-26 · PAM-426 · Médias partout, le kit

Un kit commun pour les images (`web/ui/media.tsx`) : `useMediaPicker` envoie les images dès qu'elles sont choisies (depuis l'ordinateur, glissées ou collées dans un champ de texte), avec un aperçu pendant l'envoi, l'ordre et le retrait ; `MediaGrid` et `MediaViewer` les affichent et les ouvrent en grand (flèches, clavier, vignettes). Branché de bout en bout : la demande d'aide envoie ses captures (4 au plus, rattachées dans la transaction de création, renvoyées avec chaque demande) à la place des fausses tuiles « capture-1.png » ; la photo de couverture du profil (`POST/api/user/cover`) devient la couverture ; la galerie du projet passe sur le kit. Vérifié dans le navigateur sur une base seedée : demande publiée avec deux captures et visionneuse, couverture photo, galerie.

- **Livrable** : `web/ui/media.tsx`, formulaire et page de la demande d'aide, page « Modifier le profil » et couverture, `api/help.ts`, `coverOf` et `setCover` dans `api/media.ts`, `api/attached-media_test.ts` et `api/help_test.ts`
- **Par** : @niangoos

### 2026-10-26 · PAM-410 · Vidéos intégrées par lien

Un lien YouTube, Loom ou Vimeo devient un lecteur intégré : la miniature d'abord, le lecteur au clic (`youtube-nocookie.com` pour YouTube), construit à partir de l'identifiant de la vidéo. Le serveur lit le titre et la miniature une fois par oEmbed, les garde en mémoire et sert lui-même la miniature, pour qu'aucun fournisseur ne soit contacté avant la lecture. Les pages n'autorisent que ces trois lecteurs (`frame-src`). Branché sur la demande d'aide (aperçu dans le formulaire, lecteur dans la page) et sur la vidéo de démo du projet, réglée dans le dialogue des captures (migration 011) ; le faux lecteur de démo est retiré. Vérifié dans le navigateur : une demande avec un lien YouTube, sa miniature et son lecteur, une vidéo de démo Vimeo.

- **Livrable** : `api/video-links.ts`, `api/video.ts`, routes `GET/api/video/preview`, `GET/api/video/thumbnail` et `POST/api/project/video`, `migrations/011-project-demo-video.js`, `api/video_test.ts` (4 tests), `web/ui/video.tsx`, CSP de `prod-server.ts` et `task-dev.ts`
- **Par** : @niangoos

### 2026-10-26 · PAM-427 · Posts enregistrés avec leurs images et leur vidéo

Un post s'enregistre maintenant sur le serveur avec ses images et son lien vidéo (`POST/api/post/create`, 20 par heure, migration 012) et le fil lit les derniers (`GET/api/posts`). La rédaction de l'Accueil choisit les images sur l'ordinateur, par glisser-déposer ou collage, avec leurs vignettes ; le dialogue « Nouveau post » reprend le kit, vérifie le lien vidéo et en montre l'aperçu. Les posts affichent leurs images dans une grille qui ouvre la visionneuse, et leur vidéo dans le lecteur intégré, à la place des tuiles « capture-1.png ». Vérifié dans le navigateur : un post avec deux images depuis l'Accueil, un post avec une vidéo YouTube depuis le dialogue, le fil après rechargement, la visionneuse.

- **Livrable** : `api/posts.ts`, routes `POST/api/post/create` et `GET/api/posts`, `migrations/012-post-video.js`, `api/posts_test.ts` (2 tests), `web/lib/posts.ts`, rédaction de l'Accueil, `web/ui/new-post-dialog.tsx`, `web/ui/post.tsx`, page du post
- **Par** : @niangoos

### 2026-10-26 · PAM-428 · Messages de canal enregistrés avec leur image

Un message de `#général`, `#aide` ou `#annonces` s'enregistre sur le serveur avec une image (`POST/api/project/message/create`, 120 par heure) et produit l'entry `MESSAGE_CREATED` ; l'onglet Canaux relit les derniers messages des canaux que le développeur lit (`GET/api/project/messages`). Les droits suivent le §6.8 : les membres écrivent dans `#général` et `#aide`, le propriétaire et les mainteneurs dans `#annonces` ; les abonnés lisent `#annonces`. L'image n'est servie qu'aux lecteurs du canal. La rédaction du canal a un bouton image, accepte une capture collée et montre la vignette ; le message affiche son image, qui ouvre la visionneuse, et le lecteur de la première vidéo YouTube, Loom ou Vimeo de son texte. Les vignettes de rédaction de l'Accueil passent dans le kit (`MediaThumbs`). Vérifié dans le navigateur : un message avec une capture et un lien YouTube dans `#général`, relu après rechargement, la visionneuse.

- **Livrable** : `api/channels.ts`, routes `POST/api/project/message/create` et `GET/api/project/messages`, lecture des images de canal dans `api/media.ts`, `api/channels_test.ts` (3 tests), `web/lib/channels.ts`, onglet Canaux, `videoIn` dans `web/ui/video.tsx`
- **Par** : @niangoos

### 2026-10-26 · PAM-429 · Médias de démo dans le fil et les canaux

Le fil et les demandes d'aide de démo montrent de vraies images et de vraies vidéos. Douze captures sont dessinées pour les projets fictifs (carte et régions de Senegal Maps, écrans et ventes d'AfriCommerce, pipeline CI, tests du ledger, affiche du meetup Go d'Abidjan, et pour les demandes d'aide : le code Go à relire, les deux architectures des horaires, l'erreur « database is locked », les tuiles grises et le panneau réseau de la carte). Elles sont rangées dans `web/assets/mocks`, copiées dans `dist/mocks` par `task-dev.ts` et `task-prod.ts`, et servies avec les pages sans passer par l'upload. Cinq posts reçoivent des images, trois une vidéo YouTube publique sur leur sujet (tutoriel GitHub Actions, talk de Rob Pike, Docker en 100 secondes) ; un post « AfriCommerce 1.0 : la démo complète », en haut du fil, cache un rickroll. Les quatre demandes d'aide ouvertes ont leurs captures, et un message de `#général` d'OpenPay Africa a sa capture. Le post de Senegal Maps dit maintenant 12 régions sur 14. Vérifié dans le navigateur : le fil avec ses images et ses lecteurs, les captures d'une demande d'aide, sans image cassée.

- **Livrable** : `web/assets/mocks/*.webp`, `web/fixtures/media.ts`, `copyMocks` dans `build-config.ts`, `mediaUrl` dans `web/lib/messages.ts`, fixtures des posts, des demandes d'aide et des canaux
- **Par** : @niangoos

### 2026-10-26 · PAM-430 · Vidéo d'un post par le lien collé dans son texte

Un lien YouTube, Loom ou Vimeo collé dans le texte d'un post devient sa vidéo, comme dans les canaux : la rédaction de l'Accueil, qui n'avait pas de champ vidéo, en montre l'aperçu dès le collage et l'enregistre avec le post ; le dialogue « Nouveau post » le prend quand son champ vidéo est vide. Un fichier vidéo choisi, glissé ou collé ne part pas et un message dit de coller un lien. Le texte d'aide de la rédaction le rappelle. Vérifié dans le navigateur : un lien YouTube collé, son aperçu, le post relu après rechargement avec son lecteur, et le message pour un fichier `.mp4`.

- **Livrable** : rédaction de l'Accueil, `web/ui/new-post-dialog.tsx`, `useMediaPicker` dans `web/ui/media.tsx`
- **Par** : @niangoos

### 2026-10-28 · PAM-223 · Filtres du matching par skills, projets et communautés

Les réglages du matching ont trois filtres de plus, enregistrés dans `Profile.matchingFilters` avec le mode, le score minimum et les types d'aide (`POST/api/notification/preferences`, relus par `GET/api/user/me`). Chacun dit « seulement » : vide, toutes les demandes passent ; rempli, `rank()` écarte une demande qui ne touche aucun des skills choisis, qui n'est pas d'un des projets choisis (ou n'a pas de projet), ou dont l'auteur n'est membre d'aucune des communautés choisies. La page propose les skills du développeur, ses projets construits ou suivis et ses communautés ; le bloc « Tes skills », qui ne s'enregistrait pas, laisse sa place. Le compte « N demandes ouvertes passent ce seuil » suit les filtres. Une page plus ancienne qui n'envoie pas les filtres les remet à vide. Vérifié dans le navigateur : 3 demandes, 1 avec TypeScript seul, 3 avec Go en plus, les choix relus après rechargement.

- **Livrable** : `matchingFiltersOf` et `updateMatching` dans `api/user.ts`, `kept` dans `api/matching.ts`, contrôle des filtres dans `api/routes.ts`, 2 tests dans `api/matching_test.ts`, réglages, `saveMatching` et `matchingRequests` côté web
- **Par** : @niangoos

### 2026-10-28 · PAM-118 · Rendu Markdown sécurisé pour tous les contenus

Le rendu Markdown lisait déjà le texte en éléments, jamais en HTML : rien de ce qu'écrit un membre ne peut s'exécuter, et aucune page n'injecte de HTML. PAM-118 finit le travail sur les liens et étend le rendu au README. Une règle unique (`web/lib/member-links.ts`) fait d'un lien écrit par un membre une adresse `http` ou `https` normalisée, sinon il reste du texte, et lui donne un nouvel onglet avec `rel="noopener noreferrer nofollow ugc"`. Elle sert au Markdown (liens nommés et liens nus), au site web du profil, au lien d'une vidéo non intégrable et à l'aperçu de lien des messages. Le résumé d'un README importé perd ses balises HTML et s'affiche avec le même Markdown ; les textes des projets de démo restent des phrases traduites. Vérifié dans le navigateur : un post avec un lien nommé, un lien nu et un lien `javascript:` resté texte ; le site du profil.

- **Livrable** : `web/lib/member-links.ts` et son test, `web/ui/rich-text.tsx` et son test, `web/ui/video.tsx`, `websiteHref`, page profil, aperçu de lien des messages, `readmeSummary` et « À propos » du projet
- **Par** : @niangoos

### 2026-10-28 · PAM-306 · Pulse déterministe

Le Pulse d'un projet connu du serveur est maintenant compté par `GET/api/project/pulse`, en SQL, sur les 7 derniers jours ou depuis un instant donné (`since`, ramené entre 90 jours et maintenant) : PRs mergées (`mergedAt`), issues fermées (par leur dernière mise à jour), membres arrivés (`PROJECT_MEMBER_JOINED`), reviews demandées (demandes d'aide « Review de code »), PRs ouvertes sans review non rejetée, releases (`RELEASE_PUBLISHED` ou la dernière release lue par le rafraîchissement). L'onglet Pulse relit ces chiffres à chaque ouverture et le résumé automatique, affiché sans IA, s'en sert ; les projets de démo gardent leurs chiffres fictifs. Corrigé en route : le client de l'API écrit `null` dans une adresse, la page n'envoie donc que le slug. Vérifié dans le navigateur sur un projet inséré dans une base de test : 3 PRs mergées, 2 issues fermées, 2 PRs en attente, 1 release, comme attendu.

- **Livrable** : `api/pulse.ts`, route `GET/api/project/pulse`, `api/pulse_test.ts` (2 tests), `web/lib/pulse.ts`, `projectPulse` et onglet Pulse
- **Par** : @niangoos

### 2026-10-28 · PAM-412 · Non-lus et réglage par canal

Les non-lus des canaux ne se perdent plus au rechargement et suivent le développeur d'un appareil à l'autre. `ChannelState` garde, pour chaque canal qu'il lit, l'heure de sa dernière lecture et son réglage (`GET/api/project/channels`, `POST/api/project/channel/read`, `POST/api/project/channel/notify`) ; `#suivi` est lisible par les membres et les abonnés. La page compte les messages des autres arrivés après la dernière lecture, selon le réglage : « Rien » n'affiche pas de pastille, « Mentions » ne compte que les messages qui mentionnent `@login`, « Seulement mes PRs », le réglage par défaut de `#suivi`, ne compte que les alertes sur ses PRs. La page projet charge messages et lectures pour que le badge « Canaux » soit juste avant d'ouvrir l'onglet ; un projet inconnu du serveur garde ses lectures dans la page. Corrigé pendant le test : une lecture faite avant que la page sache le projet enregistré n'était jamais envoyée. Vérifié dans le navigateur : badge à 3 (2 messages de #général, l'alerte de la PR #81 dans #suivi), canaux lus après rechargement, un second appareil sans non-lus, réglage gardé.

- **Livrable** : `api/channel-state.ts`, routes `GET/api/project/channels`, `POST/api/project/channel/read` et `POST/api/project/channel/notify`, lecture de `#suivi` dans `rightsIn`, 2 tests dans `api/channels_test.ts`, `unreadIn`, `notifyOf` et `adoptChannelStates` dans les fixtures, `readChannel` et `saveNotify`, onglet Canaux et page projet
- **Par** : @niangoos

### 2026-10-28 · PAM-411 · Canal #suivi

`#suivi` montre maintenant les vraies alertes d'un projet connu du serveur, lues dans les entries que les webhooks et la synchro écrivent : PR ouverte, review (approuvée, changements demandés, commentée), merge, fermeture, PR sans review depuis 2 jours, issue ouverte, fermée ou rouverte, release, CI en échec ou réparée, pushes regroupés (`GET/api/project/tracking`, 100 dernières). Le serveur donne les faits, la page écrit la phrase en français ou en anglais (`web/lib/tracking.ts`). Les boutons « Demander de l'aide » et « Demander une review » s'y appliquent comme aux alertes de démo. Les membres répondent en fil sous une alerte (`ProjectMessage.parentEntryId`), les abonnés lisent ; une réponse reste dans son fil, hors des canaux. Une vérification planifiée signale une fois chaque PR ouverte sans review depuis 2 jours (`PR_REVIEW_STALE`, que rien ne produisait). Une nouvelle entry GitHub ou un message relit les canaux ouverts en temps réel. Vérifié dans le navigateur sur un projet de test : PR ouverte, changements demandés, CI en échec, 3 commits poussés, deux PRs signalées sans review au démarrage du serveur, « Demander une review », une réponse en fil gardée après rechargement.

- **Livrable** : `api/tracking.ts`, route `GET/api/project/tracking`, réponses sous une alerte dans `api/channels.ts`, `api/tracking_test.ts` (3 tests), `web/lib/tracking.ts`, `adoptTracking`, `loadTracking`, `answerAlert` et `reloadOpenedChannels`, onglet Canaux, page projet, `web/lib/live-data.ts`
- **Par** : @niangoos
### 2026-10-25 · PAM-529 · Longues listes, corrections rapides

Avec les données du test de charge, plusieurs listes s'affichaient en entier ou étaient coupées sans le dire. Corrigé :

- **Notifications** : le serveur n'en rendait que 100, sans moyen de voir les plus anciennes. Elles arrivent maintenant par lots de 20, et « Charger plus » lit les suivantes. Les compteurs (menu, cloche, onglets) viennent du serveur, qui compte toutes les non lues et pas seulement celles déjà chargées : « Toutes 1002 » avec 20 notifications affichées. La cloche de l'en-tête affiche « 9+ » comme le menu, au lieu de « 1002 ».
- **Demandes d'aide** : le serveur en rendait 200, toutes mélangées. Chaque onglet (Pour moi, Mes demandes, Acceptées par moi, Demandes des projets) lit maintenant ses propres lots de 20, à son ouverture puis avec « Charger plus » ; « Pour moi » est trié par score. Le compteur d'un onglet n'apparaît qu'une fois tout lu, pour ne jamais afficher un faux total.
- **Page d'un post** : les 500 réponses d'un fil s'affichaient d'un coup. Il y en a maintenant 20 au premier niveau, puis « Afficher plus de réponses · 480 restantes ».
- **Board** : une colonne grandissait avec ses cartes. Elle ne dépasse plus la hauteur de l'écran (480 px au moins), et ses cartes défilent à l'intérieur.

Le lot suivant se demande par curseur (la date ou le score, et l'id du dernier élément reçu), jamais par numéro de page : une notification qui arrive entre deux lots ne décale ni ne répète rien. Trouvé en écrivant le test : `Number.MAX_VALUE`, un entier pour JavaScript, est lié en entier 64 bits par le pilote SQLite et déborde ; le curseur de départ utilise `Number.MAX_SAFE_INTEGER`.

Vérifié dans le navigateur avec `deno task stress` (3 000 notifications, 1 500 demandes « Pour moi ») et `?stress` (fil de 500 réponses) : lots de 20, compteurs exacts, « Charger plus » sur chaque liste, colonnes du board bornées.

- **Livrable** : `api/lib/cursor.ts`, `api/notifications.ts`, `api/help.ts`, `api/help-lifecycle.ts`, `api/routes.ts`, tests (`notifications_test.ts`, `help_test.ts`, `matching_test.ts`) ; `web/lib/notifications.ts`, `web/lib/help.ts`, `web/lib/session.ts`, `web/pages/notifications.tsx`, `web/pages/help/help-list.tsx`, `web/ui/post.tsx`, `web/pages/post-page.tsx`, `web/pages/project/board-tab.tsx`, `web/ui/navigation.tsx`, `web/ui/header.tsx`, traductions ; §12.7
- **Par** : @Mirak29

### 2026-10-25 · PAM-530 · Listes chargées au défilement (InfiniteList)

Les longues listes se chargent maintenant comme sur un réseau social : le lot suivant arrive tout seul un peu avant la fin de la liste (800 px), sans clic. Le bouton « Charger plus » reste sous la liste pour le clavier, les lecteurs d'écran et un navigateur qui ne sait pas suivre le défilement ; la fin de la liste est dite (« Tu as tout vu. »).

- **Accueil** : le fil n'est plus coupé à 30 publications, il continue par lots de 20 jusqu'à la dernière.
- **Explore** (développeurs, projets), **liste des communautés**, **posts et membres d'une communauté** : par lots de 20 ; un changement de filtre, d'onglet ou de communauté repart du premier lot.
- **Notifications** et **demandes d'aide** : les lots du serveur de PAM-529 se chargent au défilement au lieu du seul bouton.

La brique tient dans `web/ui/infinite-list.tsx` : `InfiniteList` pour une liste du serveur (s'il en reste, et comment lire la suite), `Batched` et `useBatches` pour une liste déjà en mémoire, comme les écrans encore sur données fictives. Le fil social de l'API (PAM-501) s'y branchera avec le curseur de `api/lib/cursor.ts`.

Vérifié dans le navigateur avec `?stress` (2 000 posts, 3 000 développeurs) : 20 publications, puis le lot suivant au défilement sans perdre la position ; Explore par lots de 20, ramené au premier lot quand on choisit un skill ; notifications et « Pour moi » chargés au défilement. Le chargement automatique ne se voit que si l'onglet est affiché : le navigateur ne suit pas le défilement d'un onglet caché, le bouton prend alors le relais.

- **Livrable** : `web/ui/infinite-list.tsx` ; `web/pages/home/home-page.tsx`, `web/pages/explore/explore-page.tsx`, `web/pages/communities/communities-page.tsx`, `web/pages/communities/community-page.tsx`, `web/pages/notifications.tsx`, `web/pages/help/help-list.tsx`, traductions ; §12.7
- **Par** : @Mirak29

### 2026-10-25 · PAM-531 · Charge du serveur

À la relecture de PAM-529 et PAM-530, une partie de la charge restait : ces tâches limitaient surtout l'affichage. Audit mesuré sur la base de `deno task stress` (5 000 développeurs, 1 200 conversations, un dépôt de 3 000 issues et 2 000 PRs), plans de requête SQLite compris, puis corrections, chacune vérifiée.

Ce que l'audit a trouvé :

- `GET/api/projects` renvoyait 909 Ko : tous les projets avec tous leurs membres, issues, PRs et le README entier, relu par chaque membre à chaque événement de PR ou de CI.
- `GET/api/conversations` renvoyait les 1 200 conversations en 148 ms, en calculant le dernier message et les non lus de chacune, et elle était relue à chaque message.
- Les requêtes par lots de PAM-529 lisaient toutes les lignes de l'utilisateur puis les triaient avant d'en garder 20 (`USE TEMP B-TREE FOR ORDER BY`) ; « Acceptées par moi » parcourait toute la table, faute d'index ; la liste de toutes les demandes d'aide, lue à chaque connexion, parcourait toute la table à cause d'un `OR`.
- Aucune réponse n'était compressée : la compression de `Deno.serve` est désactivée par défaut.

Ce qui a changé :

- **Index composés** qui suivent chaque requête par lots (notifications, onglets de l'aide, « Pour moi », fil d'une conversation, issues et PRs d'un projet, dont un index sur expression pour les PRs ouvertes d'abord) ; les `OR` deviennent des `UNION` de lectures d'index limitées au lot (aide, activité d'un profil). Plus aucun tri de la liste entière dans les plans : la liste de toutes les demandes d'aide prend 0,3 ms.
- **Projets** : la liste porte des comptes exacts (issues ouvertes, good first issues, PRs ouvertes, PRs en attente de review), le premier lot d'issues ouvertes et de PRs, et le résumé du README. Les onglets Issues et PRs lisent la suite par lots au défilement (`GET/api/project/issues`, `GET/api/project/pulls`) ; un rechargement garde les lots déjà lus. 909 Ko deviennent 96 Ko, 3,6 Ko compressés.
- **Conversations** : par lots de 20 ; les ids du lot d'abord, puis le détail de ces 20 seulement. Le compteur du menu vient du serveur et s'arrête à 99, puisque le menu affiche « 9+ ». « Écrire » depuis un profil retrouve une conversation plus ancienne que les lots lus (`GET/api/conversation/with`). 433 Ko en 148 ms deviennent 7 Ko en 6 ms, 0,8 Ko compressés.
- **Temps réel** : un message relit le premier lot de la liste, pas toute la liste. Un onglet caché ne relit rien et relit une fois en redevenant visible. Un événement de projet fait attendre chaque membre un moment au hasard (jusqu'à 1,5 s) avant de relire. La réputation n'est relue que pour le profil à l'écran, plus pour tous ceux vus depuis l'ouverture.
- **Compression** par Deno en dev comme en production, jamais pour le flux SSE (`no-transform`). **Cache** : morceaux du bundle hachés gardés un an, page et fichiers sans hash revalidés par ETag. Caddy ne compresse pas une seconde fois (§17.4).

Vérifié dans le navigateur sur la base de charge : conversations par lots, y compris au défilement de leur colonne, compteur « 9+ » du serveur, « Écrire » vers une conversation non chargée, onglets d'un dépôt de 3 000 issues avec « 1334 PRs ouvertes · 1334 en attente de review » pour 40 PRs chargées. Sources consultées : la documentation SQLite sur le [planificateur](https://www.sqlite.org/queryplanner.html) et sur les [nombreuses petites requêtes](https://www.sqlite.org/np1queryprob.html), et la [documentation de `Deno.serve`](https://docs.deno.com/runtime/fundamentals/http_server/) sur la compression automatique.

- **Livrable** : `api/schema.ts` (index), `api/help.ts`, `api/messages.ts`, `api/projects.ts`, `api/routes.ts`, `api/events.ts`, `prod-server.ts`, `.env-dev`, tests (`projects_test.ts`, `messages_test.ts`, `import_test.ts`, `help_test.ts`) ; `web/lib/messages.ts`, `web/lib/realtime.ts` (`whenShown`), `web/lib/live-data.ts`, `web/lib/notifications.ts`, `web/lib/reputation.ts`, `web/fixtures/repos.ts`, `web/fixtures/projects.ts`, `web/ui/infinite-list.tsx` (défilement d'une colonne), `web/ui/project-card.tsx`, `web/pages/messages-page.tsx`, `web/pages/project/issues-tab.tsx`, `web/pages/project/pull-requests-tab.tsx` ; §12.7, §15, §17.4
- **Par** : @Mirak29

### 2026-10-25 · PAM-531 · Retour sur les listes : notifications, bouton, profil

Corrigé après un retour sur la branche :

- **Un onglet des notifications vide ou presque proposait « Charger plus »**, et la page lisait en fond les lots de toutes les catégories pour tenter de le remplir (vérifié : `before=…_20`, `_40`, `_60`… pour l'onglet Communautés vide), jusqu'à toute la boîte. Le filtre par catégorie se faisait dans la page. Chaque onglet lit maintenant sa catégorie côté serveur (`GET/api/notifications?category=`, index par catégorie) avec ses propres lots : l'onglet Communautés vide fait une requête et dit « Rien de neuf ici », l'onglet Social montre sa notification sans bouton.
- **Le bouton « Charger plus » restait affiché** même quand la liste se chargeait seule. Il est maintenant caché tant qu'il n'a pas le focus (clavier, lecteur d'écran) et « Chargement… » s'affiche pendant la lecture. Il ne réapparaît que si la liste ne peut pas se charger seule.
- **Garde-fous dans la brique** : une liste dont le dernier lot n'a ajouté aucune ligne cesse de charger seule (le bouton reprend la main), ce qui empêche toute lecture en chaîne ; un verrou évite deux lectures à la fois ; la position est vérifiée une fois à la main après chaque lot, en plus de l'observateur.
- **Projets d'un profil** : la liste « En train de construire » s'affichait en entier. Elle tient dans un cadre d'environ trois cartes, qui défile à l'intérieur et se charge par lots, avec le nombre de projets dans le titre (« En train de construire · 61 »).

Vérifié dans le navigateur sur la base de charge, en naviguant dans l'app comme dans le retour : onglets Communautés et Social sans bouton ni lecture en chaîne, « Toutes » chargé au défilement avec le bouton caché, Explore chargé au défilement après le passage par les notifications, cadre des projets du profil chargé à son défilement (20 puis 40 cartes).

- **Livrable** : `api/notifications.ts`, `api/routes.ts`, `api/schema.ts`, `api/notifications_test.ts` ; `web/lib/notifications.ts`, `web/pages/notifications.tsx`, `web/ui/infinite-list.tsx`, `web/pages/profile/profile-page.tsx`, traductions ; §12.7, §15
- **Par** : @Mirak29

### 2026-10-25 · PAM-531 · Page Messages trop longue, sections d'un projet dans des cadres

- **La page Messages défilait sur un grand vide** : 1 771 px de haut pour un écran de 768. Le bouton « Charger plus » caché de la liste des conversations est placé en position absolue ; sans ancêtre positionné, il sortait de la colonne qui défile et rallongeait toute la page. Le pied de liste est maintenant `relative` : le bouton reste dans sa liste. La page Messages retrouve la hauteur de l'écran ; le cadre des projets d'un profil avait le même défaut.
- **Page projet** : comme les projets d'un profil, les longues sections tiennent dans un cadre qui défile à l'intérieur et se charge par lots : l'équipe dans l'aperçu (environ six personnes, « Équipe · 400 »), les membres de l'onglet Équipe (et des Réglages, qui réutilisent la liste), les listes des onglets Issues et PRs. Sur le dépôt de test (400 membres, 3 000 issues, 2 000 PRs), l'aperçu passe de 20 482 à 1 594 px de haut, l'onglet Équipe de 27 862 à 1 702 px, Issues et PRs vers 1 600 px.

- **Livrable** : `web/ui/infinite-list.tsx`, `web/pages/project/overview-tab.tsx`, `web/pages/project/team-tab.tsx`, `web/pages/project/issues-tab.tsx`, `web/pages/project/pull-requests-tab.tsx`, traductions ; §12.7
- **Par** : @Mirak29

### 2026-10-25 · PAM-531 · Page Projets dans des cadres

La page Projets listait tous les projets d'un coup : avec 61 projets, il fallait faire défiler toute la page pour arriver à « Projets que tu suis ». « Tes projets » tient maintenant dans un cadre d'environ deux rangées de cartes, qui défile à l'intérieur et se charge par lots ; « Projets que tu suis » suit la même logique dans son propre cadre. Vérifié sur la base de charge : la page passe à 1 251 px de haut, les projets suivis sont visibles juste sous le cadre, et le défilement du cadre charge les cartes suivantes (20 puis 40).

- **Livrable** : `web/pages/projects/projects-page.tsx` ; §12.7
- **Par** : @Mirak29

### 2026-10-25 · PAM-531 · Communautés dans des cadres

- **Page Communautés** : les trois sortes (technologies, pays, domaines) étaient empilées en entier, et une longue sorte repoussait les suivantes. Chacune tient maintenant dans un cadre d'environ deux rangées, qui défile par lots, avec le nombre dans le titre (« Technologies · 103 »). Vérifié avec `?stress` (300 communautés de plus) : les trois sections se suivent, la page fait 2 027 px.
- **Page d'une communauté** : les onglets Projets et Aide s'affichaient en entier ; ils se chargent par lots, comme les posts et les membres. Ces onglets n'ont qu'une liste chacun : ils défilent avec la page, comme un fil, sans cadre qui ajouterait une seconde barre de défilement.

- **Livrable** : `web/pages/communities/communities-page.tsx`, `web/pages/communities/community-page.tsx` ; §12.7
- **Par** : @Mirak29

### 2026-10-25 · PAM-531 · Passage de relais du défilement

Arrivé en haut ou en bas d'un cadre (projets d'un profil, page Projets, Communautés, équipe, issues et PRs d'un projet, colonnes du board, colonne de droite de l'Accueil), la molette semblait bloquée : `overscroll-contain` interdisait de passer à la page, et même sans lui le navigateur garde tout le geste sur le cadre jusqu'au geste suivant. Désormais le reste du geste passe à ce qui contient le cadre, la page au bout, dans le même mouvement : le cadre finit sa course, la page prend le reste, en glissant pour un cran de molette et au doigt près pour un pavé tactile. Les crans rapprochés s'additionnent : aucun n'est perdu pendant une glisse. Les cadres n'interdisent plus l'enchaînement, ce qui laisse le tactile enchaîner lui-même ; les colonnes de la messagerie le gardent, la page n'y défilant pas. Une fenêtre modale garde son geste.

Vérifié dans le navigateur (`?stress`, page Communautés) : au milieu d'un cadre le navigateur garde la main ; en bas, la page descend ; avec 20 px de place pour un geste de 35, le cadre finit et la page prend 15 px ; en haut, la page remonte ; trois crans rapides font descendre la page de 300 px en glissant ; rien ne bouge depuis une fenêtre modale.

- **Livrable** : `web/lib/scroll-handoff.ts`, `web/app.tsx`, cadres des pages (sans `overscroll-contain`) ; §12.7
- **Par** : @Mirak29

### 2026-11-11 · PAM-531 · Relecture des listes : bugs et nettoyage

Relecture complète de la branche (`/simplify` puis `/code-review`), puis correction de tout ce qu'elle a relevé.

- **Bugs** :
  - une demande de message refusée restait dans la liste ;
  - une liste pouvait cesser de se charger seule après un changement d'onglet ;
  - le glissement du défilement pouvait revenir en arrière sans l'événement `scrollend` ;
  - une notification supprimée côté serveur restait affichée ;
  - un onglet d'aide restait vide, sans bouton, après une erreur réseau ;
  - l'en-tête d'un projet de l'API comptait les lignes chargées (« 20 issues ouvertes ») au lieu des compteurs du serveur (2 250).
- **Une seule mécanique de lots côté navigateur** (`web/lib/batches.ts`), utilisée par les notifications, l'aide, les messages, les issues et les PRs : un curseur par liste, un lot à la fois, un lot raté réessayé avec « Charger plus ». Une première page relue retire ce qui a disparu de sa plage. Chaque onglet montre les lignes jusqu'où ses propres lots sont allés, jamais celles qu'un autre onglet a lues plus bas, sous un trou. Chaque onglet ou filtre a sa propre liste (`key`), qui repart de zéro.
- **Cadres défilants** : un composant `ScrollFrame` remplace les cadres écrits à la main. Il est positionné, pour que rien de caché n'en sorte, et marqué `data-scroller`, pour que les listes et le passage du défilement le trouvent sans relire les styles de la page à chaque cran de molette.
- **Serveur** :
  - un helper commun de lots (`readBatch`, `after`, `BATCH`) ;
  - les issues « good first issue » filtrées par le serveur, avec leurs propres lots ;
  - les onglets issues et PRs dans l'ordre du serveur ;
  - « Pour moi » lu en 2 requêtes par lot au lieu de 2 par demande ;
  - les onglets de l'aide lisent chaque source par son index, au lieu de trier toutes les demandes des projets ;
  - les compteurs des projets lus en une requête groupée, et le README plus lu en entier ;
  - le compteur de messages calculé avec la première page seulement ;
  - le compteur de notifications non lues lu par son index ;
  - la migration 013 retire deux index devenus inutiles.
- **Petits nettoyages** : `readmeSummary` partagé entre l'API et l'aperçu d'import, un seul `debounced` pour les rechargements en temps réel, badge « 9+ » et schémas de curseur factorisés, cartes du fil construites seulement pour le lot affiché.

Vérifié sur une copie de la base de `deno task stress` : lots de notifications et onglet Projets, filtre « good first issue » (2 250 / 450, réponse en 10 ms), PRs sans doublon, onglet d'aide en erreur puis réessayé, demande refusée qui disparaît. Le format, le lint, les types et les 183 tests passent.

- **Livrable** : `web/lib/batches.ts`, `web/ui/scroll-frame.tsx`, `web/ui/infinite-list.tsx`, `web/lib/scroll-handoff.ts`, `api/lib/cursor.ts`, `api/lib/readme.ts`, `api/help.ts`, `api/projects.ts`, `migrations/013-drop-prefix-indexes.js` ; §12.7
- **Par** : @Mirak29

### 2026-11-11 · PAM-431 · Invitation à CodeRabbit, reviews des bots écartées

- **Import** : l'aperçu d'un repo propose, sans l'imposer, d'activer CodeRabbit. C'est un encadré « Facultatif » avec un lien vers sa page d'installation sur GitHub (`github.com/apps/coderabbitai`), ouvert dans un nouvel onglet. Pamoja n'installe rien : son app reste en lecture seule. L'import se fait de la même façon qu'on clique ou non.
- **Reviews des bots** : une review d'un compte GitHub de type `Bot` (ou dont le login finit par `[bot]`) n'est plus enregistrée, ni par le webhook ni par la resynchronisation. Avant, une remarque de CodeRabbit faisait passer une PR en « review reçue » et la sortait du compteur « en attente de review ». Elle ne validait déjà aucune demande d'aide et ne comptait pas dans la réputation. Un test le vérifie.

- **Livrable** : `web/pages/projects/new-project-dialog.tsx`, `api/review-check.ts`, `api/github-events.ts`, `api/review_check_test.ts` ; §5.4, §7.5
- **Par** : @Mirak29

### 2026-11-11 · PAM-506 · « Sur quoi puis-je travailler ? » calculé par le serveur

L'onglet était calculé dans la page, sur les seules données chargées. Le serveur le calcule maintenant pour le développeur connecté (`api/work.ts`, `GET/api/work`), sans IA, en trois groupes d'au plus 10 :
- les demandes d'aide de « Pour moi », avec leur score ;
- les besoins ouverts des projets publics dont il n'est pas membre ;
- les issues pour débuter des 10 projets qui lui correspondent le mieux, 3 par projet.

La correspondance est la part des skills demandés qu'il possède, pesée comme dans le matching : 100 % prouvé sur Pamoja, 85 % lu sur GitHub, 70 % déclaré. Les lignes de démo s'ajoutent à la suite, sans doublon avec celles du serveur. Le seed enregistre désormais la stack des projets (`project.skills`), sans quoi aucun projet de démo ne correspondait.

- **Livrable** : `api/work.ts`, `api/work_test.ts`, `web/pages/explore/explore-page.tsx`, `api/seed.ts` ; §10.3
- **Par** : @Mirak29

### 2026-11-11 · PAM-533 · Premier pas, d'après State of Dev Sénégal 2026

Lecture complète de l'enquête State of Dev Sénégal 2026 (624 répondants), résumée dans `docs/etudes/state-of-dev-senegal-2026.md`. Le premier groupe, 34,8 %, répond « J'aimerais mais je ne sais pas par où commencer » ; seuls 13,5 % contribuent régulièrement.

- **Premier pas** : pour qui n'a encore aucune PR mergée connue de Pamoja, l'onglet commence par une seule chose :
  - la `good first issue` ou l'issue `documentation` qui lui correspond le mieux, la moins disputée à correspondance égale ; à défaut, un besoin « Documentation » ;
  - trois étapes ;
  - « Demander un mentor », qui ouvre une demande « Mentorat » pré-remplie (Débutant, ~30 min, avec le lien).
- **Documentation** : les issues `documentation` rejoignent les `good first issue`. C'est la deuxième forme de contribution (49,4 %).
- **Vocabulaire** : Tailwind CSS, Next.js, Laravel, Angular, Spring, Express, NestJS et React Native ajoutés ; ils sont parmi les plus utilisés au Sénégal et manquaient.
- **Index** `pull_request_author`, pour savoir sans parcourir toute la table si un développeur a déjà contribué.

Vérifié dans le navigateur, sur une copie de la base : premier pas « Documentation » chez AfriCommerce, étapes adaptées à un besoin, demande de mentor pré-remplie.

- **Livrable** : `docs/etudes/state-of-dev-senegal-2026.md`, `api/work.ts`, `api/vocabulary.ts`, `api/schema.ts`, `web/pages/explore/explore-page.tsx`, `web/pages/help/new-help.tsx` ; §6.1, §10.3
- **Par** : @Mirak29

### 2026-11-11 · PAM-532 · Assistant sur Ollama Cloud

Un encadré en tête de « Sur quoi puis-je travailler ? » répond à des questions du genre « Sur quoi puis-je travailler aujourd'hui ? » ou « Je veux contribuer à l'open source, par où commencer ? ».

- **Le modèle ne fait que rédiger.** Il reçoit la liste de PAM-506, à part de la question et comme une donnée. Il cite chaque élément par sa clé ; le serveur remplace la clé par le titre et donne les liens. Une réponse qui cite un élément absent de la liste est écartée entière.
- **Rien n'est gardé** : ni la question ni la réponse. La page renvoie au plus les 6 derniers messages de l'échange.
- **Budget** : 30 questions par développeur et par jour, 2 000 pour tout Pamoja, et un cache de 10 minutes.
- **Repli** : sans clé, en cas d'erreur, après 20 s ou pour une réponse invalide, la liste s'affiche sans phrase.
- **Configuration** : `LLM_API_KEY`, `LLM_BASE_URL` et `LLM_MODEL_NAME` dans `.env-local`. Une adresse en `/v1` (`https://ollama.com/v1`) passe par l'API compatible OpenAI ; sans `/v1`, par l'API native d'Ollama.

Testé avec un faux modèle (6 tests) : sans clé, réponse valide sans lien du modèle, citation inventée écartée, panne, budget, API compatible OpenAI, clé entre crochets avec espaces et Markdown retiré. Le repli est vérifié dans le navigateur.

Essayé pour de vrai avec **Groq** (`openai/gpt-oss-120b`, offre gratuite), sur une copie de la base : réponses en 1 à 2 s, en français, qui ne citent que la liste ; une question hors sujet (« la capitale du Japon ») est déclinée. Les premiers essais disaient « sur l'issue » pour un besoin de projet : les étapes du premier pas sont désormais écrites par le serveur. Ollama Cloud refusait l'appel (402 : compte sans crédits).

- **Livrable** : `api/assistant.ts`, `api/assistant_test.ts`, `web/pages/explore/assistant.tsx`, `api/routes.ts` ; §11
- **Par** : @Mirak29

### 2026-11-11 · PAM-534 · Assistant repensé : un panneau sur toutes les pages

L'Assistant de PAM-532 était un encadré dans Explorer, dont la conversation se perdait en quittant la page. Il est repensé de zéro.

- **Disponible partout** : un bouton de l'en-tête (et `Ctrl J`) ouvre un panneau à droite, plein écran sur mobile. Il reste ouvert pendant qu'on navigue, et d'une visite à l'autre.
- **Conversation gardée** : enregistrée par le serveur (table `AssistantMessage`, 60 derniers messages, pour le développeur seul). La corbeille l'efface pour de bon. Les 6 derniers messages accompagnent chaque question.
- **Un contexte plus large**, calculé par le serveur à chaque question :
  - le profil et ce qui correspond au développeur (PAM-506, PAM-533) ;
  - ce qui l'attend : demandes à confirmer, aides acceptées, demandes sans aidant, notifications non lues ;
  - la page ouverte : sur un projet, ses besoins, sa stack, ses issues pour débuter ;
  - le mode d'emploi de Pamoja (demander une review, importer, réputation, matching).
- **Cartes et actions** : une réponse montre les éléments cités, cliquables, et des boutons d'un catalogue fixe (« Demander un mentor », « Compléter mon profil »…). Une clé inventée écarte toute la réponse.
- **Des liens dans la phrase** : chaque élément, projet ou page nommé dans une réponse est un lien, à l'endroit où il est nommé ; chaque carte mène à l'élément et à son projet. Le lien d'une PR ouverte du développeur ouvre la demande de review déjà remplie. Le catalogue d'actions couvre aussi ses demandes, son profil et ses preuves, ses projets, les communautés, les développeurs et les messages.
- **Le point d'un projet** : sur la page d'un projet, « Où en est ce projet ? » donne ce qui a été fait et par qui (PR fusionnées, relecteurs), ce qui est en cours (PR ouvertes, dont celles sans review, tâches du tableau) et ce qui reste (issues ouvertes, tableau, jalons), chaque PR et issue en lien. Essayé pour de vrai sur deux projets de la base.
- **Jamais de « rien ne te correspond » sec** : sans correspondance, le serveur donne la raison et des projets à découvrir, et l'Assistant part des projets du développeur, propose de compléter son profil et d'en découvrir d'autres.
- **Utile sans question** : à l'ouverture, un point calculé sans IA et des questions proposées selon la page (« Que puis-je faire sur ce projet ? »).
- **Explorer** garde le premier pas et les listes ; l'encadré devient un bouton « Demander à l'Assistant ».

Vérifié dans le navigateur avec Groq, sur une copie de la base : panneau qui suit la navigation, conversation retrouvée, question sur le projet ouvert (AfriCommerce), « Qu'est-ce qui m'attend ? », « Comment demander une review ? », nouvelle conversation. 7 tests avec un faux modèle.

- **Livrable** : `api/assistant.ts`, `api/assistant_test.ts`, `api/schema.ts`, `api/routes.ts`, `web/lib/assistant.ts`, `web/ui/assistant-panel.tsx`, `web/ui/header.tsx`, `web/ui/layout.tsx`, `web/pages/explore/explore-page.tsx` ; §11, §14.4
- **Par** : @Mirak29

### 2026-11-12 · PAM-535 · Passe de fluidité sur toute l'interface

Parcours de toutes les pages, sur ordinateur (1 440 et 1 920 px) et sur mobile (375 px), avec un contrôle automatique des débordements (aucun) puis un passage à l'œil.

- **Défilement** : en changeant de page, on gardait la position de la page précédente (un profil ouvert depuis le milieu d'Explorer s'affichait au milieu). Une nouvelle page s'ouvre maintenant en haut, le retour ramène où l'on était, et les onglets d'une même page ne bougent pas.
- **Grand écran** : le contenu, collé à gauche, laissait un grand vide à droite ; il est centré sous la recherche. Le panneau de l'Assistant ne recouvre plus la page : elle lui fait place au-delà de 1 400 px.
- **Mobile** :
  - la barre du bas passe de 7 à 6 entrées : les notifications, déjà dans l'en-tête, n'y sont plus en double ;
  - les onglets amènent l'onglet courant à l'écran et s'estompent au bord quand d'autres suivent ;
  - les filtres d'Explorer se replient sous « Filtres · n », les résultats sont sur le premier écran ;
  - la rédaction de l'Accueil tient sur une ligne tant qu'on n'écrit pas, le fil arrive plus tôt.
- **Écrans vides** : chacun mène quelque part (messages → trouver des développeurs ; onglets de l'aide → compléter ses skills, nouvelle demande, sur quoi travailler ; preuves de son profil → trouver sa première contribution).

Vérifié dans le navigateur, sur une base de démo neuve : mesures de défilement (0 sur une nouvelle page, 600 retrouvés au retour), captures mobile et grand écran.

- **Livrable** : `web/lib/scroll-position.ts`, `web/ui/tabs.tsx`, `web/ui/navigation.tsx`, `web/ui/layout.tsx`, `web/lib/assistant.ts`, `web/pages/explore/explore-page.tsx`, `web/pages/home/home-page.tsx`, `web/pages/help/help-list.tsx`, `web/pages/messages-page.tsx`, `web/pages/profile/profile-page.tsx` ; §12.7
- **Par** : @Mirak29

### 2026-11-12 · PAM-536 · Mécanismes de réseau social

Ce qu'un réseau social fait et que Pamoja ne faisait pas :

- **Chaque page principale garde sa place.** Accueil, Explorer, Projets, Aide, Communautés, Notifications, Messages et Enregistrés retrouvent leur position même quand on y revient par le menu, pas seulement par le retour. Une page ouverte depuis une autre (profil, projet, post) s'ouvre en haut.
- **Les listes gardent ce qu'elles ont chargé.** Avant, revenir à l'Accueil ne montrait que les 20 premiers posts : impossible de retrouver le 60ᵉ. Le nombre de lignes lues est gardé par page et par liste.
- **L'onglet actif touché à nouveau** remonte en haut et relit le contenu (posts, projets, demandes, notifications, messages), avec une barre fine pendant la lecture. Depuis très bas, saut près du haut puis glissement court.
- **Les posts arrivent en direct.** Le serveur ne créait aucune entrée `POST_CREATED` : le fil n'était lu qu'à la connexion. L'entrée est maintenant créée et envoyée à l'auteur (ses autres onglets), aux membres de la communauté et aux abonnés de l'auteur, pas à tout le monde, pour ménager le serveur.
- **« ↑ N nouveaux posts ».** Plus bas dans le fil, les nouveautés attendent derrière ce bouton, collé en haut, au lieu de faire sauter ce qu'on lit. En haut du fil, elles s'affichent tout de suite.
- **Brouillons.** Un post commencé, ou un message par conversation, survit à un changement de page (pour l'onglet du navigateur seulement, jamais envoyé).
- **Titre de l'onglet** : « (3) Accueil · Pamoja » quand des notifications ou des messages attendent.

**Correction : la place perdue au rechargement.** Positions et nombre de lignes n'étaient gardés qu'en mémoire, et la restauration du navigateur était désactivée (`scrollRestoration = 'manual'`) : un rechargement, un retour depuis un autre site, ou un téléphone qui recharge l'onglet après un passage dans une autre application, ramenaient en haut. Le mécanisme est réécrit sur le modèle du navigateur : une clé par entrée de l'historique (`history.state`), une position par entrée et par page principale, gardées pour l'onglet (`web/lib/tab-memory.ts`, `sessionStorage`) ; la restauration attend que la page soit assez haute et cède au premier geste du lecteur ; les défilements de l'application pendant une navigation ne sont pas enregistrés. Vérifié avec de vrais gestes (molette, clics, retour, avance, F5) : Accueil à 2 000 px retrouvé par le menu et par l'avance, Explorer à 500 px par le retour, 1 500 px retrouvés après F5, un projet ouvert en haut, l'Accueil touché à nouveau remonte en haut.

**Correction : chaque clic du menu remontait en haut.** Le routeur change de page dès que le pointeur s'enfonce (`pointerdown`), avant le clic : au moment où « l'onglet de la page où l'on est déjà ? » était vérifié (sur le clic), l'adresse était déjà celle du lien, et la remontée partait à chaque changement de page. Une restauration juste derrière le masquait chez moi, pas dans un vrai navigateur. La décision est maintenant prise avant que le lien n'agisse : à l'appui pour un pointeur, au clic pour une touche (Entrée) ; elle empêche alors le routeur de naviguer. Vérifié en traçant chaque défilement : changer de page ne fait plus que restaurer, retoucher l'Accueil remonte une seule fois.

Vérifié dans le navigateur, sur une base de démo neuve : Accueil à 3 000 px retrouvé après un passage par Explorer (12 posts toujours chargés), Explorer à 500 px retrouvé, profil ouvert en haut, retour au bon endroit ; un post publié par un compte suivi pendant la lecture fait apparaître « 1 nouveau post » sans bouger le fil, puis passe en tête au clic. Le test des déclencheurs couvre la nouvelle audience de `POST_CREATED`.

**Relecture `/simplify`** (réutilisation, simplification, performance, architecture) et corrections à la racine :
- **Défilement** : plus d'écoute continue ni de drapeau « en cours de navigation ». La position est gardée quand on quitte une page et quand l'onglet est masqué ; une entrée d'historique sans clé est un nouveau lien (le test `isTrusted` reposait sur une idée fausse : le routeur n'envoie pas d'événement) ; ce sont les liens qui disent leur intention (menu, onglet) au lieu des listes de chemins `MAIN` et `pageOf` ; ce qui ne change que les paramètres ne bouge pas le défilement ; la restauration réessaie quand la page grandit (`ResizeObserver`) au lieu d'un minuteur.
- **Menu** : chaque entrée porte ce qu'elle relit ; « déjà sur sa page » est décidé à l'appui et gardé pour le clic (le menu est redessiné entre les deux). Un premier essai qui décidait au rendu relançait une remontée à chaque changement de page : vu en traçant chaque défilement, corrigé.
- **Un seul stockage d'onglet** (`tabMemory<T>`) pour les positions, les listes et les brouillons, limité aux 100 clés les plus récentes, écrit après une rafale ; les brouillons ne sont plus écrits à chaque frappe. Chaque conversation a son propre composer (`key`) : ses pièces jointes ne passent plus à la suivante.
- **Listes** : une seule source pour le nombre de lignes lues, avec une clé par liste (`useId`) : deux listes d'une même page ne partagent plus leur compteur.
- **Nouveaux posts** : mis de côté par la couche de données, seuls les plus récents lus ; `adoptPosts` ne prévient plus les pages quand rien n'a été ajouté.
- **Petits** : place du panneau de l'Assistant lue directement par la mise en page, écrans vides par `EmptyState`, listes de filtres d'Explorer écrites une fois, audience `fan` nommée, fondu des onglets simplifié et mesuré par `ResizeObserver`.

**Relecture `/code-review`**, six points corrigés :
- une fenêtre ouverte sur une liste (visionneuse d'images, signalement) changeait sa clé et la ramenait à 20 lignes : les lignes lues sont gardées par chemin, liste et filtres, plus par l'adresse entière ; Explorer ne compte plus que ses filtres ;
- la position atteinte sans changer de page n'était pas écrite avant un rechargement (l'écriture du stockage passait avant elle) : elle est écrite tout de suite quand la page part ou est masquée ;
- un Ctrl+clic ou un clic du milieu laissait une intention de défilement en attente pour le lien suivant : seuls les appuis que le routeur suit comptent ;
- retoucher l'Accueil relit aussi les demandes d'aide de sa colonne ;
- la restauration après un rechargement attend jusqu'à 10 s (le temps de la session et des données), sans rien coûter pendant l'attente ;
- le logo se comporte comme l'entrée Accueil du menu.

Vérifié : F5 retrouve 5 000 px atteints sans navigation, une visionneuse ouverte puis fermée laisse le fil à 5 000 px, le logo ramène l'Accueil à 5 000 px, un profil ouvert après un Ctrl+clic dans le menu s'ouvre en haut.

Revérifié avec de vrais gestes, dans un onglet neuf : Explorer en haut à la première visite, Accueil retrouvé à 1 500 px par le menu sans remontée parasite, Accueil touché à nouveau remonte une fois, l'onglet du fil garde la position, retour 1 200 px, avance 839 px, F5 1 200 px, « 1 nouveau post » sans bouger le fil.

- **Livrable** : `web/lib/scroll-position.ts`, `web/lib/tab-memory.ts`, `web/lib/posts.ts`, `web/ui/tabs.tsx`, `web/lib/refresh.ts`, `web/lib/draft.ts`, `web/lib/live-data.ts`, `web/ui/infinite-list.tsx`, `web/ui/navigation.tsx`, `web/ui/layout.tsx`, `web/pages/home/home-page.tsx`, `web/pages/messages-page.tsx`, `api/posts.ts`, `api/entries.ts` ; §10.1, §12.7
- **Par** : @Mirak29

### 2026-11-12 · PAM-537 · Démo prête à déployer chez Systalink

La démo sera hébergée chez Systalink, sur la formule Développeur (1 cœur, 2 Go, 30 Go, 7 733 F CFA par mois) : l'app, Caddy et Docker y tiennent en environ 1 Go. Consigne : une app aussi légère que possible, au bundle comme au build.

**Bundle.** Le poids venait de notre code, pas des dépendances (Preact et les signals font 22 Ko). Le navigateur lisait au démarrage toutes les pages (270 Ko) et l'anglais de l'interface (90 Ko).
- Chaque page est lue à sa première visite (`web/lib/lazy-page.ts`). Celle de l'adresse demandée part en même temps que la session, les autres quand le navigateur est libre : un clic ouvre sa page sans attente. Si le code d'une page manque après un nouveau déploiement, la page se recharge une fois.
- L'anglais n'est lu que par qui l'a choisi, avant le premier affichage, donc sans français entrevu. `language` est la langue affichée ; elle passe à l'anglais une fois ses mots chargés.
- Le build de production repart d'un `dist/` vide (il embarquait les source maps, le CSS et les anciens morceaux du build de dev) et ne garde pas les commentaires de licence.
- Mesuré : 175 Ko au démarrage (64 Ko compressés) au lieu de 594 Ko (186 Ko), puis 48 Ko (21 Ko) pour l'Accueil et 20 Ko (7 Ko) pour la landing.

**Correction en cours de route.** Le premier essai du build de production affichait une page blanche. Le code de la page arrivait entre son premier affichage (vide) et l'effet qui devait la redessiner ; l'effet voyait la page déjà là et ne faisait rien. Il se fie maintenant à ce qui a été affiché. Un test reproduit cette course : il échoue avec l'ancien code.

**Image.** Le `Dockerfile` suit Tournament : build sur l'image Deno, binaire `deno compile`, Alpine finale avec la glibc et SQLite, sans root. Le binaire embarquait `node_modules`, soit 50 Mo d'outils de build (esbuild, Tailwind) ; il est compilé sans. Résultat : 112 Mo de binaire, dont 96 Mo de runtime Deno, et 174 Mo d'image au lieu de 241 Mo. Le `.dockerignore` ne laisse entrer que ce que le build lit. Un seul binaire sert l'app (`pamoja`) et reconstruit la démo (`pamoja seed --prod`).

**Publication et compose, comme Defendable.** L'image est construite et publiée par GitHub (`.github/workflows/publish.yml`, `ghcr.io/mirak29/pamoja`), après une CI réussie sur `master` ; la VM ne fait que `docker compose pull`. Le `docker-compose.yml` lance l'app sur `127.0.0.1:8000`, avec un volume pour la base, les médias et les sauvegardes, et une vérification de santé ; Caddy est son profil `https`. Le `Caddyfile` sert HTTPS en HTTP/1.1, 2 et 3, avec `flush_interval -1` sur `/api/events` et sans `encode`. Les secrets vont dans `.env.production`, sur la VM seulement (`.env.production.example`). Marche à suivre : `docs/deploiement.md`.

**Bloquant découvert : les logs.** En production, le logger de `@01edu/api` refuse de démarrer sans les devtools de 01edu (`DEVTOOL_URL`, `DEVTOOL_REPORT_TOKEN`), où Tournament envoie ses logs. Pamoja ne les a pas. En production, `api/lib/log.ts` écrit donc une ligne JSON par événement sur la sortie du conteneur, lue avec `docker logs`, avec la même interface `Log`.

**Sauvegardes.** Le serveur copie lui-même la base toutes les heures avec `VACUUM INTO` (`api/backups.ts`), comme ses autres tâches de fond, et efface les copies de plus de 7 jours. Il n'y a ni cron ni conteneur de plus. `BACKUP_DIR` est obligatoire en production.

Vérifié :
- build de production servi en local : landing, connexion, les huit pages du menu, passage en anglais et rechargement en anglais ;
- image construite et lancée avec compose : seed par le binaire, page et API servies à travers Caddy, compression de l'app intacte, HTTP/2 et 3 annoncés ;
- une sauvegarde horaire copiée hors du conteneur : `integrity_check` à `ok`, 9 développeurs.

Reste à faire :
- la restauration complète (remettre la copie en place puis redémarrer), avec PAM-907 ;
- le flux SSE à travers Caddy avec une vraie session, avec PAM-906 sur la VM ;
- la copie quotidienne hors de la VM, qui dépend du stockage proposé par Systalink (PAM-003).

- **Livrable** : `web/lib/lazy-page.ts`, `web/lib/language.ts`, `web/app.tsx`, `task-prod.ts`, `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.env.production.example`, `.github/workflows/publish.yml`, `deploy/`, `api/backups.ts`, `api/lib/log.ts`, `api/lib/env.ts`, `api/server.ts`, `docs/deploiement.md` ; §12.7, §17.4, §17.5
- **Par** : @Mirak29

### 2026-11-13 · PAM-538 · Navigation au doigt

Trois retours de tests sur téléphone : en faisant défiler, on ouvrait les cartes ; sur la page Communautés, seul le nom d'une communauté l'ouvrait ; la navigation manquait d'un bouton retour.

**Un défilement ouvrait les cartes.** La cause est dans le routeur (`@01edu/signal-router`) : son lien `A` navigue au `pointerdown`, quel que soit le pointeur. C'est ce qui le rend vif à la souris, mais sur un écran tactile, le doigt qui se pose sur une carte pour faire défiler la page l'ouvre aussitôt. La correction est faite à la racine, sans toucher à la bibliothèque : `web/ui/link.tsx` est le lien de l'app, et les 44 fichiers qui prenaient celui du routeur le prennent maintenant. La souris navigue toujours à l'appui. Un doigt ou un stylet navigue au clic, que le navigateur n'envoie que pour un tap, jamais après un défilement. Le clavier navigue au clic, et les liens vers un autre site restent ceux du navigateur.

Les intentions de défilement (menu, onglets) et « déjà sur sa page » sont maintenant décidées par `onNavigate`, au moment où le lien va naviguer, et non plus à l'appui. Un doigt qui ne fait que défiler ne laisse donc plus d'intention en attente. L'état `pressed` du menu, qui gardait la décision de l'appui jusqu'au clic, disparaît.

**Cartes de communauté.** Elles s'ouvrent maintenant en entier, comme celles des développeurs et des projets, avec le même effet au survol. Comme elles portent le bouton « Rejoindre », qui ne peut pas être dans un lien, le lien du nom les couvre (`::after`) et le bouton reste au-dessus.

**Bouton retour.** Il apparaît dans la barre du haut sur chaque page hors du menu (`web/ui/back-button.tsx`). Sur mobile, il prend la place du logo. Une entrée de l'historique créée par l'app le dit dans son état (`inApp`, posé par `scroll-position.ts`). Le retour revient alors à l'entrée précédente, et le défilement y est retrouvé. Une page ouverte par un lien partagé n'a rien avant elle dans l'app : le retour mène à sa section, sans quitter le site.

Vérifié :
- `web/ui/link_test.ts` : un doigt posé n'ouvre rien, un tap ouvre une fois, un stylet fait comme un doigt, la souris navigue à l'appui sans repartir au clic, le clavier navigue au clic, `onNavigate` peut garder la page, un lien externe n'est pas touché. Le même test échoue avec le lien du routeur.
- Dans le navigateur, en vue mobile, avec des événements tactiles : un doigt posé sur une carte de communauté ne l'ouvre pas, un tap sur sa description l'ouvre ; la description, les coins et le bas de la carte mènent au lien, le bouton reste au-dessus ; le retour depuis une communauté revient sur Communautés à 700 px sans nouvelle entrée d'historique ; un projet ouvert directement ramène à Projets ; l'onglet Projets touché sur sa page relit les projets.
- À la souris, avec de vrais clics : la description d'une carte ouvre la communauté, la flèche retour ramène à Communautés.
- CI : format, lint, types, 198 tests.

- **Livrable** : `web/ui/link.tsx`, `web/ui/link_test.ts`, `web/ui/back-button.tsx`, `web/ui/header.tsx`, `web/ui/navigation.tsx`, `web/ui/tabs.tsx`, `web/ui/button.tsx`, `web/lib/scroll-position.ts`, `web/pages/communities/communities-page.tsx`, imports de 44 fichiers ; §12.7
- **Par** : @Mirak29

### 2026-11-13 · PAM-507 · Meilisearch

La recherche globale passe maintenant par le serveur et par Meilisearch, comme le prévoit le §10.4. Jusqu'ici, elle se faisait dans le navigateur, sur les données déjà chargées : elle tolérait les fautes, mais elle ne voyait que ce que la page avait reçu.

**Serveur** (`api/search.ts`, `GET/api/search`).
- **Cinq index** : `developers`, `projects`, `communities`, `posts` et `help_requests`. Ils ne contiennent que ce que tout développeur connecté peut voir : ni projet non listé, ni post masqué, ni réponse, ni demande adressée à une seule personne, ni compte suspendu.
- **Une seule source pour les documents** : les mêmes requêtes SQL servent à l'index et au repli `LIKE`. Ce qui est tapé reste du texte : `%` ne trouve rien.
- **Reconstruction complète** : à chaque démarrage, puis chaque nuit. Elle remplit un index à côté, puis l'échange avec l'actuel, pour qu'une recherche ne tombe jamais sur un index à moitié rempli.
- **Synchronisation** : elle lit les entries après la dernière vue, toutes les 3 s, et renvoie ou retire les documents concernés. Le curseur n'avance qu'après l'envoi : pendant une panne, les entries attendent dans SQLite.
- **Repli** : si Meilisearch ne répond pas en 1,5 s, SQL prend le relais pendant 30 s, pour la recherche comme pour la synchronisation. Les logs reçoivent une erreur par pause, pas toutes les 3 s.

**Navigateur.**
- La palette (Ctrl+K) et la page Recherche demandent au serveur une fois la frappe arrêtée : une seule requête pour un mot de 9 lettres.
- Un élément déjà connu de la page est affiché avec ses données habituelles. Un élément inconnu, comme un développeur qui vient de s'inscrire, est affiché avec ce que le serveur envoie.
- Les posts et demandes d'aide de démo n'existent que dans le navigateur : ils sont toujours cherchés sur place et ajoutés aux résultats, comme les skills.
- Sans réponse du serveur, la page cherche seule, comme avant.

**Déploiement.** Le compose ajoute un conteneur `meilisearch` (`v1.56.0`, 256 Mo pour indexer, volume `search`), sans port ouvert. Sa clé est lue dans `.env` et transmise à l'app comme à Meilisearch.

**Bugs trouvés au premier vrai essai.**
- Supprimer un index absent crée une tâche Meilisearch qui échoue. L'attente d'une tâche accepte maintenant les échecs attendus, par leur code exact (`index_not_found`, `index_already_exists`), au lieu de tout ignorer.
- Le pilote SQLite renvoie un `json_group_array` déjà décodé : les skills des développeurs revenaient vides. Les listes sont lues sous les deux formes, et un skill déclaré et lu sur GitHub n'apparaît plus deux fois. Le test le vérifie maintenant.
- Le tag `sql` lit le texte brut : `ESCAPE '\\'` y valait deux caractères. Le caractère d'échappement est `!`.

Vérifié :
- avec un vrai Meilisearch `v1.56.0` et une copie de la base de dev : 5 009 développeurs, 66 projets, 308 communautés et 1 500 demandes indexés au démarrage ;
- « postgress » trouve les développeuses en PostgreSQL, « typscript » trouve TypeScript, en 50 à 90 ms ;
- un post publié est trouvé 2,6 s plus tard, même écrit « Kubernets » ;
- Meilisearch arrêté, la recherche répond par SQL ; un Meilisearch neuf et vide est rempli au démarrage ;
- sur une base seedée comme la démo : la palette montre développeurs, projets et skill pour « postgress », et la page Recherche trouve le post et la demande de démo « tuiles » à côté des résultats du serveur ;
- `api/search_test.ts` : contenu public seulement, session obligatoire, texte et non motif, skills sans doublon, document retiré quand il est masqué ;
- CI : format, lint, types et tests.

Reste à faire : brancher les filtres d'Explorer sur l'index. Ils sont déclarés, mais Explorer filtre encore dans le navigateur.

- **Livrable** : `api/search.ts`, `api/search_test.ts`, `api/routes.ts`, `api/server.ts`, `api/lib/env.ts`, `web/ui/command-palette.tsx`, `web/pages/search-page.tsx`, `docker-compose.yml`, `.env.production.example`, `docs/deploiement.md` ; §10.4, §17.4
- **Par** : @Mirak29

### 2026-11-13 · PAM-901 · Seed des 14 reviews confirmées de Moussa

Ajout au seed des 14 preuves de review de Moussa (`REVIEW_HELP_CONFIRMED`, `source = demo`, éligibles, backdatées), réparties sur quatre demandeurs de trois pays (Sénégal, Ghana, Cameroun) et deux projets. Le profil continue d'afficher ses preuves de fixtures, que le seed reflète (§18.2) ; côté serveur, le matching compte désormais « 14 reviews confirmées » (+15, score 59 → 74, Moussa n'est plus un « nouveau profil ») et l'évaluateur de badges donne Trusted Reviewer Silver, plus First Responder et Cross-border Silver. `evaluateBadges` reçoit un indicateur `announce` : le seed écrit la progression des badges sans émettre d'entry `BADGE_UNLOCKED` ni de notification datées « maintenant », ce qui garde toutes les entries du seed en `source = demo`.

**Revue (CodeRabbit et relecture).** Les skills prouvés par ces reviews manquaient : en production, chaque confirmation écrit une ligne `platform_activity` dans `userSkill` (`help-lifecycle.ts`), la source que le matching pèse le plus (100 contre 70 pour un skill déclaré). Le seed les écrit maintenant, datées de la plus ancienne review ; le test le vérifie. Le score de Moussa pour la demande de la démo (review de code sur OpenPay Africa, Go, SQLite, Backend) passe ainsi de 74 à 87, recalculé avec `rank` sur la base seedée ; le « 59 → 74 » plus haut est celui d'avant ces skills. Un commentaire annonçait l'Or à la 15e review : il est à 20 (`[3, 10, 20, 50]`), la démo montre « 15 / 20 vers Gold » (§18.2).

- **Livrable** : `api/seed.ts`, `api/badges.ts`, `api/seed_test.ts`, `task-db-seed.ts` ; §8, §18.1
- **Par** : @niangoos

### 2026-11-13 · PAM-503 · Suivre développeurs, projets et communautés

Route `POST/api/follow/toggle` (utilisateur, projet, communauté) qui ajoute ou retire une ligne `follow`, avec limite de débit (§16) et refus de se suivre soi-même. Après le changement, `refreshListeners` relit les abonnements des connexions SSE du suiveur : un vrai follow fait désormais arriver `POST_CREATED` dans le fil en direct (§13.2), alors qu'avant seuls les follows du seed existaient. Côté interface, les boutons Suivre du profil, de la Home, de la page projet et de la liste des projets passent par `web/lib/follow.ts` — changement affiché tout de suite, enregistré sur le serveur, remis en place en cas d'échec.

**Revue (relecture et CodeRabbit), corrigée.** La route était une bascule (`POST/api/follow/toggle`) et la page ne relisait jamais les abonnements : `me.follows` partait des fixtures ou d'une liste vide. Après un rechargement, un abonné voyait « Suivre » et son clic le désabonnait sur le serveur ; un second onglet ou une nouvelle tentative faisaient de même. Maintenant :
- `POST/api/follow` reçoit l'état voulu (`follow: true/false`) : la même requête donne le même résultat ;
- `GET/api/follows` donne les développeurs, projets et communautés suivis, lus à chaque session (`loadFollows`, comme `loadProjects`) ;
- la page applique l'état que le serveur confirme, et revient en arrière si la requête échoue.
La règle va dans le cahier (§15) : une route qui active ou désactive reçoit l'état voulu. Le test couvre la requête rejouée et la relecture.

Vérifié dans le navigateur : suivre Kofi, recharger, le bouton dit toujours « Suivi », un clic désabonne vraiment (écran et base d'accord). Sur la page d'un projet, le bouton ne changeait pas au clic (défaut antérieur à la PR) : l'en-tête lit le signal `helpChanged` et, avec le même objet `project` modifié sur place, n'était pas redessiné ; il lit maintenant aussi `projectsChanged`.

Seconde relecture de CodeRabbit, sur les requêtes concurrentes : deux clics rapides envoient des états opposés que le serveur pouvait enregistrer dans le désordre, la relecture du démarrage pouvait écraser un clic fait pendant qu'elle courait, et une réponse arrivée après un changement de compte s'appliquait au nouveau. `web/lib/in-order.ts` fait partir les écritures d'une même cible l'une après l'autre ; seule la dernière décide de l'affichage ; la relecture garde ce qui a été cliqué pendant qu'elle courait ; une réponse d'une autre session est ignorée. Testé (`web/lib/in-order_test.ts`) et vérifié dans le navigateur : trois clics rapides, écran et base d'accord, et encore après un rechargement.

Relecture `/code-review` : un projet devenu non listé ne pouvait plus être quitté (la route ne retrouvait que les projets publics) ; il se quitte maintenant, sans pouvoir être suivi de nouveau. La limite de débit refusait aussi les désabonnements après 60 abonnements dans l'heure : seul un nouvel abonnement compte. Reste connu : la limite compte les abonnements encore présents, donc des allers-retours suivre / ne plus suivre ne l'atteignent pas ; il faudrait enregistrer chaque tentative.

- **Livrable** : `api/follow.ts`, `web/lib/session.ts`, `web/fixtures/people.ts`, `web/fixtures/projects.ts`, `docs/cahier-des-charges.md`, `api/follow_test.ts`, `api/routes.ts`, `web/lib/follow.ts`, `web/pages/home/home-page.tsx`, `web/pages/profile/profile-page.tsx`, `web/pages/projects/projects-page.tsx`, `web/pages/project/project-page.tsx` ; §10.1, §13.2, §14.1
- **Par** : @niangoos

### 2026-11-13 · PAM-502 · Rejoindre et quitter une communauté sur le serveur

Route `POST/api/community/join` qui ajoute ou retire une ligne `communityMember` (par slug), avec limite de débit (§16) et refus d'une communauté inconnue. `refreshListeners` relit ensuite les abonnements SSE du membre : il reçoit (ou cesse de recevoir) les posts de la communauté en direct (§13.2). `GET/api/user/me` renvoyant déjà les communautés rejointes, l'état « Membre » est juste après un rechargement. Côté interface, les boutons Rejoindre et Quitter passent par `web/lib/communities.ts` — changement affiché tout de suite, enregistré sur le serveur, remis en place en cas d'échec.

Reste pour clore PAM-502 : créer une communauté (ligne `community` + créateur modérateur + réindexation recherche) demande d'abord un listing des communautés lu depuis la base, sinon une communauté créée disparaît du listing fixture au rechargement ; à suivre dans une PR dédiée.

**Revue (relecture et CodeRabbit), corrigée.** La route basculait l'adhésion et la page ne relisait jamais les communautés rejointes (`GET/api/user/me` ne les donnait pas) : après un rechargement, un second onglet ou une nouvelle tentative, un clic pour rejoindre pouvait faire quitter. Maintenant :
- `POST/api/community/join` reçoit l'état voulu (`join: true/false`) : la même requête donne le même résultat ;
- les communautés rejointes viennent avec le développeur connecté (`communities` de `GET/api/user/me`, une seule requête partagée avec le profil public : `communitiesOf`) ;
- la page applique l'état confirmé par le serveur, et revient en arrière si la requête échoue.
Le nombre de membres affiché reste celui de la page tant que les communautés ne sont pas lues sur le serveur (`GET/api/communities`, PAM-502) : le compte du serveur d'une communauté seedée n'est pas celui que montre la démo.

Vérifié dans le navigateur : rejoindre React, recharger, la page dit « Membre » ; quitter, la base suit.

Seconde relecture de CodeRabbit : un départ lancé pendant qu'une adhésion était en route pouvait être défait par la réponse tardive de l'adhésion. Les écritures d'une même communauté partent l'une après l'autre et seule la dernière décide de l'affichage (`web/lib/in-order.ts`, le même que pour le follow) ; une réponse arrivée après un changement de compte est ignorée.

Relecture `/code-review` : après 60 adhésions dans l'heure, même un départ était refusé ; seule une adhésion compte maintenant. Reste à trancher : un modérateur qui quitte perd son rôle (la ligne `communityMember` est supprimée, et il revient en simple membre) ; le cahier ne dit pas s'il faut l'en empêcher.

- **Livrable** : `api/community.ts`, `api/community_test.ts`, `api/routes.ts`, `web/lib/communities.ts`, `web/pages/communities/membership.tsx` ; §10.2, §13.2, §14.5
- **Par** : @niangoos

### 2026-11-13 · PAM-302 · Personnalisation du profil enregistrée

Le thème, la couleur d'accent, l'ordre des sections et les projets mis en avant sont désormais enregistrés par `POST/api/user/profile/update` (champs ajoutés à la route, à `updateProfile` et au schéma lu) ; une valeur de thème ou d'accent inconnue est ignorée et l'actuelle gardée. `GET/api/user/me` et le profil public `GET/api/user` les renvoient, et `web/lib/profile.ts` les adopte au chargement (`adoptSettings`) : chaque profil `/@login` s'affiche avec son propre thème, son accent et son ordre de sections, même après rechargement. Les styles de couverture prédéfinis (fil, grille…) restent dans la page, faute de colonne dédiée.

**Revue (relecture et CodeRabbit), corrigée.** Un profil jamais ordonné a sa colonne `sectionOrder` vide, et le serveur renvoie alors `[]`. `adoptSettings` remplaçait l'ordre par défaut par cette liste vide : la page construit ses sections avec `order.map`, donc tous les profils du seed et tout nouvel inscrit n'en montraient plus aucune, et l'écran Modifier le profil non plus (enregistrer gardait `[]`). `completeOrder` donne maintenant l'ordre enregistré, puis toutes les sections qu'il ne nomme pas, dans l'ordre par défaut : un profil jamais ordonné les a toutes, et un profil ordonné avant l'ajout d'une section la garde. Testé (`web/fixtures/profile-settings_test.ts`) et vérifié dans le navigateur : le profil de Moussa montre ses sections.

Relecture `/simplify` : l'ordre complet est maintenant donné par le serveur (`sectionOrderOf`, `api/user.ts`), au lieu d'une liste vide à compléter par chaque client ; `completeOrder` reste dans la page comme garde-fou si les deux versions divergent. `jsonStrings`, copié dans `api/profile.ts` et `api/user.ts`, devient `stringsOf` (`api/lib/json.ts`), qui lit le JSON sous forme de texte ou déjà décodé. Les projets mis en avant passent par `assertSlugs` (30 au plus, slugs valides) ; les champs texte sont nommés pour leur limite au lieu d'être déduits par élimination.

Relecture `/code-review` : l'écran « Modifier le profil » partait de `settingsOf(me.login)`, rempli seulement quand la page profil avait été chargée dans la session ; ouvert directement, il enregistrait les valeurs par défaut par-dessus le thème, l'accent, l'ordre et les projets mis en avant. `setUser` reprend maintenant la personnalisation de `GET/api/user/me`. Vérifié : thème Terminal enregistré, rechargement, écran d'édition ouvert directement, enregistrement : le serveur garde Terminal, Corail et l'ordre.

- **Livrable** : `api/user.ts`, `api/profile.ts`, `api/routes.ts`, `api/profile_personalization_test.ts`, `web/lib/session.ts`, `web/lib/profile.ts`, `web/fixtures/profile-settings.ts` ; §9.2
- **Par** : @niangoos

### 2026-11-13 · PAM-403 · Candidatures pour rejoindre un projet

`POST/api/project/join` enregistre une candidature (`joinRequest`, façons d'aider, disponibilité, message), refuse une candidature en double ou vers son propre projet, limite le débit, et notifie l'owner et les mainteneurs. `POST/api/project/join-request/decide` n'est permis qu'à un owner ou un mainteneur : accepter ajoute la personne à l'équipe (rôle `contributor`), produit l'entry `PROJECT_MEMBER_JOINED`, relit ses abonnements SSE et la prévient ; refuser la prévient aussi. Les notifications d'application portent le `joinRequestId`, si bien que le gestionnaire **accepte ou refuse directement depuis sa notification** (§6.6). Côté interface, `web/lib/applications.ts` relie le formulaire de candidature et les boutons Accepter/Refuser à ces routes, en conservant le chemin des candidatures de démo (fixtures).

Correctifs de relecture : les actions suivent l’état actuel de la candidature, indépendamment de la lecture de la notification. Un échec d’envoi restaure l’état optimiste et garde le formulaire ouvert ; un échec de décision permet de réessayer. Le champ `message` est masqué dans les logs par la liste des clés sensibles.

**Revue (relecture et CodeRabbit), corrigée.**
- Le serveur n'avait aucune limite : le message dépassait `LIMITS.note` (1 000 caractères) sans refus, alors que la page compte jusque-là (§16), et les façons d'aider et la disponibilité n'étaient pas vérifiées (un test envoyait `~5 h par semaine`, que la page ne propose pas). Les listes vont dans `api/vocabulary.ts` (`joinAreas`, `joinAvailabilities`), lues par la page et vérifiées par le serveur ; un message trop long est refusé.
- Chaque refus porte une raison stable (`member`, `pending`, `unknown`, `invalid`, `decided`). La page disait « Pamoja n'a pas pu joindre le serveur » pour tout échec, même quand le serveur avait répondu. Elle dit maintenant ce qui s'est passé ; une candidature déjà en attente (autre onglet, rechargement) est annoncée comme telle et reste affichée comme envoyée ; une décision déjà prise par un autre membre relit les notifications.
- La boîte se fermait à la fin de l'envoi même si on l'avait annulée pour en ouvrir une autre : elle ne ferme plus que la sienne.
- Les phrases de la candidature avaient leur anglais manquant : ajouté.
- Le paragraphe de correctifs du second commit était sous PAM-304 (« Fermé sans réalisation »), avec des marqueurs laissés par CodeRabbit : il est revenu ici, les marqueurs sont retirés.

Relecture `/simplify` : la requête qui enregistre une décision devient une constante comme les autres ; les requêtes du rôle d'un membre et des gestionnaires d'un projet viennent de `channels.ts` (`getRole`) et `badges.ts` (`listKeepers`) au lieu de copies ; un index `join_request_user (userId, createdAt)` sert la limite de débit ; un projet inconnu répond 404 comme ailleurs ; l'état d'une candidature se lit dans une table au lieu de cinq ternaires ; `reasonOf` rejoint `retryAfterOf` (`web/lib/api.ts`) et `isServer` est partagé. Vérifié : candidature (200), doublon (409 `pending`), réponse inconnue (400 `invalid`), projet inconnu (404 `unknown`), puis acceptation depuis la notification, qui ajoute Moussa à l'équipe. Relecture `/code-review` : une candidature disparue répondait la raison d'un projet inconnu, et la page disait « Ce projet n'existe plus » ; elle a sa raison (`gone`) et son message. Les façons d'aider sont dédoublonnées avant d'être comptées : une liste répétée n'est plus refusée.

- **Livrable** : `api/join.ts`, `api/join_test.ts`, `api/notifications.ts`, `api/routes.ts`, `web/lib/applications.ts`, `web/lib/notifications.ts`, `web/pages/notifications.tsx`, `web/pages/project/join-dialog.tsx` ; §3, §6.6, §13.3
- **Par** : @niangoos

### 2026-11-14 · PAM-005 · Trois fournisseurs IA à la suite

`api/llm.ts` est le seul chemin vers un modèle : l'Assistant et les futures tâches de fond (résumé du Pulse, extraction à l'import, embeddings) passent par lui. Il essaie **Meta** (`muse-ember-1.0` sur `api.meta.ai`, le moins cher des modèles Muse : rapide, assez pour des réponses courtes), puis **Gemini** (`gemini-3.5-flash`), puis **Groq** (`openai/gpt-oss-120b`), tous en API compatible OpenAI. Un fournisseur qui répond une erreur, rien, ou rien en 20 s passe la main au suivant et reste de côté 5 minutes : une panne ne coûte qu'un appel. Un fournisseur sans clé est sauté. `chatJson` demande du JSON et le lit ; `embed` donne des vecteurs Gemini (`gemini-embedding-001`, 256 dimensions, normalisés) et `cosine` les compare.

Essayé avec les vraies clés le 14 novembre. Baseten, prévu d'abord avec les crédits du hackathon Meta, répond « Model version … is deactivated » : remplacé par l'API Muse de Meta. Un fournisseur en échec passe la main à Gemini en 1,5 s, et l'appel suivant ne repasse plus par lui. `gemini-2.5-flash` n'est plus ouvert aux nouvelles clés et `gemini-3.8-flash` était saturé sur l'offre gratuite : `gemini-3.5-flash` répond. Les embeddings rapprochent une demande Go d'un profil Go (0,82) plus que d'un profil de designer (0,62).

`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL_NAME` et le chemin vers l'API native d'Ollama sont retirés.

- **Livrable** : `api/llm.ts`, `api/assistant.ts`, `api/assistant_test.ts`, `.env.production.example` ; §11, §20
- **Par** : @Mirak29

### 2026-11-14 · PAM-307 · Résumé IA du Pulse

`api/pulse-summary.ts` écrit le résumé en tâche de fond, jamais pendant l'affichage d'une page (§11). Toutes les 10 minutes (la première fois une minute après le démarrage), il relit les projets liés à un repo et donne au modèle les chiffres du Pulse, les PRs mergées sur 7 jours avec leur auteur, les PRs sans review, les issues ouvertes (dont celles marquées `blocked`), les besoins et les demandes d'aide ouverts, dans un bloc `<donnees>` que le prompt présente comme des données, jamais des instructions. Le modèle n'est rappelé que si cette entrée a changé (empreinte SHA-256 gardée avec le résumé), au plus une fois toutes les 10 minutes par projet, 5 projets par passage, 300 résumés par jour. Un résumé trop court ou trop long est écarté ; le Markdown est retiré. Seul le dernier résumé d'un projet est gardé, et l'entry `PULSE_READY` fait relire le Pulse déjà ouvert.

`GET/api/project/pulse` renvoie `summary` et `summaryAt`. L'onglet Pulse affiche le résumé dès la lecture du Pulse, sinon le résumé déterministe ; l'attente simulée de 2,6 s des premières maquettes est retirée. Les projets de démo gardent leurs résumés pré-calculés.

Essayé sur une copie de la base avec les vraies clés : Meta (`muse-ember-1.0`) a résumé les deux projets liés à un repo en 4 s chacun, affichés dans l'onglet Pulse. Le premier prompt énumérait tous les chiffres à zéro d'une semaine calme : il demande maintenant une phrase pour une semaine calme et trois titres au plus.

- **Livrable** : `api/pulse-summary.ts`, `api/pulse-summary_test.ts`, `api/pulse.ts`, `api/routes.ts`, `api/server.ts`, `web/fixtures/pulse.ts`, `web/lib/pulse.ts`, `web/lib/live-data.ts`, `web/pages/project/pulse-tab.tsx` ; §6.4
- **Par** : @Mirak29

### 2026-11-14 · PAM-310 · L'IA propose skills, besoins et description à l'import

Dans l'aperçu d'un repo, « Proposer avec l'IA » appelle `POST/api/project/import/suggest` (`api/import-suggest.ts`). Le serveur relit le repo comme à l'import, sans croire la page, puis donne au modèle le nom, la description GitHub, les langages, les topics, les 20 premières issues ouvertes et les 6 000 premiers caractères du README, dans un bloc `<repo>` présenté comme des données. Il demande un JSON et n'en garde que ce qui est valide : des skills du vocabulaire écrits à l'identique (8 au plus, ajoutés après ceux de GitHub), 5 besoins de 3 à 80 caractères, une description de 20 à 300 caractères. Sans modèle ou s'il échoue, la réponse dit `ai: false` et la page prévient sans rien changer. 20 propositions par heure et par développeur ; une même version du repo (son dernier push) est servie depuis le cache pendant une heure.

Côté page, l'aperçu gagne un champ Description, envoyé à l'import (vide, la description GitHub reste). Les skills et les besoins proposés s'ajoutent aux choix et sont cochés ; tout reste modifiable avant « Créer le projet ».

La proposition n'est pas refaite à la resynchronisation : elle écraserait ce que le propriétaire a corrigé.

Essayé avec les vraies clés : sur un repo de scoring crédit en Python, Meta a proposé Python, quatre besoins tirés du README et une description juste, en 4 s ; sur le repo de profil (README de 4 300 caractères), huit skills et une description en 6 s. Le repo `pamoja`, sans README ni topics ni issues, ne donne que les langages : la proposition reste maigre, comme son entrée. Vérifié dans la fenêtre d'import sur une copie de la base.

- **Livrable** : `api/import-suggest.ts`, `api/import-suggest_test.ts`, `api/import.ts`, `api/routes.ts`, `web/pages/projects/new-project-dialog.tsx`, `web/lib/english.ts` ; §5.4, §11
- **Par** : @Mirak29

### 2026-11-14 · PAM-311 · Proximité sémantique du matching

`api/embeddings.ts` donne un vecteur Gemini (`gemini-embedding-001`, 256 dimensions, normalisé) à chaque profil (headline, bio, skills, intentions) et à chaque demande d'aide (titre, description, skills), rangé en BLOB dans la table `Embedding` existante avec l'empreinte de son texte. La route de création calcule le vecteur de la demande avant de l'écrire, 4 s au plus : la première vague le compte déjà. Toutes les 5 minutes, une tâche de fond fait les vecteurs manquants ou dont le texte a changé, les demandes ouvertes puis les profils, les plus actifs d'abord, 90 textes par passage : l'offre gratuite de Gemini refuse au-delà de 100 par minute (vu en essai, erreur 429).

Le matching (`rank`) lit le cosinus de la demande et de chaque candidat : 0 point sous 0,70, 10 points dès 0,82, linéaire entre les deux. Le barème vient d'une mesure sur les profils de démo. Pour une review de webhook de paiement en Go, moussa (backend Go) obtient 0,83, wanjiru (backend et DevOps) 0,80, et les profils frontend, data ou mobile 0,68 à 0,69. Pour un crash Flutter, kofi (mobile Flutter) obtient 0,80, les autres 0,69 à 0,72. Le premier barème (0,62 à 0,85) donnait encore 3 à 4 points à des profils sans rapport. Le nouveau critère `semantic` s'affiche dans « Pourquoi ce match ? » : « Profil proche de la demande · 82 % ».

`listOf` (une liste JSON que le pilote rend en texte ou déjà lue) passe de `api/search.ts` à `api/lib/json-list.ts`, partagé.

Vérifié sur une copie de la base : une demande créée par l'API (0,86 s, vecteur compris) envoie sa première vague avec la proximité (moussa +10, wanjiru +7, zeinab +5), affichée sur la page de la demande.

- **Livrable** : `api/embeddings.ts`, `api/embeddings_test.ts`, `api/lib/json-list.ts`, `api/matching.ts`, `api/help.ts`, `api/routes.ts`, `api/search.ts`, `api/server.ts`, `api/llm.ts`, `web/lib/help.ts`, `web/lib/english.ts` ; §7.3, §11
- **Par** : @Mirak29

### 2026-11-14 · PAM-540 · Ce que coûte l'IA

Après les quatre usages de l'IA, il fallait éviter qu'une réponse ou une journée coûte plus que prévu. `api/llm.ts` ajoute trois freins aux plafonds d'appels déjà là.

- **Un plafond par appel**, réflexion comprise (`max_completion_tokens`) : 700 tokens pour l'Assistant, 500 pour le résumé du Pulse, 600 pour la proposition à l'import. Une réponse coupée à son plafond passe au fournisseur suivant, sans le mettre de côté : c'était la question, pas lui.
- **Aussi peu de réflexion que possible.** Mesuré le 14 novembre sur une question de deux lignes : Muse Ember dépense 298 tokens à réfléchir à l'effort par défaut comme à `low`, et rend une réponse vide une fois son plafond atteint ; 33 à `minimal`. Gemini répond en 2,4 s à `minimal` au lieu de 9,9 s. Groq ne connaît pas `minimal` : `low`.
- **Un budget quotidien pour Meta**, le seul qui facture : 1 $ par jour (UTC), tous usages confondus, compté au tarif de Muse Spark (1,25 $ et 4,25 $ le million de tokens), plafond du prix d'Ember. `AI_DAILY_BUDGET` le change. Une fois dépensé, Gemini puis Groq, gratuits, répondent jusqu'au lendemain. Le compte est en mémoire : un redémarrage repart de 0.

Chaque appel écrit une ligne `model-call` (fournisseur, usage, tokens d'entrée, de sortie et de réflexion, coût, dépense du jour, durée), lue avec `docker logs`.

Essayé avec les vraies clés sur une copie de la base : un résumé du Pulse coûte au plus 0,0017 $ (2,5 s), une proposition à l'import 0,0018 $ (1,9 s), une question à l'Assistant 0,004 à 0,005 $ (2,3 à 2,9 s) ; aucune réponse coupée. Le budget de 1 $ couvre donc environ 200 questions par jour sur Meta.

- **Livrable** : `api/llm.ts`, `api/llm_test.ts`, `api/assistant.ts`, `api/pulse-summary.ts`, `api/import-suggest.ts`, `.env.production.example` ; §11
- **Par** : @Mirak29

### 2026-11-14 · PAM-113 · La page `/dev` n'est plus en production

La page de l'équipe qui montre le socle de composants était servie en production à `/dev`. Le build pose maintenant une constante `DEV_PAGES` : `true` dans la configuration commune (`build-config.ts`, donc en dev), `false` dans `task-prod.ts`. `web/app.tsx` n'ajoute la route `dev` que si elle vaut `true` : en production, esbuild retire la route et le fichier de la page, et `/dev` répond la page introuvable.

Vérifié : `deno task prod:build` ne produit plus de fichier `socle-*.js` ; un build avec la configuration de dev le produit toujours.

- **Livrable** : `build-config.ts`, `task-prod.ts`, `web/app.tsx` ; §17.4
- **Par** : @Mirak29

### 2026-11-14 · PAM-115 · Copie quotidienne de la sauvegarde hors de la VM

`deploy/pull-backup.sh` ramène sur le poste de l'équipe la sauvegarde horaire la plus récente du serveur. Il passe par SSH (alias `pamoja`) : `docker compose exec -T app` liste `/data/backups` puis lit le fichier, sans copie laissée sur la VM. La copie est écrite dans un fichier `.part`, gardée seulement si elle commence par l'en-tête SQLite, effacée si le transfert s'interrompt. Les 7 dernières copies restent dans `~/pamoja-backups`. Une tâche du Planificateur de Windows le lance une fois par jour (`docs/deploiement.md`). C'est la solution du hackathon ; un stockage Systalink reste prévu avant l'ouverture (§17.5).

Vérifié en local avec un faux `ssh` : trois passages ne gardent que les deux dernières copies quand `PAMOJA_KEEP=2` ; un transfert qui échoue et une copie qui n'est pas une base sortent en erreur sans rien laisser. Essayé ensuite sur la VM : la sauvegarde de 12 h (770 Ko) est arrivée en 2,6 s, et `PRAGMA integrity_check` répond `ok`.

- **Livrable** : `deploy/pull-backup.sh`, `docs/deploiement.md` ; §17.5
- **Par** : @Mirak29

### 2026-11-14 · PAM-508 · Signaler un contenu, masquage à 3 signalements

`POST/api/report/create` enregistre un signalement (`report`, un par signaleur et par cible), produit l'entry `CONTENT_REPORTED` qui prévient les modérateurs, limite le débit et refuse de signaler son propre contenu. Au-delà de **trois signaleurs distincts**, un post ou un commentaire est masqué (`hiddenAt`) en attendant la décision d'un modérateur : `GET/api/posts` filtrant déjà `hiddenAt`, il **disparaît du feed pour tout le monde** (§10.5). Côté interface, `web/lib/reports.ts` branche le formulaire de signalement sur cette route pour le contenu serveur (id numérique), le contenu de démo restant géré dans la page.

Reste pour clore PAM-508 : la file des modérateurs, leurs actions (ignorer, avertir, suspendre, retirer une preuve) et le bandeau pour l'auteur ; la page Modération lit encore les fixtures.

- **Livrable** : `api/reports.ts`, `api/reports_test.ts`, `api/routes.ts`, `web/lib/reports.ts`, `web/ui/report-dialog.tsx` ; §10.5, §13.3
- **Par** : @niangoos

### 2026-11-14 · PAM-404 · Board sur le serveur, rang fractionnaire, PR mergée → Done

Les cartes du board sont enregistrées : `GET/api/project/board` les liste par colonne et par rang, `POST/api/task/create` ajoute une carte au Backlog, `POST/api/task/move` la déplace. Le **rang est fractionnaire** (`api/lib/rank.ts`, `rankBetween`) : une carte prend une position entre deux autres sans renuméroter la colonne, donc deux personnes déplacent des cartes en même temps sans perte (§6.7, §14). Chaque changement, réservé aux membres, produit une entry `TASK_UPDATED`. Une **PR mergée passe sa carte en Done** : le webhook `pull_request` appelle `markPullRequestDone` après `PR_MERGED` (`api/github-events.ts`). Le seed crée les cartes des projets de démo ; côté interface, `board-tab` lit le board du serveur (`web/lib/board.ts`) et un déplacement est enregistré, remis en place en cas d'échec.

Reste : réordonner à l'intérieur d'une colonne (le glisser ne fait que changer de colonne aujourd'hui) et la Roadmap (PAM-405).

- **Livrable** : `api/board.ts`, `api/board_test.ts`, `api/lib/rank.ts`, `api/routes.ts`, `api/github-events.ts`, `api/seed.ts`, `web/lib/board.ts`, `web/pages/project/board-tab.tsx` ; §6.7, §13.3, §14
- **Par** : @niangoos

### 2026-11-14 · PAM-309 · Collaboration Map et Graph : gestes, qui, et passage à l'échelle

**Les gestes au doigt.** Le globe avait `touch-action: pan-y` : le navigateur donnait un glissé vertical au défilement de la page pendant que le globe essayait aussi de tourner, si bien qu'un geste tantôt tournait, tantôt faisait défiler. Au doigt, le globe a maintenant deux états nets. Au repos, il ne réagit pas au glissé, qui fait défiler la page. Un toucher le prend en main : un cadre indigo marque la zone, `touch-action: none` s'y applique, un doigt tourne, deux zooment, et un bouton « Terminé » (ou un toucher hors du globe, ou Échap) le rend à la page. À la souris rien ne change. La phrase d'aide sous le globe suit le pointeur (`pointer-coarse`).

**Savoir qui.** Les pastilles du globe donnent le nombre de personnes, abrégé au-delà de 999. Un pays touché sur le globe, ou choisi dans la liste (« +N · voir qui »), remplace la liste par ses personnes, classées par nombre de liens, avec un lien vers leur profil : douze à la fois, avec une recherche dès qu'il y en a plus de douze. Mille collaborateurs restent donc lisibles sans charger l'écran. Un toucher choisit le pays le plus proche du doigt : quand le globe est petit, les marqueurs des pays voisins se chevauchent.

**Le graphe à l'échelle.** L'étoile ne dessine jamais plus de six lieux et quatorze personnes ; chaque lieu porte son nombre total de personnes. Un clic sur un lieu le met en avant : ses quatorze personnes principales viennent en éventail autour de lui, avec leurs liens dans ce lieu, et « Voir ses N personnes » ouvre le panneau du réseau limité à ce lieu (`?lieu=`, effacé à la fermeture). Ce panneau va par pages de trente lignes, et chaque lieu de sa liste ouvre ses personnes. Sur mobile, les lieux principaux deviennent des pastilles « Par lieu » qui limitent le classement. Chaque lieu a une place d'au moins 40° sur le cercle, et son nom est écrit vers l'extérieur : à 1 000 personnes, les noms des projets se chevauchaient. Le réseau n'est plus recalculé à chaque survol (`useMemo`).

Testé (`web/pages/profile/collaboration_test.ts`) avec 1 000 collaborateurs dans trois pays et quarante projets : chaque pays liste ses personnes triées et la recherche les trouve ; l'étoile garde au plus six lieux et quatorze personnes ; un lieu mis en avant amène les siennes, triées par liens dans ce lieu. Vérifié dans le navigateur sur une copie de la base, avec les mêmes 1 000 personnes ajoutées le temps du test : gestes simulés au doigt en 375 px (au repos, pas de rotation ; en main, rotation ; un toucher dehors relâche), pays choisis sur le globe, Kenya à 600 personnes par pages, graphe en bureau avec un lieu mis en avant, panneau limité à un lieu, pastilles sur mobile.

- **Livrable** : `web/pages/profile/collaboration-map.tsx`, `web/pages/profile/collaboration-graph.tsx`, `web/pages/profile/collaboration_test.ts`, `web/ui/dialog.tsx` (`Drawer` efface ses paramètres), `web/lib/plural.ts` (`shortCount`), `web/lib/english.ts` ; §9.3
- **Par** : @Mirak29

### 2026-11-14 · PAM-539 · Fil et profil comme un réseau social

**Une seule réaction.** La barre d'un post avait J'aime, Utile et Merci à côté de Commenter, Republier, Enregistrer, Partager et Signaler : trop de boutons, et trois réactions proches. Il reste **J'aime**, un cœur ; les réactions de démo des trois sortes sont réunies dans J'aime. La page d'un post suit. La barre garde six boutons, ceux de X ou LinkedIn : Commenter, Republier, J'aime, puis Enregistrer, Partager, Signaler.

**« Pour toi » classé.** L'onglet montrait tous les posts dans l'ordre du temps. Il est maintenant classé pour le lecteur, sans IA (`web/lib/for-you.ts`) : une personne suivie, une republication par une personne suivie, les personnes avec qui il a échangé (travail commun, réponses, J'aime, republications, dans les deux sens), ses communautés, ses projets, ses compétences nommées dans le texte ; l'activité du post compte un peu, jamais plus que tout cela ; le poids diminue de moitié toutes les 36 heures. Chaque post dit en une ligne pourquoi il est là (« Tu suis Fatou », « Tu as échangé avec Kofi »). Les événements GitHub de ses projets pèsent comme un post d'une personne suivie ; la demande d'aide qui correspond reste en 2ᵉ position. Les autres onglets restent dans l'ordre du temps.

**L'activité d'un profil.** La section Activité ne montrait que des demandes d'aide. Elle a trois onglets, comme sur un réseau social : **Posts**, **Réponses** et **Aide**, avec leur nombre, cinq lignes puis « Voir plus ». L'onglet tient dans l'adresse (`?activite=`). Les posts du profil sont lus par `GET/api/posts?author=login` ; les réponses restent dans la page jusqu'à PAM-512.

Testé : `web/lib/for-you_test.ts` (chaque lien relève un post et donne sa raison, « Go » n'est pas dans « Google », l'activité ne passe pas devant une personne suivie, demi-vie de 36 h, échanges dans les deux sens) et `api/posts_test.ts` (les posts d'un auteur). Vérifié dans le navigateur sur une copie de la base : Pour toi classé avec ses raisons, un seul cœur, onglets Posts / Réponses / Aide de Moussa, appel `GET/api/posts?author=moussa`.

- **Livrable** : `web/lib/for-you.ts`, `web/lib/for-you_test.ts`, `web/pages/home/home-page.tsx`, `web/ui/post.tsx`, `web/pages/post-page.tsx`, `web/fixtures/posts.ts`, `web/pages/profile/profile-page.tsx`, `web/lib/posts.ts`, `api/posts.ts`, `api/routes.ts`, `api/posts_test.ts`, `web/assets/icons.tsx`, `web/lib/english.ts` ; §6.2, §9.1, §10.1
- **Par** : @Mirak29

### 2026-11-14 · PAM-501 (réactions et favoris) · Réagir et enregistrer sur le serveur

`POST/api/reaction/toggle` (`like`, la seule réaction depuis PAM-539) et `POST/api/bookmark/toggle` enregistrent une réaction ou un favori, un par développeur et par cible. `GET/api/posts` renvoie désormais, pour chaque post, le nombre de chaque réaction, celles du développeur et s'il l'a enregistré ; `GET/api/saved` liste les posts qu'il a gardés. Côté interface, `web/lib/reactions.ts` relie les réactions et le bouton Enregistrer aux routes (optimiste, remis en place en cas d'échec) pour les posts du serveur ; `adoptPosts` adopte les compteurs, et la page Enregistrés lit `GET/api/saved`. Les posts de démo (id de fixture) restent gérés dans la page.


Rapproché de PAM-539 à la fusion : PAM-539 ne garde qu'une réaction, « J'aime ». Le serveur n'accepte donc que `like` (une autre réaction répond 400), un post renvoie `reactions: { like }`, et le bouton « J'aime » du fil et de la page d'un post (`toggleLike`, `web/lib/reactions.ts`) passe par cette route : affiché tout de suite, enregistré, remis en place si l'envoi échoue. Le test compte deux « J'aime » sur un post et vérifie qu'une autre réaction est refusée.
Reste pour clore PAM-501 : partage par lien et pagination par curseur ; PAM-512 couvre réponses, réponse acceptée et republications.

- **Livrable** : `api/posts.ts`, `api/reactions_test.ts`, `api/routes.ts`, `web/lib/reactions.ts`, `web/fixtures/posts.ts`, `web/ui/post.tsx`, `web/pages/post-page.tsx`, `web/pages/saved-page.tsx` ; §10.1
- **Par** : @niangoos

### 2026-11-14 · PAM-512 (réponses) · Répondre, accepter une réponse, lire un fil sur le serveur

`POST/api/post/reply` enregistre une réponse (un post avec un parent et une racine), prévient l'auteur du post et diffuse l'entry `POST_REPLIED`. `POST/api/post/accept` laisse l'auteur d'une question accepter une réponse une seule fois : la réponse devient une preuve d'Entraide pour son auteur (entry `ANSWER_ACCEPTED`, éligibilité figée §8.3, badges réévalués), qui est notifié. `GET/api/post/thread` renvoie un post et tout son fil (racine et réponses, chacun avec ses réactions et son parent) pour un lien partagé ou un rechargement. Côté interface, `web/lib/replies.ts` relie répondre et accepter aux routes (optimiste, remis en place en cas d'échec), la page d'un post charge son fil au montage, et `adoptThread` adopte les réponses du serveur. Les posts de démo (id de fixture) restent gérés dans la page.

Exception assumée (§4) : la republication n'est pas branchée. Le schéma en fait un post (`repostOfId`) qui paraîtrait dans le fil des abonnés, or le fil n'a pas de rendu de republication ; la brancher déposerait des posts vides. Hors de la boucle de démo (§18), reportée avec son rendu.

- **Livrable** : `api/posts.ts`, `api/replies_test.ts`, `api/notifications.ts`, `api/routes.ts`, `web/lib/replies.ts`, `web/lib/notifications.ts`, `web/fixtures/posts.ts`, `web/ui/post.tsx`, `web/pages/post-page.tsx` ; §8, §10.1, §12.7
- **Par** : @niangoos

### 2026-11-14 · PAM-505 (développeurs) · Explorer les vrais développeurs

`GET/api/explore/developers` renvoie tous les développeurs non suspendus avec ce que les filtres d'Explore utilisent : nom, headline, ville, **pays (nom, pas le code ISO)**, disponibilité, skills et intentions. La page les adopte au chargement (`web/lib/explore.ts`, `adoptDevelopers`), si bien qu'Explorer liste désormais les **vrais inscrits** et pas seulement les 9 profils de démo ; les filtres pays / skill / intention / disponibilité restent calculés dans la page sur cet ensemble complet.

Reste pour clore PAM-505 : le listing serveur des **projets** (l'onglet Projets filtre encore les fixtures) et « Sur quoi travailler » (déjà serveur via `GET/api/work`).

- **Livrable** : `api/explore.ts`, `api/explore_test.ts`, `api/routes.ts`, `web/lib/explore.ts`, `web/fixtures/people.ts`, `web/pages/explore/explore-page.tsx` ; §10.3
- **Par** : @niangoos

### 2026-11-14 · PAM-401 · Page d'un projet public par son slug

`GET/api/projects` ne renvoyait que **mes** projets : un projet importé par quelqu'un d'autre n'avait aucune route pour s'afficher, et sa page tombait sur « projet introuvable ». Nouvelle route `GET/api/project` qui lit un projet par son slug — visible de tout développeur connecté s'il est public, d'un membre s'il est privé, sinon 404 (§6). Elle renvoie la même forme qu'un élément de `GET/api/projects` (en-tête, compétences, membres, abonnés, needs, galerie, vidéo, dépôt avec le premier lot d'issues et de PR) ; la construction de cette forme est partagée (`shownProject`), et sa description est un `OBJ` commun aux deux routes (`projectShape`). Côté interface, la page d'un projet absent des pages le lit depuis l'API (`loadProject`, adopté par `adoptProjects`) et montre un état de chargement avant de conclure à introuvable.

- **Livrable** : `api/projects.ts`, `api/projects_test.ts`, `api/routes.ts`, `web/fixtures/repos.ts`, `web/pages/project/project-page.tsx` ; §6
- **Par** : @niangoos

### 2026-11-14 · PAM-402 (needs) · Informations et besoins d'un projet enregistrés

L'onglet Réglages modifiait le nom, la description, la vision et les besoins d'un projet **dans le navigateur seulement** : aucune route ne les enregistrait. Nouvelle route `POST/api/project/update` (propriétaire et mainteneurs, via `editable`) qui enregistre ces champs et remplace les besoins ouverts — un besoin gardé par son titre conserve ses compétences, un retiré est supprimé, un nouveau est ajouté (`projectNeed`). Elle diffuse l'entry `PROJECT_UPDATED`, qui prévient l'audience en direct et réindexe le projet dans la recherche. Côté interface, `web/lib/project-settings.ts` relie l'enregistrement à la route (optimiste, projet remis en l'état en cas d'échec).

Exception assumée (§4) : le **calcul serveur des « personnes qui peuvent aider »** n'est pas fait. Il demande des compétences structurées par besoin, que seule l'extraction IA (PAM-310) posera ; en attendant, « Ils pourraient aider » reste calculé dans le navigateur à partir de la table `needSkills`. La boucle de démo (§18) passe par le matching des demandes d'aide, déjà côté serveur.

- **Livrable** : `api/project-gallery.ts`, `api/project_settings_test.ts`, `api/routes.ts`, `web/lib/project-settings.ts`, `web/pages/project/settings-tab.tsx` ; §6.3, §13.3
- **Par** : @niangoos

### 2026-11-14 · Relectures `/simplify` et `/code-review` du 14 novembre

Relecture de tout ce qui a été fusionné le 14 novembre (PAM-005, 307, 310, 311, 540, 113, 115, 508, 404, 309, 539, 501, 512, 505, 401, 402).

**Corrigé.**
- Un post du serveur signalé n'atteignait jamais le serveur : la page envoyait son id affiché (`s12`). Une seule fonction, `serverIdOf`, à côté de `savedId`, sert désormais les réactions, les réponses, la page d'un post et les signalements.
- Le board d'un projet privé était illisible pour ses membres : `GET/api/project/board` ne cherchait que les projets publics.
- Le motif d'un signalement n'était pas vérifié : c'est maintenant une clé de `reportReasons` (la page traduit le libellé), et un signalement sur une demande d'aide ou un profil qui n'existe pas est refusé.
- Les besoins enregistrés depuis les Réglages avaient le type `skill`, ceux de l'import `contribution` : un seul type ; la migration 014 corrige les besoins déjà écrits.
- Une demande d'aide est vérifiée (champs, limite du jour) avant que son embedding soit demandé.
- Deux « J'aime » ou deux favoris envoyés en même temps ne répondent plus 500 (`ON CONFLICT DO NOTHING`).
- Les posts d'un développeur se lisent quelle que soit la casse de son login.
- Sous une réponse masquée, ses propres réponses quittent aussi le fil.
- Les « J'aime » du serveur ne sont plus des listes de faux logins : la page garde les logins connus et le nombre des autres (`likeCountOf`), que le classement « Pour toi » compte aussi.
- Un message d'échec partagé (`notifyFailure`) dit « trop de demandes », « refusé » ou « serveur injoignable » au lieu de toujours « injoignable ». Les lectures de listes JSON passent par `api/lib/json.ts`, les limites en mémoire par `within` (`memoryWindow`, qui oublie un développeur inactif), un seul plafond de besoins (10).
- Index `reaction_by_target` pour compter les « J'aime » du fil ; le globe ne recalcule sa terre, son quadrillage et ses arcs que quand la vue change ; les motifs des skills du classement sont construits une fois.

**Laissé, noté.** La route `GET/api/posts` sert encore trois lectures ; Explore renvoie le nom du pays et non son code ; des imports ne servent qu'à créer les tables avant les requêtes.

Vérifié : CI complète sous Windows et Linux, 257 tests ; globe vérifié dans le navigateur sur une copie de la base.

- **Livrable** : `api/board.ts`, `api/reports.ts`, `api/posts.ts`, `api/help.ts`, `api/project-gallery.ts`, `api/lib/rate.ts`, `api/lib/json.ts`, `migrations/014-need-type.js`, `web/lib/failure.ts`, `web/fixtures/posts.ts`, `web/pages/profile/collaboration-map.tsx` et leurs tests ; §6.7, §10.1, §10.5
- **Par** : @Mirak29

### 2026-11-14 · PAM-512 (correctif) · Les réponses s'affichent au rechargement d'un post

Test de bout en bout sur la démo : une réponse enregistrée (vérifiée côté serveur par `GET/api/post/thread`) n'apparaissait pas en rouvrant la page du post. `Replies` (`web/pages/post-page.tsx`) a des hooks et lit les réponses du tableau `posts`, muté sur place quand le fil arrive après le premier rendu ; elle ne lisait pas `postsChanged`, donc ne se re-rendait pas (le piège signaux + hooks du socle). Elle lit maintenant le signal. Vérifié dans le navigateur : créer un post, répondre, recharger → « 1 réponse » et la réponse s'affichent.

- **Livrable** : `web/pages/post-page.tsx` ; §12.2
- **Par** : @niangoos

### 2026-11-14 · PAM-502 (suite) · Créer une communauté et lire la liste sur le serveur

Clôt le reste de PAM-502 noté le 13 nov. `POST/api/community/create` enregistre une communauté (type en anglais, slug tiré du nom avec un suffixe s'il est pris) et son créateur comme premier membre, un modérateur ; elle est réindexée dans la recherche quand Meilisearch est présent (sinon trouvée par SQLite, source de vérité, §10.4). `GET/api/communities` renvoie toutes les communautés avec leur nombre de membres et si le développeur y est. Côté interface, `web/lib/communities.ts` crée via le serveur puis dans la page avec le slug reçu, et `loadCommunities` (adopté par `adoptCommunities`) est lu au montage de la liste et d'une page de communauté : une communauté créée est donc là après un rechargement, et un lien direct vers elle marche. Une communauté seedée garde ses données de démo et son compte affiché ; seules les nouvelles rejoignent la liste.

- **Livrable** : `api/community.ts`, `api/community_test.ts`, `api/routes.ts`, `web/lib/communities.ts`, `web/fixtures/communities.ts`, `web/pages/communities/communities-page.tsx`, `web/pages/communities/community-page.tsx`, `web/pages/communities/new-community-dialog.tsx` ; §10.2, §10.4
- **Par** : @niangoos

### 2026-11-14 · PAM-307 · Le résumé IA d'un projet importé arrive aussitôt

Le scénario de la démo (§18.2, étape 4) montre le résumé IA quelques secondes après l'import, sans rafraîchir. La tâche de fond ne passait que toutes les 10 minutes : un projet importé pouvait attendre jusque-là. L'import appelle maintenant `summarizeSoon(projectId)`, qui résume ce projet juste après la réponse (`later`), avec le même prompt, le même budget et la même entry `PULSE_READY` que la tâche de fond, qui reprend ensuite son rythme. Le corps commun est `summarize(project, at)`.

- **Livrable** : `api/pulse-summary.ts`, `api/pulse-summary_test.ts`, `api/import.ts` ; §6.4, §18.2
- **Par** : @Mirak29

### 2026-11-14 · Démo · Importer OpenPay Africa rattache le repo au projet du seed

Le seed crée le projet `openpay-africa` d'Abdou, sans repo, qui porte les 14 reviews de démo de Moussa. À l'étape 3 de la démo (§18.2), Abdou importe le vrai repo `openpay-africa` : l'import créait un second projet, `openpay-africa-2`, coupé de cet historique, et la page gardait le premier en données de démo. L'import rattache maintenant le repo à un projet du développeur de même slug qui n'en a pas encore (§6.3, « connecté à un repo plus tard ») : équipe et besoins gardés, seuls les besoins nouveaux ajoutés, entry `PROJECT_UPDATED`. Côté page, un projet de démo qui a un repo réel n'est plus gardé en données fictives : il s'affiche depuis le serveur, PRs, Pulse et résumé IA réels.

- **Livrable** : `api/import.ts`, `api/import_test.ts`, `web/fixtures/repos.ts` ; §5.4, §6.3, §18.2
- **Par** : @Mirak29

## Audits QA

### 2026-10-19 · QA de régression front

Retest transversal après les livraisons du 10 au 16 octobre. Les défauts QA-01, 07–14 sont corrigés ou corrigés pour la session ; QA-02 attend le cycle de vie serveur et la vérification de review. QA-15 relève une contradiction entre « Contributions réelles » et les badges « Donnée de démo » sur le profil. La validation front reste partielle ; voir le [rapport complet](qa/2026-10-19/rapport-qa-front.md).

### 2026-10-22 · PAM-124 · Interface en anglais au choix

L'interface suit par défaut la langue du système et se règle sur français ou anglais dans les réglages ou par le bouton de l'en-tête, qui affiche la langue cible ; le choix vaut pour tous les onglets ouverts. Le français reste la langue du code : `web/lib/english.ts` donne l'anglais de chaque phrase de l'interface, que le rendu traduit en entier, textes et attributs lus (libellés, aides, titres de l'onglet). Une phrase avec des valeurs (« Écrire à Moussa ») s'écrit ``t`Écrire à ${name}` `` : seules ses parties fixes sont traduites. Une première version traduisait par motifs à l'affichage et réécrivait le début des messages de membres (« Tu as vu la démo ? » devenait « You know vu la démo ? ») ; ce que les développeurs écrivent n'est plus jamais touché. Vérifié dans le navigateur, page par page, en anglais : 45 écrans et dialogues relevés jusqu'à ce que seul le contenu de démonstration reste en français ; le texte en cours de saisie survit au changement de langue. Les pages publiques (accueil, passeport) ont aussi leurs boutons de thème et de langue, regroupés sous le logo sur téléphone.

- **Livrable** : `web/lib/language.ts`, `web/lib/english.ts`, `web/ui/language-toggle.tsx`, en-tête public (`web/ui/public-header.tsx`), réglage de langue, ``t`…` `` dans les écrans, `web/lib/language_test.ts` (traduction exacte, contenu de membre intact, phrases à valeurs, changement d'onglet)
- **Par** : @Mirak29

### 2026-10-22 · PAM-206 · Resynchronisation horaire des projets actifs

Livrée avec PAM-203 : au démarrage, le serveur lance `startRefresh()`, qui toutes les 15 minutes relit en conditionnel (ETag) les repos en mode simple et ceux en synchro live qui n'ont pas été relus depuis une heure, puisque GitHub ne garantit pas la livraison des webhooks. Une nouvelle de GitHub crée une entry `PROJECT_UPDATED` et les pages ouvertes se mettent à jour ; les fichiers des PRs poussées depuis sont relus ensuite (§7.1).

- **Livrable** : `api/sync.ts` (`refreshAll`, `startRefresh`), `api/server.ts` ; couvert par les tests de rafraîchissement d'`api/import_test.ts`
- **Par** : @Mirak29

### 2026-10-22 · PAM-208 · Cycle de vie complet d'une demande d'aide

Chaque transition du §7.2 a sa route et s'applique en une transaction, seulement depuis l'état attendu : deux aidants qui acceptent en même temps donnent une acceptation et un « Déjà prise ». L'aidant se désiste, ou le demandeur le libère 72 h après sa dernière activité ; dans les deux cas la demande rouvre pour 7 jours et l'aidant sorti ne peut plus la reprendre. Le demandeur annule, rouvre une demande expirée ou fermée avec les mêmes données, ou répond « pas utile » ; l'aidant marque livrée une aide sans PR. Le fil privé n'est écrit que par le demandeur et l'aidant, et lu par eux seuls. Toutes les 10 minutes, le serveur expire les demandes ouvertes depuis 7 jours, relance une fois l'aidant silencieux et le demandeur qui ne répond pas, et ferme les aides restées 7 jours sans réponse. Sur une vraie demande, la page joue ces actions sur le serveur, boutons occupés pendant l'envoi, et se met à jour aux entries de la demande. Vérifié dans le navigateur avec deux comptes : Fatou accepte, l'écran d'Abdou passe à « Acceptée par Fatou » sans rafraîchir.

- **Livrable** : `api/help-lifecycle.ts`, `api/help-timers.ts`, `api/notifications.ts`, `migrations/004-help-lifecycle.js`, routes `GET/api/help/detail` et `POST/api/help/{accept,withdraw,release,cancel,reopen,deliver,decline,message}`, `api/help_lifecycle_test.ts` (8 tests, dont l'acceptation simultanée), `web/lib/help.ts`, détail d'une demande branché sur l'API
- **Par** : @Mirak29

### 2026-10-22 · PAM-209 · Matching SQL

Le serveur calcule pour chaque demande un score sur 100 et ses raisons, lues en SQL : skills demandés pondérés par leur source, type d'aide accepté (réglages ou intentions), aides confirmées sur ces skills, disponibilité et activité récente, communauté commune ou projet suivi. La proximité sémantique attend les embeddings (PAM-311). Sont exclus le demandeur, le matching sur Off et les scores sous le seuil choisi. Les vagues de 5 gardent une place pour un profil prometteur ; la première part à la création, la suivante 2 h plus tard sans acceptation ou dès un désistement, une libération ou une réouverture, dans la limite de 10 notifications par jour et par développeur. Le formulaire montre la vague que le serveur enverrait pendant la saisie ; la demande montre tous ses matchs au demandeur et son seul score à un développeur matché ; « Pour moi » liste les demandes reçues du matching. Vérifié dans le navigateur sur les données du seed : une review Go, SQLite, Backend notifie Moussa (54, nouveau profil prometteur tant que ses reviews ne sont pas seedées).

- **Livrable** : `api/matching.ts`, `migrations/005-help-waves.js`, routes `GET/api/help/for-me` et `GET/api/help/preview`, matchs dans `GET/api/help/detail`, vagues dans `api/help-timers.ts`, `api/matching_test.ts` (5 tests : score et raisons, place « nouveau profil », vagues, plafond quotidien, aperçu), types d'aide seedés
- **Par** : @Mirak29

### 2026-10-22 · PAM-210 · Notifications

Chaque étape d'une demande d'aide notifie l'autre côté : match, acceptation, désistement, libération, annulation, aide livrée, « pas utile », message du fil, demande expirée, relances. Le serveur garde le type et les faits (demande, titre, score, skills, durée, début du message) ; la page en écrit la phrase, en français ou en anglais. Le centre de notifications et le badge du menu lisent la boîte du serveur, à côté des notifications de démo ; ouvrir une notification ou tout marquer comme lu est enregistré. Une notification arrive en direct par son entry et s'affiche en toast ; un match montre « … a besoin de toi » avec skills, score et durée. Le mode de matching, le score minimum et les types d'aide des réglages sont enregistrés et appliqués par le matching. Vérifié dans le navigateur avec deux comptes : Abdou publie, le toast de match arrive chez Fatou sans rafraîchir ; Fatou accepte, le toast « … a accepté ta demande » arrive chez Abdou.

- **Livrable** : `api/notifications.ts`, notifications du cycle de vie dans `api/help-lifecycle.ts` et `api/help-timers.ts`, routes `GET/api/notifications`, `POST/api/notification/read`, `POST/api/notifications/read-all`, `POST/api/notification/preferences`, `api/notifications_test.ts` (3 tests), `web/lib/notifications.ts`, toast de match, réglages branchés
- **Reste** : filtres par skills, projets et communautés (PAM-223)
- **Par** : @Mirak29

### 2026-10-22 · PAM-211 · Vérification d'une review

Une review faite sur GitHub valide une demande d'aide quand les cinq conditions du §7.5 sont réunies : demande acceptée sur cette PR, relecteur égal à l'aidant, ni auteur de la PR ni demandeur, review postérieure à l'acceptation, et approbation, demande de changements ou commentaire avec au moins un commentaire. La demande passe alors en « Review soumise », la review lui est rattachée et le demandeur est notifié. Le webhook ne portant pas les commentaires de ligne, ceux d'une review « commented » sans texte sont lus sur GitHub juste après ; la resynchronisation relit les reviews des PRs qui attendent une aide, au cas où un webhook se serait perdu. Côté projet, une PR relue n'est plus « en attente de review ». Vérifié par 6 tests avec de vrais webhooks signés et un GitHub simulé ; le parcours avec deux vrais comptes GitHub sera rejoué à la préparation de la démo (PAM-905).

- **Livrable** : `api/review-check.ts`, webhook `pull_request_review` et resynchronisation branchés, état « relue » des PRs dans `GET/api/projects`, notification « … a fait sa review », `api/review_check_test.ts` (6 tests)
- **Par** : @Mirak29

### 2026-10-22 · PAM-212 · Confirmation du demandeur et preuve de réputation

« Oui, elle m'a aidé » fait passer la demande en « Terminée » et crée la preuve de l'aidant. Elle fige tout ce qui a servi à la décision (§8.3) : demandeur et aidant, skills au moment de l'aide, type d'aide, et pour une review vue sur GitHub le repo, le numéro de PR, l'URL, l'id et l'état de la review. Une review donne `REVIEW_HELP_CONFIRMED` « vérifiée par GitHub » ; une aide livrée sur Pamoja donne `HELP_CONFIRMED`. L'éligibilité est décidée une fois, à la confirmation : au plus 2 confirmations comptées par paire demandeur / aidant sur 30 jours (§8.4). Une preuve qui compte rend ses skills « prouvés sur Pamoja », ce qui pèse le plus dans le matching. L'aidant est notifié. Vérifié dans le navigateur avec deux comptes, de bout en bout : Abdou publie, Fatou accepte et livre, l'écran d'Abdou passe à « Cette aide t'a été utile ? » sans rafraîchir, Abdou confirme, le toast « Abdou a confirmé ton aide » arrive chez Fatou.

- **Livrable** : `confirmHelp` dans `api/help-lifecycle.ts`, règle d'éligibilité dans `api/reputation.ts`, route `POST/api/help/confirm`, `api/help_confirmation_test.ts` (3 tests : aide livrée, review GitHub, plafond par paire), bouton de confirmation et frise branchés
- **Par** : @Mirak29

### 2026-10-22 · PAM-213 · Évaluateur de badges

Les 8 badges du §8.2 sont calculés à partir des seules preuves éligibles, à chaque nouvelle preuve : aide confirmée (l'aidant et le demandeur), PR mergée, release ou push (propriétaires et mainteneurs du projet), et à chaque connexion pour la suite de mois du Maintainer. Les niveaux Or et Platine demandent la diversité du §8.4 : demandeurs et projets distincts pour Trusted Reviewer, demandeurs pour First Responder et Mentor, projets pour Open Source, contributeurs par projet pour Builder, contributeurs actifs par mois pour Maintainer, personnes par pays pour Cross-border Builder, auteurs pour Community Pillar. La progression est enregistrée dans `BadgeProgress` ; un nouveau niveau donne l'entry `BADGE_UNLOCKED` et une notification « Badge débloqué » qui mène au profil. `GET/api/user/badges` les lit par login, sans session, comme le passeport. Leur affichage sur le profil vient avec PAM-303.

- **Livrable** : `api/badges.ts`, appels depuis `api/help-lifecycle.ts`, `api/github-events.ts` et la connexion, route `GET/api/user/badges`, notification « Badge débloqué », `api/badges_test.ts` (6 tests : niveaux et diversité, preuve exclue, Or, Cross-border, Open Source, Builder, Maintainer, lecture par login)
- **Par** : @Mirak29

### 2026-10-22 · PAM-303 · Réputation par dimensions avec preuves

Le profil montre la vraie réputation d'un développeur : ses preuves éligibles, rangées dans les cinq dimensions du §8.1 (review de code, construction de projets, mentorat, open source, entraide), et ses badges avec leur niveau et ce qui manque pour le suivant. Chaque preuve dit d'où elle vient : « vérifié par GitHub » pour une review ou une PR vue sur GitHub, « donnée de démonstration » pour le seed, « confirmée sur Pamoja » pour une aide livrée sur Pamoja et confirmée par le demandeur. Elle mène à ce qui la prouve : la PR sur GitHub, la demande d'aide, le projet. La personne aidée apparaît avec son nom, et son pays alimente la Collaboration Map. Une nouvelle preuve s'affiche en direct, badges compris. Les personnes de la démo gardent leurs preuves des fixtures jusqu'au seed des preuves (PAM-901). Vérifié dans le navigateur avec trois comptes : les reviews de Kadi pour Sena apparaissent vérifiées par GitHub ; la troisième aide confirmée par Sena est bien écartée par le plafond par paire ; quand Yaw confirme un pair programming, la preuve, la dimension Mentorat, deux badges Bronze et la Côte d'Ivoire sur la carte arrivent sans rafraîchir, en français comme en anglais.

- **Livrable** : `api/proofs.ts`, route `GET/api/user/proofs`, `api/proofs_test.ts` (2 tests : dimensions et sources, construction de projets), `web/lib/reputation.ts`, preuves et badges du serveur sur le profil, le passeport, la carte de partage et la Collaboration Map, mention « confirmée sur Pamoja », traductions ; corrections de types dans `api/badges_test.ts` et `api/review_check_test.ts`
- **Par** : @Mirak29

### 2026-10-22 · Revue de sécurité du serveur

Revue de tout le code serveur et des affichages du web. Injection SQL, sessions, OAuth, webhooks, installation de la GitHub App, import, droits sur les demandes d'aide, messages et notifications, SSE et XSS : rien d'exploitable. Un point corrigé : hors production, la librairie `@01edu/api` ajoute d'elle-même une route `POST/api/sql/execute` qui exécute n'importe quel SQL sans session, joignable depuis le réseau local, le tunnel de dev ou une page piégée visitée pendant que le serveur de dev tourne. Pamoja ne sert plus cette route ni les métriques de la librairie, quel que soit l'environnement ; le serveur de dev n'écoute plus que sur la machine ; le tunnel ne laisse passer que le webhook GitHub, corps et signature intacts. Un test vérifie qu'une requête SQL envoyée à la route ne touche plus la base (elle passait avant la correction). Reste pour PAM-113 : écrire `APP_ENV=prod` dans le Dockerfile, sans quoi la production repartirait en mode dev.

- **Livrable** : routes fermées dans `api/routes.ts`, `api/dev_tools_test.ts`, `--host=127.0.0.1` dans `deno task dev`, filtre du tunnel dans `task-tunnel.ts`, ligne « Outils de dev » au §16
- **Par** : @Mirak29

### 2026-10-22 · PAM-301 · Profil public à une seule adresse

Le profil `/@login` s'ouvre pour n'importe quel développeur inscrit, plus seulement pour soi et les personnes de la démo. Il est lu sur le serveur : nom, photo, headline, bio, ville et pays, site, skills, communautés, projets publics avec le rôle de la personne, réputation et badges. Sans connexion, c'est le passeport en lecture seule ; connecté, le profil complet, avec en plus l'activité d'aide de la personne. Le profil ne donne jamais l'email ni les réglages de matching. Chaque chiffre est cliquable : reviews, contributions et développeurs aidés ouvrent leurs preuves ; collaborations et projets mènent au graphe et aux projets. Un projet que l'app ne sait pas encore ouvrir (celui d'un autre, PAM-401) s'affiche sans lien ; un login inconnu donne « Profil introuvable », une coupure réseau « Réessayer ». Sur le passeport, une section vide (badges, preuves) n'est plus affichée. Les personnes de la démo restent visibles sans base seedée. Vérifié dans le navigateur, en français et en anglais : le profil de Sena ouvert par Kadi (adresse en minuscules pour le login « Sena »), son passeport sans session, un login inconnu, le profil de démo de Moussa, les chiffres qui ouvrent leurs preuves.

- **Livrable** : `api/profile.ts`, route `GET/api/user`, `listHelpActivity` dans `api/help.ts`, `api/public_profile_test.ts`, `web/lib/profile.ts`, profil et passeport chargés par l'adresse, chiffres cliquables, projets du profil (`projectsShownOf`), traductions
- **Par** : @Mirak29

### 2026-10-22 · QA de consolidation

Passe complète sur `master` après PAM-301, avant tout nouveau chantier : base seedée, deux comptes en même temps, ordinateur et mobile, français et anglais, et une série de contenus piégés sur chaque champ où un membre écrit. La boucle d'aide marche de bout en bout, rien n'est injectable et le serveur n'a renvoyé aucune erreur 500. Quinze défauts relevés (QA-19 à QA-33) : pas de limite de taille sur les posts, réponses, messages de canal et champs du profil ; un mot très long fait déborder la page ; retours à la ligne perdus ; pas de « voir plus » ; Markdown annoncé mais non rendu ; liens et mentions non cliquables ; doublon du compte « abdou » à la connexion simulée ; risque pour la démo réelle (le login seedé est renommé à la connexion du vrai compte). Le rapport liste aussi les scénarios réseau social à jouer quand posts, images et modération auront leur serveur ; voir le [rapport](qa/2026-10-22/rapport-qa-consolidation.md).

Les quinze défauts sont corrigés et la passe a été rejouée sur une copie de la base de `master`. Ce qu'un membre écrit a une taille maximale, se coupe dans sa colonne, garde ses retours à la ligne, se lit en Markdown sans jamais devenir du HTML, et un long post se replie. Un login ne désigne plus qu'un compte, et le compte de la démo garde son login quand le vrai compte s'y connecte. La seconde passe a trouvé et corrigé trois défauts de plus (QA-34 à QA-36) : un texte de membre pouvait être traduit, les cartes d'aide étaient écrasées sur mobile, et le titre d'un post disait « Réponse de ». Une comparaison des mises en page avec `master` a vérifié que rien d'autre n'a bougé.

- **Livrable** : `docs/qa/2026-10-22/rapport-qa-consolidation.md` ; `api/limits.ts`, Markdown sûr dans `web/ui/rich-text.tsx`, « voir plus », zone de texte des canaux, `migrations/006-github-login.js`, règles de login dans `api/user.ts`, journaux masqués ; tests `api/profile_test.ts`, `api/user_login_test.ts`, `web/ui/rich-text_test.ts`
- **Par** : @Mirak29

### 2026-10-23 · Rafraîchissement GitHub après un redémarrage

Les événements GitHub d'un projet en synchro par rafraîchissement n'arrivaient plus. La lecture du repo attendait un minuteur de 15 minutes lancé au démarrage du serveur, et `deno task dev` redémarre le serveur à chaque fichier modifié : pendant qu'on code, le minuteur n'arrivait jamais au bout. Dans la base de dev, le repo n'avait plus été lu depuis près de deux heures, alors qu'une lecture faite à la main répondait en une seconde avec des nouveautés. Désormais, le serveur regarde chaque minute, dès son démarrage, quels repos sont dus : 15 minutes après leur dernière lecture, une heure pour un repo live, le plus ancien d'abord, une lecture à la fois. La synchro live (webhooks) n'était pas en cause ; elle demande le tunnel en dev et l'activation de la synchro live sur le projet.

- **Livrable** : `api/sync.ts`, `api/sync_refresh_test.ts`, précision au §5.4
- **Par** : @Mirak29

### 2026-10-23 · Webhooks manqués renvoyés à l'ouverture du tunnel

Les événements GitHub envoyés pendant que le tunnel était fermé étaient perdus : GitHub ne renvoie pas de lui-même un webhook qui a échoué. Le journal de l'app en comptait 14 (push, CI, issues, ajout d'un repo à l'installation), tous en « failed to connect to host ». À l'ouverture, le tunnel attend maintenant que lui-même et le serveur de dev répondent, puis demande à GitHub de renvoyer les livraisons des 3 derniers jours qui ne sont jamais arrivées, de la plus ancienne à la plus récente. Une livraison déjà reçue, ou refusée par Pamoja elle-même, n'est pas renvoyée. Les identifiants de livraison dépassent la précision d'un nombre JavaScript : lus comme des nombres, ils désignaient une autre livraison ; ils sont lus comme du texte. Vérifié à blanc sur le journal réel de l'app : les 14 livraisons manquées sont retrouvées, dans l'ordre.

- **Livrable** : `api/webhook-replay.ts`, appel dans `task-tunnel.ts`, `api/webhook_replay_test.ts` (2 tests), précision au §5.6
- **Par** : @Mirak29

### 2026-10-23 · PAM-214 · Tests de ce qui casserait la démo ou la réputation

Revue des tests contre le §12.8. Étaient déjà couverts : signature, déduplication et reprise de la file de webhooks ; cycle de vie d'une demande (acceptation simultanée, désistement, réouverture) et les cinq conditions d'une review ; anti-abus et badges à partir des seules preuves éligibles ; score de matching et ses raisons ; les trois contrôles d'installation. Manquait « qui reçoit quoi » pour chaque type d'entry : seuls quelques types étaient testés. Un nouveau test le vérifie pour les 42 types, face à dix rôles (l'auteur, un membre, un abonné du projet, le demandeur, l'aidant, un développeur matché, un membre et un modérateur de la communauté, un abonné de l'auteur, un inconnu) : chacun reçoit exactement ce que dit le §13.3, l'inconnu ne reçoit rien, et un type ajouté sans son audience fait échouer le test. Vérifié qu'une audience fausse le fait bien échouer. Le §13.3 précise deux destinataires que le code servait déjà : le nouveau membre d'un projet et l'aidant qui accepte. Trois critères d'acceptation du bloc 2 sont cochés : webhook traité après un redémarrage, deux acceptations simultanées, badge à jour sans rafraîchir (vérifié dans le navigateur avec PAM-303). Restent ceux qui demandent de vrais comptes GitHub (import en 3 clics, review réelle en moins de 10 s : PAM-905).

- **Livrable** : `api/entry_triggers_test.ts` (2 tests), §13.3 complété
- **Par** : @Mirak29

### 2026-10-23 · PAM-522 · Messages directs

Pamoja n'avait pas de messages directs : seulement le fil d'une demande d'aide et les canaux de projet. On écrit maintenant à un développeur depuis son profil (« Écrire ») et on retrouve ses conversations dans **Messages**, avec un compteur de non lus dans le menu (dans l'en-tête sur téléphone). Deux développeurs qui ont déjà travaillé ensemble (projet en commun, demande d'aide entre eux) s'écrivent directement ; sinon, le premier message arrive en demande : le destinataire accepte, répond (ce qui accepte) ou refuse, et l'expéditeur, qui n'envoie que ce premier message, n'est jamais prévenu d'un refus. Bloquer arrête les messages dans les deux sens, sans prévenir. Chaque message reçu peut être signalé aux modérateurs. Les messages arrivent sans rafraîchir, avec un toast hors de la conversation ; ils suivent le même Markdown sûr que le fil, 2 000 caractères au plus, ne sont jamais traduits ni écrits dans les journaux, et l'événement temps réel ne porte jamais leur texte. Vérifié dans le navigateur à deux comptes : Moussa écrit à Fatou, la demande arrive chez elle en direct, elle accepte et répond, la réponse arrive chez Moussa ; elle signale un message puis bloque Moussa, qui ne peut plus écrire et voit seulement « Tu ne peux pas écrire à Fatou Ndiaye pour l'instant ». Aussi corrigé pendant le test : l'aperçu de la liste en texte simple, « PR #8 » qui devenait un hashtag, une formulation genrée, la liste qui débordait sur mobile.

Contre le spam, des limites comptées en base, donc tenues après un redémarrage : 10 demandes à des inconnus par 24 heures, 20 messages par minute et 1 000 par jour, 30 signalements par jour. Au-delà, le serveur répond 429 avec le délai ; la page dit quand réessayer et garde le texte écrit (vérifié : le 21ᵉ message d'affilée est refusé, « Réessaie dans 42 s »). La suite de la messagerie, à la manière de Discord, est au cahier (§10.6) et découpée en tâches : modifier et supprimer (PAM-523), « en train d'écrire » et statut en ligne (PAM-524), répondre et réactions (PAM-525), nouveaux messages, non lu, sourdine, archives (PAM-526), recherche (PAM-527), images, fichiers et aperçus de liens (PAM-528).

- **Livrable** : `api/messages.ts`, 9 routes, tables `Conversation`, `ConversationMember`, `DirectMessage`, `UserBlock`, entries `DIRECT_MESSAGE_CREATED` et `CONVERSATION_UPDATED`, `api/messages_test.ts` (7 tests), audiences ajoutées à `api/entry_triggers_test.ts`, `web/lib/messages.ts`, page `web/pages/messages-page.tsx`, bouton « Écrire » du profil, compteurs, traductions, §10.6 et les sections liées du cahier
- **Par** : @Mirak29

### 2026-10-23 · PAM-523, PAM-525, PAM-526, PAM-527 · Messages directs comme sur Discord

La messagerie gagne ce qu'on attend d'un Discord. Chacun peut **modifier** son message sur place (Entrée enregistre, Échap annule, ↑ dans un champ vide reprend son dernier message) ; il porte alors « modifié ». **Supprimer** demande une confirmation et laisse « Message supprimé » à sa place, sans texte ni réactions. On **répond** à un message précis : son début s'affiche au-dessus de la réponse et y mène d'un clic. Six **réactions** (👍 ❤️ 😂 🎉 🙏 👀), qu'un second clic retire. À l'ouverture, une ligne **« Nouveaux messages »** marque le premier message reçu depuis la dernière lecture. On peut **marquer comme non lu** à partir d'un message reçu, mettre une conversation en **sourdine** (plus de toast, hors du compteur du menu, son compte en gris) ou l'**archiver** (elle revient au prochain message). Enfin, une **recherche** dans ses messages ouvre la conversation sur le message trouvé, avec un retour aux derniers messages.

Vérifié dans le navigateur à deux comptes, en direct des deux côtés : Moussa écrit à Awa ; elle accepte, réagit ❤️, répond en citant le message (un `<script>` tapé s'affiche en texte), modifie sa réponse avec ↑, supprime un message et en envoie un autre. Chez Moussa, tout arrive sans rafraîchir ; il marque la conversation non lue, la retrouve par la recherche, la met en sourdine puis l'archive, et le message suivant d'Awa la fait revenir avec un compteur gris. L'interface passe en anglais sans toucher aux messages. Corrigé pendant le test : le champ ne prenait pas le focus pour répondre ou modifier.

- **Livrable** : routes `POST/api/conversation/message/edit`, `…/delete`, `…/react`, `POST/api/conversation/unread`, `…/mute`, `…/archive`, `GET/api/conversations/search` ; table `DirectMessageReaction`, colonnes de la migration 007, entry `DIRECT_MESSAGE_UPDATED` ; 4 tests de plus dans `api/messages_test.ts` ; `web/lib/messages.ts`, `web/pages/messages-page.tsx`, traductions ; §10.6
- **Par** : @Mirak29

### 2026-10-23 · PAM-524 · « En train d'écrire… » et statut en ligne

Dans une conversation, on voit maintenant si l'autre est là : un point vert sur son avatar, dans la liste et en tête de la conversation, et « en ligne » sous son nom. Quand il tape, « Awa Diop écrit… » s'affiche sous les messages et « écrit… » remplace l'aperçu dans la liste ; l'indication s'efface 6 secondes après la dernière frappe ou à l'arrivée du message. Rien n'est enregistré : le serveur tient la présence en mémoire, par connexion temps réel, et envoie des événements éphémères qui ne portent jamais le texte. Seul l'autre participant d'une conversation acceptée, sans blocage, voit ces signaux : ni une demande de message ni un développeur bloqué. Un rechargement de page ne fait pas clignoter le statut : on passe hors ligne 10 secondes après avoir fermé son dernier onglet. Ces fonctions servent de base à la présence des projets (PAM-407).

Vérifié dans le navigateur à deux comptes : Awa tape sans envoyer, Moussa voit « écrit… » dans la liste et sous les messages, puis l'indication disparaît ; Awa ferme son onglet et le point vert s'éteint chez Moussa après le délai.

- **Livrable** : `api/presence.ts`, connexions suivies dans `api/events.ts`, `POST/api/conversation/typing`, `online` dans `GET/api/conversations`, 1 test de plus dans `api/messages_test.ts` ; `onSignal` dans `web/lib/realtime.ts`, `web/lib/messages.ts`, `web/pages/messages-page.tsx`, traductions ; §10.6, §13.6
- **Par** : @Mirak29

### 2026-10-23 · PAM-409, PAM-528 · Images, fichiers et aperçus de liens

Pamoja sait maintenant recevoir des images (PAM-409), et la messagerie s'en sert. Une image choisie ou collée dans le champ (une capture d'écran, comme sur Discord) est réduite à 2 000 px et réencodée par le navigateur avant l'envoi : plus légère, et sans ses métadonnées, dont la position GPS d'une photo prise au téléphone. Le serveur lit le type sur les premiers octets, jamais sur le nom (un script nommé `.png` est refusé), limite une image à 2 Mo et un PDF à 5 Mo, 20 envois par heure, et range le fichier sur disque sous un nom aléatoire, jamais dans SQLite. Un envoi jamais rattaché disparaît au bout de 24 heures. Dans une conversation acceptée, un message porte jusqu'à 4 images ou PDF, avec ou sans texte. Seuls les deux participants les ouvrent (404 pour tout autre, 401 sans session) ; un PDF se télécharge, jamais affiché dans la page, et supprimer le message supprime ses fichiers.

Le premier lien d'un message reçoit un aperçu : le serveur lit la page et garde son titre, sa description et son site, sans image. Comme un membre choisit l'adresse, la lecture est prudente : http ou https sur leurs ports habituels, uniquement des adresses publiques (jamais la machine, son réseau ni les métadonnées du cloud), chaque redirection revérifiée, 5 secondes et 512 Ko au plus, une page HTML seulement. Une demande de message d'un inconnu reste du texte.

Vérifié dans le navigateur à deux comptes : Moussa joint une image de 3 000 px (arrivée en WebP de 2 000 px, 21 ko) et un PDF à un message avec un lien ; Awa voit l'image, télécharge le PDF sous son nom, et l'aperçu « example.com · Example Domain » s'affiche. Awa colle une capture, qui arrive en direct chez Moussa (« Pièce jointe » dans la liste). Fatou, hors de la conversation, reçoit 404 sur l'image ; un GIF est refusé avec un message. Corrigé pendant le test : la conversation ne restait pas en bas quand une image se chargeait ou qu'un aperçu arrivait. Corrigé aussi avant le commit : la colonne ajoutée par la migration 009 doit être déclarée en dernier dans le schéma, sinon le serveur refuse de démarrer.

- **Livrable** : `api/media.ts`, `api/link-preview.ts`, `api/lib/rate.ts` (limite partagée), migration 009 (`media.fileName`), `POST/api/media/upload`, `GET/api/media`, fichiers et aperçus dans `api/messages.ts`, nettoyage horaire dans `api/server.ts`, `api/link-preview_test.ts` (4 tests) et 3 tests de plus dans `api/messages_test.ts` ; `web/lib/messages.ts` (préparation et envoi), `web/pages/messages-page.tsx`, icône `FileText`, traductions ; `media/` ignoré par git ; §10.6, §15, §16, §17.3
- **Par** : @Mirak29

### 2026-10-24 · PAM-117 · CI : format, lint, types et tests sur chaque PR

Chaque PR et chaque push sur `master` lancent maintenant sur GitHub Actions les quatre vérifications faites jusqu'ici à la main : `deno fmt --check`, `deno lint`, `deno check api web *.ts` et `deno task test`. Deno est figé sur la 2.9.7, celle des postes de l'équipe, et les deux actions utilisées sont épinglées sur leur commit. Les tests simulent tous les appels à GitHub : la CI n'a besoin d'aucun secret. Le dossier `.claude/` (worktrees locaux de Claude Code) est exclu de toutes les commandes Deno, pour qu'un worktree ne soit jamais vérifié ni testé à la place du repo.

Vérifié en local : les quatre commandes passent, et un fichier mal formaté et un test en échec placés dans `.claude/worktrees/` sont bien ignorés. La protection de `master` (CI verte et une approbation) se règle dans les paramètres GitHub du repo.

- **Livrable** : `.github/workflows/ci.yml`, `exclude` dans `deno.json`
- **Par** : @Mirak29

### 2026-10-24 · Revue de code complète, sécurité et simplification

Revue de tout le serveur sur `master` après PAM-522 : app lancée sur la base seedée, revue de sécurité (chaque faille candidate vérifiée à part), puis `/simplify` sous quatre angles. Aucune faille exploitable. Six défauts corrigés (REV-01 à REV-06) :

- une erreur dans une tâche de fond arrêtait tout le serveur ;
- deux Preact se trouvaient dans le bundle de dev ;
- esbuild et `@std` n'étaient pas épinglés ;
- la recherche dans les messages privés partait dans les logs ;
- l'import n'avait pas de limite de taille ;
- un appel GitHub sans réponse bloquait le rafraîchissement.

Les duplications relevées sont retirées et 13 index ajoutés. Sept points relevés hors correction (R-01 à R-07) : R-05 et R-07 sont corrigés depuis (entrées ci-dessous), les cinq autres restent à décider par l'équipe, par exemple le refus d'une demande de message qui se devine, ou l'absence de limite de débit sur les demandes d'aide. Voir le [rapport](qa/2026-10-24/rapport-revue-code.md).

- **Livrable** : `docs/qa/2026-10-24/rapport-revue-code.md` ; `api/lib/background.ts`, en-têtes et délai GitHub dans `api/github.ts`, `api/installation.ts`, `api/messages.ts`, `api/routes.ts`, index dans `api/schema.ts`, imports épinglés ; tests `api/background_test.ts` et 1 de plus dans `api/import_test.ts`
- **Par** : @Mirak29

### 2026-10-24 · Test de la langue rendu déterministe (R-07)

`web/lib/language_test.ts` échouait parfois (2 fois sur 7 lancements de toute la suite, serveur de dev allumé) : il attendait les rendus de Preact avec un délai fixe de 50 ms, trop court quand la machine est chargée, et voyait alors l'ancien texte. Le test récupère maintenant les rendus en attente par `options.debounceRendering` et les exécute lui-même avant chaque vérification, sans minuteur ; il restaure l'option à la fin. Les vérifications sont inchangées. Contrôlé : sans exécuter ces rendus, le test échoue bien ; la suite complète passe 6 fois de suite.

- **Livrable** : `web/lib/language_test.ts` ; point R-07 de la revue de code du 2026-10-24
- **Par** : @Mirak29

### 2026-10-24 · Installation réactivée : les repos repassent en direct

Relevé par la revue de code du 24 octobre (R-05). Une installation suspendue renvoyait bien ses repos au rafraîchissement toutes les 15 minutes, mais sa réactivation (`unsuspend`) n'était pas traitée : les repos restaient en mode poll jusqu'à une réinstallation. La documentation de GitHub confirme que l'événement `unsuspend` porte la liste `repositories` de l'installation ; il est maintenant traité comme `created`. Un repo personnel dont le propriétaire possède aussi le projet Pamoja repasse en direct ; tout autre repo attend encore les trois contrôles du §5.4. Vérifié que le nouveau test échoue sans la correction.

- **Livrable** : `api/github-events.ts`, cas suspendu puis réactivé ajouté à `api/github-events_test.ts`
- **Par** : @Mirak29

### 2026-10-24 · Suites de la revue de code et en-tête mobile

Les cinq points de la revue laissés à l'équipe sont corrigés :

- **R-01** : un refus de demande de message n'arrive plus en temps réel chez l'expéditeur.
- **R-02** : seule une aide livrée ouvre une conversation directe ; accepter une demande puis se désister ne suffit plus.
- **R-03** : un envoi de fichier est lu avec sa limite, même sans `Content-Length`.
- **R-04** : demandes d'aide, messages du fil d'une demande et imports de projet ont leur limite, comptée en base, et les pages disent quand réessayer.
- **R-06** : le serveur de production refuse de démarrer sans `APP_ENV=prod`.

L'en-tête ne chevauche plus la recherche sur téléphone : le thème et la langue passent dans le menu du compte. Vérifié dans le navigateur à 375 px et sur ordinateur.

- **Livrable** : `api/entries.ts`, `api/messages.ts`, `api/media.ts`, `api/help.ts`, `api/help-lifecycle.ts`, `api/import.ts`, `api/lib/production.ts`, index dans `api/schema.ts`, `deno.json` (`prod:local`), `web/ui/header.tsx`, messages de limite dans les pages ; 5 tests de plus ; cahier des charges §10.6, §12.2, §16 ; rapport `docs/qa/2026-10-24/rapport-revue-code.md`
- **Par** : @Mirak29

### 2026-10-24 · PAM-125 · Adresses en anglais, ids opaques pour le privé

Les adresses de l'app sont en anglais, chemins et paramètres : `/help/new`, `/project/openpay-africa/channels/updates`, `/community/go/about`, `/settings`, `?filter=`… Le texte de l'interface reste en français. Les anciennes adresses françaises, déjà partagées ou en favoris, mènent à leur équivalent anglais sans étape dans l'historique. Ce qui est public reste lisible (`/@login`, slugs). Ce qui est privé ne se devine plus :

- **Conversation** : un identifiant public aléatoire de 12 caractères (`/messages/BxU3vH1Jqaqt`), comme les ids d'Instagram ; le numéro en base ne sort plus du serveur, et un inconnu reçoit 404 même avec un identifiant valide.
- **Premier message** : par l'identifiant GitHub de la personne (`/messages/new/84472218`), qui ne change pas avec le login ; le lien `?avec=<login>` disparaît et l'ancien mène au même endroit.

GitHub renvoie maintenant vers `/login/github` ; `/connexion/github` y est redirigée tant que les GitHub Apps de dev et de prod n'ont pas changé leur Callback URL. Vérifié dans le navigateur : 30 pages et dialogues, les onglets, aucun lien en français, un ancien lien redirigé, « Écrire » vers une conversation existante et vers un premier message (envoyé, l'adresse devient celle de la conversation), un identifiant GitHub inconnu, un vieux lien numérique, le retour de connexion. Corrigé pendant ce test : le client de l'API écrivait `username=null` dans la requête d'un profil lu par id GitHub, et « Écrire » ne suivait pas le profil une fois lu. Corrigé au passage, présent depuis PAM-526 : après un désarchivage, le bouton de la conversation ouverte restait sur « Désarchiver » ; il suit maintenant, comme la sourdine.

- **Livrable** : `migrations/010-conversation-public-id.js`, `api/lib/ids.ts`, `api/messages.ts`, `api/routes.ts`, `api/profile.ts`, `api/github-oauth.ts`, `api/installation.ts` ; `web/lib/addresses.ts`, `web/app.tsx`, `web/lib/messages.ts`, `web/lib/profile.ts`, `web/pages/messages-page.tsx`, liens de toutes les pages ; tests `web/lib/addresses_test.ts` et 1 de plus dans `api/messages_test.ts` ; cahier des charges §5.3, §10.6, §12.2, §14.5, §16
- **Par** : @Mirak29

### 2026-10-29 · PAM-406 · Fils et réactions des canaux

Les fils sous un message de `#général`, `#aide` ou `#annonces` et le « +1 » sont maintenant enregistrés pour un projet connu du serveur, comme les messages (PAM-428) et les fils sous une alerte de `#suivi` (PAM-411). Seuls les membres répondent en fil, sur un seul niveau et dans le canal du message ; tout lecteur du canal donne un +1, une fois. La page lit les fils et les +1 avec les messages, et un +1 s'affiche tout de suite avant la réponse du serveur. Vérifié dans le navigateur : un +1 ajouté à celui d'un autre membre, une réponse en fil, les deux toujours là après rechargement, la réponse absente du fil principal.

- **Livrable** : `api/channels.ts`, `api/routes.ts` (`POST/api/project/message/like`, `parent` à la création), `api/tracking.ts` ; `web/fixtures/channels.ts`, `web/lib/channels.ts`, `web/pages/project/channels-tab.tsx` ; 1 test de plus dans `api/channels_test.ts` ; cahier des charges §6.8
- **Par** : @niangoos

### 2026-10-26 · Diagnostic des tests de charge HTTP locaux

Préparation de sessions distinctes pour 1 000 comptes synthétiques, scénario k6 mêlant lectures et écritures répétables, et nettoyage des sessions. Après un test à 1 000 VU avec un p95 de 25,8 s et 1,56 % d'échecs, ajout du drapeau local `PAMOJA_LOAD_TEST=1` : les événements informatifs HTTP ne calculent plus leurs piles d'appels et ne s'écrivent plus dans le terminal, tandis que les avertissements et les erreurs restent visibles. La procédure utilise le build de production local sans les watchers. L'effet sur la charge et la cause des refus TCP restent à mesurer ; aucun gain n'est encore confirmé.

- **Livrable** : `api/lib/log.ts`, `qa/load/pamoja.js`, `qa/load/README.md`, `task-db-load-sessions.ts`, tâches de sessions dans `deno.json` et exclusion des cookies dans `.gitignore`
- **Par** : @Mirak29

## Fermé sans réalisation

### 2026-10-07 · PAM-009 · Installer le skill Hairline

Abandonnée : remplacée par des figures maison.

### 2026-10-08 · PAM-312 · Figures isométriques maison

Abandonnée : figures décoratives qui ne disaient rien du produit. Le système isométrique du prototype porte le sens (formes par type d'objet, colonnes pour les valeurs).

### 2026-10-08 · PAM-304 · Developer Passport

Fusionnée dans PAM-301 : le passeport devient la vue publique du profil, à la même adresse `/@login`.
