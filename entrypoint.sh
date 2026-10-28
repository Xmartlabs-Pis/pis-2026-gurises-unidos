#!/bin/sh
set -eu
mkdir -p /app/public/uploads/covers
chown -R node:node /app/public/uploads
exec su-exec node node server.js
