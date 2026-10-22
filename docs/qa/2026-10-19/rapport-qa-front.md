# QA front Pamoja — 19 octobre 2026

**Verdict : validation partielle, gel front non acquis.** Les retours du QA du 10 octobre sont pour la plupart corrigés. Le parcours de demande d’aide reste impossible à valider de bout en bout tant que son cycle de vie et le matching serveur ne sont pas livrés. Une nouvelle contradiction touche la provenance des preuves du profil.

## Conditions et limites

- Révision inspectée : `9113e89`.
- App locale `http://localhost:8800`, session de développement Abdou via la connexion simulée.
- Parcours observés dans le navigateur intégré : onboarding (étapes 1–2), création d’aide et préremplissage depuis la PR #81, détail/acceptation/désistement d’une demande de démo, projet (aperçu, Pulse, PRs, issues, équipe, activité, Board, Roadmap, réglages, canaux), Aide, profil/partage, notifications, Explorer, recherche typo, communautés, connexion et 404.
- Les formulaires de création/modification, la candidature, la publication, l’envoi d’un message et l’installation GitHub n’ont pas été soumis. Une acceptation et un désistement ont été joués sur la demande fictive `h1` en mémoire navigateur ; ils ont disparu au rechargement. Aucune écriture métier via l’API n’a été exécutée.
- Le login simulé a ouvert une session locale et créé l’entrée de connexion attendue. Aucun parcours d’écriture métier (projet, demande, post, communauté ou message) ni aucune action externe GitHub n’a été exécuté.
- Desktop grand format, mobile physique, lecteur d’écran, upload et parcours multiutilisateur non revalidés dans cette passe. L’affichage intégré observé était étroit ; le breakpoint 320 px a été contrôlé dans le code.

## Parcours et cohérence

| Parcours | Résultat observé |
| --- | --- |
| Landing → connexion simulée → onboarding | Arrive sur l’étape 1, données de profil cohérentes ; étape Skills et normalisation `postgres` → `PostgreSQL` fonctionnelles. Étapes 3–5 et sauvegarde finale non soumises. |
| Demande d’aide depuis OpenPay | Projet et PR #81 proposés ; sélection de la PR remplit titre, description, branche `feat/payment-tx`, Go, SQLite et Backend. Aperçu matching montre deux profils. |
| Formulaire d’aide vide | Erreurs de titre et de skill affichées ensemble ; le focus revient au titre. Aucun envoi. |
| Accepter h1 → contacter Kofi | Le CTA ouvre le fil privé entre les deux personnes avec champ de message. La voie bloquée vers `#aide` a disparu. Aucun message envoyé. |
| Se désister → Aide / Pour moi | Confirmation explicite ; après retrait, h1 disparaît de la liste et le compteur passe de 3 à 2. |
| Projet OpenPay | Les compteurs du projet, les 5 issues et les 5 PR ouvertes concordent. Pulse, équipe, activité, Board, Roadmap et réglages sont accessibles. La fiche #81 indique toujours « en attente de review » et aucune review, comme attendu pour les données courantes. |
| Canaux | En ouvrant #général puis #suivi, les non-lus passent de 6 à 5 puis à 1 (seul #aide reste non lu) ; ils restent à 1 après navigation interne vers le Board. |
| Profil → partage | Dialogue complet ; « Télécharger » affiche un toast visible devant le dialogue, avec l’explication que le PNG viendra côté serveur. |
| Explorer, recherche, communautés, notifications | Listes et destinations accessibles ; `postgress` retrouve PostgreSQL, Fatou et Dakar Transit. Les notifications affichent la provenance démo. |
| Connexion et 404 | Une seule balise `h1` sur ces vues et sur l’étape d’onboarding observée ; la 404 propose accueil et exploration. |

## Retest des défauts du 10 octobre

