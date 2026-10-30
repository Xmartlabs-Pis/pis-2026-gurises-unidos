#!/usr/bin/env bash
# Uso: deploy.sh <rama> <puerto> <tag>
# Solo baja la imagen ya buildeada y la levanta: no compila nada (la VM no tiene RAM para eso).
set -euo pipefail

BRANCH="$1"
PORT="$2"
TAG="$3"
cd "/srv/pis-$BRANCH"

export COMPOSE_PROJECT_NAME="pis-$BRANCH" PORT TAG
docker compose pull
docker compose up -d
docker image prune -f              # ponytail: sin esto el disco de la VM se llena en semanas
