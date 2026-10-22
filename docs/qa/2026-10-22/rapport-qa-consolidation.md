# QA de consolidation Pamoja — 22 octobre 2026

**Verdict : l'état actuel n'est pas encore à 100 %.** La boucle de démo marche de bout en bout avec deux comptes, rien n'est injectable (HTML, JavaScript, SQL, adresse) et le serveur n'a renvoyé aucune erreur 500. Mais le contenu publié n'a pas de limite de taille, un mot très long casse la mise en page, les retours à la ligne sont perdus, et la connexion simulée crée un doublon du compte de démo « abdou ». Un risque pour la démo réelle est aussi à vérifier : la connexion du vrai compte GitHub renomme le compte seedé.

## Conditions de test

- Révision : `965b148` (`master`, après PAM-301). Aucun code applicatif modifié pendant ce QA.
- Copie du code dans un espace temporaire, base seedée par `task-db-seed.ts` (8 développeurs, 8 communautés, 4 projets), serveur sur un port à part. Connexion simulée de `.env-dev`, sans compte GitHub réel.
- Deux comptes en même temps : Abdou par la vraie connexion simulée (onboarding complet), Moussa (seedé) par une session de test, dans deux onglets.
- Navigateur intégré à 1024 px, puis 375 px (mobile) ; français puis anglais.
- Les contenus piégés ont été envoyés par l'interface et directement à l'API.
- Espace, base et sessions de test supprimés à la fin.

## Parcours vérifiés

