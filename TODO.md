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
- [x] **PAM-003** · Valider l'offre Systalink avant la fin de J2 : VM avec Docker, IP publique et ports 80/443 ouverts (certificat Caddy), sortie vers `api.github.com` et le fournisseur IA, entrée des webhooks GitHub, taille de disque, sauvegardes, domaine et DNS (§17.4, §20) — VM Developer (1 cœur, 4 Go, 40 Go), ports 80/443 et sorties GitHub, GHCR, Groq vérifiés, webhooks joignables — @Mirak29
- [x] **PAM-004** · Vérifier la disponibilité du domaine, de l'org GitHub `pamoja` et du nom de la GitHub App — domaine `pamoja-tech.duckdns.org`, app « Pamoja Demo » (`pamoja-demo`) ; pas d'org GitHub, le repo reste sous Mirak29 — @Mirak29
- [x] **PAM-005** · Choisir le fournisseur IA, le modèle de génération, le modèle d'embeddings et le budget (§11) — Meta (Muse Ember), Gemini puis Groq ; embeddings Gemini — @Mirak29
- [x] **PAM-006** · Fixer la version de Meilisearch (§10.4) — `v1.56.0` — @Mirak29
- [x] **PAM-007** · Identité visuelle validée : [design system Pamoja](https://claude.ai/artifact/Gj5ox6BNFzaDpuqaCFCWhb) et prototype Pamoja v2 (§12.7)
- [x] **PAM-008** · Prototype complet avec Claude Design : Pamoja v2, copié dans `docs/prototype/` avec la liste de ce que le code ne reprend pas (§12.7)
- [x] **PAM-009** · ~~Installer le skill `hairline-create`~~ — abandonnée : figures isométriques maison à la place (voir journal)

## Bloc 1 — Fondations (J1 – J2 · 7 – 8 oct.)

Responsable : _à répartir_

- [x] **PAM-101** · Initialiser le projet Deno : `deno.json` (imports `@01edu` aux versions de Tournament, fmt et lint), arborescence `api/`, `web/`, `migrations/` (§12.1, §12.6) — @niangoos
- [x] **PAM-102** · Build esbuild + `task-dev.ts` (route `/api` vers l'API) + `prod-server.ts` (§12.2) — @niangoos
- [x] **PAM-103** · **Prototype à risque** : Tailwind CLI v4 sans twind ni daisyUI, en watch en dev et dans le build (§12.3) — à finir fin J1 — @niangoos
- [ ] **PAM-104** · **Prototype à risque** : `satori` + `@resvg/resvg-wasm` dans un binaire `deno compile` (§17.2) — à finir fin J1
- [x] **PAM-105** · Schéma initial et migrations ; `PRAGMA foreign_keys = ON` et `busy_timeout = 5000` au démarrage (§12.5, §14)
- [x] **PAM-106** · `api/entries.ts` + `initEntries` avec toutes les relations (§13.1, §14.6)
- [x] **PAM-107** · Route `GET/api/events` : abonnements calculés côté serveur, `ack` toutes les 15 s (§13.2)
- [x] **PAM-108** · `web/lib/realtime.ts` : `onEvent`, détection de déconnexion à 20 s, reconnexion (§13.4)
- [x] **PAM-109** · Créer la GitHub App : permissions en lecture (dont Actions, Checks, Commit statuses), événements (dont `workflow_run`, `check_run`, `status`), Callback URL, Setup URL, autorisation pendant l'installation (§5.1) — app de dev et app « Pamoja Demo » pour la prod — @Mirak29
- [x] **PAM-110** · Login GitHub : `GET/api/auth/github`, `POST/api/auth/github/callback`, `state`, cookie `session` (§5.3)
- [x] **PAM-111** · Socle UI : thème généré depuis `docs/identite/tokens.json`, polices Google, système isométrique en utilitaires CSS (dalles, touches, puits, disques), layout sans en-tête de page, recherche centrée, routage en vrais chemins, thèmes clair et sombre (§6.2, §12.2, §12.3, §12.7) — @niangoos
- [x] **PAM-112** · Seed rejouable en une commande, toutes les données en `source = demo` (§14, §18.1)
- [x] **PAM-113** · Dockerfile multi-stage + `deno compile` + `APP_ENV=prod` ; la page `/dev/socle` n'est servie qu'en dev (§17.4) — Dockerfile, `deno compile`, `APP_ENV=prod` (PAM-537) ; `/dev` retiré du build de production — @Mirak29
- [x] **PAM-114** · Caddy (HTTPS, HTTP/2) + conteneur Meilisearch non exposé (§17.4) — Caddy HTTPS, HTTP/1.1, 2 et 3 ; Meilisearch sans port, vérifié de l'extérieur — @Mirak29
- [x] **PAM-115** · Sauvegardes : `VACUUM INTO` horaire, conservation 7 jours, copie quotidienne hors machine (§17.5) — `VACUUM INTO` horaire gardé 7 jours (PAM-537) ; copie quotidienne sur le poste de l'équipe par `deploy/pull-backup.sh` — @Mirak29
- [x] **PAM-116** · Tunnel HTTPS pour les webhooks en dev (§5.6)
- [x] **PAM-117** · CI : fmt, lint, tests sur chaque PR — @Mirak29
- [x] **PAM-118** · Rendu Markdown sécurisé (sanitizer, liens externes `noopener nofollow`) partagé par tous les contenus (§16) — @niangoos
- [x] **PAM-119** · Écrans publics sur données fictives : landing, connexion GitHub, 404 (§6.1, §12.7) — @niangoos
- [x] **PAM-120** · Accessibilité du socle (QA du 10 oct.) : un dialogue garde le focus et le rend à son déclencheur à la fermeture ; une action en ligne qui remplace son bouton (accepter, rejoindre, publier, déplacer une carte) pose le focus sur ce qui le remplace et l'annonce ; lien « Aller au contenu » ; un `h1` par page ; erreurs de formulaire reliées au champ (`aria-invalid`, `aria-describedby`) et focus sur le premier champ en erreur ; boutons répétés nommés avec leur objet (« Rejoindre React », « Inviter Moussa », « Monter la section Badges ») (§12.7) — @Mirak29
- [x] **PAM-122** · Socle, retours QA 2 : toasts visibles au-dessus d'un dialogue ouvert (QA-09), recherche identifiable à 320 px (QA-12), un seul `h1` sur connexion, onboarding et 404 (QA-13), pluriel de la liste des PRs (QA-14), fins de ligne LF imposées par `.gitattributes` (§12.7) — @Mirak29
- [x] **PAM-121** · Textes et cohérence (QA du 10 oct.) : fonction `plural()` partagée pour tous les compteurs ; libellés en français (« Accroche » au lieu de « Headline », « toutes » pour les filtres féminins) ; mêmes réactions partout ; un seul nom pour les modes de synchro (« Synchro live », « Synchro toutes les 15 min ») ; pays écrit en entier, sans code « CI » ou « SN » ; slogans de marque en anglais sur la landing (§2, §12.7) — @Mirak29
- [x] **PAM-124** · Interface en anglais au choix : langue du système par défaut, réglage et bouton de l'en-tête ; traduction des seules phrases de l'interface, jamais du contenu des développeurs ; phrases à valeurs écrites ``t`…` `` (§2) — @Mirak29
- [x] **PAM-125** · Adresses de navigation en anglais : chemins et paramètres sans français, anciennes adresses redirigées ; ids opaques pour le privé : une conversation par un id public aléatoire, une nouvelle conversation par l'id GitHub de la personne, jamais le login ni un numéro qui se suit (§9, §10.6, §12.2, §16) — @Mirak29

**Critères d'acceptation (§4)**

- [ ] Login GitHub de bout en bout en prod via Caddy, protocole `h2` visible
- [ ] Une entry insérée côté serveur arrive dans un autre navigateur en moins d'1 s
- [ ] `PRAGMA foreign_keys` et `busy_timeout` actifs au démarrage
- [ ] Seed rejouable en une commande
- [ ] Meilisearch répond depuis l'app et n'est pas joignable depuis l'extérieur
- [ ] Toutes les routes en vrais chemins, sans `#` ; `/@login` ouvert sans connexion renvoie la page avec ses balises OG

## Bloc 2 — Boucle de démo (J3 – J5 · 9 – 11 oct.)

Responsable : _à répartir_ · Prioritaire sur tous les autres blocs en cas de retard.

- [x] **PAM-201** · Onboarding et profil de base : skills en vocabulaire contrôlé, `SkillAlias`, intentions (§6.1) `[démo]`
- [x] **PAM-202** · Import niveau 1 : liste des repos via le token bot, import des métadonnées, README, issues, PRs ; rafraîchissement toutes les 15 min avec ETag (§5.4) `[démo]`
- [x] **PAM-203** · Import niveau 2 : `POST/api/github/installation/confirm` avec les trois contrôles, passage automatique en live (§5.4)
- [x] **PAM-204** · Webhooks : HMAC sur le corps brut, `WebhookDelivery` comme file persistante, worker, reprise au démarrage, nouveaux essais (§5.5)
- [x] **PAM-205** · Traitement des événements `pull_request`, `pull_request_review`, `issues`, `issue_comment`, `release`, `installation*`, `workflow_run`, `check_run`, `status` → tables (dont `CiRun`) + entries (§5.5, §6.8, §14.2)
- [x] **PAM-206** · Resynchronisation horaire des projets actifs (§5.6)
- [x] **PAM-207** · Demande d'aide : création, bouton « Request Review » depuis une PR (§7.1) `[démo]`
- [x] **PAM-208** · Cycle de vie complet : acceptation atomique, désistement, libération, réouverture, expirations et relances (§7.2)
- [x] **PAM-209** · Matching SQL : score, raisons, vagues de 5, place « nouveau profil », plafonds par jour (§7.3) `[démo]`
- [x] **PAM-210** · Notifications : table, centre, toast temps réel, préférences (§7.4) `[démo]`
- [x] **PAM-211** · Vérification d'une review : les 5 conditions → `review_submitted` (§7.5)
- [x] **PAM-212** · Confirmation du demandeur → `REVIEW_HELP_CONFIRMED` avec les `fields` figés (§8.3) `[démo]`
- [x] **PAM-213** · Évaluateur de badges : `BadgeProgress`, anti-abus, diversité par badge (§8.2, §8.4)
- [x] **PAM-214** · Tests : webhooks, cycle de vie, acceptation simultanée, contrôles d'installation, anti-abus, matching, `trigger` (§12.8)
- [x] **PAM-223** · Préférences de matching, suite : filtres par skills, projets et communautés (§7.4) — @niangoos
- [x] **PAM-215** · Écran Onboarding sur données fictives : 5 étapes avec progression (profil, skills, intentions, matching, import) (§6.1) — @niangoos
- [x] **PAM-216** · Écrans Aide sur données fictives : liste (Pour moi, Mes demandes, Acceptées par moi, Demandes des projets), nouvelle demande, détail avec frise du cycle de vie et matching (§7.1 – §7.3) `[démo]` — @niangoos
- [x] **PAM-217** · Écran Notifications sur données fictives : centre par catégories, actions directes, toast « Ce projet a besoin de toi » (§7.4) `[démo]` — @niangoos
- [x] **PAM-218** · Boucle de démo jouable de bout en bout (QA du 10 oct.) : la demande d'Abdou passe en « Review soumise » et le demandeur peut confirmer l'aide depuis la page ; « Pour toi » reçoit les demandes qui correspondent ; notifications triées par date et menant à l'objet exact (PR, demande) ; le rail « PRs à relire » exclut ses propres PRs et ouvre la PR (§7.2, §7.4, §8.3, §18) `[démo]` — @Mirak29
- [x] **PAM-219** · Matching fictif crédible (QA du 10 oct.) : scores calculés avec la formule du §7.3 et des raisons qui l'expliquent, sans proximité inventée entre skills ; liste des notifiés triée par score ; un développeur notifié ne voit pas les scores des autres ; « Sur quoi travailler » applique le seuil des réglages (§7.3, §10.3) `[démo]` — @Mirak29
- [x] **PAM-220** · Demande d'aide : formulaire et cycle de vie (QA du 10 oct.) : toutes les erreurs affichées en une fois ; choisir une PR pré-remplit la demande comme `?pr=81` ; « Se désister » demande confirmation et retire « Accepter » ; après acceptation, un lien mène vers le demandeur et le canal `#aide` du projet (§7.1, §7.2) — @Mirak29
- [x] **PAM-222** · Boucle d'aide, retours QA 2 (`docs/qa/2026-10-10`) : fil de la demande entre demandeur et aidant à la place du lien vers `#aide` (QA-01) ; une review détectée met aussi à jour la PR, le Pulse, `#suivi` et l'activité (QA-02) ; une demande dont on s'est désisté sort des recommandations (QA-08) (§7.2, §18) `[démo]` — @Mirak29
- [x] **PAM-221** · Onboarding (QA du 10 oct.) : liste complète des pays africains avec « Autre », étape courante dans l'URL, après connexion retour à la page d'origine si l'utilisateur n'est pas nouveau (§6.1) — @Mirak29

**Critères d'acceptation (§4)**

- [ ] Import niveau 1 en 3 clics
- [ ] Une review GitHub réelle fait passer la demande en `review_submitted` en moins de 10 s
- [x] Un webhook reçu pendant un redémarrage est traité après la reprise
- [x] Deux acceptations simultanées n'en retiennent qu'une
- [x] La confirmation met à jour le badge du profil sans rafraîchir

## Bloc 3 — Vitrines (J6 – J7 · 12 – 13 oct.)

Responsable : _à répartir_

- [x] **PAM-301** · Profil à une seule adresse `/@login` : vue publique sans connexion (passeport), vue complète connecté, une colonne ; hero, contributions réelles, stats, chaque chiffre mène à ses preuves (§9.1) `[démo]`
- [x] **PAM-302** · Personnalisation : cover, accent, thèmes (Clair, Sombre, Terminal, Cyber), ordre des sections (§9.2) — @niangoos
- [x] **PAM-303** · Réputation par dimensions avec preuves, mentions « vérifié par GitHub » / « donnée de démonstration » (§8.1, §14) `[démo]`
- [x] **PAM-304** · ~~Developer Passport~~ — fusionnée dans PAM-301 : le passeport est la vue publique du profil
- [ ] **PAM-305** · Share Card + `GET/api/user/card` + injection des balises OG + `sitemap.xml` (§17.1, §17.2) `[démo]`
- [x] **PAM-306** · Pulse déterministe (§6.4) `[démo]` — @niangoos
- [x] **PAM-307** · Résumé IA du Pulse : tâche de fond, `ProjectSummary`, entry `PULSE_READY` (§6.4, §11) `[démo]` — @Mirak29
- [ ] **PAM-308** · Project DNA, Health, Story (§6.5)
- [x] **PAM-309** · Collaboration Map (globe aux couleurs de Pamoja, arcs vers les pays reliés, pays du profil exclu des pays reliés, gestes au doigt séparés du défilement, les personnes de chaque pays) et Collaboration Graph (étoile qui tient des milliers de liens : lieu mis en avant, panneau par lieu et par pages) (§9.3, §12.7) `[démo]` — @Mirak29
- [x] **PAM-310** · Extraction IA des skills et besoins à l'import, et description de projet proposée (§11) — @Mirak29
- [x] **PAM-311** · Embeddings et critère de proximité sémantique du matching (§7.3, §11) — @Mirak29
- [x] **PAM-540** · Coût de l'IA : plafond de tokens par appel, réflexion minimale, budget quotidien de Meta, consommation dans les logs (§11) — @Mirak29
- [x] **PAM-312** · ~~Figures isométriques maison~~ — abandonnée : pas d'illustration décorative, le système isométrique encode les objets (voir journal)
- [x] **PAM-313** · Écran Profil `/@login` sur données fictives : vue publique et vue connectée, stats, réputation, badges, preuves, Collaboration Map, carte de partage, proposer une collaboration (§9) `[démo]` — @niangoos
- [x] **PAM-314** · Écran Modifier le profil sur données fictives : thème, accent, sections, aperçu en direct (§9.2) — @niangoos
- [x] **PAM-315** · Profil, passeport et partage (QA du 10 oct.) : chaque preuve mène à la PR sur GitHub ; mêmes chiffres partout (aides confirmées, Entraide, reviews du badge) ; les stats nulles ne sont pas mises en avant sur le passeport ni la carte ; « Copier le lien » dans le partage ; une proposition de collaboration demande un message, et la PR quand on propose une review ; sur mobile, le nom passe avant les actions (§7.6, §9.1, §17.1) `[démo]` — @Mirak29
- [x] **PAM-316** · Vitrine du profil : badges en médaillons façon succès GitHub (teinte métal par niveau, prochain palier mis en avant, badges à découvrir), réputation en colonnes isométriques, Collaboration Map en globe manipulable, Collaboration Graph en étoile à deux niveaux, projets en avant (projets puis personnes, panneau Réseau de travail, période ; classement sur mobile), badge Cross-border aligné sur les pays de la carte, profil de démo chargé (Wanjiru) (§8.1, §8.2, §9.3, §12.7) `[démo]` — @niangoos

**Critères d'acceptation (§4)**

- [ ] Un lien `/@username` collé dans WhatsApp et LinkedIn affiche l'aperçu avec la Share Card
- [x] Chaque chiffre du profil mène à ses preuves
- [ ] Le Pulse s'affiche même IA coupée

## Bloc 4 — Gestion de projet (J8 · 14 oct.)

Responsable : _à répartir_

- [x] **PAM-401** · Page projet complète : en-tête, onglets, galerie, vidéo de démo (§6.3) `[démo]` — `GET/api/project` lit un projet public (ou privé pour un membre) par son slug, et la page d'un projet importé par quelqu'un d'autre le charge depuis l'API ; onglets board, roadmap et needs couverts par PAM-404, 405, 402 — @niangoos
- [ ] **PAM-402** · Needs et « People who could help » (§6.6)
- [x] **PAM-403** · Join project : candidatures, acceptation depuis la notification, rôles (§3, §6.6) — @niangoos ; reste : changer le rôle d'un membre (`POST/api/project/member/role`, §3)
- [x] **PAM-404** · Board : 5 colonnes, rang fractionnaire, synchro GitHub → board, PR mergée → Done (§6.7) — @niangoos
- [ ] **PAM-405** · Roadmap et milestones (§6.7)
- [x] **PAM-406** · Canaux du projet : `#général`, `#aide`, `#annonces` imposés, messages, fils, réactions, images, vidéos intégrées, droits d'écriture et de lecture par canal (§6.8) — @niangoos
- [x] **PAM-407** · Présence en mémoire, indexée par connexion SSE (§13.6) — `api/presence.ts` — @Mirak29
- [ ] **PAM-408** · Collaboration Requests depuis un profil (§7.6)
- [x] **PAM-409** · Upload d'images : redimensionnement dans le navigateur, `POST/api/media/upload`, table `Media`, nettoyage à 24 h (§17.3)
- [x] **PAM-410** · Vidéos intégrées par lien : oEmbed, miniature puis lecteur au clic, `frame-src` (§17.3) ; demande d'aide et vidéo de démo du projet, les posts avec PAM-427 — @niangoos
- [x] **PAM-411** · Canal `#suivi` : alertes PR, review, merge, CI en échec / réparée, PR sans review depuis 2 jours, pushes regroupés ; boutons « Demander de l'aide » et « Demander une review » ; fils sous une alerte (§6.8, §13.3) `[démo]` — @niangoos
- [x] **PAM-412** · Non lus et notifications par canal (`ChannelState`), « seulement mes PRs » par défaut sur `#suivi` (§6.8) — @niangoos
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
- [x] **PAM-424** · Projet sans données et provenance, retours QA 2 : l'événement de synchro de l'Accueil garde son projet (QA-03) ; Pulse sans historique inventé, langages réels du repo, résumé indisponible au lieu d'un chargement sans fin (QA-04, QA-05) ; pas de faux lien GitHub sans repo et une action pour le lier (QA-06) ; non-lus des canaux mémorisés et sans ses propres messages (QA-07) ; les actions simulées sont marquées Démo, jamais « Vérifié par GitHub » (QA-10) (§6.3, §6.4, §6.8, §12.7) — @Mirak29
- [x] **PAM-425** · Galerie du projet : ajout de captures (redimensionnées dans le navigateur), ordre, suppression, visionneuse, `POST/api/project/gallery` réservé au propriétaire et aux mainteneurs (§6.3, §17.3) — @niangoos
- [x] **PAM-426** · Médias partout, le kit : sélecteur (ordinateur, glisser-déposer, collage), aperçus, ordre, visionneuse ; captures d'une demande d'aide et photo de couverture de bout en bout ; la galerie du projet passe sur le kit (§9.2, §17.3) — @niangoos
- [x] **PAM-427** · Posts enregistrés avec leurs images et leur vidéo : `POST/api/post/create`, `GET/api/posts`, rédaction de l'Accueil et dialogue « Nouveau post » branchés, images et vidéo affichées dans le fil et sur la page du post ; réponses, réactions et onglets restent à PAM-501 (§10.1, §17.3) — @niangoos
- [x] **PAM-428** · Messages de canal enregistrés avec leur image : `POST/api/project/message/create`, `GET/api/project/messages`, droits d'écriture et de lecture par canal, image servie aux seuls lecteurs du canal, vidéo intégrée depuis le premier lien du message ; fils, réactions et temps réel restent à PAM-406 (§6.8, §17.3) — @niangoos
- [x] **PAM-429** · Médias de démo : captures dessinées pour les projets de démo (`web/assets/mocks`, copiées dans `dist`), posts du fil avec images et vidéos YouTube, captures des demandes d'aide, une capture dans `#général` d'OpenPay Africa (§12.7, §17.3) — @niangoos
- [x] **PAM-430** · Vidéo d'un post par le lien collé dans son texte : aperçu dans la rédaction de l'Accueil et le dialogue « Nouveau post », message clair pour un fichier vidéo (§17.3) — @niangoos
- [x] **PAM-431** · Invitation à activer CodeRabbit dans l'aperçu de l'import, par un lien vers sa page d'installation, sans rien imposer ; les reviews des bots ne sont plus enregistrées (§5.4, §7.5) — @Mirak29
- [x] **PAM-423** · Alerte « CI en échec » dans `#suivi` sur données fictives, avec « Demander de l'aide » qui pré-remplit une demande Debug (§6.8, §18) `[démo]` — @Mirak29

**Critères d'acceptation (§4)**

- [ ] Deux utilisateurs déplacent des cartes en même temps sans perte
- [ ] Une PR mergée déplace sa carte en Done
- [ ] Une candidature s'accepte depuis la notification
- [ ] Une CI en échec apparaît dans `#suivi` et devient une demande d'aide en un clic

## Bloc 5 — Social et découverte (J9 · 15 oct.)

Responsable : _à répartir_

- [ ] **PAM-501** · Accueil en fil social : rédaction (texte, code, images, communauté, type), onglets Pour toi / Abonnements / Communautés / Questions, événements GitHub et carte « Ce projet a besoin de toi » insérés, réaction J'aime (seule réaction, voir PAM-539), bookmarks, partage par lien, pagination par curseur (§6.2, §10.1)
- [ ] **PAM-502** · Communautés, dont les communautés de pays créées par le seed (§10.2) — fait : rejoindre et quitter sur le serveur, l'adhésion relue à chaque session ; reste : créer une communauté et lire la liste (`GET/api/communities`), encore dans la page — @niangoos
- [x] **PAM-503** · Follow : utilisateurs, projets, communautés (§14.1) — @niangoos
- [ ] **PAM-504** · Colonne de droite de l'Accueil : demandes d'aide pour toi, PRs à relire, avec qui construire, projets qui cherchent des contributeurs (§6.2)
- [ ] **PAM-505** · Explore : développeurs et projets, avec filtres (§10.3)
- [x] **PAM-506** · « What can I work on? » calculé par le serveur, sans IA : demandes qui correspondent, besoins des autres projets, `good first issue`, chacun avec sa correspondance sur 100 (§10.3, §11) — @Mirak29
- [x] **PAM-533** · Premier pas pour qui n'a jamais contribué : une issue choisie (`good first issue` ou `documentation`), les étapes, un mentor à un clic ; frameworks les plus utilisés ajoutés au vocabulaire (Tailwind CSS, Next.js, Laravel, Angular, Spring, Express, NestJS, React Native) ; d'après State of Dev Sénégal 2026 (§6.1, §10.3) — @Mirak29
- [x] **PAM-532** · Assistant sur Ollama Cloud : questions du genre « Sur quoi puis-je travailler aujourd'hui ? », réponses qui ne citent que la liste de PAM-506, vérifiées par le serveur, avec repli sans IA (§11) — @Mirak29
- [x] **PAM-539** · Fil et profil comme un réseau social : une seule réaction J'aime (« Utile » et « Merci » retirés), « Pour toi » classé pour le lecteur (personnes suivies, échanges, communautés, projets, compétences, fraîcheur) avec la raison de chaque post, activité du profil en onglets Posts / Réponses / Aide, `GET/api/posts?author=` (§6.2, §9.1, §10.1) — @Mirak29
- [x] **PAM-538** · Navigation au doigt : un défilement n'ouvre plus les cartes (le lien de l'app navigue au tap sur écran tactile), toute la carte d'une communauté s'ouvre, un bouton retour sur les pages hors du menu (§12.7) — @Mirak29
- [x] **PAM-537** · Démo prête à déployer chez Systalink : bundle allégé (pages lues à leur première visite, anglais à la demande), image Docker minimale publiée par GitHub, Caddy, docker-compose, sauvegardes horaires gardées 7 jours, logs JSON en production (§12.7, §17.4, §17.5) — @Mirak29
- [x] **PAM-536** · Mécanismes de réseau social : chaque page principale garde sa place, les listes gardent ce qu'elles ont chargé, l'onglet actif touché à nouveau remonte et relit, posts en direct avec « ↑ N nouveaux posts », brouillons gardés, compteur dans l'onglet du navigateur (§10.1, §12.7) — @Mirak29
- [x] **PAM-535** · Passe de fluidité sur toute l'interface : défilement qui suit la navigation, contenu centré sur grand écran, place pour l'Assistant, onglets et barre du bas sur mobile, filtres et rédaction repliés, écrans vides avec une action (§12.7) — @Mirak29
- [x] **PAM-534** · Assistant repensé : panneau disponible sur toutes les pages, conversation gardée, contexte élargi (ce qui t'attend, la page ouverte, mode d'emploi), cartes et actions, point d'ouverture sans IA (§11, §14.4) — @Mirak29
- [x] **PAM-507** · Meilisearch : index, worker de synchro depuis les entries, réindexation nocturne, repli `LIKE` (§10.4) — @Mirak29
- [ ] **PAM-508** · Signalement et modération : file, actions, historique, masquage à 3 signalements ; un contenu masqué reste visible pour son auteur, avec un bandeau (§10.5)
- [ ] **PAM-509** · Digest quotidien par email (§7.4)
- [ ] **PAM-510** · Limite de débit sur les routes d'écriture (§16)
- [ ] **PAM-511** · Conditions d'utilisation et politique de confidentialité (§20)
- [ ] **PAM-512** · Réponses imbriquées (une réponse est un post), dépliage à la demande, réponse acceptée, republications (§10.1, §14.5) — réponse, réponse acceptée (preuve d'Entraide) et lecture d'un fil enregistrées sur le serveur (`POST/api/post/reply`, `POST/api/post/accept`, `GET/api/post/thread`) ; republication reportée avec son rendu dans le fil (exception §4, voir suivi) — @niangoos
- [x] **PAM-522** · Messages directs : conversations à deux depuis le profil, demande de message pour un inconnu (accepter, refuser), blocage, signalement, non lus, temps réel, Markdown réduit (§10.6)
- [x] **PAM-523** · Messages directs : modifier et supprimer son message (« modifié », « Message supprimé ») (§10.6)
- [x] **PAM-524** · Messages directs : « en train d'écrire… » et statut en ligne, par la présence (§10.6, §13.6) — avec PAM-407
- [x] **PAM-525** · Messages directs : répondre à un message précis et réactions (§10.6)
- [x] **PAM-526** · Messages directs : séparateur « Nouveaux messages », marquer comme non lu, sourdine, archiver (§10.6)
- [x] **PAM-527** · Messages directs : recherche dans ses conversations (§10.6)
- [x] **PAM-528** · Messages directs : images et fichiers, aperçu des liens (§10.6, §17.3) — après PAM-409
- [x] **PAM-529** · Longues listes, corrections rapides : 20 réponses de premier niveau sur la page d'un post, colonnes du board à hauteur d'écran, notifications et demandes d'aide par curseur au lieu d'une coupe silencieuse à 100 et 200 (§12.7)
- [x] **PAM-530** · Brique `InfiniteList` : chargement par lots au défilement avec bouton de secours, pour le fil, Explore, les communautés, les notifications et les demandes d'aide (§12.7)
- [x] **PAM-531** · Charge du serveur : index qui suivent les requêtes par lots, conversations et projets par lots avec comptes exacts, temps réel qui relit le minimum, compression, cache des fichiers (§12.7, §17.4)
- [x] **PAM-513** · Écran Accueil sur données fictives : rédaction, onglets du fil, insertions, colonne de droite (§6.2, §10.1) — @niangoos
- [x] **PAM-514** · Écrans Explorer (développeurs, projets, sur quoi travailler) et résultats de recherche sur données fictives (§10.3, §10.4) — @niangoos
- [x] **PAM-515** · Écrans Communautés, communauté et post sur données fictives : réponses, réponse acceptée, nouveau post, nouvelle communauté (§10.1, §10.2) — @niangoos
- [x] **PAM-516** · Écrans Réglages et Modération sur données fictives, dialogue Signaler (§7.4, §10.5) — @niangoos
- [x] **PAM-521** · Nouveau post, retour QA 2 : même audience par défaut que l'Accueil (« Sans communauté »), communauté préremplie seulement depuis sa page (QA-11) (§10.1) — @Mirak29
- [x] **PAM-517** · Communautés (QA du 10 oct.) : quitter demande confirmation (le bouton « Membre » ne fait plus quitter en un clic) ; une communauté au nom déjà pris n'est pas créée et renvoie vers l'existante ; le nombre de membres affichés est expliqué (§10.2) — @Mirak29
- [x] **PAM-518** · Accueil et posts (QA du 10 oct.) : rédaction sans communauté par défaut, focus rendu après publication ; « Commenter » pose le focus dans la réponse ; une réponse à une réponse indique à qui elle répond ; page des posts enregistrés (§6.2, §10.1) — @Mirak29
- [x] **PAM-519** · Palette de recherche (QA du 10 oct.) : aucune frappe perdue à l'ouverture, navigation aux flèches avec résultat actif, Entrée ouvre le résultat actif (§10.4) — @Mirak29
- [x] **PAM-520** · Réglages (QA du 10 oct.) : l'export télécharge vraiment le fichier JSON, « Réinitialiser la démo » demande confirmation (§7.4) — @Mirak29

**Critères d'acceptation (§4)**

- [ ] Recherche tolérante aux fautes (« postgress » trouve PostgreSQL)
- [ ] La recherche reste utilisable Meilisearch arrêté
- [ ] Une réponse à une réponse s'affiche imbriquée et se déplie à la demande ; une republication apparaît dans le fil des abonnés
- [ ] Un contenu signalé puis masqué disparaît pour tous

## Gel — Préparation de la démo (J10 · 16 oct.)

Plus aucune nouvelle fonctionnalité.

- [x] **PAM-901** · Seed final : profils de plusieurs pays, Moussa avec 14 reviews en `source = demo` (3 demandeurs, 2 projets) (§18.1) — @niangoos
- [ ] **PAM-902** · Repo public OpenPay Africa sous le compte perso d'Abdou, app installée, webhook testé vers la prod (§18.1)
- [ ] **PAM-903** · Deux vrais comptes GitHub prêts ; PR #81 ouverte par Abdou, sans review (§18.1)
- [ ] **PAM-904** · Pré-calculer les résumés IA et les embeddings du seed (§18.1)
- [ ] **PAM-905** · Test de bout en bout du scénario, sur le modèle de `qa/` de Tournament (§12.8)
- [ ] **PAM-906** · Vérifier en prod : protocole `h2`, notifications instantanées (§20) — fait : `h2` (et `h3`) en prod ; reste : notifications instantanées
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
- 2026-10-10 · Fil de la demande d'aide entre demandeur et aidant accepté, à la place de `#aide` : l'aidant n'entre pas dans le projet (`HelpMessage`) ; retours de la QA 2 découpés en PAM-122, PAM-222, PAM-424, PAM-521 · §7.2, §14.4
- 2026-10-14 · Clés primaires nommées d'après la table (`userId`), comme Tournament ; schéma initial dans `api/schema.ts`, les migrations ne font évoluer qu'une base existante ; `source` sur les lignes racines pour la démo ; `Task.boardColumn` car `column` est un mot réservé SQL · §12.5, §14
- 2026-10-14 · Dates en secondes (`now()` de `@01edu/time`), l'unité réelle de Tournament et des entries, et non en millisecondes ; listener SSE avec membres et abonnés séparés ; `source` et champs figés des preuves en `fields` d'entry ; `userId` d'une entry = le développeur dont elle parle · §8.3, §13.2, §13.3, §14, §14.6
- 2026-10-14 · Session : entry `USER_LOGIN` signée avec `SESSION_SECRET` (pas de mot de passe à saler), 30 jours vérifiés côté serveur ; page de retour `/connexion/github` ; connexion simulée en dev sans GitHub App, jamais en prod · §5.2, §5.3
- 2026-10-14 · Profil pré-rempli depuis GitHub (photo, nom, bio, site, localisation, e-mail principal, langages des repos publics) ; vocabulaire partagé dans `api/vocabulary.ts` ; le développeur connecté devient le `me` des pages, les autres restent fictifs jusqu'à leurs écrans · §5.3, §6.1
- 2026-10-15 · Seed : recrée la base de zéro (rejouable), données des fixtures du web, `githubId` négatifs pour les comptes fictifs, `SEED_GITHUB_IDS` pour relier Abdou et Moussa à leurs vrais comptes · §14, §18.1
- 2026-10-15 · Import niveau 1 en REST conditionnel (pas GraphQL) ; skills proposés depuis langages et topics jusqu'à l'IA (PAM-310) ; migration 002 (README, chiffres, stack, auteurs et branches) ; `api/migrate.ts` remplace `runMigrations`, cassé sous Windows · §5.4, §5.6, §12.5, §14, §15
- 2026-10-15 · Installation : retour sur la Callback URL (la Setup URL est désactivée par l'autorisation pendant l'installation) ; passage auto en live via un JWT de l'app ; repos live relus toutes les heures ; erreurs GitHub en 502/503 ; `GITHUB_APP_SLUG` · §5.1, §5.2, §5.4, §5.6, §15
- 2026-10-15 · `state` de connexion et d'installation signé et daté (et non en mémoire, perdu à chaque redémarrage de `deno task dev`), lié au navigateur par le cookie `oauth_nonce` ; raison du refus affichée · §5.3, §5.4
- 2026-10-15 · GitHub App publique : privée, elle refuse tout compte autre que son propriétaire (404 chez GitHub) · §5.1
- 2026-10-16 · Tunnel de dev : `cloudflared` (pas smee.io, qui réécrit le JSON signé) ; `deno task tunnel` pointe lui-même le webhook de l'app sur le tunnel ; une app réservée au dev quand la prod sera en ligne · §5.6
- 2026-10-16 · Événements GitHub : le compte de commentaires d'une review vient de son texte en attendant PAM-211 ; check runs de GitHub Actions ignorés (`workflow_run` les couvre) ; alertes CI sur la branche principale et les PRs ouvertes seulement · §5.5, §6.8
- 2026-10-16 · Liens externes ouverts dans un nouvel onglet (`noopener noreferrer`) par une règle unique de l'app ; tableau des risques corrigé (`state` signé, `sql` qui recopie ses valeurs) · §16
- 2026-10-16 · Demande d'aide : skills d'une PR lus à la synchro et gardés avec son commit de tête (migration 003) ; une seule demande en cours par PR ; vidéo en lien web ; délais dans `api/help-rules.ts` ; la réponse simulée d'un aidant disparaît, l'acceptation réelle vient avec PAM-208 · §7.1, §7.2, §14.2, §14.4
- 2026-10-22 · Interface aussi en anglais (PAM-124) : le français reste la langue du code et la clé de chaque traduction ; une phrase avec des valeurs s'écrit ``t`…` `` ; le contenu écrit par les développeurs n'est jamais traduit · §2
- 2026-10-22 · Langue lue par la seule racine de l'app, reconstruite au changement de langue (QA-16 : un composant qui lit un signal ne se redessine plus avec son parent) ; section « Contributions » du profil au lieu de « Contributions réelles » du prototype, chaque preuve gardant sa provenance (QA-15) · §2, §9
- 2026-10-22 · Cycle de vie d'une demande : nouvelles entries `HELP_REQUEST_CANCELLED`, `HELP_REQUEST_DELIVERED`, `HELP_REQUEST_CLOSED`, `HELP_MESSAGE_CREATED` ; l'acceptation prévient aussi les autres matchés ; « pas utile » ferme la demande dès PAM-208, la confirmation reste à PAM-212 ; migration 004 (dates des relances) · §7.2, §13.3, §14.4, §15
- 2026-10-22 · Matching : poids des sources de skills 100/85/70 %, disponibilité 7 + 3 si actif, seuil par défaut 50, place « nouveau profil » sur la moitié des skills au moins ; types d'aide acceptés dans `Profile.matchingFilters` (seedés depuis les fixtures) ; migration 005 (`lastWaveAt`) ; la proximité sémantique vaut 0 jusqu'à PAM-311 · §7.3, §14.4, §15
- 2026-10-22 · Notifications : le serveur garde le type et les faits, la page écrit la phrase dans sa langue ; une notification par étape d'une demande pour l'autre côté ; préférences enregistrées dans `Profile.matchingFilters` (score minimum, types d'aide), filtres par skills, projets et communautés reportés en PAM-223 · §7.4
- 2026-10-22 · Vérification d'une review : les commentaires de ligne d'une review « commented » sans texte sont lus après le webhook (fin du compte provisoire de PAM-205) ; la resynchronisation relit les reviews des PRs à aide acceptée ; `deliveredAt` = heure de la détection · §5.5, §7.5
- 2026-10-22 · Confirmation : `REVIEW_HELP_CONFIRMED` (`github`) pour une review, `HELP_CONFIRMED` (`platform`) pour une aide livrée ; plafond par paire décidé à la confirmation (`pair_limit`) ; skills prouvés en `platform_activity` pour l'aidant · §7.3, §8.3, §8.4
- 2026-10-22 · Badges : Builder = projet avec release et au moins un contributeur hors propriétaire ; Maintainer = plus longue suite de mois d'activité GitHub ; Cross-border = pays des deux côtés d'une aide confirmée, le sien exclu ; évaluation après chaque preuve et à la connexion · §8.2, §8.4
- 2026-10-22 · Réputation : preuves par dimension lues par `GET/api/user/proofs` (éligibles seulement, membre actif = non Observateur) ; trois mentions de source : « vérifié par GitHub », « donnée de démonstration », « confirmée sur Pamoja » ; les personnes de la démo gardent leurs preuves des fixtures jusqu'au seed des preuves (PAM-901) · §8.1, §8.3, §15
- 2026-10-22 · Sécurité : les outils de dev de `@01edu/api` (`POST/api/sql/execute`, métriques) ne sont jamais servis (404) ; le serveur de dev écoute sur `127.0.0.1` ; le tunnel ne laisse passer que `POST/api/github/webhook` · §16
- 2026-10-22 · Profil public : `GET/api/user` sans email ni réglages de matching, projets publics hors Observateur, activité d'aide pour un visiteur connecté seulement ; login de l'adresse sans casse ; chaque chiffre du profil ouvre ses preuves · §9.1, §15
- 2026-10-22 · Contenu des membres : tailles maximales par champ (`api/limits.ts`, proches de LinkedIn), vérifiées par le serveur et décomptées par la page ; Markdown réduit lu en éléments (jamais en HTML), liens `http`/`https` seulement, mentions et hashtags cliquables ; long post replié ; texte d'un membre jamais traduit automatiquement · §10.1, §16
- 2026-10-22 · Logins : un login par compte (index unique sans casse) ; un compte de démo relié à un vrai compte garde son login de démo, le login GitHub gardé à part (`githubLogin`, migration 006) ; la connexion simulée entre dans l'Abdou seedé · §14
- 2026-10-23 · Rafraîchissement GitHub : le serveur cherche chaque minute, dès son démarrage, les repos dus (15 min après leur dernière lecture, 1 h pour un repo live) au lieu d'un minuteur de 15 min qui repartait à zéro à chaque redémarrage · §5.4, §5.6
- 2026-10-23 · Webhooks manqués : à l'ouverture du tunnel, les livraisons des 3 derniers jours jamais arrivées sont renvoyées, de la plus ancienne à la plus récente · §5.6
- 2026-10-23 · Temps réel : chaque type d'entry a son audience écrite dans un test qui échoue pour un type nouveau sans audience ; `PROJECT_MEMBER_JOINED` atteint aussi le nouveau membre, `HELP_REQUEST_ACCEPTED` aussi l'aidant · §12.8, §13.3
- 2026-10-23 · Messages directs ajoutés au périmètre : conversations à deux ; un inconnu passe par une demande de message (un seul message avant acceptation, refus jamais annoncé) ; blocage dans les deux sens, jamais annoncé ; pas de notification, un compteur à part comme sur LinkedIn · §4, §10.6, §13.3, §14.5, §15, §16
- 2026-10-23 · Limites des messages directs, comptées en base (tenues après un redémarrage) : 10 demandes à des inconnus par 24 h, 20 messages par minute et 1 000 par jour, 30 signalements par jour ; 429 avec le délai ; la suite de la messagerie découpée en PAM-523 à PAM-528 · §10.6, §16
- 2026-10-23 · Messages directs à la manière de Discord : modifier et supprimer son message (seul l'auteur ; « Message supprimé » garde la place, sans texte ni réactions), répondre à un message de la même conversation, six réactions (60 par minute), séparateur « Nouveaux messages », non lu à partir d'un message reçu, sourdine hors du compteur du menu, archives jusqu'au prochain message, recherche de 2 à 100 caractères (30 résultats, 30 recherches par minute) · §10.6
- 2026-10-23 · Présence des messages directs, en mémoire, jamais enregistrée : en ligne tant qu'un onglet garde le flux SSE ouvert, hors ligne 10 s après le dernier ; vue seulement par l'autre participant d'une conversation acceptée sans blocage ; « écrit… » signalé au plus toutes les 3 s, sans le texte ; événements SSE nommés `presence` et `typing`, base réutilisable pour PAM-407 · §10.6, §13.6
- 2026-10-23 · Upload d'images (PAM-409) : redimensionnement à 2 000 px et réencodage dans le navigateur, `POST/api/media/upload` sans input, type lu sur les octets, 2 Mo (PDF 5 Mo, messages directs seulement), 20 par heure, fichiers sur disque sous un nom aléatoire (`MEDIA_DIR`), servis par `GET/api/media` à qui peut les voir, supprimés après 24 h sans rattachement · §17.3
- 2026-10-23 · Messages directs : 4 images ou PDF par message, collage d'une capture, fichiers lisibles par les deux participants seulement et supprimés avec le message ; aperçu du premier lien lu par le serveur (titre, description, site, sans image) avec des garde-fous contre le SSRF ; une demande reste du texte · §10.6, §16
- 2026-10-23 · Vitrine du profil (PAM-316) : badges en médaillons avec teintes métal par niveau, seule exception à l'indigo ; réputation en colonnes ; Collaboration Map en globe avec les terres (Natural Earth 1:110m), exception à « pas d'illustration » ; Collaboration Graph en étoile à deux niveaux (projets, puis les personnes qui y ont travaillé), limitée aux 5 lieux et 14 personnes les plus liés pour rester lisible ; le reste du réseau dans un panneau ; les fixtures comptent les pays du badge Cross-border comme la carte, dans les deux sens · §8.1, §8.2, §9.3, §12.7
- 2026-10-24 · Suites de la revue de code : un refus de demande de message n'est envoyé en temps réel qu'à celui qui refuse ; seule une aide livrée (review soumise ou aide livrée) ouvre une conversation directe, plus la simple acceptation ; 10 demandes d'aide par 24 h, 20 messages par minute et 1 000 par jour dans le fil d'une demande, 10 imports par heure, comptés en base ; un envoi de fichier est lu avec sa limite même sans `Content-Length` ; le serveur de prod refuse de démarrer sans `APP_ENV=prod` (`deno task prod:local` pour l'essayer) ; sur téléphone, thème et langue passent dans le menu du compte · §5.3, §10.6, §12.2, §16, §17.3
- 2026-10-24 · Revue de PAM-316 : bundle découpé par esbuild, les terres du globe (53 Ko) chargées au premier globe affiché ; les terres sont coupées à l'horizon et refermées le long du bord, du côté de ce que chaque contour entoure (terre ou lac) ; les preuves générées de la démo ne sont jamais « vérifiées par GitHub » ; le globe zoome en pinçant ou avec Ctrl + molette, la molette seule faisant défiler la page · §8.3, §9.3, §12.2
- 2026-10-24 · Adresses en anglais (PAM-125) : chemins et paramètres sans français, le texte de l'interface restant en français ; anciennes adresses remplacées à l'ouverture ; profils (`/@login`) et slugs gardés lisibles ; une conversation par un id public aléatoire de 12 caractères (migration 010), jamais son numéro ; un premier message par l'id GitHub de la personne, jamais le login ; retour GitHub sur `/login/github`, `/connexion/github` redirigé le temps de changer les apps · §5.3, §10.6, §12.2, §14.5, §16
- 2026-10-25 · Test de charge rejouable : `deno task stress` remplit la base de dev après le seed (refusé en production), `?stress` ajoute des milliers de fixtures dans le bundle de dev seulement ; le contexte des agents de code (`AGENTS.md`, `.claude/`) reste hors du repo, comme `CLAUDE.md` · §14
- 2026-10-26 · Galerie du projet (PAM-425) : la page enregistre toute la galerie d'un coup, dans l'ordre ; une capture retirée est supprimée avec son fichier ; 8 au plus, propriétaire et mainteneurs ; la vidéo de démo reste à PAM-410 · §6.3, §17.3
- 2026-10-26 · Médias partout (PAM-426) : un kit commun d'envoi et de visionneuse pour toutes les images ; les captures d'une demande d'aide sont rattachées à sa création ; une photo de couverture uploadée est la couverture du profil, gardée sur le serveur, les couvertures prédéfinies restant dans la page jusqu'à PAM-302 ; ensuite PAM-410 (vidéos par lien) puis PAM-427 (posts enregistrés avec leurs images) · §9.2, §17.3
- 2026-10-26 · Vidéos par lien (PAM-410) : seul le lien est gardé ; titre et miniature lus une fois par oEmbed, miniature servie par Pamoja pour qu'aucun fournisseur ne soit contacté avant la lecture ; lecteur construit depuis l'identifiant ; `frame-src` limité aux trois lecteurs sur les pages ; vidéo de démo d'un projet en base (migration 011) · §6.3, §16, §17.3
- 2026-10-26 · Posts enregistrés (PAM-427) : une première partie de PAM-501, pour que les images et la vidéo d'un post soient vraies et visibles de tous ; la vitrine de démo de Kofi perd ses fausses images ; un auteur réel, absent des fixtures, s'affiche par son nom · §10.1, §17.3
- 2026-10-26 · Messages de canal enregistrés (PAM-428) : une première partie de PAM-406, pour que l'image d'un message soit vraie ; la vidéo d'un message vient du premier lien de son texte, sans colonne en plus ; un projet inconnu du serveur garde ses messages dans la page · §6.8, §17.3
- 2026-10-26 · Médias de démo (PAM-429) : des captures dessinées pour les projets fictifs, servies avec les pages et jamais uploadées, plutôt que des photos d'ailleurs ; les vidéos sont de vraies vidéos publiques sur le sujet du post · §17.3
- 2026-10-26 · Vidéo d'un post par le lien de son texte (PAM-430) : un lien collé suffit, comme dans les canaux, sans champ à trouver ; un fichier vidéo n'est jamais uploadé et l'interface le dit · §17.3
- 2026-10-28 · Filtres du matching (PAM-223) : « seulement » plutôt que « sauf » ou un bonus de score ; un filtre vide laisse tout passer ; une demande sans projet ne passe pas un filtre de projets ; les types d'aide restent un bonus de score · §7.4
- 2026-10-28 · Markdown sécurisé (PAM-118) : pas de sanitizer HTML, puisque le rendu ne lit jamais de HTML ; une seule règle pour les liens écrits par un membre (`http`/`https` seulement, nouvel onglet, `noopener noreferrer nofollow ugc`), appliquée au Markdown, au site du profil, au lien vidéo et à l'aperçu de lien ; le résumé d'un README importé passe par le même Markdown · §16
- 2026-10-28 · Pulse déterministe (PAM-306) : six comptes en SQL sur les données GitHub synchronisées et les entries ; une issue fermée compte par sa dernière mise à jour (pas de date de fermeture gardée) ; « depuis la dernière visite » prévu par le paramètre `since`, la page montre les 7 derniers jours ; Health, DNA et Story restent à PAM-308 · §6.4
- 2026-10-28 · Non-lus par canal (PAM-412) : le serveur garde l'heure de dernière lecture et le réglage, la page compte les messages des autres après cette heure ; le réglage règle aussi le compteur (Rien, Mentions, Seulement mes PRs) en attendant les notifications de canal · §6.8
- 2026-10-28 · Canal #suivi (PAM-411) : lu dans les entries GitHub, sans table propre ; le serveur donne les faits et la page écrit la phrase ; réponses en fil sous une alerte, par les membres seulement ; PR sans review signalée une fois, vérifiée toutes les 30 min · §6.8, §13.3
- 2026-10-29 · Fils et réactions des canaux (PAM-406) : un fil sous un message, sur un seul niveau, ouvert aux membres seulement, même sous #annonces ; la seule réaction est « +1 », donnée par tout lecteur du canal ; un +1 n'a pas d'entry et n'est pas diffusé en temps réel · §6.8
- 2026-10-25 · Longues listes : aucune liste affichée en entier ni coupée sans le dire ; lots de 20 par curseur (date ou score et id du dernier élément reçu, jamais un numéro de page) pour les notifications et les demandes d'aide, compteurs de non lues donnés par le serveur ; 20 réponses de premier niveau sur la page d'un post ; colonnes du board à hauteur d'écran · §12.7
- 2026-10-25 · Brique `InfiniteList` (`web/ui/infinite-list.tsx`) : le lot suivant se charge 800 px avant la fin de la liste, « Charger plus » reste en secours (clavier, lecteur d'écran, navigateur sans observateur), la fin est dite ; `Batched` et `useBatches` pour une liste déjà en mémoire, remise au premier lot quand un onglet ou un filtre change · §12.7
- 2026-10-25 · Charge du serveur : index composés (égalité puis tri) vérifiés par `EXPLAIN QUERY PLAN`, `UNION` de lectures d'index au lieu de `OR` ; une liste porte un résumé (comptes exacts, premier lot, résumé du README) et le reste se lit par lots ; compteurs « 9+ » comptés jusqu'à 99 ; le temps réel relit le premier lot, rien dans un onglet caché, avec un délai au hasard pour les événements de projet ; compression par Deno, jamais du flux SSE ; bundle haché gardé un an · §12.7, §17.4
- 2026-10-25 · Retour sur les listes : chaque onglet des notifications lit sa catégorie côté serveur (un onglet filtré par la page enchaînait les lots de toutes les catégories) ; « Charger plus » caché tant qu'il n'a pas le focus, montré seulement si la liste ne peut pas se charger seule ; une liste s'arrête de charger seule après un lot sans ligne nouvelle ; projets d'un profil dans un cadre qui défile · §12.7
- 2026-10-25 · Sections d'une page projet dans des cadres qui défilent, par lots : équipe de l'aperçu, membres, issues, PRs ; le bouton caché d'une liste reste dans son cadre (il rallongeait la page Messages) · §12.7
- 2026-10-25 · Page Projets : « Tes projets » dans un cadre d'environ deux rangées qui défile par lots, « Projets que tu suis » aussi, pour ne plus faire défiler toute la page jusqu'aux projets suivis · §12.7
- 2026-10-25 · Communautés : chaque sorte (technologies, pays, domaines) dans un cadre d'environ deux rangées ; projets et demandes d'aide d'une communauté par lots ; posts et membres d'une communauté restent dans le défilement de la page, comme un fil · §12.7
- 2026-10-25 · Passage de relais du défilement : un cadre arrivé à son bout donne le reste du geste à la page, en douceur et sans perdre de distance ; plus d'`overscroll-contain` sur les cadres ; jamais depuis une fenêtre modale · §12.7
- 2026-11-11 · Relecture des listes : une seule mécanique de lots côté navigateur (une première page relue retire ce qui a disparu, chaque onglet montre jusqu'où ses lots sont allés), un composant ScrollFrame pour les cadres, « good first issue » filtré par le serveur, issues et PRs dans l'ordre du serveur · §12.7
- 2026-11-11 · Import : l'aperçu invite à activer CodeRabbit sur le repo, par un simple lien vers sa page d'installation (Pamoja n'installe rien) ; une review d'un compte `Bot` n'est pas enregistrée, elle ne valide rien et ne sort pas une PR de « en attente de review » · §5.4, §7.5
- 2026-11-11 · « What can I work on? » calculé par le serveur sans IA (PAM-506), correspondance pesée comme le matching ; Assistant sur Ollama Cloud (PAM-532) : le modèle ne fait que rédiger à partir de cette liste, le serveur vérifie ce qu'il cite, rien n'est gardé, 30 questions par jour, repli sur la liste · §10.3, §11
- 2026-11-11 · State of Dev Sénégal 2026 lu (`docs/etudes/`) : 34,8 % veulent contribuer sans savoir par où commencer, d'où un premier pas guidé (une issue, les étapes, un mentor) ; la documentation compte comme contribution ; huit frameworks ajoutés au vocabulaire · §6.1, §10.3
- 2026-11-11 · Assistant repensé (PAM-534) : un panneau ouvert depuis l'en-tête, qui suit la navigation ; conversation gardée côté serveur (60 messages, effaçable) au lieu de « rien n'est gardé » ; le contexte s'élargit à ce qui attend le développeur, à la page ouverte et au mode d'emploi ; réponses avec cartes et actions d'un catalogue fixe · §11, §14.4
- 2026-11-12 · Passe de fluidité (PAM-535) : une nouvelle page s'ouvre en haut et le retour ramène où l'on était ; contenu centré, la page fait place à l'Assistant ; sur mobile, notifications hors de la barre du bas (déjà dans l'en-tête), filtres d'Explorer et rédaction de l'Accueil repliés, onglets qui montrent qu'ils continuent ; plus d'écran vide sans action · §12.7
- 2026-11-12 · Mécanismes de réseau social (PAM-536) : les pages principales gardent leur place même par le menu ; l'onglet actif touché à nouveau remonte et relit ; les posts arrivent en direct pour l'auteur, sa communauté et ses abonnés, et attendent derrière « nouveaux posts » quand on lit plus bas ; brouillons de posts et de messages gardés pour l'onglet ; titre « (n) » · §10.1, §12.7
- 2026-11-12 · Déploiement (PAM-537) : démo chez Systalink sur la formule Développeur (1 cœur, 2 Go, 30 Go) ; chaque page lue à sa première visite et l'anglais à la demande, 175 Ko au démarrage au lieu de 594 Ko ; un binaire sur Alpine, sans root ; sauvegardes faites par le serveur lui-même ; logs en JSON sur la sortie du conteneur, les devtools de 01edu n'étant pas les nôtres · §12.7, §17.4, §17.5
- 2026-11-13 · Navigation au doigt (PAM-538), après des retours sur téléphone : le lien du routeur naviguait dès que le doigt se posait, un défilement ouvrait donc la carte touchée ; le lien de l'app attend le tap au doigt et au stylet, la souris reste immédiate. Cartes de communauté ouvertes en entier ; retour dans la barre du haut, par l'historique ou vers la section · §12.7
- 2026-11-13 · Meilisearch en place (PAM-507) : un conteneur `v1.56.0` sans port ouvert, cinq index lus dans SQLite par les mêmes requêtes que le repli SQL, reconstruits à chaque démarrage puis chaque nuit par échange d'index, synchronisés par les entries toutes les 3 s ; la palette et la page Recherche passent par `GET/api/search`, les posts et demandes de démo restent cherchés dans le navigateur · §10.4, §17.4
- 2026-11-13 · Point sur le TODO, vérifié dans le code et sur la VM : PAM-003, 004, 006, 109, 114 et 407 cochés ; PAM-005, 113, 115 et 906 à moitié faits, ce qui reste est noté sur leur ligne. Les écrans de PAM-401 à 405 et de PAM-501 à 512 existent sur données de démo, mais le serveur n'a pas encore leurs routes : follow, communautés, réactions, favoris, réponses, republications, signalements, board, roadmap, needs, candidatures, listing d'Explore
- 2026-11-14 · Seed des reviews de Moussa (PAM-901) : 14 preuves `REVIEW_HELP_CONFIRMED` en `source = demo`, de quatre demandeurs et deux projets, backdatées ; les skills qu'elles prouvent sont écrits en `platform_activity` comme le fait une confirmation, et les badges sont calculés sans annoncer un déblocage daté du jour · §8, §18.1
- 2026-11-14 · Follow enregistré (PAM-503) : `POST/api/follow` reçoit l'état voulu, jamais une bascule, et `GET/api/follows` donne à la page l'état du serveur à chaque session ; une requête rejouée ou un second onglet ne peut plus désabonner · §15
- 2026-11-14 · Communautés rejointes sur le serveur (PAM-502) : `POST/api/community/join` reçoit l'état voulu (`join`), jamais une bascule, et les communautés rejointes viennent avec le développeur connecté (`GET/api/user/me`) ; la page part du serveur à chaque session · §10.2, §15
- 2026-11-14 · Personnalisation du profil enregistrée (PAM-302) : thème, accent, ordre des sections et projets mis en avant sur le serveur ; un profil jamais ordonné garde toutes ses sections dans l'ordre par défaut · §9.2
- 2026-11-14 · Candidatures (PAM-403) : façons d'aider et disponibilité tirées d'une seule liste (`api/vocabulary.ts`), vérifiées par le serveur, message limité à `LIMITS.note` ; chaque refus porte une raison que la page affiche, au lieu de « serveur injoignable » · §6.6, §16
- 2026-11-14 · Fournisseurs IA (PAM-005) : `api/llm.ts` essaie Meta (`muse-ember-1.0`), puis Gemini (`gemini-3.5-flash`), puis Groq (`gpt-oss-120b`) ; un fournisseur qui échoue est laissé de côté 5 min ; embeddings Gemini en 256 dimensions ; `LLM_*` et l'API native d'Ollama retirés · §11
- 2026-11-14 · Résumé IA du Pulse (PAM-307) : tâche de fond toutes les 10 min sur les projets liés à un repo, rappel du modèle seulement si l'empreinte de son entrée change ; 5 projets par passage, 300 par jour ; seul le dernier résumé est gardé ; `PULSE_READY` relit le Pulse ouvert · §6.4, §11
- 2026-11-14 · Proposition IA à l'import (PAM-310) : sur clic, pas à l'affichage ; skills limités au vocabulaire et ajoutés à ceux de GitHub, besoins et description validés puis modifiables ; pas de relecture à la resynchronisation, pour ne pas écraser ce que le propriétaire a corrigé · §5.4, §11
- 2026-11-14 · Proximité sémantique (PAM-311) : vecteurs Gemini de 256 dimensions dans `Embedding` ; la demande a le sien avant sa première vague (4 s au plus), les profils en tâche de fond (90 textes toutes les 5 min, les plus actifs d'abord) ; 0 point sous un cosinus de 0,70, 10 dès 0,82, mesuré sur les profils de démo ; nouveau critère `semantic` dans « Pourquoi ce match ? » · §7.3, §11
- 2026-11-14 · Coût de l'IA (PAM-540) : `max_completion_tokens` par usage (700, 500, 600) ; `reasoning_effort` `minimal` pour Meta et Gemini, `low` pour Groq ; Meta arrêté pour la journée au-delà de 1 $ (`AI_DAILY_BUDGET`), compté au tarif de Muse Spark ; ligne `model-call` dans les logs · §11
- 2026-11-14 · Page `/dev` hors production (PAM-113) : constante de build `DEV_PAGES`, `false` dans `task-prod.ts` ; esbuild retire la route et le code de la page · §17.4
- 2026-11-14 · Copie hors de la VM (PAM-115) : pour le hackathon, sur le poste de l'équipe (`deploy/pull-backup.sh`, SSH, 7 copies gardées, une copie qui n'est pas une base SQLite rejetée) ; un stockage Systalink avant l'ouverture · §17.5
- 2026-11-14 · Collaboration Map : au doigt, le globe au repos laisse défiler la page et se prend en main d'un toucher (« Terminé » le rend) ; un pays montre ses personnes, douze à la fois avec une recherche. Collaboration Graph : un clic sur un lieu amène ses personnes autour de lui, le panneau du réseau se limite à un lieu et va par pages de trente · §9.3
- 2026-11-14 · Fil (PAM-539) : une seule réaction, J'aime ; « Pour toi » classé sans IA par ce qui relie le post au lecteur, puis la fraîcheur (demi-vie de 36 h), chaque post disant pourquoi il est là ; l'activité d'un profil en onglets Posts / Réponses / Aide · §6.2, §9.1, §10.1
