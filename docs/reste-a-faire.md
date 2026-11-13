# Ce qui reste à faire

Point du 13 novembre 2026, vérifié dans le code et sur la VM de démo, pas seulement dans `TODO.md`. Les numéros `PAM-xxx` renvoient au TODO et le `§` au cahier des charges (`docs/cahier-des-charges.md`).

**État** : 113 tâches faites, 37 restantes. La démo tourne sur [pamoja-tech.duckdns.org](https://pamoja-tech.duckdns.org) (déploiement : `docs/deploiement.md`).

## Ordre conseillé

1. **Préparation de la démo** (partie 4) : c'est ce qui sécurise la présentation.
2. **Fil, follow et communautés** (PAM-501, 502, 503, 512) : c'est ce que le jury verra.
3. **Explore** (PAM-505) : sans lui, un vrai inscrit reste introuvable.
4. Le reste de la partie 1, puis les parties 2 et 3.

## Règles du projet à suivre

- Un changement de règle va d'abord dans `docs/cahier-des-charges.md`, puis dans `TODO.md` (case cochée et ligne de journal), puis dans une entrée de `docs/suivi-projet.md`, placée avant « ## Audits QA ».
- Une migration déjà écrite ne se modifie jamais : on en ajoute une nouvelle dans `migrations/`.
- Liens : utiliser `A` de `/web/ui/link.tsx`, jamais celui de `@01edu/signal-router` (sinon un défilement au doigt ouvre les cartes).
- Icônes : importer le nom Lucide depuis `/web/assets/icons.tsx`, puis lancer `deno task icon`.
- Jamais deux classes Tailwind sur la même propriété.
- Avant chaque commit : `deno fmt --check`, `deno lint`, `deno check api web deploy *.ts`, `deno task test`.

## 1. Des écrans qui n'enregistrent rien sur le serveur

C'est le principal constat de l'audit. Ces écrans existent et semblent marcher, mais **tout se passe dans le navigateur, sur les données de démo** (`web/fixtures/`) : rien n'est enregistré, les autres utilisateurs ne voient rien, et tout disparaît au rechargement. Les tables existent déjà dans `api/schema.ts`, mais il manque les routes dans `api/routes.ts` et leur branchement dans les pages.

Pour chaque fonction, le modèle à suivre est celui des posts (`api/posts.ts`, `web/lib/posts.ts`) :
- une route d'écriture avec `authorize: withSession` et une limite de débit (`within` de `api/lib/rate.ts`) ;
- une entry dans `api/entries.ts` pour prévenir les autres en direct ;
- côté page, l'appel à l'API à la place de la modification locale de la fixture ;
- des tests dans `api/*_test.ts`.

| Tâche | Ce qui se passe aujourd'hui | Tables prêtes | À faire |
|---|---|---|---|
| **PAM-505 Explore** | Ne liste que les 9 développeurs et les projets de démo (`web/pages/explore/explore-page.tsx` lit `web/fixtures/people.ts` et `projects.ts`). Seul « Sur quoi travailler » vient du serveur (`GET/api/work`). | `user`, `profile`, `userSkill`, `project` | Une route de listing par lots, avec les filtres pays, skill, intention et disponibilité. Les filtres sont déjà déclarés dans l'index Meilisearch `developers` (`api/search.ts`, `SETTINGS`), qu'on peut réutiliser. |
| **PAM-503 Follow** | Local : `toggleFollowing` (`web/fixtures/people.ts`) et `toggleFollow` (`web/fixtures/projects.ts`). En base, seuls les follows du seed existent. Or les posts en direct (`POST_CREATED`) vont aux abonnés lus en base : un vrai follow ne fait rien. | `follow` | Routes suivre / ne plus suivre (utilisateur, projet, communauté), puis relire les abonnements du flux SSE (`refreshListeners`). |
| **PAM-502 Communautés** | Rejoindre, quitter et créer sont locaux (`web/pages/communities/membership.tsx`, `new-community-dialog.tsx`). | `community`, `communityMember` | Routes rejoindre, quitter, créer, et la liste des membres. Réindexer la communauté créée dans la recherche (`api/search.ts`, aucune entry ne la couvre aujourd'hui). |
| **PAM-501 Fil** | Créer et lire un post passent par le serveur. Réactions et favoris sont locaux. | `reaction`, `bookmark` | Routes réagir et enregistrer. La page « Enregistrés » (`web/pages/saved-page.tsx`) doit lire le serveur. |
| **PAM-512 Réponses** | Réponses imbriquées, réponse acceptée et republications sont locales. `POST/api/post/create` n'accepte pas de parent. | `post` (`parentId`, `rootId`, `repostOfId`, `acceptedReplyId`) | Répondre, accepter une réponse, republier, et lire un fil (`GET` d'un post avec ses réponses par lots de 20, §12.7). |
| **PAM-508 Modération** | Locale, sauf le signalement d'un message privé (`POST/api/conversation/report`). Le masquage à 3 signalements n'existe pas. | `report`, `post.hiddenAt` | Signaler un post, la file des modérateurs, les actions, le masquage à 3 signalements, et le bandeau pour l'auteur (§10.5). |
| **PAM-404 Board** | Local. « PR mergée → Done » n'existe pas. | `task` (`boardColumn`, `rank`) | Routes créer et déplacer une carte (rang fractionnaire, §14), une entry `TASK_UPDATED`, et le passage en Done au webhook de merge (`api/github-events.ts`). |
| **PAM-405 Roadmap** | Locale. | `milestone` | Routes jalons. |
| **PAM-402 Needs** | Les needs sont créés à l'import et par le seed, mais ne se modifient pas. « People who could help » est calculé dans le navigateur. | `projectNeed` | Routes needs, et le calcul serveur des personnes qui peuvent aider. |
| **PAM-403 Candidatures** | Locales. | `joinRequest`, `projectMember` | Candidater, accepter depuis la notification, rôles. |
| **PAM-401 Page projet** | `GET/api/projects` ne renvoie que **mes** projets : un projet importé par quelqu'un d'autre n'a pas de route pour s'afficher. | `project` | Une route de lecture d'un projet public par son slug. |
| **PAM-302 Personnalisation** | La cover est enregistrée (`POST/api/user/cover`), mais pas le thème, l'accent ni l'ordre des sections (`POST/api/user/profile/update` ne les prend pas). | `profile` (`theme`, `accent`, `sectionOrder`, `featured`) | Ajouter ces champs à la route et à l'écran Modifier le profil. |
| **PAM-504 Colonne de droite** | Les demandes pour toi viennent du serveur (`GET/api/help/for-me`). | — | Vérifier « PRs à relire », « avec qui construire » et « projets qui cherchent des contributeurs », qui semblent encore locaux. |

## 2. Pas commencé

- **IA** (§11), sur le même fournisseur que l'Assistant (`LLM_*`, Groq, `api/assistant.ts`) :
  - **PAM-307** : résumé du Pulse en tâche de fond, enregistré dans `ProjectSummary`, avec l'entry `PULSE_READY`. Aujourd'hui, rien n'écrit dans `ProjectSummary`.
  - **PAM-310** : extraction des skills et des besoins à l'import, et description de projet proposée (`api/import.ts` n'appelle aucune IA).
  - **PAM-311** : embeddings et critère de proximité sémantique du matching. La table `embedding` existe, `api/matching.ts` ne s'en sert pas. Il faut d'abord choisir le modèle d'embeddings (fin de PAM-005).
  - **PAM-904** : pré-calculer résumés et embeddings du seed.
