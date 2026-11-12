# Déploiement de la démo

La démo tourne sur une VM Systalink avec Docker (§17.4) : l'app compilée en un binaire, et Caddy devant elle pour HTTPS. Les fichiers sont dans `deploy/` ; le `Dockerfile` est à la racine.

## Avant la première mise en ligne

- **Systalink (PAM-003)** : IP publique, ports 80 et 443 ouverts vers la VM (443 en UDP aussi, pour HTTP/3), sorties vers `api.github.com`, `github.com` et `api.groq.com`, Docker avec le plugin compose.
- **Domaine (PAM-004)** : un enregistrement A vers l'IP de la VM. Caddy obtient le certificat seul, au premier démarrage, une fois le DNS en place.
- **GitHub App** : Callback URL `https://DOMAINE/login/github`, webhook `https://DOMAINE/api/github/webhook`.

## Mise en ligne

Sur la VM :

```bash
git clone https://github.com/Mirak29/pamoja.git && cd pamoja
cp deploy/.env.example deploy/.env   # puis le remplir, sur la VM seulement
docker compose -f deploy/compose.yaml up -d --build
```

L'image se construit en une minute environ. La première fois, la base est vide. Pour charger les données de démo, il faut arrêter le serveur, qui garde la base ouverte :

```bash
docker compose -f deploy/compose.yaml stop app
docker compose -f deploy/compose.yaml run --rm app seed --prod
docker compose -f deploy/compose.yaml start app
```

Le même enchaînement remet la démo à zéro avant une répétition (PAM-909).

## Mise à jour

```bash
git pull && docker compose -f deploy/compose.yaml up -d --build
```

La base, les médias, les sauvegardes et les certificats sont dans des volumes : ils survivent à la reconstruction de l'image.

## Logs

```bash
docker compose -f deploy/compose.yaml logs -f app
```

Chaque événement de l'app est une ligne JSON (`at`, `level`, `event`, `props`).

## Sauvegardes (§17.5)

Le serveur copie la base toutes les heures avec `VACUUM INTO`, dans le volume `backups` : `pamoja-AAAA-MM-JJTHH.db`. Il garde 7 jours de copies.

Pour la copie quotidienne hors de la VM, on prend la plus récente :

```bash
docker compose -f deploy/compose.yaml cp app:/backups/. ./sauvegardes/
```

Puis on l'envoie vers le stockage que Systalink propose (à fixer avec PAM-003).

## Restaurer une sauvegarde (PAM-907)

```bash
docker compose -f deploy/compose.yaml stop app
docker compose -f deploy/compose.yaml run --rm --entrypoint sh app -c \
  'rm -f /data/pamoja.db-wal /data/pamoja.db-shm && cp /backups/pamoja-AAAA-MM-JJTHH.db /data/pamoja.db'
docker compose -f deploy/compose.yaml start app
```

Les fichiers `-wal` et `-shm` sont ceux de l'ancienne base : il faut les effacer avant de remettre la copie.
