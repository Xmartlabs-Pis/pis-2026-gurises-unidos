#!/bin/sh
set -eu
mkdir -p /app/uploads/covers
chown -R node:node /app/uploads
exec su-exec node node server.js
