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

## Fermé sans réalisation

### 2026-10-07 · PAM-009 · Installer le skill Hairline

Abandonnée : remplacée par des figures maison.

### 2026-10-08 · PAM-312 · Figures isométriques maison

Abandonnée : figures décoratives qui ne disaient rien du produit. Le système isométrique du prototype porte le sens (formes par type d'objet, colonnes pour les valeurs).

### 2026-10-08 · PAM-304 · Developer Passport

Fusionnée dans PAM-301 : le passeport devient la vue publique du profil, à la même adresse `/@login`.