| Parcours | Résultat |
| --- | --- |
| Accueil public → connexion → onboarding | Les 5 étapes s'enchaînent, l'étape est dans l'adresse, les choix sont annoncés aux lecteurs d'écran (`aria-pressed`). Terminer ouvre l'accueil. Voir QA-26 pour le compte créé. |
| Boucle d'aide à deux comptes | Abdou publie une demande Debug, l'aperçu annonce les développeurs notifiés ; Moussa reçoit la notification « Abdou a besoin de toi », accepte : l'écran d'Abdou passe à « Acceptée » sans rafraîchir. Message dans le fil, livraison, puis « Oui, elle m'a aidé » : la preuve « confirmée sur Pamoja » apparaît sur le profil de Moussa, la dimension et les badges suivent. |
| Projet OpenPay Africa | Aperçu, Pulse (le résumé s'affiche après le chargement), Canaux, PRs, Issues, Équipe, Activité, Board, Roadmap, Réglages s'ouvrent sans erreur. |
| Explorer, Communautés, Notifications, Réglages, Profil | S'ouvrent sans erreur ; les adresses inconnues (`aide/99999`, `post/zzz`, `projet/zzz`, `communaute/zzz`, `@nobody`, page inconnue) donnent une page « introuvable » claire. |
| Mobile 375 px | Aucun débordement horizontal sur 18 écrans (accueil, aide, détail, nouvelle demande, projets, canaux, board, PRs, notifications, réglages, explorer, communautés, profil, preuves, passeport, post), sauf avec un mot très long (QA-20). |
| Anglais | L'interface est traduite ; restent en français le journal d'activité de démo (déjà noté en QA-17) et les titres des preuves de démo (QA-29). |
| Déconnexion | Retour à l'accueil public ; l'ancien cookie de session est refusé ensuite (401). |
| Journal du serveur | Aucune erreur 500 sur toute la passe ; seulement les refus attendus (401 avant connexion, 400 sur les contenus trop longs, 404 sur les adresses inconnues). |

## Contenu publié : injection et taille

Un réseau social doit tout encaisser : du code, du HTML, des textes énormes, des emoji, d'autres alphabets. Chaque champ où un membre écrit a été testé avec la même série.

**Injection : aucune faille.** Rien ne s'exécute et aucune balise n'est créée ; tout s'affiche comme du texte.

| Contenu essayé | Post | Réponse | Canal | Demande d'aide | Profil | Adresse (URL) |
| --- | --- | --- | --- | --- | --- | --- |
| `<script>`, `<img onerror>`, `<svg onload>`, `<iframe>` | texte | texte | texte | texte (titre de page compris) | texte | texte |
| Lien `javascript:` | texte | — | — | vidéo refusée par le serveur | site neutralisé en `https://javascript:…` | — |
| `{{7*7}}`, `${7*7}`, `'; DROP TABLE post; --` | texte | — | — | — | — | — |
| Paramètres d'adresse piégés (12 écrans : explorer, onglets, dialogues, connexion, nouvelle demande…) | — | — | — | — | — | rien d'injecté |

**Autres contenus :** les emoji (drapeaux, tons de peau, séquences), l'arabe (droite à gauche) et le texte « zalgo » s'affichent correctement. Un post vide ou fait d'espaces est refusé.

**Taille : à corriger (QA-19 à QA-22).**

| Champ | Limite aujourd'hui | Essai | Résultat |
| --- | --- | --- | --- |
| Post du fil | aucune | 103 800 caractères | publié, affiché en entier (28 824 px de haut) |
| Réponse à un post | aucune | 20 000 caractères | publiée |
| Message de canal | aucune | 15 000 caractères | publié |
| Profil : nom, accroche, bio, ville | aucune (serveur) | nom 5 000, accroche et bio 200 000, ville 10 000 | enregistrés |
| Titre d'une demande d'aide | 140 (serveur) | 141 | refusé « Title too long » |
| Description d'une demande | 8 000 (serveur) | 8 016 | refusée |
| Message du fil d'aide | 4 000 (serveur) | 4 001 | refusé |

Les posts, réponses et messages de canal vivent encore dans la page (le serveur arrive avec PAM-501, PAM-406 et PAM-512) : leurs limites devront être **vérifiées par le serveur**, la page ne faisant qu'aider à les respecter.

**Référence LinkedIn** (à confirmer au moment de fixer nos valeurs) : post 3 000 caractères, commentaire 1 250, accroche 220, « À propos » 2 600 ; un long post est replié après quelques lignes avec « … voir plus » ; les retours à la ligne sont gardés ; liens, mentions et hashtags sont cliquables.

## Défauts à corriger

### QA-19 · P1 · Aucune limite de taille sur le contenu publié

Posts, réponses et messages de canal sans limite dans la page ; nom, accroche, bio, ville et site sans limite sur le serveur (`POST/api/user/profile/update`). Un membre peut publier 100 000 caractères ou enregistrer une bio de 200 000.

**Attendu :** une limite par champ, vérifiée par le serveur (erreur claire), et un compteur dans la page à l'approche de la limite, comme les demandes d'aide le font déjà côté serveur.

### QA-20 · P1 · Un mot très long fait déborder la page

Un mot sans espace (une URL, un hash, un texte collé) élargit toute la page : 29 871 px sur l'accueil (post), 53 475 px sur le détail d'une demande d'aide (description). Un nom d'affichage très long déborde aussi des cartes du fil et de la liste du matching. Les réponses, les messages de canal et le profil, eux, coupent correctement.

**Attendu :** tout texte écrit par un membre se coupe dans sa colonne (`overflow-wrap: anywhere`), partout.

### QA-21 · P2 · Les retours à la ligne sont perdus

Un post ou une description de demande écrits sur plusieurs lignes s'affichent en un seul paragraphe (`white-space: normal`). Seul un bloc de code entre ``` garde sa forme.

**Attendu :** les retours à la ligne du membre sont gardés (`white-space: pre-line`), comme sur LinkedIn.

### QA-22 · P2 · Pas de « voir plus » sur les longs posts

Un long post s'affiche en entier dans le fil.

**Attendu :** au-delà de quelques lignes, le post est replié avec « … voir plus », qui le déplie sur place.

### QA-23 · P2 · Le compositeur annonce du Markdown qui n'est pas rendu

Les zones de saisie disent « Markdown, `code` », mais seul le `code` entre accents graves est mis en forme : `**gras**` et `[lien](…)` restent littéraux.

**Attendu :** soit un rendu Markdown sûr (PAM-118 : HTML désactivé, liens filtrés), soit retirer « Markdown » du texte d'aide.

### QA-24 · P2 · Liens, mentions et hashtags ne sont pas cliquables

`https://github.com/…`, `www.exemple.sn`, `@moussa` et `#golang` restent du texte simple.

**Attendu :** liens cliquables (nouvel onglet, `noopener nofollow`, schémas `http`/`https` seulement), `@login` vers le profil, `#tag` vers la recherche.

### QA-25 · P3 · Un message de canal tient sur une seule ligne

Le champ des canaux est un `input` : impossible d'écrire sur plusieurs lignes ou de coller un bloc de code.

**Attendu :** une zone de texte, Entrée pour envoyer, Maj + Entrée pour un retour à la ligne.

### QA-26 · P1 · La connexion simulée crée un doublon du compte de démo « abdou »

Avec une base seedée, la connexion simulée de dev (githubId 0) ne retrouve pas « abdou » seedé (githubId de `SEED_GITHUB_IDS`) et crée un second utilisateur « abdou ». Conséquences vues : `@abdou` montre le compte seedé et non celui connecté ; l'aperçu du matching propose « Abdou Sow » à Abdou lui-même. Plus largement, `githubUsername` n'est pas unique : un login libéré puis repris sur GitHub donnerait deux comptes au même login, et les lectures par login (`GET/api/user`, preuves, badges) prendraient le premier.

**Attendu :** la connexion simulée se connecte au compte seedé « abdou » ; un login ne désigne qu'un compte (l'ancien porteur perd le login à la connexion du nouveau).

### QA-27 · P1 · Risque démo : la vraie connexion renomme le compte seedé

