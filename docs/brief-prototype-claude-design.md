# Brief — Prototype complet de Pamoja

> **Statut (8 octobre 2026)** : le prototype a été produit (Pamoja v2, `docs/prototype/`). Ses écarts validés sont reportés dans le cahier des charges, qui fait foi ; ce brief n'est plus mis à jour que pour de nouvelles itérations du prototype.

Ce document est le brief pour Claude Design. Il est autonome : tout ce qu'il faut pour produire le prototype est ici.

## 1. Ce qu'on te demande

Produis un **prototype interactif complet** de Pamoja : **toutes les pages** listées au §6, **tous les workflows** du §7 jouables de bout en bout, dans les **deux thèmes** (clair et sombre), en desktop et en mobile.

- **Dynamique** : on clique, on remplit, on valide, et l'état change partout (compteurs, badges, notifications, canaux). Les données sont fictives mais cohérentes d'une page à l'autre (§5).
- **Temps réel simulé** : les événements qui viennent de GitHub ou d'un autre utilisateur (review soumise, CI en échec, nouvelle candidature…) se déclenchent depuis un **panneau de démo** (§8) et arrivent à l'écran sans rechargement.
- **Fidèle au design system** (§3) : tokens, typographie, composants, règles du fil.
- **But** : valider l'expérience avant d'écrire le vrai code, et servir de support de démo de secours pour le concours.

Pas de backend : tout l'état vit dans le navigateur (en mémoire, persisté localement, avec un bouton « Réinitialiser la démo »).

## 2. Le produit en bref

**Pamoja** (« ensemble » en swahili) est une plateforme de collaboration pour développeurs africains, construite pour le concours CADEV. Promesse : *Your work is your profile.*

La boucle principale :

