# Pamoja — TODO

Liste de référence des tâches pour CADEV. Elle suit le
[cahier des charges](docs/cahier-des-charges.md) (copie partagée
[en ligne](https://claude.ai/code/artifact/e7a00b2e-5fef-42ba-b949-7d181200909a)) :
même découpage en blocs, et chaque tâche renvoie à sa section (`§`).

**J1 = mercredi 7 octobre 2026 · J10 = vendredi 16 octobre 2026 · Équipe : Abdou, niangoos · Hébergement : Systalink**

## Règles de mise à jour

- **Une tâche = un ID `PAM-xxx`.** La centaine indique le bloc (`PAM-1xx` = bloc 1,
  `PAM-9xx` = gel). Un ID n'est jamais réutilisé ni renuméroté. Une nouvelle tâche
  prend le prochain numéro libre de son bloc.
- **Branche et commit portent l'ID**, comme dans Tournament :
  branche `PAM-204-webhook-queue`, commit `PAM-204 Add persistent webhook queue`.
- **Prendre une tâche** : ajouter `— @login` en fin de ligne **avant** de commencer, pour ne pas la faire en double. Une tâche en cours par personne.
- **Revue croisée** : chaque PR est relue et approuvée par l'autre développeur avant le merge.
- **Conflits sur ce fichier** : ne modifier que les lignes de ses propres tâches, et rebaser sur `master` avant le merge.
- **Terminer une tâche** : cocher la case dans la PR qui la livre, pas après, et ajouter
  son entrée dans `docs/suivi-projet.md` dans la même PR.
- **Point du soir** : comparer l'avancement au planning ci-dessous. Un retard sur le
  bloc 2 se rattrape avant d'attaquer le bloc suivant ; un retard sur les blocs 3 à 5
  laisse leurs tâches au niveau *fonctionnel*.
- **Un bloc est terminé** quand tous ses critères d'acceptation sont cochés,
  vérifiés **en production**.
- **Niveau de finition** (§4) : `[démo]` = écran du scénario, maquetté, animé,
  testé de bout en bout. Sans mention = niveau *fonctionnel*.
- **Trois états par page** : chaque page livrée a ses états vide, chargement et erreur.
- **Le prototype est une référence, pas du code** : `docs/prototype/` montre les écrans et
  les parcours ; on n'en reprend ni les `#` dans les adresses, ni les styles en ligne.
- **Changer le périmètre ou une règle** : modifier d'abord le cahier des charges,
  puis cette liste, et noter la décision dans le journal en bas.

## Planning

| Jour | Date | Bloc |
| --- | --- | --- |
| J1 – J2 | mer. 7 – jeu. 8 oct. | Bloc 0 + Bloc 1 — Fondations |
| J3 – J5 | ven. 9 – dim. 11 oct. | Bloc 2 — Boucle de démo |
| J6 – J7 | lun. 12 – mar. 13 oct. | Bloc 3 — Vitrines |
| J8 | mer. 14 oct. | Bloc 4 — Gestion de projet |
| J9 | jeu. 15 oct. | Bloc 5 — Social et découverte |
| J10 | ven. 16 oct. | Gel — Préparation de la démo |

Après le bloc 1, les blocs 3 à 5 peuvent avancer en parallèle du bloc 2, selon la répartition (PAM-002). Les jours indiquent l'échéance de chaque bloc.

## Bloc 0 — Décisions (J1) (§20)

- [x] **PAM-001** · Fixer les dates : J1 = 7 octobre, J10 = 16 octobre 2026
- [ ] **PAM-002** · Répartir les blocs entre Abdou et niangoos, et noter le responsable sous chaque bloc
- [ ] **PAM-003** · Valider l'offre Systalink avant la fin de J2 : VM avec Docker, IP publique et ports 80/443 ouverts (certificat Caddy), sortie vers `api.github.com` et le fournisseur IA, entrée des webhooks GitHub, taille de disque, sauvegardes, domaine et DNS (§17.4, §20)
- [ ] **PAM-004** · Vérifier la disponibilité du domaine, de l'org GitHub `pamoja` et du nom de la GitHub App
- [ ] **PAM-005** · Choisir le fournisseur IA, le modèle de génération, le modèle d'embeddings et le budget (§11)
- [ ] **PAM-006** · Fixer la version de Meilisearch (§10.4)
- [x] **PAM-007** · Identité visuelle validée : [design system Pamoja](https://claude.ai/artifact/Gj5ox6BNFzaDpuqaCFCWhb) et prototype Pamoja v2 (§12.7)
- [x] **PAM-008** · Prototype complet avec Claude Design : Pamoja v2, copié dans `docs/prototype/` avec la liste de ce que le code ne reprend pas (§12.7)
- [x] **PAM-009** · ~~Installer le skill `hairline-create`~~ — abandonnée : figures isométriques maison à la place (voir journal)

## Bloc 1 — Fondations (J1 – J2 · 7 – 8 oct.)

Responsable : _à répartir_

- [x] **PAM-101** · Initialiser le projet Deno : `deno.json` (imports `@01edu` aux versions de Tournament, fmt et lint), arborescence `api/`, `web/`, `migrations/` (§12.1, §12.6) — @niangoos
- [x] **PAM-102** · Build esbuild + `task-dev.ts` (route `/api` vers l'API) + `prod-server.ts` (§12.2) — @niangoos
- [x] **PAM-103** · **Prototype à risque** : Tailwind CLI v4 sans twind ni daisyUI, en watch en dev et dans le build (§12.3) — à finir fin J1 — @niangoos
- [ ] **PAM-104** · **Prototype à risque** : `satori` + `@resvg/resvg-wasm` dans un binaire `deno compile` (§17.2) — à finir fin J1
- [ ] **PAM-105** · Schéma initial et migrations ; `PRAGMA foreign_keys = ON` et `busy_timeout = 5000` au démarrage (§12.5, §14)
- [ ] **PAM-106** · `api/entries.ts` + `initEntries` avec toutes les relations (§13.1, §14.6)
- [ ] **PAM-107** · Route `GET/api/events` : abonnements calculés côté serveur, `ack` toutes les 15 s (§13.2)
- [ ] **PAM-108** · `web/lib/realtime.ts` : `onEvent`, détection de déconnexion à 20 s, reconnexion (§13.4)
- [ ] **PAM-109** · Créer la GitHub App : permissions en lecture (dont Actions, Checks, Commit statuses), événements (dont `workflow_run`, `check_run`, `status`), Callback URL, Setup URL, autorisation pendant l'installation (§5.1)
- [ ] **PAM-110** · Login GitHub : `GET/api/auth/github`, `POST/api/auth/github/callback`, `state`, cookie `session` (§5.3)
- [x] **PAM-111** · Socle UI : thème généré depuis `docs/identite/tokens.json`, polices Google, système isométrique en utilitaires CSS (dalles, touches, puits, disques), layout sans en-tête de page, recherche centrée, routage en vrais chemins, thèmes clair et sombre (§6.2, §12.2, §12.3, §12.7) — @niangoos
- [ ] **PAM-112** · Seed rejouable en une commande, toutes les données en `source = demo` (§14, §18.1)
- [ ] **PAM-113** · Dockerfile multi-stage + `deno compile` + `APP_ENV=prod` ; la page `/dev/socle` n'est servie qu'en dev (§17.4)
- [ ] **PAM-114** · Caddy (HTTPS, HTTP/2) + conteneur Meilisearch non exposé (§17.4)
- [ ] **PAM-115** · Sauvegardes : `VACUUM INTO` horaire, conservation 7 jours, copie quotidienne hors machine (§17.5)
- [ ] **PAM-116** · Tunnel HTTPS pour les webhooks en dev (§5.6)
- [ ] **PAM-117** · CI : fmt, lint, tests sur chaque PR
- [ ] **PAM-118** · Rendu Markdown sécurisé (sanitizer, liens externes `noopener nofollow`) partagé par tous les contenus (§16)
- [x] **PAM-119** · Écrans publics sur données fictives : landing, connexion GitHub, 404 (§6.1, §12.7) — @niangoos
- [ ] **PAM-120** · Accessibilité du socle (QA du 10 oct.) : un dialogue garde le focus et le rend à son déclencheur à la fermeture ; une action en ligne qui remplace son bouton (accepter, rejoindre, publier, déplacer une carte) pose le focus sur ce qui le remplace et l'annonce ; lien « Aller au contenu » ; un `h1` par page ; erreurs de formulaire reliées au champ (`aria-invalid`, `aria-describedby`) et focus sur le premier champ en erreur ; boutons répétés nommés avec leur objet (« Rejoindre React », « Inviter Moussa », « Monter la section Badges ») (§12.7) — @Mirak29
- [ ] **PAM-121** · Textes et cohérence (QA du 10 oct.) : fonction `plural()` partagée pour tous les compteurs ; libellés en français (« Accroche » au lieu de « Headline », « toutes » pour les filtres féminins) ; mêmes réactions partout ; un seul nom pour les modes de synchro (« Synchro live », « Synchro toutes les 15 min ») ; pays écrit en entier, sans code « CI » ou « SN » ; slogans de marque en anglais sur la landing (§2, §12.7) — @Mirak29

**Critères d'acceptation (§4)**

- [ ] Login GitHub de bout en bout en prod via Caddy, protocole `h2` visible
- [ ] Une entry insérée côté serveur arrive dans un autre navigateur en moins d'1 s
- [ ] `PRAGMA foreign_keys` et `busy_timeout` actifs au démarrage
- [ ] Seed rejouable en une commande
- [ ] Meilisearch répond depuis l'app et n'est pas joignable depuis l'extérieur
- [ ] Toutes les routes en vrais chemins, sans `#` ; `/@login` ouvert sans connexion renvoie la page avec ses balises OG

## Bloc 2 — Boucle de démo (J3 – J5 · 9 – 11 oct.)

Responsable : _à répartir_ · Prioritaire sur tous les autres blocs en cas de retard.

- [ ] **PAM-201** · Onboarding et profil de base : skills en vocabulaire contrôlé, `SkillAlias`, intentions (§6.1) `[démo]`
- [ ] **PAM-202** · Import niveau 1 : liste des repos via le token bot, import des métadonnées, README, issues, PRs ; rafraîchissement toutes les 15 min avec ETag (§5.4) `[démo]`
- [ ] **PAM-203** · Import niveau 2 : `POST/api/github/installation/confirm` avec les trois contrôles, passage automatique en live (§5.4)
- [ ] **PAM-204** · Webhooks : HMAC sur le corps brut, `WebhookDelivery` comme file persistante, worker, reprise au démarrage, nouveaux essais (§5.5)
- [ ] **PAM-205** · Traitement des événements `pull_request`, `pull_request_review`, `issues`, `issue_comment`, `release`, `installation*`, `workflow_run`, `check_run`, `status` → tables (dont `CiRun`) + entries (§5.5, §6.8, §14.2)
- [ ] **PAM-206** · Resynchronisation horaire des projets actifs (§5.6)
- [ ] **PAM-207** · Demande d'aide : création, bouton « Request Review » depuis une PR (§7.1) `[démo]`
- [ ] **PAM-208** · Cycle de vie complet : acceptation atomique, désistement, libération, réouverture, expirations et relances (§7.2)
- [ ] **PAM-209** · Matching SQL : score, raisons, vagues de 5, place « nouveau profil », plafonds par jour (§7.3) `[démo]`
- [ ] **PAM-210** · Notifications : table, centre, toast temps réel, préférences (§7.4) `[démo]`
- [ ] **PAM-211** · Vérification d'une review : les 5 conditions → `review_submitted` (§7.5)
- [ ] **PAM-212** · Confirmation du demandeur → `REVIEW_HELP_CONFIRMED` avec les `fields` figés (§8.3) `[démo]`
- [ ] **PAM-213** · Évaluateur de badges : `BadgeProgress`, anti-abus, diversité par badge (§8.2, §8.4)
- [ ] **PAM-214** · Tests : webhooks, cycle de vie, acceptation simultanée, contrôles d'installation, anti-abus, matching, `trigger` (§12.8)
- [x] **PAM-215** · Écran Onboarding sur données fictives : 5 étapes avec progression (profil, skills, intentions, matching, import) (§6.1) — @niangoos
- [x] **PAM-216** · Écrans Aide sur données fictives : liste (Pour moi, Mes demandes, Acceptées par moi, Demandes des projets), nouvelle demande, détail avec frise du cycle de vie et matching (§7.1 – §7.3) `[démo]` — @niangoos
- [x] **PAM-217** · Écran Notifications sur données fictives : centre par catégories, actions directes, toast « Ce projet a besoin de toi » (§7.4) `[démo]` — @niangoos
- [x] **PAM-218** · Boucle de démo jouable de bout en bout (QA du 10 oct.) : la demande d'Abdou passe en « Review soumise » et le demandeur peut confirmer l'aide depuis la page ; « Pour toi » reçoit les demandes qui correspondent ; notifications triées par date et menant à l'objet exact (PR, demande) ; le rail « PRs à relire » exclut ses propres PRs et ouvre la PR (§7.2, §7.4, §8.3, §18) `[démo]` — @Mirak29
- [x] **PAM-219** · Matching fictif crédible (QA du 10 oct.) : scores calculés avec la formule du §7.3 et des raisons qui l'expliquent, sans proximité inventée entre skills ; liste des notifiés triée par score ; un développeur notifié ne voit pas les scores des autres ; « Sur quoi travailler » applique le seuil des réglages (§7.3, §10.3) `[démo]` — @Mirak29
- [x] **PAM-220** · Demande d'aide : formulaire et cycle de vie (QA du 10 oct.) : toutes les erreurs affichées en une fois ; choisir une PR pré-remplit la demande comme `?pr=81` ; « Se désister » demande confirmation et retire « Accepter » ; après acceptation, un lien mène vers le demandeur et le canal `#aide` du projet (§7.1, §7.2) — @Mirak29
- [ ] **PAM-221** · Onboarding (QA du 10 oct.) : liste complète des pays africains avec « Autre », étape courante dans l'URL, après connexion retour à la page d'origine si l'utilisateur n'est pas nouveau (§6.1) — @Mirak29

**Critères d'acceptation (§4)**

- [ ] Import niveau 1 en 3 clics
- [ ] Une review GitHub réelle fait passer la demande en `review_submitted` en moins de 10 s
- [ ] Un webhook reçu pendant un redémarrage est traité après la reprise
- [ ] Deux acceptations simultanées n'en retiennent qu'une
- [ ] La confirmation met à jour le badge du profil sans rafraîchir

## Bloc 3 — Vitrines (J6 – J7 · 12 – 13 oct.)

Responsable : _à répartir_

- [ ] **PAM-301** · Profil à une seule adresse `/@login` : vue publique sans connexion (passeport), vue complète connecté, une colonne ; hero, contributions réelles, stats, chaque chiffre mène à ses preuves (§9.1) `[démo]`
- [ ] **PAM-302** · Personnalisation : cover, accent, thèmes (Clair, Sombre, Terminal, Cyber), ordre des sections (§9.2)
- [ ] **PAM-303** · Réputation par dimensions avec preuves, mentions « vérifié par GitHub » / « donnée de démonstration » (§8.1, §14) `[démo]`
- [x] **PAM-304** · ~~Developer Passport~~ — fusionnée dans PAM-301 : le passeport est la vue publique du profil
- [ ] **PAM-305** · Share Card + `GET/api/user/card` + injection des balises OG + `sitemap.xml` (§17.1, §17.2) `[démo]`
- [ ] **PAM-306** · Pulse déterministe (§6.4) `[démo]`
- [ ] **PAM-307** · Résumé IA du Pulse : tâche de fond, `ProjectSummary`, entry `PULSE_READY` (§6.4, §11) `[démo]`
- [ ] **PAM-308** · Project DNA, Health, Story (§6.5)
- [ ] **PAM-309** · Collaboration Map (une colonne par pays sur grille isométrique, sans contour de l'Afrique, pays du profil exclu des pays reliés) et Collaboration Graph (§9.3, §12.7) `[démo]`
- [ ] **PAM-310** · Extraction IA des skills et besoins à l'import, et description de projet proposée (§11)
- [ ] **PAM-311** · Embeddings et critère de proximité sémantique du matching (§7.3, §11)
- [x] **PAM-312** · ~~Figures isométriques maison~~ — abandonnée : pas d'illustration décorative, le système isométrique encode les objets (voir journal)
- [x] **PAM-313** · Écran Profil `/@login` sur données fictives : vue publique et vue connectée, stats, réputation, badges, preuves, Collaboration Map, carte de partage, proposer une collaboration (§9) `[démo]` — @niangoos
- [x] **PAM-314** · Écran Modifier le profil sur données fictives : thème, accent, sections, aperçu en direct (§9.2) — @niangoos
- [ ] **PAM-315** · Profil, passeport et partage (QA du 10 oct.) : chaque preuve mène à la PR sur GitHub ; mêmes chiffres partout (aides confirmées, Entraide, reviews du badge) ; les stats nulles ne sont pas mises en avant sur le passeport ni la carte ; « Copier le lien » dans le partage ; une proposition de collaboration demande un message, et la PR quand on propose une review ; sur mobile, le nom passe avant les actions (§7.6, §9.1, §17.1) `[démo]` — @Mirak29

**Critères d'acceptation (§4)**

- [ ] Un lien `/@username` collé dans WhatsApp et LinkedIn affiche l'aperçu avec la Share Card
- [ ] Chaque chiffre du profil mène à ses preuves
- [ ] Le Pulse s'affiche même IA coupée

## Bloc 4 — Gestion de projet (J8 · 14 oct.)

Responsable : _à répartir_

- [ ] **PAM-401** · Page projet complète : en-tête, onglets, galerie, vidéo de démo (§6.3) `[démo]`
- [ ] **PAM-402** · Needs et « People who could help » (§6.6)
- [ ] **PAM-403** · Join project : candidatures, acceptation depuis la notification, rôles (§3, §6.6)
- [ ] **PAM-404** · Board : 5 colonnes, rang fractionnaire, synchro GitHub → board, PR mergée → Done (§6.7)
- [ ] **PAM-405** · Roadmap et milestones (§6.7)
- [ ] **PAM-406** · Canaux du projet : `#général`, `#aide`, `#annonces` imposés, messages, fils, réactions, images, vidéos intégrées, droits d'écriture et de lecture par canal (§6.8)
- [ ] **PAM-407** · Présence en mémoire, indexée par connexion SSE (§13.6)
- [ ] **PAM-408** · Collaboration Requests depuis un profil (§7.6)
- [ ] **PAM-409** · Upload d'images : redimensionnement dans le navigateur, `POST/api/media/upload`, table `Media`, nettoyage à 24 h (§17.3)
- [ ] **PAM-410** · Vidéos intégrées par lien : oEmbed, miniature puis lecteur au clic, `frame-src` (§17.3)
- [ ] **PAM-411** · Canal `#suivi` : alertes PR, review, merge, CI en échec / réparée, PR sans review depuis 2 jours, pushes regroupés ; boutons « Demander de l'aide » et « Demander une review » ; fils sous une alerte (§6.8, §13.3) `[démo]`
- [ ] **PAM-412** · Non lus et notifications par canal (`ChannelState`), « seulement mes PRs » par défaut sur `#suivi` (§6.8)
- [x] **PAM-413** · Page projet sur données fictives : en-tête, onglets, Aperçu, dialogue Rejoindre (§6.3, §6.6) `[démo]` — @niangoos
- [x] **PAM-414** · Onglet Pulse sur données fictives : Pulse, résumé IA, Health, DNA, Story (§6.4, §6.5) `[démo]` — @niangoos
- [x] **PAM-415** · Onglet Canaux sur données fictives : quatre canaux, messages, fils, alertes `#suivi` actionnables, présence (§6.8) `[démo]` — @niangoos
- [x] **PAM-416** · Onglets Pull requests et Issues sur données fictives, panneau de détail d'une PR (§6.3) `[démo]` — @niangoos
- [x] **PAM-417** · Onglets Équipe et Activité sur données fictives (§6.6) — @niangoos
- [x] **PAM-418** · Onglets Board et Roadmap sur données fictives (§6.7) — @niangoos
- [x] **PAM-419** · Réglages du projet sur données fictives (§6.3) — @niangoos
- [x] **PAM-420** · Écran Projets sur données fictives : mes projets et projets suivis, nouveau projet (import ou création), activation de la synchro live (§5.4, §6.3) — @niangoos
- [x] **PAM-421** · Page projet vue du propriétaire (QA du 10 oct.) : « Demander de l'aide » à la place de « Suivre » et « Proposer mon aide » ; pas de milestone inventée à l'import ; chiffres du projet créé identiques à l'aperçu d'import ; accepter un membre ne change pas les contributeurs GitHub ; « + 0 contributeurs » masqué ; métriques en grille sur mobile (§6.3, §6.6) `[démo]` — @Mirak29
- [x] **PAM-422** · Liens vers l'objet exact et données cohérentes (QA du 10 oct.) : issues, journal d'activité et besoins de « Sur quoi travailler » mènent à l'élément ; la colonne Review du board montre les PRs en attente ; état CI des PRs identique entre l'onglet et le fil (§6.3, §6.7) — @Mirak29
- [x] **PAM-423** · Alerte « CI en échec » dans `#suivi` sur données fictives, avec « Demander de l'aide » qui pré-remplit une demande Debug (§6.8, §18) `[démo]` — @Mirak29

**Critères d'acceptation (§4)**

- [ ] Deux utilisateurs déplacent des cartes en même temps sans perte
- [ ] Une PR mergée déplace sa carte en Done
- [ ] Une candidature s'accepte depuis la notification
- [ ] Une CI en échec apparaît dans `#suivi` et devient une demande d'aide en un clic

## Bloc 5 — Social et découverte (J9 · 15 oct.)

Responsable : _à répartir_

- [ ] **PAM-501** · Accueil en fil social : rédaction (texte, code, images, communauté, type), onglets Pour toi / Abonnements / Communautés / Questions, événements GitHub et carte « Ce projet a besoin de toi » insérés, réactions dont « Utile », bookmarks, partage par lien, pagination par curseur (§6.2, §10.1)
- [ ] **PAM-502** · Communautés, dont les communautés de pays créées par le seed (§10.2)
- [ ] **PAM-503** · Follow : utilisateurs, projets, communautés (§14.1)
- [ ] **PAM-504** · Colonne de droite de l'Accueil : demandes d'aide pour toi, PRs à relire, avec qui construire, projets qui cherchent des contributeurs (§6.2)
- [ ] **PAM-505** · Explore : développeurs et projets, avec filtres (§10.3)
- [ ] **PAM-506** · « What can I work on? » (§10.3, §11)
- [ ] **PAM-507** · Meilisearch : index, worker de synchro depuis les entries, réindexation nocturne, repli `LIKE` (§10.4)
- [ ] **PAM-508** · Signalement et modération : file, actions, historique, masquage à 3 signalements ; un contenu masqué reste visible pour son auteur, avec un bandeau (§10.5)
- [ ] **PAM-509** · Digest quotidien par email (§7.4)
- [ ] **PAM-510** · Limite de débit sur les routes d'écriture (§16)
- [ ] **PAM-511** · Conditions d'utilisation et politique de confidentialité (§20)
- [ ] **PAM-512** · Réponses imbriquées (une réponse est un post), dépliage à la demande, réponse acceptée, republications (§10.1, §14.5)
- [x] **PAM-513** · Écran Accueil sur données fictives : rédaction, onglets du fil, insertions, colonne de droite (§6.2, §10.1) — @niangoos
- [x] **PAM-514** · Écrans Explorer (développeurs, projets, sur quoi travailler) et résultats de recherche sur données fictives (§10.3, §10.4) — @niangoos
- [x] **PAM-515** · Écrans Communautés, communauté et post sur données fictives : réponses, réponse acceptée, nouveau post, nouvelle communauté (§10.1, §10.2) — @niangoos
- [x] **PAM-516** · Écrans Réglages et Modération sur données fictives, dialogue Signaler (§7.4, §10.5) — @niangoos
- [ ] **PAM-517** · Communautés (QA du 10 oct.) : quitter demande confirmation (le bouton « Membre » ne fait plus quitter en un clic) ; une communauté au nom déjà pris n'est pas créée et renvoie vers l'existante ; le nombre de membres affichés est expliqué (§10.2) — @Mirak29
- [ ] **PAM-518** · Accueil et posts (QA du 10 oct.) : rédaction sans communauté par défaut, focus rendu après publication ; « Commenter » pose le focus dans la réponse ; une réponse à une réponse indique à qui elle répond ; page des posts enregistrés (§6.2, §10.1) — @Mirak29
- [ ] **PAM-519** · Palette de recherche (QA du 10 oct.) : aucune frappe perdue à l'ouverture, navigation aux flèches avec résultat actif, Entrée ouvre le résultat actif (§10.4) — @Mirak29
- [ ] **PAM-520** · Réglages (QA du 10 oct.) : l'export télécharge vraiment le fichier JSON, « Réinitialiser la démo » demande confirmation (§7.4) — @Mirak29

**Critères d'acceptation (§4)**

- [ ] Recherche tolérante aux fautes (« postgress » trouve PostgreSQL)
- [ ] La recherche reste utilisable Meilisearch arrêté
- [ ] Une réponse à une réponse s'affiche imbriquée et se déplie à la demande ; une republication apparaît dans le fil des abonnés
- [ ] Un contenu signalé puis masqué disparaît pour tous

## Gel — Préparation de la démo (J10 · 16 oct.)

Plus aucune nouvelle fonctionnalité.

- [ ] **PAM-901** · Seed final : profils de plusieurs pays, Moussa avec 14 reviews en `source = demo` (3 demandeurs, 2 projets) (§18.1)
- [ ] **PAM-902** · Repo public OpenPay Africa sous le compte perso d'Abdou, app installée, webhook testé vers la prod (§18.1)
- [ ] **PAM-903** · Deux vrais comptes GitHub prêts ; PR #81 ouverte par Abdou, sans review (§18.1)
- [ ] **PAM-904** · Pré-calculer les résumés IA et les embeddings du seed (§18.1)
- [ ] **PAM-905** · Test de bout en bout du scénario, sur le modèle de `qa/` de Tournament (§12.8)
- [ ] **PAM-906** · Vérifier en prod : protocole `h2`, notifications instantanées (§20)
- [ ] **PAM-907** · Tester une restauration de sauvegarde (§17.5)
- [ ] **PAM-908** · Répéter le plan B webhook : Redeliver depuis la GitHub App, resynchronisation manuelle (§18.1)
- [ ] **PAM-909** · Trois répétitions complètes et chronométrées en prod (§18.1)

## Journal des décisions

Une ligne par décision qui modifie le périmètre, une règle ou un choix technique.
Format : `AAAA-MM-JJ · décision · section du cahier des charges`.

- 2026-10-07 · Nom retenu : Pamoja · §20
- 2026-10-07 · Reverse proxy : Caddy · §17.4
- 2026-10-07 · Recherche : Meilisearch auto-hébergé, SQLite reste la source de vérité · §10.4
- 2026-10-07 · Vidéos intégrées par lien uniquement ; upload vidéo natif hors périmètre CADEV · §17.3
- 2026-10-07 · Calendrier : 10 jours (7 – 16 octobre 2026), un seul développeur (Abdou) · §2, §4
- 2026-10-07 · Hébergement imposé : Systalink (VM + Docker) · §2, §17.4
- 2026-10-07 · Projets organisés en 4 canaux imposés façon Discord (`#général`, `#suivi`, `#aide`, `#annonces`) ; alertes CI/CD actionnables · §2, §6.8
- 2026-10-07 · Identité visuelle : design system Pamoja (fil indigo, lignes fines isométriques), illustrations Hairline sur mesure · §2, §12.7
- 2026-10-07 · Vibe isométrique pour toute la DA ; dix figures isométriques maison remplacent Hairline et son skill (aucune dépendance) · §2, §12.7
- 2026-10-07 · Interface en français, au tutoiement ; signatures de marque en anglais · §2
- 2026-10-07 · Équipe à deux : Abdou et niangoos ; un responsable par bloc, revue croisée de chaque PR · §2, §4
- 2026-10-07 · `CLAUDE.md` versionné dans le repo, contexte commun des sessions Claude Code · —
- 2026-10-08 · Prototype Pamoja v2 adopté comme référence d'interface (`docs/prototype/`) · §2, §12.7
- 2026-10-08 · Interface entièrement isométrique (dalles, touches, puits, formes par type d'objet) ; figures décoratives abandonnées · §12.7
- 2026-10-08 · Accueil en fil social (abonnements, republications, réponses imbriquées) ; une réponse est un post · §6.2, §10.1, §14.5
- 2026-10-08 · Profil à une seule adresse `/@login`, le passeport devient sa vue publique · §9
- 2026-10-08 · Routage en vrais chemins, sans `#` · §2, §12.2
- 2026-10-08 · Tailwind v4 seul, sans daisyUI : le système isométrique rend tous les composants sur mesure · §2, §12.3, §20
- 2026-10-08 · Écrans construits d'abord sur données fictives côté web, une tâche par écran (PAM-119, PAM-215 à PAM-217, PAM-313 et PAM-314, PAM-413 à PAM-420, PAM-513 à PAM-516) ; les tâches existantes les branchent ensuite sur l'API · §4
- 2026-10-08 · Thèmes et accents de profil définis dans `docs/identite/tokens.json` ; la couverture « Plaques » reste, seule illustration, parce que le développeur la choisit · §9.2, §12.3, §12.7
- 2026-10-09 · Plaques et figures de la boucle gardées sur les pages publiques (landing, 404), qui présentent le produit ; sans session, `/` est la landing · §6.2, §12.7
- 2026-10-09 · Onboarding : les 11 domaines du §6.1, pas les 7 du prototype ; une seule liste d'intentions, celle du §6.1, affichée sur les cartes et filtrée dans Explore · §6.1
- 2026-10-10 · QA complète du frontend sur données fictives : corrections découpées en PAM-120, PAM-121, PAM-218 à PAM-221, PAM-315, PAM-421 à PAM-423, PAM-517 à PAM-520 ; la boucle de démo passe en premier · §4, §18
