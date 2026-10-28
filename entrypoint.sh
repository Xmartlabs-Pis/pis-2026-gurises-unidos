#!/bin/sh
set -eu
mkdir -p /app/public/uploads/covers
chown node:node /app/public/uploads /app/public/uploads/covers
exec su-exec node node server.js
