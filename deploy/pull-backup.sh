#!/usr/bin/env bash
# The copy off the VM, once a day (§17.5, PAM-115): the newest hourly backup
# of the server comes to this machine, read through SSH without a file left
# on the VM. The last 7 copies are kept here.
#
#   deploy/pull-backup.sh
#
# PAMOJA_HOST (the SSH alias, `pamoja`), PAMOJA_BACKUPS (the folder,
# ~/pamoja-backups), PAMOJA_KEEP (7) and SSH (the ssh program) change the
# defaults. On Windows, SSH=C:/Windows/System32/OpenSSH/ssh.exe uses the key
# loaded in the agent of Windows.
set -euo pipefail

HOST=${PAMOJA_HOST:-pamoja}
DIR=${PAMOJA_BACKUPS:-$HOME/pamoja-backups}
KEEP=${PAMOJA_KEEP:-7}
SSH=${SSH:-ssh}
APP="cd /root/pamoja && docker compose exec -T app"

mkdir -p "$DIR"
latest=$("$SSH" "$HOST" "$APP sh -c 'ls -1 /data/backups/pamoja-*.db | tail -1'")
latest=${latest%$'\r'}
name=$(basename "$latest")
case $name in
  pamoja-*.db) ;;
  *) echo "No backup on the server" >&2; exit 1 ;;
esac

# A copy cut short never stays
trap 'rm -f "$DIR/$name.part"' EXIT
"$SSH" "$HOST" "$APP cat '$latest'" > "$DIR/$name.part"
# Only a whole SQLite file is kept
if [ "$(head -c 15 "$DIR/$name.part")" != 'SQLite format 3' ]; then
  echo "The copy of $name is not a database" >&2
  exit 1
fi
mv "$DIR/$name.part" "$DIR/$name"

# The oldest leave, the last $KEEP stay
ls -1 "$DIR"/pamoja-*.db | sort | head -n -"$KEEP" | while read -r old; do
  rm -f "$old"
done
echo "$DIR/$name"
