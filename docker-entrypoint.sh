#!/bin/sh
set -e

# Default Docker/Coolify runs this script as root once. Named volumes and many
# bind mounts allow fixing ownership so the app can run as non-root (nextjs).
if [ "$(id -u)" = "0" ]; then
  mkdir -p /data
  chown -R nextjs:nodejs /data 2>/dev/null || true
  exec su-exec nextjs:nodejs "$@"
fi

exec "$@"