Lu dans le code, non joué faute de compte GitHub réel : avec `SEED_GITHUB_IDS=abdou:…`, la connexion du vrai compte retrouve le profil seedé par son githubId puis met son login à jour (`findOrCreateGithubUser`) : « abdou » devient le login GitHub réel. Les données de démo de la page (propriétaire d'OpenPay, auteur de la PR #81, fil) restent sur « abdou », qui n'est plus le compte connecté.

**Attendu :** à jouer avec les vrais comptes (PAM-903, PAM-905) ; le seed doit utiliser le login GitHub réel des comptes reliés, ou la page doit suivre le login réel.

### QA-28 · P2 · Le rôle des profils de démo devient « Développeur »

Régression de PAM-301 : quand le serveur ne connaît pas de domaine pour une personne de la démo, son rôle (« Développeur backend » pour Moussa) est remplacé par « Développeur ».

**Attendu :** garder le rôle connu de la page quand le serveur n'en donne pas.

### QA-29 · P3 · Titres des preuves de démo en français dans l'interface anglaise

« Review de la PR #62 », « PR #40 mergée chez … » restent en français en anglais, alors que les preuves du serveur sont traduites.

### QA-30 · P3 · « Profil introuvable » affiche le login encodé

`/@a%3Cb` affiche « Aucun développeur « a%3Cb » » au lieu de « a<b ».

### QA-31 · P3 · L'onboarding promet un résumé quotidien qui n'existe pas encore

« Résumé quotidien : un récapitulatif chaque matin à 8 h » est proposé alors que le digest arrive avec PAM-509.

### QA-32 · P3 · « Proposer mon aide » affiché au propriétaire de son propre projet

Sur OpenPay Africa, dont Abdou est propriétaire, l'encart « On cherche » lui propose « Proposer mon aide ».

### QA-33 · P3 · Les messages privés sont écrits dans le journal du serveur

Le routeur de `@01edu/api` journalise chaque entrée validée (`in-params`) : le texte des messages entre demandeur et aidant, les bios, et le `code` OAuth à usage unique se retrouvent dans les logs.

**Attendu :** masquer ces champs (`sensitiveKeys` du routeur).

## Scénarios réseau social à jouer quand leurs écrans auront leur serveur

À reprendre dans le QA de chaque tâche concernée, sans rien laisser de côté :

- **Posts (PAM-501, PAM-512)** : limites vérifiées par le serveur ; injection (même série que ci-dessus) ; mot très long ; retours à la ligne ; « voir plus » ; modification et suppression de son post (et pas de celui d'un autre) ; post dans une communauté dont on n'est pas membre ; réponse à une réponse supprimée ; republication d'un post supprimé ou masqué ; double clic sur « Publier » (pas de doublon) ; même post publié dix fois de suite (anti-spam, PAM-510).
- **Images (PAM-409)** : fichier trop lourd, mauvais type (SVG, HTML renommé en .png), image géante en pixels, métadonnées GPS supprimées, 5ᵉ image refusée.
- **Vidéos (PAM-410)** : lien d'un fournisseur hors liste, `javascript:`, lien qui n'est pas une vidéo.
- **Mentions et liens** : `@login` inexistant, mention de soi-même, lien vers un domaine piégé, aperçu de lien.
- **Signalement et modération (PAM-508)** : signaler deux fois le même contenu, signaler son propre contenu, contenu masqué après 3 signalements (visible par l'auteur avec un bandeau), sanction d'un modérateur.
- **Comptes** : compte supprimé (ses posts et preuves), login GitHub changé, suspension, profil masqué de la recherche.
- **Débit (PAM-510)** : rafale de messages, de demandes d'aide, de réactions.

## Parcours non validables dans cette passe

- Connexion GitHub réelle, import d'un dépôt, installation de l'app, webhooks et review réelle : il faut le repo de démo et deux vrais comptes (PAM-902, PAM-903, PAM-905).
- Persistance des posts, réponses, messages de canal et non-lus : ils vivent encore dans la page (PAM-406, PAM-412, PAM-501, PAM-512) et disparaissent au rechargement.
- Rendu visuel : la fenêtre du navigateur de test était masquée, donc pas de capture ; les mesures ont été prises dans la page (largeurs, hauteurs, styles).

## Ordre de correction proposé

1. QA-20, QA-21 : coupure des mots longs et retours à la ligne, partout où un membre écrit (petit changement, gros effet).
2. QA-19 : limites par champ, vérifiées par le serveur pour le profil, et dans la page pour les posts en attendant PAM-501.
3. QA-26, QA-28 : doublon de la connexion simulée et rôle des profils de démo.
4. QA-22 à QA-25 : « voir plus », Markdown sûr ou texte d'aide corrigé, liens et mentions cliquables, zone de texte des canaux.
5. QA-29 à QA-33.
6. QA-27 : à jouer avec les vrais comptes pendant la préparation de la démo.
