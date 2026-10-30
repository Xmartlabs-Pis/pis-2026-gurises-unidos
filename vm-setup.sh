#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:?uso: vm-setup.sh <rama>}"
DIR="/srv/pis-$BRANCH"
ENV_FILE="$DIR/.env"

case "$BRANCH" in
main)
  PORT=3000
  DB_PORT=5432
  ;;
staging)
  PORT=3001
  DB_PORT=5433
  ;;
*)
  echo "rama desconocida: $BRANCH (main|staging)" >&2
  exit 1
  ;;
esac

[ -d "$DIR" ] || {
  echo "falta $DIR: cloná el repo primero" >&2
  exit 1
}

if [ -e "$ENV_FILE" ]; then
  echo "== $ENV_FILE ya existe, no lo toco"
  exit 0
fi

PG_PASS="$(openssl rand -hex 24)"
METADATA=http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address
IP="${IP:-$(curl -fsS --max-time 5 "$METADATA" || curl -fsS --max-time 5 ifconfig.me || true)}"
[ -n "$IP" ] || {
  echo "no pude determinar la IP publica: correlo con IP=<ip> ./vm-setup.sh $BRANCH" >&2
  exit 1
}

umask 077
cat >"$ENV_FILE" <<EOF
POSTGRES_PASSWORD=$PG_PASS
DATABASE_URL=postgresql://postgres:$PG_PASS@db:5432/app
DB_PORT=$DB_PORT
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_TRUST_HOST=true
AUTH_URL=http://$IP:$PORT
EOF

if [ "$(id -u)" -eq 0 ]; then
  chown "$(stat -c '%u:%g' "$DIR")" "$ENV_FILE"
fi

echo "== $ENV_FILE creado"
