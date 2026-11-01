#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:?uso: clear-uploads.sh <main|staging>}"

case "$BRANCH" in
main | staging) ;;
*)
  echo "rama desconocida: $BRANCH (main|staging)" >&2
  exit 1
  ;;
esac

if [ "$BRANCH" = main ] && [ "${CONFIRM:-}" != main ]; then
  echo "refusado: CONFIRM=main ./scripts/clear-uploads.sh main" >&2
  exit 1
fi

export UPLOADS_DIR="/srv/pis-uploads/$BRANCH"
export COMPOSE_PROJECT_NAME="pis-$BRANCH"
cd "/srv/pis-$BRANCH"
mkdir -p "$UPLOADS_DIR"

sql="UPDATE \"Project\" SET \"coverPhoto\" = '/images/project-placeholders/1.webp' WHERE \"coverPhoto\" LIKE '/uploads/covers/%';"
docker compose exec -T db \
  psql -U postgres -d app -v ON_ERROR_STOP=1 -c "$sql" </dev/null

if ! docker compose exec -T -u root web \
  sh -c 'mkdir -p /app/uploads && find /app/uploads -mindepth 1 -delete' </dev/null; then
  echo "no pude borrar las portadas: el contenedor web tiene que estar arriba" >&2
  exit 1
fi
