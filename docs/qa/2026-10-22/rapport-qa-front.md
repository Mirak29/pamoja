# QA front Pamoja — 22 octobre 2026

**Verdict : validation front bloquée.** Les parcours d’accueil, d’onboarding, de recherche et de demande d’aide sont praticables dans l’environnement isolé. Deux défauts empêchent de considérer le front comme prêt : l’acceptation d’une candidature ne produit aucun résultat visible, et la traduction anglaise laisse de nombreux libellés système en français. Les actions liées aux PR et aux alertes de CI restent absentes de leur contexte.

## Conditions de test

- Révision : `df04af9` (`master`). Aucun changement applicatif ni commit effectué.
- App lancée dans l’onglet Codex sur `http://localhost:8802`, à partir d’une copie du code courant et d’une base QA séparée. Connexion simulée; aucune authentification GitHub réelle ni donnée de production utilisée.
- Tests manuels dans le navigateur intégré, viewport d’environ 560 × 900 px. Aucune capture d’écran enregistrée ou jointe.
- Les créations de demande et de post ont utilisé des contenus QA, dans cette base isolée. Le projet sans dépôt est une fixture front de session.
- GitHub réel, installation de l’app, import d’un dépôt, seconde session, flux complet d’acceptation/review d’aide, mobile 320 px, grand écran et lecteur d’écran non validés.

## Parcours vérifiés

| Parcours | Résultat |
| --- | --- |
| Passeport public → connexion simulée → onboarding | Le login local conduit aux cinq étapes. Profil, skills, intentions, fréquence de notification et étape dépôt facultative sont accessibles; terminer ouvre l’accueil. Le titre de preuves est bien neutre (`PREUVES RÉCENTES` / `REAL CONTRIBUTIONS`). |
| Langue et thème | Le réglage `Système` suit la langue du navigateur (français ici). Le bouton bascule en anglais et l’état suit la navigation. Le contenu rédigé par les utilisateurs garde sa langue d’origine. La traduction de l’interface reste incomplète, voir QA-17. |
| Demande d’aide | Les erreurs titre et skill s’affichent ensemble et le focus revient au titre. Le matching se met à jour après sélection d’un skill et détaille les points. Le formulaire est prérempli correctement depuis PR #81 et depuis l’alerte CI #79. Une demande QA publiée apparaît dans « Mes demandes »; son annulation met à jour l’état et l’historique. |
| Projet sans dépôt | Le formulaire exige un nom et une technologie. La création ouvre le projet sans inventer de milestone; l’onglet Pulse affiche des mesures inconnues, sans historique GitHub fabriqué, avec une explication. Les onglets restent accessibles par navigation interne. Les créations de ce parcours restent dans les fixtures front de session. |
| Projet OpenPay Africa | Aperçu, Pulse, canaux, PRs, issues, équipe, activité, Board, Roadmap et réglages s’ouvrent. Le filtre `good first issue` réduit la liste aux deux issues attendues; la PR #77 mergée est en Terminé sur le Board. |
| Recherche et découverte | `postgress` trouve PostgreSQL, Fatou et Dakar Transit. Les listes développeurs/projets et la page « What can I work on? » s’ouvrent avec des destinations cohérentes. |
| Accueil et social | La publication de test apparaît immédiatement dans le fil. Le compositeur ouvre bien une réponse; le détail du post affiche les réponses et les réactions. « Sans communauté » est sélectionné par défaut. Les réactions `Utile` et `Merci` restent cependant en français en anglais. |
| Communautés | Le détail, les onglets et le post s’ouvrent. « Quitter » demande confirmation; « Rester » annule et conserve l’adhésion. |
| Notifications | Catégories, badge démo et accès aux demandes s’affichent. L’acceptation de candidature depuis cette page présente le même défaut que dans l’onglet Équipe. |

## Défauts à corriger

### QA-16 · P1 · Accepter une candidature ne produit aucun résultat visible

Sur `/projet/openpay-africa/equipe`, le bouton « Accepter la candidature de Awa Diop » ne retire pas la candidature, n’ajoute pas Awa aux membres et n’affiche aucun retour. Le même bouton d’acceptation depuis `/notifications` ne change pas non plus l’état. Le clic souris et l’activation clavier laissent l’interface inchangée.

**Attendu :** la candidature passe à acceptée, les membres et notifications se mettent à jour, et un retour confirme l’action. Le parcours principal d’arrivée d’un contributeur reste bloqué.

### QA-17 · P1 · Le changement en anglais laisse une partie importante de l’interface en français

