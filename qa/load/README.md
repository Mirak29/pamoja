# Charge HTTP locale

Le scénario `pamoja.js` répartit les VU entre les lectures de profils, projets,
demandes d'aide, conversations, notifications et plusieurs écritures répétables.
Il ne couvre pas encore les transitions des demandes, l'envoi et la modification
de messages, l'upload, le SSE ni les intégrations GitHub.

## Serveur

Arrêter `deno task dev` avant de lancer le serveur suivant. Le build local
utilise la même base et les mêmes secrets de développement, sans les processus
de watch, de tests, de formatage et de lint du serveur de développement.

```powershell
$env:PAMOJA_LOAD_TEST = '1'
deno task prod:local
```

Ce drapeau réduit les événements informatifs HTTP `in`, `in-params` et `out`
avant leur mise en forme. Les avertissements et les erreurs restent visibles, y
compris les erreurs HTTP journalisées sous le nom `out`. Le drapeau n'agit
qu'avec `APP_ENV=dev`.

## Charge

Dans un autre PowerShell ouvert à la racine du dépôt, préparer les 1 000
sessions distinctes des comptes `dev00000` à `dev00999` créés par
`deno task stress`. Si `sessions.json` existe déjà, exécuter
`deno task load:sessions:clean` avant de le recréer.

```powershell
deno task load:sessions
Remove-Item Env:K6_VUS -ErrorAction SilentlyContinue
Remove-Item Env:K6_DURATION -ErrorAction SilentlyContinue
$env:PAMOJA_VUS = '400'
$env:PAMOJA_DURATION = '2m'
k6 run .\qa\load\pamoja.js
```

Les VU sont répartis sur l'ensemble du scénario ; chaque VU dispose d'une
session distincte jusqu'à 1 000 VU. Une pause d'une seconde suit chaque action.
Les actions de détail peuvent effectuer deux requêtes : liste puis détail. Le
débit obtenu dépend du temps de réponse ; 1 000 VU ne fixe pas 1 000 requêtes/s.

Après les essais, y compris après une interruption de k6 :

```powershell
deno task load:sessions:clean
```

Pour reprendre le développement dans le premier terminal, arrêter le serveur,
puis supprimer le drapeau :

```powershell
Remove-Item Env:PAMOJA_LOAD_TEST -ErrorAction SilentlyContinue
deno task dev
```

## Interprétation

Les seuils restent : moins de 1 % d'échecs HTTP et p95 inférieur à une seconde.
Une réponse 200 de `/api/health` après un test ne suffit pas à expliquer les
refus de connexion pendant la charge. Conserver les erreurs et les événements de
démarrage du serveur, et observer CPU, mémoire et disque : le générateur k6 et
l'application partagent la machine lors d'un essai local.

L'extrait de logs du 26 octobre montre des requêtes reçues et des réponses
200/204, sans erreur fatale ni redémarrage dans cet extrait. Le coût du logger
de dev est une hypothèse à comparer à charge identique avec ce mode, pas une
cause démontrée des délais ou des refus TCP.