| ID | État actuel |
| --- | --- |
| QA-01 — aidant sans accès à `#aide` | **Corrigé et vérifié** sur la demande de démo : fil privé et composer présents après acceptation. La persistance serveur attend PAM-208. |
| QA-02 — review confirmée non répercutée | **Non validable, bloquant de périmètre.** La création est désormais réelle, mais l’acceptation, la détection de review et la confirmation de réputation restent en attente (PAM-208, PAM-211, PAM-212). Le parcours de review complète n’a pas été rejoué. |
| QA-03 — événement d’accueil sans projet | **Correction présente dans le code** : l’événement passe `project`, `text`, `at` et `session` explicitement. Déclencheur de synchro non rejoué. |
| QA-04 — mesures inventées sans historique | **Correction présente dans le code** : semaine vide pour un projet hors démo, mesures inconnues sans historique, langues lues du repo seulement. Création d’un projet sans repo non rejouée. |
| QA-05 — résumé Pulse bloqué | **Correction présente dans le code** : sans résumé IA, le texte déterministe de repli s’affiche immédiatement. Le résumé du projet OpenPay a un délai de présentation normal ; le cas d’un projet neuf n’a pas été créé pour ce test. |
| QA-06 — faux lien GitHub sans repo | **Correction présente dans le code** : le lien n’apparaît que si le projet est lié ; les réglages proposent les repos importables. Parcours sur un projet neuf non rejoué. |
| QA-07 — compteurs de canaux | **Corrigé pour la navigation de session et vérifié**. La sauvegarde durable/multiapp reste à PAM-412 (`ChannelState`). |
| QA-08 — demande retirée encore recommandée | **Corrigé et vérifié** : h1 disparaît de « Pour moi » juste après désistement. |
| QA-09 — toast masqué par le dialogue | **Corrigé et vérifié visuellement** : le toast de téléchargement apparaît au-dessus de la carte de partage. |
| QA-10 — simulation présentée comme vérifiée | **Correction présente dans le code** : les événements de session et projets de démo affichent « Donnée de démo ». |
| QA-11 — audience imposée au menu Créer | **Correction présente dans le code** : audience vide par défaut, communauté passée en contexte seulement. Dialogue non soumis. |
| QA-12 — recherche vide à 320 px | **Correction présente dans le code** : bouton de largeur minimale 42 px et icône non rétractable. Vue 320 px non réémulée dans cette passe. |
| QA-13 — deux `h1` | **Corrigé et vérifié** sur connexion, onboarding observé et 404. |
| QA-14 — pluriel « 1 PRs » | **Correction présente dans le code** via `counted()` ; scénario à une seule PR non rejoué. |

## Nouveau défaut

### QA-15 · P3 · Le titre « Contributions réelles » coiffe des preuves de démo

Sur `/@abdou`, le titre de section est « Contributions réelles », mais chacune des cinq preuves listées porte le badge « Donnée de démo ». Le profil met aussi en avant les compteurs de réputation construits depuis ces preuves. Le titre promet ce que les lignes démentent.

Le marquage des preuves, lui, est conforme : le cahier veut des preuves de démo affichées avec leur mention, à côté des preuves vérifiées par GitHub, sans jamais les confondre (§14, « Seed ») ; la démo montre même les deux sur le même profil, 14 reviews de démo et une 15e vérifiée (§18.2, étape 12). Les retirer de la section casserait ce scénario.

**Attendu :** un titre qui n'affirme pas la provenance (par exemple « Contributions »), ou qui la chiffre (« 1 vérifiée par GitHub · 14 de démo ») ; les preuves restent toutes listées avec leur mention. Reproduit le 19 octobre sur le profil connecté. Aucun correctif appliqué pendant cet audit.

## Vérifications techniques

| Vérification | Résultat |
| --- | --- |
| `deno lint` | OK — 164 fichiers |
| `deno fmt --check` | OK — 168 fichiers |
| `deno check web/app.tsx` | Non exécuté le 19 : cache npm incomplet et accès DNS au registre indisponible (`@preact/signals`). Relancé le 22 sur `master` (même code front que `9113e89`) : OK, avec `api/server.ts`. |
| `deno task test` | Échec le 19 avant le lancement des tests, pour la même raison. Relancé le 22 sur `master` : 79 tests réussis, aucun échec. |

## Suite conseillée

1. Corriger le titre de QA-15 sans retirer les preuves de démo (§18.2), et vérifier le même affichage sur le passeport public et la carte de partage.
2. Terminer PAM-208/209/211/212, puis rejouer la boucle demande → acceptation → review réelle → confirmation sur PR, Pulse, `#suivi`, activité et profil.
3. Rejouer création/import sans repo et l’onboarding complet sur une base QA isolée ; vérifier sauvegarde, reprise après rechargement et états d’erreur.
4. Retester 320 px, grand écran, clavier et lecteurs d’écran.

**Aucun code applicatif n’a été modifié pendant cette passe.**

## Contrôle des faits — 22 octobre 2026

Faits du rapport vérifiés dans le code de `9113e89` :

- **Confirmés :**
  - données d’OpenPay : 5 PRs ouvertes, 5 issues, branche `feat/payment-tx` pour la PR #81 ;
  - erreurs du formulaire d’aide affichées ensemble, focus sur le titre ;
  - QA-09 : toast « L’image PNG 1200 × 630 arrive avec la génération côté serveur » ;
  - QA-10 : badge démo dans les notifications ;
  - QA-11 : audience vide par défaut ;
  - QA-12 : bouton de recherche `min-w-[42px]`, icône `flex-none` ;
  - QA-13 : un seul `h1` affiché sur la connexion (les deux du fichier sont les deux branches d’une même condition) ;
  - QA-14 : `counted()` dans la liste des PRs ;
  - QA-15 : cinq preuves, toutes de démo ;
  - références PAM-208, PAM-211, PAM-212 et PAM-412 (`ChannelState`).
- **Corrigé :**
  - QA-15 : l’attendu demandait de réserver la section aux preuves vérifiées, ce que le cahier exclut (§18.2, étape 12) ; sévérité ramenée à P3, le défaut étant le titre seul ;
  - typecheck et tests, qui n’avaient pas pu tourner le 19, relancés et réussis.
