# State of Dev Sénégal 2026 : ce que Pamoja en retient

Source : [State of Dev Sénégal, édition 2026](https://stateofgalsen.dev/2026), enquête de la communauté Galsen DEV, du 10 juillet au 9 août 2026, **624 répondant·e·s**. Lue le 11 novembre 2026.

**Limites** : l'échantillon est volontaire, issu de la communauté Galsen DEV, à 71 % à Dakar, et ne représente pas tous les développeurs du Sénégal. Les chiffres guident des choix de produit ; ils ne remplacent pas les retours des utilisateurs de Pamoja.

## Les constats qui changent le produit

### 1. L'open source : on veut, mais on ne sait pas par où commencer

| Contribuez-vous à l'open source ? | Part | Personnes |
| --- | --- | --- |
| Oui, régulièrement | 13,5 % | 84 |
| Oui, occasionnellement | 23,7 % | 148 |
| **J'aimerais mais je ne sais pas par où commencer** | **34,8 %** | **217** |
| Non | 28 % | 175 |

C'est le **premier groupe** de l'enquête : plus d'un tiers veut contribuer et bloque sur le premier pas. Et 29 % citent « Contribuer à l'open source » parmi leurs aspirations.

**Pour Pamoja** : c'est exactement le problème que « Sur quoi puis-je travailler ? » et l'Assistant doivent résoudre. Il faut un **premier pas guidé** pour qui n'a jamais contribué : une seule chose concrète, choisie pour lui, les étapes pour la faire, et un mentor à un clic. Une liste de 30 issues ne règle pas « je ne sais pas par où commencer ».

### 2. La documentation est une vraie porte d'entrée

Chez ceux qui contribuent (449) : code 76,6 %, **documentation 49,4 %**, maintenance 35,4 %, issues et bugs 35,2 %, code review 31,4 %, animation de communauté 13,6 %, traduction 7,4 %.

**Pour Pamoja** : proposer aussi la doc, et pas seulement du code, comme première contribution : issues `documentation`, besoins « Documentation » d'un projet. Signaler un bug (35,2 %) est aussi une contribution.

### 3. La code review est rare : c'est la compétence à valoriser

Seuls 31,4 % des contributeurs font de la review. Or c'est le cœur de la boucle de Pamoja (§7). Et 51,6 % utilisent déjà l'IA pour relire du code.

**Pour Pamoja** : la review humaine, vérifiée sur GitHub, garde toute sa valeur dans la réputation (§8). Un bot de review (CodeRabbit, PAM-431) fait une première passe, mais ne remplace pas ce qui compte.

### 4. Une population jeune, souvent en début de carrière

- **Âge** : 45,7 % ont 18-24 ans, 44,4 % 25-34 ans.
- **Expérience** : 20 % ont moins d'un an, 26 % un à deux ans, donc **46 % ont au plus deux ans**.
- **Situation** : salariés 37,8 %, **étudiants 24,2 %**, freelances 16,8 %, **en recherche d'emploi 15,7 %**, entrepreneurs 4,5 %.
- **Parcours** : université 66,4 %, autodidacte 53,9 %, formation en ligne 53,7 %, bootcamp 32,2 %.

**Pour Pamoja** : 40 % sont étudiants ou cherchent un emploi. Une contribution vérifiée, c'est une preuve à montrer (« Your work is your profile »). Les recommandations doivent marcher pour un profil qui n'a que des skills déclarés, sans historique.

### 5. Il y a des mentors

Dans les aspirations, 23,2 % citent le **mentorat** (145 personnes), 38 % la formation continue et 57,4 % l'évolution technique.

**Pour Pamoja** : relier ceux qui veulent mentorer (intention « Mentorer ») à ceux qui débutent. Une demande d'aide « Mentorat » sur une première issue est le pont naturel.

### 6. La stack à couvrir

- **Langages** : JavaScript 45,7 %, TypeScript 41,5 %, Python 32,9 %, PHP 28,7 %, Java 26,9 %, SQL 26,3 %, C# 11,4 %, Bash 11,1 %, Dart 10,6 %, Go 5,3 %.
- **Frameworks** : React 54 %, **Tailwind CSS** 48,4 %, **Next.js** 41 %, **Laravel** 39,4 %, Flutter 36,5 %, **Angular** 34,9 %, **Spring** 34,5 %, **Express** 30,1 %, **NestJS** 21,6 %, **React Native** 21,5 %.

**Pour Pamoja** : les frameworks en gras manquaient au vocabulaire de skills (`api/vocabulary.ts`). Sans eux, un développeur Laravel ou Angular ne peut pas le déclarer, et le matching ne le trouve pas.

### 7. Où ils travaillent et contribuent

- **GitHub** : 95,6 % des contributeurs, mais **GitLab** 47,4 % et Gitea 20,3 %.
- **Régions** : Dakar 71,3 %, Thiès 7,1 %, hors Sénégal 5,8 % (France, Maroc, États-Unis).
- **Employeurs** : au Sénégal à 73,3 % ; PME 37,1 %, start-up 19,7 %. Secteur en tête : **fintech** 20,4 %.

**Pour Pamoja** : GitHub comme source unique tient pour la démo. GitLab est une piste réelle pour plus tard, à noter sans l'ajouter maintenant. La diaspora est une source de mentors et de reviewers. Le projet de démo fintech (OpenPay Africa) parle à la population.

### 8. L'IA fait déjà partie du quotidien

- **Fréquence** : 68,8 % utilisent l'IA tous les jours, et 84,5 % disent qu'elle a beaucoup changé leur façon de travailler.
- **Outils** : Claude 78,5 %, ChatGPT 73,7 %, Gemini 50,8 % ; côté agents de code, Claude Code 67,2 %, Codex 44,9 %, Cursor 40,9 %.
- **Usages** : génération de code 74,3 %, débogage 69,5 %, documentation 59,2 %, revue de code 51,6 %.

**Pour Pamoja** : un Assistant est naturel pour eux. Il doit apporter ce que leurs outils n'ont pas : leurs données à eux sur Pamoja (projets, besoins, demandes, issues), vérifiées, jamais inventées.

### 9. Du temps rare, une stack qu'on veut faire grandir

- **Stress** : médiane 6/10. **Satisfaction** : médiane 6/10.
- **Culture valorisée** : équilibre vie pro/perso 62,2 %, formation continue 55 %, évolution 51,3 %.
- **Technologies d'avenir** : IA / ML 75 %, DevOps 50,8 %, cybersécurité 49 %, cloud 45,8 %, data 41,7 %.

**Pour Pamoja** : « Sur quoi puis-je travailler **aujourd'hui** ? » veut une chose petite et bornée, avec sa durée, plutôt qu'un projet entier. Contribuer est aussi une façon d'apprendre : on peut proposer, en second, une issue dans un domaine que le développeur veut apprendre.

## Ce qu'on en fait

| Décision | Tâche |
| --- | --- |
| Premier pas guidé pour qui n'a jamais contribué : une issue, les étapes, un mentor à un clic | PAM-533 |
| La documentation comme première contribution (issues `documentation`, besoins « Documentation ») | PAM-533 |
| Frameworks manquants ajoutés au vocabulaire : Tailwind CSS, Next.js, Laravel, Angular, Spring, Express, NestJS, React Native | PAM-533 |
| L'Assistant répond d'abord au « je ne sais pas par où commencer », à partir de la liste calculée | PAM-532 |
| GitLab : piste pour plus tard, non planifiée | — |