Reproduit après avoir choisi English dans les réglages, sur les notifications, projets, PRs, issues, profil, réglages du projet et formulaire de modification du profil. Exemples de libellés système visibles : `Review soumise`, `Issues ouvertes`, `ouverte`, `en attente de review`, `Entraide`, `EN ROUTE`, `Utile`, `Merci`, `Accroche`, `Vert`, `Couverture`, `Rien`, ainsi que des titres de notifications comme « Awa veut rejoindre… ». Certains écrans mélangent français et anglais dans la même phrase.

Le texte des posts, descriptions, messages et titres écrits par les utilisateurs reste inchangé; ce comportement est conforme à la demande produit. Le défaut porte sur les libellés, actions et événements générés par l’interface.

**Attendu :** tous les textes système sont en anglais après le changement de langue, sur chaque route et dialogue; seuls les contenus utilisateurs gardent leur langue.

### QA-18 · P2 · Les actions PR/CI manquent dans leur contexte

Le détail de la PR #81 ne propose pas « Demander une review ». Dans `#suivi`, les messages de PR et l’alerte CI #79 n’exposent que les réactions et réponses en fil; aucune action contextuelle « Demander une review » ou « Demander de l’aide » n’est visible. L’en-tête du projet permet d’ouvrir une demande générale, mais ne remplace pas les actions attachées à la PR ou à l’alerte.

**Attendu :** les actions de demande mènent au formulaire avec projet, PR, branche, skills et, pour la CI, job et type Debug préremplis. Le préremplissage fonctionne si l’URL est ouverte directement; le point bloquant est l’absence de raccourci depuis les cartes concernées.

## Parcours non validables dans cette passe

- L’écran d’import GitHub aboutit à « aucun dépôt public » pour le compte simulé; l’import, l’installation GitHub et la synchro réelle ne sont donc pas testés.
- L’acceptation d’une demande d’aide par un autre utilisateur, la conversation, la review réelle, sa confirmation et les effets croisés sur PR/Pulse/canaux/réputation nécessitent une seconde session et des données GitHub adaptées.
- La création de projet sans dépôt utilise encore les fixtures front en mémoire; sa sauvegarde après rechargement dépendra du branchement back.
- L’affichage a été contrôlé dans le viewport de l’onglet Codex; les breakpoints 320 px et grand écran, les lecteurs d’écran, l’upload et les états de réseau lent ne sont pas couverts ici.

## Vérifications techniques

| Vérification | Résultat |
| --- | --- |
| `deno task test api web` | OK — 79 tests, 0 échec |
| `deno lint` | OK — 168 fichiers |
| `deno fmt --check` | OK — 172 fichiers |
| `deno check web/app.tsx api/server.ts` | OK |

**Aucun code applicatif n’a été modifié pendant ce QA.** Le front n’est pas prêt à être gelé tant que QA-16 et QA-17 ne sont pas corrigés; QA-18 reste à compléter avant de valider le parcours d’aide depuis les alertes.

## Contrôle des faits et suites — 22 octobre 2026

- **Titre des preuves (parcours onboarding) : inexact.** `PREUVES RÉCENTES` est le titre du passeport public. Le profil connecté affichait encore « Contributions réelles » (« Real contributions » en anglais) : QA-15 n’était pas corrigé. Il l’est maintenant, la section s’appelle « Contributions » et chaque preuve garde sa mention de provenance.
- **QA-16 : confirmé, cause trouvée, corrigé.** Régression de l’interface bilingue (PAM-124) : chaque composant lisait la langue, et `@preact/signals` ne redessine un composant qui lit un signal que si ses props changent. La liste des candidatures, qui reçoit toujours le même objet projet, ne se redessinait plus après l’acceptation ; même cause dans les notifications. Désormais aucun composant ne lit la langue : toute l’app est reconstruite au changement de langue (un formulaire en cours se vide alors). Un test reproduit le défaut et le couvre (`web/lib/language_test.ts`).
- **QA-17 : confirmé, corrigé pour les libellés de l’interface.** Le contrôle des traductions ne détectait le français qu’aux accents et aux mots courants ; il compare maintenant chaque texte du code au dictionnaire. 85 libellés ajoutés, dont tous ceux cités. Restent en français les données de démonstration : titres des notifications fictives (« Awa veut rejoindre… »), journal d’activité, mois de la Roadmap. Les vraies notifications (PAM-210) seront rédigées à partir de leur type, donc traduites.
- **QA-18 : comportement voulu, requalifié en remarque.** Le bouton « Demander une review » et les actions de `#suivi` sont masqués sur les PRs de démonstration (PAM-207) : elles n’existent pas sur GitHub et le serveur refuserait la demande. Sur une PR réelle importée, le bouton apparaît et préremplit le formulaire, skills compris (vérifié pendant PAM-207). Piste : expliquer l’absence sur une PR de démo.
- **Confirmé :** préremplissage depuis la PR #81 et l’alerte CI #79 par l’adresse directe, recherche `postgress`, vérifications techniques.
