# Modélisation du backend

Diagrammes du backend de Pamoja, tirés du [cahier des charges](../cahier-des-charges.md). Chacun est écrit en Mermaid : GitHub l'affiche tel quel, et Excalidraw sait l'importer (**Plus d'outils → Mermaid vers Excalidraw**, puis coller le bloc sans les balises ```` ```mermaid ````).

| # | Diagramme | Type | Dans Excalidraw | Cahier |
| --- | --- | --- | --- | --- |
| 1 | Architecture de production | Flowchart | Formes éditables | §5, §13, §17.4 |
| 2 | Entité-relation, en cinq domaines | ER | Image : redessiner à partir du bloc | §14 |
| 3 | États : demande d'aide, livraison webhook, synchro d'un repo | État | Image : redessiner à partir du bloc et du tableau | §5.4, §5.5, §7.2 |
| 4 | Séquences : connexion, synchro live, boucle de démo | Séquence | Formes éditables | §5.3, §5.4, §7, §18 |
| 5 | Flowcharts : traitement d'un webhook, matching | Flowchart | Formes éditables | §5.5, §7.3 |
| 6 | Modèle de domaine | Classe | Formes éditables | §7, §8 |

Les fichiers Excalidraw (`.excalidraw`) et leurs exports PNG se rangent dans ce dossier, avec le même numéro que leur section (`1-architecture.excalidraw`, `1-architecture.png`).

## 1. Architecture de production

Une seule VM Systalink, une seule instance de l'app. Le navigateur n'écrit qu'en HTTP et ne reçoit que des signaux en SSE ; GitHub n'est jamais appelé pendant l'affichage d'une page.

```mermaid
flowchart LR
  subgraph Clients
    WEB["Navigateur<br/>SPA Preact"]
    GH["GitHub<br/>App en lecture seule"]
  end
  subgraph VM["VM Systalink (Docker)"]
    CADDY["Caddy<br/>HTTPS, HTTP/2, SSE sans tampon"]
    subgraph APP["Binaire Deno (deno compile)"]
      API["API @01edu/api<br/>routes GET / POST"]
      SSE["Route SSE<br/>GET /api/events"]
      HOOK["Route webhook<br/>POST /api/github/webhook"]
      WQ["Worker webhooks<br/>file WebhookDelivery"]
      JOBS["Tâches planifiées<br/>resynchro horaire, vagues de matching,<br/>expirations, digest, sauvegardes"]
      IDX["Worker d'index<br/>entries vers Meilisearch"]
    end
    DB[("SQLite<br/>tables + entries<br/>volume persistant")]
    MEILI[("Meilisearch<br/>non exposé")]
  end
  IA["Fournisseur IA<br/>résumés, embeddings"]
  BAK[("Copie quotidienne<br/>stockage Systalink")]

  WEB -->|"HTTPS"| CADDY
  GH -->|"webhooks signés HMAC"| CADDY
  CADDY --> API
  CADDY --> SSE
  CADDY --> HOOK
  API --> DB
  HOOK -->|"insère la livraison, répond 202"| DB
  WQ -->|"tables + entries, une transaction"| DB
  DB -.->|"insertListeners, trigger"| SSE
  SSE -.->|"signal : quelque chose a changé"| WEB
  API -->|"login, import, 3 contrôles"| GH
  JOBS -->|"requêtes conditionnelles ETag"| GH
  JOBS --> DB
  IDX --> MEILI
  API -->|"GET /api/search, repli LIKE"| MEILI
  JOBS -->|"tâche de fond, repli déterministe"| IA
  DB -.->|"VACUUM INTO horaire"| BAK
```

## 2. Entité-relation

Conventions (§12.5, §14) : clé primaire `INTEGER` nommée d'après la table (`userId`, `helpRequestId`), comme dans Tournament, unicité par index, dates en `REAL` (millisecondes), JSON validé à l'écriture, clés étrangères appliquées (`PRAGMA foreign_keys = ON`). Il n'y a pas de table d'activité : l'activité est une requête sur les entries. Les liens « polymorphes » (`targetType` + `targetId`) sont notés en commentaire, sans flèche. Les références vers la même table (`Post.parentId`, `ProjectMessage.parentMessageId`…) sont dessinées comme des FK mais n'ont pas de contrainte SQLite (§12.5).

Un diagramme par domaine ; `User` revient dans chacun comme point d'ancrage.

### 2.1 Identité et profil

```mermaid
erDiagram
  User ||--|| Profile : "a"
  User ||--o{ UserSkill : "possède"
  Skill ||--o{ UserSkill : "est possédé"
  Skill ||--o{ SkillAlias : "a pour alias"
  User ||--o{ UserIntent : "déclare"
  User ||--o{ Follow : "suit"

  User {
    int userId PK
    int githubId UK
    text githubUsername
    text avatarUrl
    text email "facultatif"
    real suspendedUntil "facultatif"
    text source "demo, github, platform"
    real createdAt
    real updatedAt
  }
  Profile {
    int profileId PK
    int userId FK, UK
    text displayName
    text headline "facultatif"
    text bio "facultatif"
    text country "facultatif"
    text city "facultatif"
    text website "facultatif"
    text coverUrl "facultatif"
    text theme
    text accent
    text availability
    json sectionOrder "facultatif"
    json featured "facultatif"
    text matchingMode "instant, digest, off"
    json matchingFilters "facultatif"
    real createdAt
    real updatedAt
  }
  Skill {
    int skillId PK
    text slug UK
    text name
    text category
  }
  SkillAlias {
    int skillAliasId PK
    text alias UK
    int skillId FK
  }
  UserSkill {
    int userSkillId PK
    int userId FK
    int skillId FK
    text source "declared, github, platform_activity"
    real createdAt
  }
  UserIntent {
    int userIntentId PK
    int userId FK
    text intent
  }
  Follow {
    int followId PK
    int followerId FK
    text targetType "user, project, community"
    int targetId
    real createdAt
  }
```

### 2.2 GitHub

```mermaid
erDiagram
  User ||--o{ GithubInstallation : "installe"
  GithubInstallation ||--o{ Repository : "couvre"
  Project ||--o| Repository : "est lié à"
  Repository ||--o{ PullRequest : "contient"
  Repository ||--o{ Issue : "contient"
  Repository ||--o{ CiRun : "exécute"
  PullRequest ||--o{ CiRun : "déclenche"
  PullRequest ||--o{ Review : "reçoit"
  User |o--o{ Review : "est le reviewer"
  HelpRequest |o--o{ Review : "est validée par"
  Repository |o--o{ WebhookDelivery : "reçoit"

  GithubInstallation {
    int installationId PK
    int githubInstallationId UK
    text accountLogin
    text accountType "User ou Organization"
    int installedByUserId FK "facultatif"
    real createdAt
    real updatedAt
  }
  Repository {
    int repositoryId PK
    int projectId FK
    int githubId UK
    int installationId FK "facultatif"
    text owner
    text name
    text fullName
    text defaultBranch
    text syncMode "poll ou live"
    json etag "facultatif"
    real lastSyncedAt "facultatif"
    text source "demo, github, platform"
  }
  PullRequest {
    int pullRequestId PK
    int repositoryId FK
    int githubId
    int number "UNIQUE avec repositoryId"
    text title
    text state
    int authorGithubId
    int additions
    int deletions
    real mergedAt "facultatif"
    text source "demo, github, platform"
    real createdAt
    real updatedAt
  }
  Issue {
    int issueId PK
    int repositoryId FK
    int githubId
    int number "UNIQUE avec repositoryId"
    text title
    text state
    json labels
    int authorGithubId
    text source "demo, github, platform"
    real createdAt
    real updatedAt
  }
  Review {
    int reviewId PK
    int pullRequestId FK
    int githubReviewId UK
    int reviewerGithubId
    int reviewerUserId FK "facultatif"
    text state
    int commentCount
    real submittedAt
    int helpRequestId FK "facultatif"
    text source "demo, github, platform"
  }
  CiRun {
    int ciRunId PK
    int repositoryId FK
    int githubId
    text source "actions, checks, status"
    text name
    text headSha
    text branch
    int pullRequestId FK "facultatif"
    text conclusion "facultatif"
    text url
    real completedAt "facultatif"
  }
  WebhookDelivery {
    int deliveryId PK
    text githubDeliveryId UK
    text event
    int repositoryId FK "facultatif"
    json payload
    text status "received, processing, done, failed"
    int attempts
    text lastError "facultatif"
    real receivedAt
    real processingStartedAt "facultatif"
    real processedAt "facultatif"
  }
```

Aucune table de tokens : aucun token utilisateur n'est stocké (§5.2).

### 2.3 Projets

```mermaid
erDiagram
  User ||--o{ Project : "possède"
  Project ||--o{ ProjectMember : "a pour membres"
  User ||--o{ ProjectMember : "est membre"
  Project ||--o{ JoinRequest : "reçoit"
  User ||--o{ JoinRequest : "candidate"
  Project ||--o{ ProjectNeed : "exprime"
  Project ||--o{ Milestone : "planifie"
  Project ||--o{ Task : "organise"
  Milestone |o--o{ Task : "regroupe"
  User |o--o{ Task : "est assigné"
  Project ||--o{ ProjectMessage : "héberge"
  ProjectMessage |o--o{ ProjectMessage : "fil de réponses"
  ProjectMessage ||--o{ MessageReaction : "reçoit"
  User ||--o{ ChannelState : "lit"
  Project ||--o{ ChannelState : "a"
  Project ||--o{ ProjectSummary : "est résumé"

  Project {
    int projectId PK
    int ownerId FK
    text name
    text slug UK
    text description
    text vision "facultatif"
    text visibility "public ou unlisted"
    text status
    text source "demo, github, platform"
    real createdAt
    real updatedAt
  }
  ProjectMember {
    int projectMemberId PK
    int projectId FK
    int userId FK
    text role "owner, maintainer, contributor, reviewer, observer"
    real joinedAt
  }
  JoinRequest {
    int joinRequestId PK
    int projectId FK
    int userId FK
    json areas
    text availability
    text message
    text status
    real createdAt
  }
  ProjectNeed {
    int projectNeedId PK
    int projectId FK
    text type
    text title
    text description "facultatif"
    json skills
    text status
    real createdAt
    real updatedAt
  }
  Milestone {
    int milestoneId PK
    int projectId FK
    text title
    text description "facultatif"
    text status "planned, active, done"
    int position
    real createdAt
  }
  Task {
    int taskId PK
    int projectId FK
    int milestoneId FK "facultatif"
    text boardColumn "backlog, ready, in_progress, review, done"
    text title
    text description "facultatif"
    text priority "facultatif"
    int assigneeId FK "facultatif"
    int issueId FK "facultatif"
    int pullRequestId FK "facultatif"
    text rank "rang fractionnaire"
    real createdAt
    real updatedAt
  }
  ProjectMessage {
    int messageId PK
    int projectId FK
    text channel "general, help, announcements"
    int authorId FK
    text body
    int parentMessageId FK "facultatif, même table, sans contrainte"
    int parentEntryId "facultatif, alerte de suivi"
    real hiddenAt "facultatif"
    text source "demo, github, platform"
    real createdAt
  }
  ChannelState {
    int channelStateId PK
    int userId FK
    int projectId FK
    text channel "general, tracking, help, announcements"
    real lastReadAt "facultatif"
    text notify "all, mentions, mine, none"
  }
  MessageReaction {
    int messageReactionId PK
    int messageId FK
    int userId FK
    text emoji
  }
  ProjectSummary {
    int projectSummaryId PK
    int projectId FK
    text period
    text content
    text inputHash
    real createdAt
  }
```

Le canal `#suivi` n'a pas de table : il affiche les entries des webhooks.

### 2.4 Aide, matching, réputation

```mermaid
erDiagram
  User ||--o{ HelpRequest : "demande"
  User |o--o{ HelpRequest : "accepte"
  Project |o--o{ HelpRequest : "concerne"
  PullRequest |o--o{ HelpRequest : "porte sur"
  HelpRequest ||--o{ HelpMatch : "est proposée"
  User ||--o{ HelpMatch : "est matché"
  HelpRequest ||--o{ HelpMessage : "fil de la demande"
  User ||--o{ HelpMessage : "écrit"
  User ||--o{ Notification : "reçoit"
  User ||--o{ BadgeProgress : "progresse"

  HelpRequest {
    int helpRequestId PK
    int authorId FK
    int targetUserId FK "facultatif, collaboration request"
    int projectId FK "facultatif"
    int pullRequestId FK "facultatif"
    text category
    text title
    text description
    json skills
    text expectedLevel "facultatif"
    int estimatedMinutes "facultatif"
    text status "voir le diagramme d'état"
    int acceptedBy FK "facultatif"
    real acceptedAt "facultatif"
    real deliveredAt "facultatif"
    real confirmedAt "facultatif"
    real expiresAt
    text source "demo, github, platform"
    real createdAt
    real updatedAt
  }
  HelpMatch {
    int helpMatchId PK
    int helpRequestId FK
    int userId FK
    int score
    json reasons
    int wave
    bool newcomerSlot
    real notifiedAt "facultatif"
    text status "notified, accepted, declined, withdrawn, released"
  }
  HelpMessage {
    int helpMessageId PK
    int helpRequestId FK
    int authorId FK
    text body
    real createdAt
  }
  Notification {
    int notificationId PK
    int userId FK
    text type
    text category "for-you, projects, communities, social, system"
    int entryId "facultatif"
    int actorId FK "facultatif"
    json payload
    real readAt "facultatif"
    real createdAt
  }
  BadgeProgress {
    int badgeProgressId PK
    int userId FK
    text badge
    int level
    int count
    real updatedAt
  }
  Embedding {
    int embeddingId PK
    text targetType "user ou help_request"
    int targetId
    text model
    blob vector
    text inputHash
    real createdAt
  }
```

Les badges sont des constantes du code (§8.2) ; la réputation se calcule depuis les entries aux `fields` figés (§8.3), pas depuis ces tables.

### 2.5 Communautés, feed et modération

```mermaid
erDiagram
  Community ||--o{ CommunityMember : "réunit"
  User ||--o{ CommunityMember : "rejoint"
  User ||--o{ Post : "publie"
  Community |o--o{ Post : "accueille"
  Post |o--o{ Post : "réponse (parentId)"
  Post |o--o{ Post : "republication (repostOfId)"
  User ||--o{ Bookmark : "enregistre"
  Post ||--o{ Bookmark : "est enregistré"
  User ||--o{ Reaction : "réagit"
  User ||--o{ Report : "signale"
  Report |o--o{ ModerationAction : "est traité par"
  User ||--o{ ModerationAction : "modère"
  User ||--o{ Media : "téléverse"

  Community {
    int communityId PK
    text slug UK
    text name
    text type "technology, country, domain"
    text description
    text countryCode "facultatif"
    text source "demo, github, platform"
    real createdAt
  }
  CommunityMember {
    int communityMemberId PK
    int communityId FK
    int userId FK
    text role "member ou moderator"
    real joinedAt
  }
  Post {
    int postId PK
    int authorId FK
    int communityId FK "facultatif"
    int projectId FK "facultatif"
    text type
    text title "facultatif"
    text body
    json attachments "facultatif"
    int parentId FK "facultatif, même table, sans contrainte"
    int rootId FK "facultatif, même table, sans contrainte"
    int repostOfId FK "facultatif, même table, sans contrainte"
    int acceptedReplyId FK "facultatif, même table, sans contrainte"
    real hiddenAt "facultatif"
    text source "demo, github, platform"
    real createdAt
    real updatedAt
  }
  Reaction {
    int reactionId PK
    int userId FK
    text targetType
    int targetId
    text kind "like ou useful"
  }
  Bookmark {
    int bookmarkId PK
    int userId FK
    int postId FK
    real createdAt
  }
  Report {
    int reportId PK
    int reporterId FK
    text targetType
    int targetId
    text reason
    text comment "facultatif"
    text status "open, resolved, dismissed"
    real createdAt
    real resolvedAt "facultatif"
  }
  ModerationAction {
    int moderationActionId PK
    int moderatorId FK
    int reportId FK "facultatif"
    text targetType
    int targetId
    text action "dismiss, hide, warn, suspend, revoke_evidence"
    text reason
    real until "facultatif"
    real createdAt
  }
  Media {
    int mediaId PK
    int ownerId FK
    text storageKey
    text mime
    int width
    int height
    int bytes
    text targetType "facultatif, profile_cover, project_gallery, post, help_request, message"
    int targetId "facultatif"
    int position
    real hiddenAt "facultatif"
    text source "demo, github, platform"
    real createdAt
  }
```

### 2.6 Entries

Les entries (`@01edu/db/entries`) ne sont pas une table métier mais le journal de tout ce qui arrive : la réputation, l'activité, la recherche et le temps réel en dépendent. Relations déclarées dans `initEntries` : `userId`, `projectId`, `helpRequestId`, `pullRequestId`, `issueId`, `taskId`, `messageId`, `postId`, `communityId`, `notificationId`. Les types et leurs destinataires sont au §13.3.

## 3. Diagrammes d'état

### 3.1 Demande d'aide

Le diagramme central : seul `completed` produit de la réputation.

```mermaid
stateDiagram-v2
  [*] --> open : demande publiée, vague 1 notifiée
  open --> accepted : un aidant accepte (atomique)
  open --> cancelled : le demandeur annule
  open --> expired : 7 jours sans acceptation
  accepted --> review_submitted : review GitHub validée (5 conditions)
  accepted --> delivered : l'aidant déclare « terminé » (sans PR)
  accepted --> open : l'aidant se désiste
  accepted --> open : libérée après 72 h sans activité
  accepted --> cancelled : le demandeur annule
  review_submitted --> completed : « Utile ? » oui
  delivered --> completed : « Utile ? » oui
  review_submitted --> closed_unhelpful : « Utile ? » non
  delivered --> closed_unhelpful : « Utile ? » non
  review_submitted --> closed_unconfirmed : 7 jours sans réponse
  delivered --> closed_unconfirmed : 7 jours sans réponse
  expired --> open : le demandeur rouvre
  closed_unhelpful --> open : le demandeur rouvre
  closed_unconfirmed --> open : le demandeur rouvre
  completed --> [*]
  cancelled --> [*]
```

| De | Vers | Déclencheur | Effet |
| --- | --- | --- | --- |
| — | `open` | `POST/api/help/create` | Vague 1 (5 développeurs, dont 1 place « prometteur ») ; entries `HELP_REQUEST_CREATED`, `HELP_REQUEST_MATCHED` |
| `open` | `accepted` | `POST/api/help/accept` | `UPDATE … WHERE status = 'open'` : une seule acceptation gagne ; le fil de la demande s'ouvre ; `HELP_REQUEST_ACCEPTED` |
| `open` | `open` | 2 h sans acceptation | Vague suivante, en excluant les aidants sortis |
| `open` | `expired` | 7 jours | `HELP_REQUEST_EXPIRED` |
| `accepted` | `review_submitted` | Webhook `pull_request_review` validé | `REVIEW_SUBMITTED` ; la PR passe en « review reçue » |
| `accepted` | `delivered` | `POST/api/help/deliver` | Le demandeur reçoit « Utile ? » |
| `accepted` | `open` | `POST/api/help/withdraw` ou `release` | `HelpMatch` en `withdrawn` / `released` ; `HELP_REQUEST_WITHDRAWN` / `RELEASED` |
| `review_submitted`, `delivered` | `completed` | `POST/api/help/confirm` | `REVIEW_HELP_CONFIRMED` ou `HELP_CONFIRMED` aux `fields` figés ; évaluateur de badges |
| `review_submitted`, `delivered` | `closed_unhelpful` | Réponse « non » | Aucune réputation |
| `review_submitted`, `delivered` | `closed_unconfirmed` | 7 jours sans réponse | Rappel à 24 h ; aucune réputation |
| `expired`, `closed_*` | `open` | `POST/api/help/reopen` | `HELP_REQUEST_REOPENED` ; mêmes données, vague 1 |
| `open`, `accepted` | `cancelled` | `POST/api/help/cancel` | Final |

### 3.2 Livraison d'un webhook

`WebhookDelivery` sert de file persistante : elle survit aux redémarrages.

```mermaid
stateDiagram-v2
  [*] --> received : signature HMAC valide, insérée, réponse 202
  received --> processing : le worker la prend
  processing --> done : tables + entries en une transaction
  processing --> received : erreur, nouvel essai (attempts + 1, délai croissant)
  processing --> failed : 5e échec, alerte dans les logs
  processing --> received : bloquée plus de 2 min (reprise au démarrage)
  done --> [*]
  failed --> [*]
```

Une livraison déjà connue (`githubDeliveryId`) n'est pas réinsérée, et le traitement est idempotent : la rejouer est sans effet de bord.

### 3.3 Synchro d'un projet

```mermaid
stateDiagram-v2
  [*] --> none : projet créé sans repo
  [*] --> poll : import niveau 1
  [*] --> live : import d'un repo déjà couvert par une installation (propriétaire du repo personnel)
  none --> poll : repo lié
  poll --> live : installation de l'app, 3 contrôles réussis
  live --> poll : app désinstallée ou repo retiré de l'installation
```

En `poll`, la plateforme relit le repo toutes les 15 minutes (requêtes conditionnelles) ; en `live`, les webhooks arrivent en quelques secondes. Dans les deux cas, une resynchronisation horaire rattrape les webhooks perdus.

## 4. Diagrammes de séquence

### 4.1 Connexion avec GitHub

```mermaid
sequenceDiagram
  autonumber
  actor Dev as Développeur
  participant Web as SPA
  participant API as API Deno
  participant GH as GitHub
  participant DB as SQLite

  Dev->>Web: « Continuer avec GitHub »
  Web->>API: GET /api/auth/github
  API-->>Web: URL d'autorisation + state
  Web->>GH: redirection vers l'autorisation
  GH-->>Web: callback avec code et state
  Web->>API: POST /api/auth/github/callback (code, state)
  API->>API: vérifie le state
  API->>GH: échange le code contre un token
  API->>GH: GET /user
  GH-->>API: githubId, login, avatar
  API->>DB: crée ou retrouve User par githubId, entry USER_LOGIN
  API->>API: jette le token GitHub
  API-->>Web: cookie session (httpOnly, secure, SameSite=Lax)
  Web-->>Dev: onboarding (nouveau) ou page d'origine
```

### 4.2 Passage en synchro live (installation de l'app)

```mermaid
sequenceDiagram
  autonumber
  actor Owner as Propriétaire
  participant Web as SPA
  participant API as API Deno
  participant GH as GitHub
  participant DB as SQLite

  Owner->>Web: « Activer la synchro live »
  Web->>GH: page d'installation de l'app
  Owner->>GH: coche le repo, installe
  GH-->>Web: Setup URL avec installation_id, setup_action, code
  Web->>API: POST /api/github/installation/confirm
  API->>GH: échange le code contre un token temporaire
  API->>GH: 1. Identité : GET /user
  GH-->>API: githubId du compte connecté ?
  API->>GH: 2. Couverture : GET /user/installations/{id}/repositories
  GH-->>API: le repo y figure ?
  API->>GH: 3. Droit : GET /repos/{owner}/{repo}
  GH-->>API: permissions.admin ou maintain ?
  API->>API: jette le token
  alt les trois contrôles passent
    API->>DB: Repository.syncMode = live, GithubInstallation enregistrée
    API-->>Web: synchro live active
  else un contrôle échoue
    API-->>Web: refus, avec le contrôle en échec
  end
```

### 4.3 Boucle de démo : de la demande à la preuve

Le scénario du §18, côté serveur.

```mermaid
sequenceDiagram
  autonumber
  actor Abdou
  actor Moussa
  participant API as API Deno
  participant DB as SQLite + entries
  participant SSE as Route SSE
  participant W as Worker webhooks
  participant GH as GitHub

  Abdou->>API: POST /api/help/create (PR 81, Go, SQLite, Backend)
  API->>DB: HelpRequest open, score des candidats
  API->>DB: HelpMatch vague 1, Notification, entry HELP_REQUEST_MATCHED
  DB-->>SSE: trigger : Moussa est matché
  SSE-->>Moussa: signal, toast « Ce projet a besoin de toi »
  Moussa->>API: POST /api/help/accept
  API->>DB: UPDATE ... WHERE status = 'open' (une seule ligne)
  API->>DB: entry HELP_REQUEST_ACCEPTED
  DB-->>SSE: trigger : demandeur et membres du projet
  SSE-->>Abdou: signal, la page relit la demande
  Moussa->>GH: review de la PR 81 sur GitHub
  GH->>API: webhook pull_request_review (HMAC)
  API->>DB: WebhookDelivery received
  API-->>GH: 202
  W->>DB: prend la livraison (processing)
  W->>W: valide les 5 conditions (§7.5)
  W->>DB: Review, PR en review reçue, HelpRequest review_submitted, entries REVIEW_SUBMITTED et PR_REVIEWED, livraison done
  DB-->>SSE: trigger : demandeur, membres et abonnés
  SSE-->>Abdou: signal, « Review soumise », alerte dans suivi
  Abdou->>API: POST /api/help/confirm (oui)
  API->>DB: HelpRequest completed, entry REVIEW_HELP_CONFIRMED (fields figés)
  API->>DB: évaluateur de badges, BadgeProgress, BADGE_UNLOCKED si niveau franchi
  DB-->>SSE: trigger : l'aidant et les membres
  SSE-->>Moussa: signal, profil et badge à jour
```

## 5. Flowcharts

### 5.1 Traitement d'un webhook

```mermaid
flowchart TD
  A["POST /api/github/webhook"] --> B{"Signature HMAC<br/>valide ?"}
  B -->|non| B1["401, rien n'est écrit"]
  B -->|oui| C{"githubDeliveryId<br/>déjà connu ?"}
  C -->|oui| C1["202, ignoré"]
  C -->|non| D["INSERT WebhookDelivery<br/>status = received"]
  D --> E["202 en moins de 10 s"]
  D -.-> F["Worker : prend la livraison<br/>status = processing"]
  F --> G{"Type d'événement"}
  G -->|"pull_request"| H1["PullRequest, entries PR_OPENED / PR_MERGED / PR_CLOSED<br/>une PR mergée passe sa carte en Done"]
  G -->|"pull_request_review"| H2["Review, entry PR_REVIEWED<br/>vérifie les 5 conditions d'une demande d'aide"]
  G -->|"workflow_run, check_run, status"| H3["CiRun, entry CI_FAILED ou CI_FIXED"]
  G -->|"issues, issue_comment"| H4["Issue, entry ISSUE_UPDATED"]
  G -->|"release"| H5["entry RELEASE_PUBLISHED"]
  G -->|"installation*"| H6["GithubInstallation, couverture des repos"]
  H2 --> R{"Demande accepted sur cette PR<br/>et review de l'aidant ?"}
  R -->|oui| R1["HelpRequest review_submitted<br/>entry REVIEW_SUBMITTED"]
  R -->|non| T
  R1 --> T
  H1 --> T["Une transaction : tables + entries<br/>status = done"]
  H3 --> T
  H4 --> T
  H5 --> T
  H6 --> T
  T --> U["Les triggers diffusent en SSE"]
  F -->|erreur| X{"moins de 5 essais ?"}
  X -->|oui| X1["attempts + 1, lastError<br/>nouvel essai avec délai croissant"]
  X -->|non| X2["status = failed<br/>alerte dans les logs"]
```

### 5.2 Calcul du matching

```mermaid
flowchart TD
  A["Demande publiée ou vague suivante"] --> B["Candidats : tous les développeurs"]
  B --> C["Exclure : le demandeur, matching sur Off,<br/>aidants sortis de cette demande,<br/>10 notifications déjà reçues aujourd'hui"]
  C --> D["Score sur 100 par candidat"]
  D --> D1["Skills requis possédés : 45"]
  D --> D2["Type d'aide accepté : 15"]
  D --> D3["Aides confirmées sur ces skills : 15"]
  D --> D4["Proximité sémantique (embeddings) : 10<br/>0 si l'IA est indisponible"]
  D --> D5["Disponibilité : 10"]
  D --> D6["Affinité (communautés, projet suivi) : 5"]
  D1 --> E["Garder ceux au-dessus de leur score minimum"]
  D2 --> E
  D3 --> E
  D4 --> E
  D5 --> E
  D6 --> E
  E --> F["Trier par score"]
  F --> G["Vague : 4 meilleurs + 1 place<br/>« nouveau profil prometteur » (moins de 3 aides)"]
  G --> H["HelpMatch (score, raisons, vague)<br/>Notification + entry HELP_REQUEST_MATCHED"]
  H --> I{"Acceptée en 2 h ?"}
  I -->|oui| J["Fin du matching"]
  I -->|non| K["Vague suivante : 5 suivants"]
  K --> C
```

« Pourquoi ce match ? » affiche exactement les critères qui ont compté, avec leurs points.

## 6. Modèle de domaine

Le back n'a presque pas de classes (des routes, des fonctions et des tables) : ce diagramme montre les objets métier, leurs règles et leurs liens, sans détail de stockage.

```mermaid
classDiagram
  direction LR
  class Developer {
    githubId
    skills
    intents
    matchingMode
    proposerSonAide()
    suivre()
  }
  class Project {
    slug
    syncMode
    needs
    importer()
    activerSynchroLive()
  }
  class HelpRequest {
    category
    skills
    status
    publier()
    accepter()
    seDesister()
    confirmer()
    rouvrir()
  }
  class Match {
    score
    raisons
    vague
    nouveauProfilPrometteur
  }
  class HelpThread {
    messages
    ecrire()
  }
  class Review {
    githubReviewId
    state
    validerPourUneDemande()
  }
  class Proof {
    dimension
    source
    fieldsFiges
    rulesVersion
  }
  class Badge {
    niveau
    progression
    evaluer()
  }
  class Community {
    type
    rejoindre()
    publier()
  }
  class Post {
    type
    repondre()
    republier()
    accepterLaReponse()
  }

  Developer "1" --> "*" Project : possède / est membre
  Developer "1" --> "*" HelpRequest : demande
  HelpRequest "1" --> "*" Match : vagues
  Match "*" --> "1" Developer : notifie
  HelpRequest "0..1" --> "1" Developer : acceptée par
  HelpRequest "1" --> "0..1" HelpThread : fil
  HelpRequest "*" --> "0..1" Project : concerne
  Review "0..1" --> "1" HelpRequest : valide
  HelpRequest "1" --> "0..1" Proof : confirmée, produit
  Proof "*" --> "1" Developer : appartient à
  Badge "*" --> "1" Developer : progression de
  Badge ..> Proof : calculé depuis
  Developer "*" --> "*" Community : membre
  Post "*" --> "0..1" Community : publié dans
  Post "0..1" --> "*" Post : réponses
```