- **Partage** :
  - **PAM-104** : prototype `satori` et `@resvg/resvg-wasm` dans un binaire `deno compile`, à valider avant tout le reste du partage ;
  - **PAM-305** : Share Card, `GET/api/user/card`, balises OG injectées par `prod-server.ts`, `sitemap.xml`.
- **Vitrines** :
  - **PAM-308** Project DNA, Health, Story : seulement à l'écran (`web/pages/project/pulse-tab.tsx`), sans calcul serveur ;
  - **PAM-309** Collaboration Map et Graph : les écrans existent (`web/pages/profile/collaboration-*.tsx`), mais ils lisent les fixtures.
- **PAM-408** : demandes de collaboration depuis un profil.
- **PAM-509** : digest quotidien par email. Le mode « digest » existe dans les préférences de matching (`api/matching.ts`), mais aucun email n'est envoyé : il faut un fournisseur d'emails et une tâche quotidienne (`every` de `api/lib/background.ts`).
- **PAM-510** : la limite de débit est en place sur les routes d'aide, de posts, de médias, de messages et d'import. Il faut l'ajouter à chaque nouvelle route d'écriture de la partie 1.
- **PAM-511** : conditions d'utilisation et politique de confidentialité (pages publiques, liens depuis la landing et la connexion).

## 3. Petits restes

- **PAM-113** : `/dev/socle` est encore servi en prod. La route `dev` de `web/app.tsx` est toujours présente : il faut la retirer du build de production.
- **PAM-115** : la copie quotidienne des sauvegardes hors de la VM. Les copies horaires sont dans le volume (`/data/backups`), il manque l'envoi vers un autre stockage (à voir avec Systalink).
- **PAM-005** : choisir le modèle d'embeddings (l'Assistant est déjà sur Groq).
- **GitHub App « Pamoja Demo »** : vérifier qu'elle est publique (GitHub, Settings, Developer settings, GitHub Apps, Pamoja Demo, Advanced, « Make public »). Sinon, tout autre compte reçoit un 404 à la connexion.
- **PAM-002** : noter la répartition des blocs dans le TODO.

## 4. Préparation de la démo (§18.1)

- **PAM-901** : seed final. `api/seed.ts` n'insère **aucune review** aujourd'hui : il manque les 14 reviews de Moussa (3 demandeurs, 2 projets), en `source = demo`.
- **PAM-902** : repo public OpenPay Africa sous le compte perso d'Abdou, avec l'app « Pamoja Demo » installée et le webhook testé vers la prod.
- **PAM-903** : deux vrais comptes GitHub prêts, et la PR #81 ouverte par Abdou, sans review.
- **PAM-905** : test de bout en bout du scénario, sur le modèle de `qa/` de Tournament. `qa/` ne contient aujourd'hui qu'un test de charge (`qa/load/`).
- **PAM-906** : vérifier en prod que les notifications arrivent sans recharger la page (le `h2` est déjà vérifié).
- **PAM-907** : tester une restauration de sauvegarde, avec la commande de `docs/deploiement.md`.
- **PAM-908** : répéter le plan B webhook (Redeliver depuis la GitHub App, resynchronisation manuelle).
- **PAM-909** : trois répétitions complètes et chronométrées en prod.

## Accès à la VM

`ssh pamoja`, depuis un poste dont la clé est autorisée sur le serveur. Chaque personne pose sa propre clé publique ; une clé privée ne se partage jamais. Mettre à jour la démo après une fusion sur `master` et le passage du workflow `publish` :

```bash
ssh pamoja "cd /root/pamoja && docker compose pull && docker compose --profile https up -d"
```

Les secrets sont dans `/root/pamoja/.env.production` et `/root/pamoja/.env`, sur la VM seulement.
