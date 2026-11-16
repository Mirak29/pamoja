# Déploiement de la démo

Une machine, un conteneur pour l'app, Caddy devant elle pour HTTPS (§17.4). La base SQLite, les médias et les sauvegardes sont dans un volume Docker. La procédure est celle de Defendable : l'image est construite par GitHub, la machine ne fait que la télécharger.

## 1. La machine

La VM Systalink, formule Développeur (1 cœur, 2 Go, 30 Go), en x86-64, avec Docker et le plugin Compose :

```bash
docker --version || curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Se déconnecter puis se reconnecter, pour lancer Docker sans `sudo`.

À vérifier avec Systalink (PAM-003) :
- une IP publique, avec les ports 80 et 443 ouverts (443 en UDP aussi, pour HTTP/3) ;
- les sorties vers `github.com`, `api.github.com`, `ghcr.io` et `api.groq.com` ;
- l'entrée des webhooks GitHub.

Domaine (PAM-004) : un enregistrement A vers l'IP de la VM.

## 2. L'image, les fichiers et les secrets

L'image est publiée par le workflow `.github/workflows/publish.yml` sous le nom `ghcr.io/mirak29/pamoja:latest`. Il tourne après chaque CI réussie sur `master`, ou à la main depuis l'onglet Actions. Une image n'est donc jamais publiée depuis du code qui a échoué à ses vérifications.

L'image est **publique** : elle contient le code, aucun secret, puisque les clés viennent de `.env.production` au démarrage. La machine la télécharge donc sans se connecter au registre. Un package est privé à sa première publication. Après le premier passage du workflow, il faut le rendre public une fois : GitHub, ton profil, Packages, `pamoja`, Package settings, Change visibility, Public.

Sur la machine, il ne faut que trois fichiers du dépôt, copiés par exemple avec `scp` : `docker-compose.yml`, `deploy/Caddyfile` et `.env.production.example`.

```bash
mkdir -p ~/pamoja/deploy && cd ~/pamoja
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
echo 'PUBLIC_HOST=demo.example.sn' > .env
echo "MEILI_MASTER_KEY=$(openssl rand -hex 32)" >> .env
chmod 600 .env
```

`.env.production` est lu par l'app. `.env` est lu par Compose : il donne le domaine à Caddy, et la clé de Meilisearch à la fois à l'app et à Meilisearch. Aucun des deux n'est commité, ni copié dans l'image.

Meilisearch tourne dans le conteneur `meilisearch`, sans port ouvert : seule l'app le joint. Il ne garde qu'un index, que l'app reconstruit depuis SQLite à chaque démarrage.

GitHub App : Callback URL `https://PUBLIC_HOST/login/github`, webhook `https://PUBLIC_HOST/api/github/webhook`.

(Sans le registre, on peut aussi faire `git clone` du dépôt sur la machine, puis `docker compose up -d --build` au lieu de `pull` : la même image est construite sur place.)

## 3. Démarrer

```bash
docker compose pull
docker compose --profile https up -d
docker compose logs -f app
```

Les logs montrent `server-start`, `backup`, puis `search-reindexed` avec le nombre de documents de chaque index. Chaque événement est une ligne JSON (`at`, `level`, `event`, `props`). Caddy obtient le certificat seul, une fois le DNS en place.

La première fois, la base est vide. Pour charger les données de démo, il faut arrêter le serveur, qui garde la base ouverte :

```bash
docker compose stop app
docker compose run --rm --no-deps app seed --prod
docker compose start app
```

Pour remettre la prod sur une base propre avant une répétition (PAM-909), depuis le poste de l'équipe, avec la clé chargée dans l'agent SSH :

```bash
deno task prod:reset
```

La tâche ([`task-prod-reset.ts`](../task-prod-reset.ts)) demande de taper `pamoja` pour confirmer, puis :

1. elle arrête l'app, pour que la base soit entière sur le disque ;
2. elle ramène la base et les médias dans `~/pamoja-backups/pamoja-avant-reset-….tar` et vérifie que l'archive contient une base SQLite entière (sinon rien n'est effacé) ;
3. elle efface la base et les médias, puis recharge la démo ;
4. elle redémarre l'app, même après un échec, et attend qu'elle réponde.

`--vide` repart sur une base vide, sans démo ; `--yes` ne pose pas de question. `PAMOJA_HOST`, `PAMOJA_DIR`, `PAMOJA_BACKUPS` et `SSH` changent l'hôte, le dossier sur la VM, le dossier des archives et le programme ssh (sous Windows, celui du système par défaut). Les comptes et les sessions partent avec la base : chacun se reconnecte avec GitHub. Un cookie d'avant la remise ne vaut plus rien, même si sa connexion a le même id qu'une nouvelle (PAM-126).

Pour restaurer une archive : `tar xf pamoja-avant-reset-….tar` donne `pamoja.db`, son `pamoja.db-wal` et `media/`, à remettre ensemble dans `/data` comme une copie ci-dessous (le `-wal` de l'archive est copié avec la base, pas effacé).

Vérifier depuis l'extérieur : la landing s'ouvre, la connexion GitHub aboutit, une notification arrive sans recharger la page (PAM-906).

## 4. La faire tourner plusieurs jours

- **Elle redémarre seule** (`restart: unless-stopped`) après une panne ou un redémarrage de la VM. `docker compose ps` montre `healthy`.
- **Sauvegardes** : le serveur copie la base toutes les heures avec `VACUUM INTO` dans `/data/backups` (`pamoja-AAAA-MM-JJTHH.db`) et garde 7 jours de copies. Il n'y a pas de cron à installer sur la VM.
- **Copie hors de la VM** (PAM-115) : depuis le poste de l'équipe, `deploy/pull-backup.sh` ramène la copie la plus récente dans `~/pamoja-backups` et y garde les 7 dernières. Elle passe par SSH (alias `pamoja`), sans fichier laissé sur la VM, et n'est gardée que si c'est une base SQLite entière. Sous Windows, avec la clé chargée dans l'agent SSH de Windows :

  ```bash
  SSH=C:/Windows/System32/OpenSSH/ssh.exe bash deploy/pull-backup.sh
  ```

  Une fois par jour, par le Planificateur de tâches (PowerShell, à lancer une fois) :

  ```powershell
  $action = New-ScheduledTaskAction -Execute "C:\Program Files\Git\bin\bash.exe" -Argument "-lc 'SSH=C:/Windows/System32/OpenSSH/ssh.exe bash ~/Documents/pamoja/deploy/pull-backup.sh'"
  Register-ScheduledTask -TaskName "Pamoja backup" -Action $action -Trigger (New-ScheduledTaskTrigger -Daily -At 9am)
  ```
- **Restaurer** une copie (ici `pamoja-X.db`, dans `./backups`) :

  ```bash
  docker compose stop app
  docker compose run --rm --no-deps -v "$PWD/backups:/b" --entrypoint sh app \
    -c 'rm -f /data/pamoja.db-wal /data/pamoja.db-shm; cp /b/pamoja-X.db /data/pamoja.db'
  docker compose start app
  ```

  Les fichiers `-wal` et `-shm` sont ceux de l'ancienne base : ils sont effacés avant de remettre la copie. À tester au moins une fois avant la démo (PAM-907).
- **Mettre à jour** : pousser sur `master`, attendre que les workflows CI puis `publish` soient au vert, puis sur la machine :

  ```bash
  docker compose pull && docker compose --profile https up -d
  ```

  Les migrations passent au démarrage ; la base reste dans le volume.
- **Logs** : `docker compose logs --since 1h app`.