1. Un développeur importe son **projet GitHub** (repos publics uniquement).
2. Il exprime un **besoin précis** : review de PR, debug, architecture… (« demande d'aide »).
3. La plateforme **envoie la demande aux bons développeurs** (matching par skills, avec la raison de chaque recommandation, « Pourquoi ce match ? »).
4. Un développeur **accepte**, aide (par exemple une vraie review sur GitHub), la plateforme **détecte** l'action GitHub.
5. Le demandeur **confirme** que l'aide était utile.
6. L'aide devient une **preuve vérifiée** qui fait progresser la **réputation** et les **badges** de l'aidant, visibles sur son **profil public partageable**.

GitHub reste la source du code. Pamoja ajoute la couche humaine : découverte, entraide, collaboration, réputation.

## 3. Design system

**Utilise le design system Pamoja : https://claude.ai/artifact/Gj5ox6BNFzaDpuqaCFCWhb** (README, tokens clair et sombre, composants, logo). Lis son README en premier. Si tu ne peux pas l'ouvrir, applique au minimum les règles ci-dessous.

- **L'idée** : *des personnes reliées par un fil.* Objets et code en lignes droites, fines (1px), en gris ; ce qui relie les personnes est un **fil courbe indigo**, seule couleur de marque.
- **Couleurs** (clair / sombre) : fond de page `#F6F6F8` / `#0E0E13`, cartes `#FFFFFF` / `#16161D`, survol `#EEEEF2` / `#1F1F28`, filets `#E0E0E6` / `#2C2C37`, bords de champs `#85859A` / `#72728A`, texte `#1D1D25` / `#EDEDF3`, texte secondaire `#5D5D6B` / `#A2A2B2`, **indigo** `#3340B8` / `#8C96FF` (texte dessus : `#FFFFFF` / `#0E0E13`), indigo doux `#E8EAFB` / `#23264D`, vérifié `#1E7A4E` / `#4FC88A`, attente `#8A5700` / `#E9B04C`, danger `#B42318` / `#FF7B6E`.
- **Typographie** (Google Fonts) : *Bricolage Grotesque* pour les titres et les noms, *IBM Plex Sans* pour le texte, *IBM Plex Mono* pour les chiffres, scores, IDs (PR #81) et étiquettes en capitales.
- **Règle clé : trait plein = vérifié par GitHub ; trait pointillé = donnée de démonstration ou lien pas encore créé.** Un badge « Vérifié par GitHub » a un bord plein vert ; un badge « Donnée de démo » a un bord pointillé gris.
- Plat : filets de 1px, aucune ombre sauf pour ce qui flotte (toasts, menus, dialogues). Rayons 4 / 6 / 10px, avatars ronds.
- Un état n'est jamais porté par la couleur seule : toujours un mot et une icône. Icônes au trait (style Lucide, 1,5px).
- **Système isométrique** : toute l'interface est en isométrie à 30° : cartes, barre latérale et menus en dalles épaisses ; boutons en touches qui s'enfoncent ; champs et recherche en puits ; personne = disque, projet = cube, événement = tuile, état = losange ; métriques et badges en colonnes dont la hauteur suit la valeur. Fond uni. Pas d'illustration décorative.
- **Langue de l'interface : français**, au tutoiement, de développeur à développeur. Casse de phrase ; boutons à l'infinitif qui disent l'action exacte (« Demander une review », « Accepter ») ; confirmation au participe (« Demande acceptée ») ; vocabulaire de GitHub gardé tel quel (PR, review, merge, CI, branche, issue) ; pas d'emoji dans l'interface. Seules les deux signatures de marque restent en anglais : *Your work is your profile* et *Where developers don't just connect. They build together.*

## 4. Structure générale

- **Barre latérale** (desktop) / barre d'onglets (mobile) : Accueil, Explorer, Projets, Aide, Communautés, Notifications (avec compteur), Profil.
- **Bouton global « + Créer »** : Post, Projet, Demande d'aide, Communauté.
- **En-tête** : recherche globale (raccourci ⌘K / Ctrl+K), cloche de notifications, bascule de thème, avatar (menu : profil, réglages, déconnexion).
- **Toasts** temps réel en bas à droite.
- **Panneau de démo** flottant (§8), repliable, visible sur toutes les pages.

## 5. Données fictives

Toutes les données doivent être cohérentes entre les pages. Les données de départ sont marquées **démo** (bord pointillé « Donnée de démo ») ; seules les actions jouées pendant la session qui simulent GitHub deviennent **verified**.

**Personnes**

| Login | Nom | Pays, ville | Rôle | Skills | Notes |
| --- | --- | --- | --- | --- | --- |
| `abdou` | Abdou Sow | Sénégal, Dakar | Ingénieur backend | Go, TypeScript, Deno, SQLite | Utilisateur principal. Propriétaire d'OpenPay Africa |
| `moussa` | Moussa Diallo | Côte d'Ivoire, Abidjan | Développeur backend | Go, SQLite, Backend, Code review | 14 reviews confirmées (démo), Reviewer de confiance niveau Argent, 14/20 vers Or |
| `awa` | Awa Diop | Sénégal, Thiès | Ingénieure frontend | React, TypeScript, UI | Mainteneuse de Senegal Maps |
| `fatou` | Fatou Ndiaye | Sénégal, Dakar | Full-stack | TypeScript, PostgreSQL | Contributrice d'OpenPay Africa |
| `amina` | Amina Tchoupo | Cameroun, Douala | DevOps | Docker, Kubernetes, CI | Peu d'historique : profil « prometteur » |
| `kofi` | Kofi Mensah | Ghana, Accra | Mobile | Flutter, Dart | Membre de la communauté Mobile |
| `yao` | Yao Koffi | Côte d'Ivoire, Yamoussoukro | Data | Python, SQL | Nouveau, pas de projet |
| `zeinab` | Zeinab Sylla | Guinée, Conakry | Security | Security, Go | Modératrice de la communauté Go |

**Projets**

| Projet | Propriétaire | Stack | État |
| --- | --- | --- | --- |
| OpenPay Africa | abdou | Go, SQLite, Deno | Synchro live ; 3 PRs en attente de review dont **PR #81 « Payment transaction handling »** ; 1 bloqueur (issue #44 label `blocked`) ; 12 contributeurs ; release v0.3 |
| Senegal Maps | awa | TypeScript, React | Synchro toutes les 15 min ; cherche des contributeurs ; issues `good first issue` |
| Dakar Transit | fatou | TypeScript, PostgreSQL | Cherche un backend |
| AfriCommerce | kofi | Flutter, Go | Besoin : documentation |

**Communautés** : Go, React, DevOps, Open Source, Code Review, Senegal Developers, Côte d'Ivoire Developers, Cameroon Developers.

**Demandes d'aide** de départ : 3 qui correspondent à Moussa, 1 ouverte par Awa sur Senegal Maps (Debugging), 1 terminée et confirmée (démo) dans l'historique de Moussa.

## 6. Inventaire des pages

Chaque page existe, est atteignable depuis la navigation, et a ses **états vide, chargement et erreur**.

### Public

1. **Landing** : promesse, boucle en 4 étapes illustrée, aperçu d'un profil, « Continuer avec GitHub ».
2. **Connexion** : bouton « Continuer avec GitHub » (simulé : écran d'autorisation GitHub factice, puis retour).
3. **Profil public** `/@login` vu sans être connecté (lecture seule, aperçu de partage).
4. **404** avec illustration.

### Onboarding (moins de 2 minutes, 5 étapes avec progression)

5. Profil pré-rempli depuis GitHub (avatar, nom, bio, ville) ; compléter headline, pays, ville, site.
6. Skills : domaines puis technologies, dans un vocabulaire contrôlé (taper « postgres » propose PostgreSQL).
7. Intentions : Trouver des projets, Trouver des contributeurs, Faire des reviews, Recevoir des reviews, Aider des développeurs, Contribuer à l'open source, Mentorer, Trouver un mentor, Construire des projets, Trouver des collaborateurs.
8. Préférence de matching : Instantané, Résumé quotidien, Désactivé.
9. Import d'un premier projet (facultatif, « Passer »).

### Application

10. **Accueil** personnalisé : « 3 demandes d'aide correspondent à tes skills », PRs qui attendent une review, projet à découvrir, projets qui cherchent des contributeurs, discussion tendance, développeurs avec qui construire.
11. **Explorer — Développeurs** : filtres (skill, pays, intentions, disponibilité, communauté), cartes développeur.
12. **Explorer — Projets** : filtres (techno, stade, cherche des contributeurs, beginner friendly, pays, activité).
13. **Explorer — Sur quoi puis-je travailler ?** : liste personnalisée de choses concrètes (reviews demandées, `good first issue`, besoins de projets).
14. **Recherche** : palette ⌘K avec résultats groupés (développeurs, projets, communautés, posts, demandes d'aide, skills), tolérante aux fautes (« postgress » trouve PostgreSQL), puis page de résultats.
15. **Projets** : mes projets, projets suivis, bouton « Nouveau projet ».
16. **Nouveau projet** (dialogue) : « Importer depuis GitHub » (liste des repos publics, choix, aperçu de ce qui sera importé, skills et besoins proposés par l'IA à valider) ou « Créer de zéro » (nom, description, vision, technologies, visibilité, besoins).
17. **Activer la synchro live** (dialogue) : explication, page d'installation GitHub factice, retour avec les trois contrôles affichés (identité, repo couvert, droit admin) et leur résultat.

### Page projet `/projet/:slug`

En-tête commun : nom, description, technologies, lien GitHub, mode de synchro (Live / Toutes les 15 min), chiffres (contributeurs, issues ouvertes, PRs ouvertes, demandes d'aide ouvertes), actions Suivre, Proposer mon aide, Rejoindre.

18. **Aperçu** : à propos, galerie de captures, vidéo de démo intégrée (miniature YouTube/Loom, lecteur au clic), milestone en cours, besoins (« On cherche »), activité récente, équipe, dernière release.
19. **Pulse** : Pulse déterministe sur 7 jours (PRs mergées, issues fermées, contributeurs arrivés, reviews demandées, PRs en attente, releases) ; résumé IA de 3 à 5 phrases qui arrive après quelques secondes ; **Health** (indicateurs lisibles, chacun avec sa règle au survol) ; **DNA** (langages, domaines, besoins) ; **Story** (frise des moments marquants).
20. **Canaux** : quatre canaux imposés, comme un serveur Discord.
    - `#général` (les membres écrivent), `#suivi` (alertes GitHub et CI/CD écrites par la plateforme, les membres répondent en fil), `#aide` (demandes d'aide du projet et leurs échanges), `#annonces` (Propriétaire et Mainteneurs écrivent ; les abonnés lisent).
    - Messages en Markdown, image, vidéo intégrée, réactions, **fils de discussion** sous un message ou une alerte, compteurs non lus, réglage de notification par canal (Tout, Mentions, Seulement mes PRs, Rien).
    - Alertes de `#suivi` : PR ouverte, review soumise, PR mergée, **CI en échec** puis **CI réparée**, PR sans review depuis 2 jours, release, pushes regroupés. **Alertes actionnables** : « CI en échec » porte « Demander de l'aide », « PR en attente de review » porte « Demander une review ».
    - Présence légère : « 3 développeurs actifs », avec ce qu'ils regardent.
21. **Pull requests** : liste (état, auteur, reviews, CI) ; détail en panneau latéral avec **« Demander une review »**.
22. **Issues** : liste avec labels, filtre `good first issue`.
23. **Équipe** : membres et rôles (Propriétaire, Mainteneur, Contributeur, Reviewer, Observateur), candidatures en attente (Accepter / Refuser), « Ils pourraient aider » pour chaque besoin.
24. **Activité** : journal des événements du projet.
25. **Board** : Kanban Backlog, Prêt, En cours, Review, Terminé ; glisser-déposer ; cartes internes ou liées à une issue/PR GitHub ; une PR mergée passe la carte en Terminé.
26. **Roadmap** : milestones (Terminé, En cours, Prévu) avec progression.
27. **Réglages du projet** (Propriétaire) : informations, besoins, rôles, mode de synchro.
28. **Rejoindre le projet** (dialogue) : comment aider (Backend, Frontend, Tests, DevOps, Documentation), disponibilité, message.

### Aide

29. **Aide** : onglets Pour moi (matchs), Mes demandes, Acceptées par moi, Demandes des projets.
30. **Nouvelle demande d'aide** : type (Review de code, Debug, Architecture, Sécurité, Tests, DevOps, UI/UX, Documentation, Pair programming, Mentorat, Recherche de contributeur), titre, description, projet et PR (facultatifs), skills, niveau, durée, jusqu'à 4 captures, un lien vidéo. Depuis une PR, tout est pré-rempli.
31. **Détail d'une demande d'aide** : description, skills, **frise du cycle de vie** (§9), actions selon l'état et selon qui regarde (demandeur, aidant, développeur matché, autre), panneau **matching** (développeurs notifiés par vague, score, « Pourquoi ce match ? »), lien vers la PR.
32. **Proposer une collaboration** (dialogue, depuis un profil) : Relire ma PR, M'aider à débugger, Conseil d'architecture, Rejoindre mon projet, Pair programming, Me mentorer, Construire quelque chose ensemble.

### Notifications

33. **Centre de notifications** : catégories Pour toi, Projets, Communautés, Social, Système ; actions directes dans la notification (Accepter une candidature, Voir la demande) ; tout marquer comme lu.
34. **Toast temps réel** « Ce projet a besoin de toi » (projet, PR, skills, score, durée, Voir la demande / Plus tard).

### Profil et réputation

35. **Profil** `/@login` : hero (cover, avatar, nom, pays, headline, technologies, bio, GitHub, site, Suivre, Proposer une collaboration), En train de construire, Contributions réelles, stats (projets, reviews vérifiées, contributions, développeurs aidés, collaborations), **réputation en cinq dimensions** (Review de code, Construction de projets, Mentorat, Open source, Entraide) en barres, badges avec progression, activité, communautés, **Collaboration Map** (Afrique en piliers isométriques, un fil indigo entre pays), **Collaboration Graph** (liens de travail uniquement).
36. **Preuves** (panneau ou page) : pour une dimension ou un badge, la liste des preuves, chacune marquée « Vérifié par GitHub » ou « Donnée de démo », avec lien vers la PR, le projet, la demande.
37. **Passeport développeur** : vue condensée partageable.
38. **Carte de partage** (dialogue) : carte image du profil, boutons de partage LinkedIn, X, WhatsApp, téléchargement.
39. **Modifier le profil** : headline, bio, liens, cover, couleur d'accent, thème du profil (Minimal, Terminal, Cyber, Clair, Sombre), technologies, projets et badges mis en avant, ordre des sections (glisser-déposer), aperçu en direct.

### Communautés

40. **Communautés** : liste par type (technologie, pays, domaine), Rejoindre.
41. **Communauté** : Fil, Membres, Projets, Demandes d'aide, À propos.
42. **Détail d'un post** : contenu (Markdown, code, images, vidéo, lien de repo/PR), réactions, commentaires, bookmark, **réponse acceptée** pour une question.
43. **Nouveau post** (dialogue) : type (Discussion, Question, Mise à jour de projet, Demande d'aide, Vitrine, Ressource, Opportunité, Release), communauté, contenu, images (4 max), lien vidéo.
44. **Nouvelle communauté** (dialogue).

### Réglages et modération

45. **Réglages** : compte GitHub connecté, notifications (par catégorie), matching (Instantané / Résumé quotidien / Désactivé, skills, types d'aide, score minimum), thème, données.
46. **Signaler** (dialogue, sur tout contenu) : motif (Spam, Harcèlement, Contenu inapproprié, Usurpation, Triche à la réputation, Autre), commentaire.
47. **File de modération** (modérateurs) : signalements, actions (Ignorer, Masquer, Avertir, Suspendre, Retirer la preuve) avec motif obligatoire, historique.

## 7. Workflows à rendre jouables

Chaque workflow se joue en entier, et ses effets apparaissent partout où ils doivent (compteurs, Pulse, canaux, notifications, profil).

1. **Arrivée** : Landing → Continuer avec GitHub → onboarding en 5 étapes → Accueil.
2. **Import en 3 clics** : Nouveau projet → Importer depuis GitHub → OpenPay Africa → aperçu → Créer. Puis « Activer la synchro live » → installation factice → trois contrôles verts → mode Live.
3. **La boucle de démo** (le plus important, à soigner au niveau final) :
   1. Abdou ouvre la PR #81 → **Demander une review** → formulaire pré-rempli (Go, SQLite, Concurrency, ~20 min, Intermédiaire+) → Publier.
   2. Le panneau de matching montre les 5 développeurs notifiés, dont Moussa en tête (« Pourquoi ce match ? » : Go, SQLite, Backend, 14 reviews confirmées, Ouvert aux reviews) et Amina dans la place « Nouveau profil prometteur ».
   3. En basculant sur Moussa : le **toast « Ce projet a besoin de toi »** arrive, la notification aussi.
   4. Moussa **accepte** → chez Abdou, la demande passe en « Acceptée par Moussa » ; une alerte apparaît dans `#aide`.
   5. Panneau de démo : « GitHub : Moussa soumet une review sur la PR #81 » → la demande passe en « Review soumise », l'alerte arrive dans `#suivi` avec « Vérifié par GitHub ».
   6. Abdou : « Cette aide t'a été utile ? » → **Oui**.
   7. Profil de Moussa : reviews 14 → 15, Reviewer de confiance **15 / 20** vers le niveau Or, la nouvelle preuve marquée « Vérifié par GitHub » au-dessus des 14 « Donnée de démo » ; toast « Badge en progression ».
   8. Pulse d'OpenPay : « Review reçue sur la PR #81 », PRs en attente de review 3 → 2. **Le bloqueur reste affiché** (une review ne lève pas un bloqueur).
4. **CI en échec** : panneau de démo « CI en échec sur la PR #84 » → alerte « CI en échec » dans `#suivi` → **Demander de l'aide** → demande Debug pré-remplie (PR, branche, lien du job) → Publier → matching.
5. **Sorties du cycle d'aide** : l'aidant **se désiste** → la demande repasse en Ouverte et la vague suivante est notifiée ; « Libérer la demande » côté demandeur après inactivité (simulée) ; **Rouvrir** une demande expirée ; deux acceptations simultanées (bouton du panneau de démo) → le second voit « Déjà prise ».
6. **Rejoindre un projet** : Awa → Rejoindre OpenPay → Abdou reçoit la candidature → Accepter depuis la notification → Awa apparaît dans Équipe et peut écrire dans `#général`.
7. **Board** : glisser une carte ; panneau de démo « PR #78 mergée » → sa carte passe en Terminé et l'alerte arrive dans `#suivi`.
8. **Question et réponse** : poster une Question dans la communauté Go → un commentaire → **Accepter la réponse** → la réponse est marquée, Entraide progresse.
9. **Modération** : signaler un post → la file de Zeinab affiche le signalement → Masquer avec motif → le post disparaît pour les autres, l'auteur est notifié.
10. **Partage** : profil de Moussa → Partager → Carte de partage → aperçu tel qu'il apparaîtrait dans WhatsApp ou LinkedIn.
11. **Personnalisation** : Modifier le profil → changer thème et ordre des sections → aperçu en direct → Enregistrer.

## 8. Panneau de démo

Un panneau flottant, repliable, présent partout, qui simule ce qui viendrait de GitHub ou d'autres personnes :

- **Changer d'utilisateur** : Abdou, Moussa, Awa, Amina, Zeinab (l'interface se met à jour sans rechargement).
- **Vue côte à côte** : Abdou et Moussa, pour montrer le temps réel au jury.
- **Événements GitHub** : review soumise sur une PR, CI en échec / réparée, PR ouverte, PR mergée, release publiée.
- **Événements des personnes** : nouvelle candidature, nouveau message dans un canal, deuxième acceptation simultanée.
- **Temps** : « +24 h » et « +72 h » pour faire apparaître relances, libération et expiration.
- **Réinitialiser la démo**.

## 9. Règles métier visibles dans l'interface

**Cycle de vie d'une demande d'aide**

| État | Sorties |
| --- | --- |
| Ouverte | Accepter → Acceptée ; Annuler → Annulée ; 7 jours sans acceptation → Expirée |
| Acceptée | Review GitHub détectée → Review soumise ; « Marquer comme livrée » (types sans PR) → Livrée ; Se désister → Ouverte ; Libérer (après 72 h d'inactivité de l'aidant) → Ouverte ; Annuler → Annulée |
| Review soumise / Livrée | « Cette aide t'a été utile ? » Oui → Terminée ; Non → Fermée (pas utile) ; 7 jours sans réponse → Fermée (non confirmée) |
| Terminée | Finale ; produit une preuve et fait progresser la réputation |
| Expirée / Fermée | Rouvrir → Ouverte avec les mêmes données |

**Matching** : score sur 100 (skills 45, type d'aide accepté 15, aides confirmées sur ces skills 15, proximité sémantique 10, disponibilité 10, affinité 5). 5 développeurs par vague, dont une place réservée à un profil prometteur ; vague suivante après 2 h sans acceptation. « Pourquoi ce match ? » affiche exactement les critères qui ont compté.

**Badges** (Bronze / Argent / Or / Platine) : Reviewer de confiance 3 / 10 / 20 / 50 reviews confirmées ; Premier à répondre 3 / 10 / 25 / 50 aides ; Mentor 2 / 5 / 15 / 30 ; Contributeur open source 3 / 10 / 25 / 50 PRs mergées chez d'autres ; Bâtisseur 1 / 3 / 5 / 10 projets ; Mainteneur 1 / 3 / 6 / 12 mois ; Bâtisseur sans frontières 2 / 3 / 5 / 8 pays ; Pilier de communauté 5 / 15 / 40 / 100 réponses acceptées.

**Réputation** : jamais de score global ; cinq dimensions, chacune cliquable vers ses preuves.

**Droits** : seuls les membres écrivent dans `#général` et `#aide` ; seuls le Propriétaire et les Mainteneurs écrivent dans `#annonces` ; `#suivi` n'est écrit que par la plateforme ; les abonnés lisent `#suivi` et `#annonces`.

## 10. Exigences techniques du prototype

- Une seule application, routage côté client, URL lisibles (`/@moussa`, `/projet/openpay-africa/canaux/suivi`).
- Un seul **store** de données fictives, partagé par toutes les pages ; les actions le modifient ; persistance locale ; « Réinitialiser la démo ».
- Thèmes clair et sombre (bascule dans l'en-tête, préférence système par défaut).
- Responsive : le fil, les notifications, l'aide, le profil et Explorer sont confortables sur mobile ; Board et Roadmap restent pensés pour le desktop.
- Accessible : navigation au clavier, focus visible (anneau indigo de 2px), libellés sur les icônes, `prefers-reduced-motion` respecté.
- Animations courtes (150 à 250 ms) : arrivée d'un toast, carte qui change de colonne, barre de badge qui avance, fil qui se tend.
- Pas d'illustration décorative : les volumes et les formes encodent les objets et leurs valeurs (§3).

## 11. Ordre de production conseillé

Le prototype est grand ; produis-le par étapes, chacune utilisable :

1. **Socle** : layout, navigation, en-tête, thèmes, store de données fictives, panneau de démo, composants de base.
2. **Boucle de démo** (§7.3) au niveau final : page projet (Aperçu, Pulse, Canaux, Pull requests), demande d'aide, matching, toast, notifications, profil et preuves.
3. **Projet complet** : Équipe, Board, Roadmap, Activité, Issues, réglages, import et synchro live.
4. **Découverte et social** : Accueil, Explorer, recherche, communautés, posts.
5. **Le reste** : onboarding, landing, réglages, modération, personnalisation du profil, carte de partage, états vides et 404.

**Critères de réussite** : chaque page du §6 existe et se rejoint par la navigation ; chacun des 11 workflows du §7 se joue de bout en bout ; les deux thèmes sont soignés ; la boucle de démo se joue en moins de 4 minutes en split view.

## 12. Hors prototype

Vraie connexion GitHub, vrai backend, vraie IA, vrais emails, vraie recherche : tout est simulé.
