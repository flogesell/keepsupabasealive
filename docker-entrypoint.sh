#!/bin/sh
set -e

# Production: Node.js only (see Dockerfile). Bun is used to build the image, not to run it.
db_path="${DATABASE_PATH:-/data/keepsupabasealive.db}"

case "$db_path" in
  /data/*) ;;
  *)
    echo "keepsupabasealive: DATABASE_PATH must be /data/keepsupabasealive.db in Docker (got: ${db_path})" >&2
    exit 1
    ;;
esac

db_dir=$(dirname "$db_path")
echo "keepsupabasealive: entrypoint uid=$(id -u) node=$(node --version) DATABASE_PATH=${db_path}" >&2

mkdir -p "$db_dir"

if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs "$db_dir" 2>/dev/null || true
  wt="$db_dir/.ksa-write-test-$$"
  if ! su-exec nextjs:nodejs sh -c ': >"$1" && rm -f "$1"' _ "$wt"; then
    echo "keepsupabasealive: cannot write to ${db_dir} — mount a Coolify volume at /data" >&2
    exit 1
  fi
  exec su-exec nextjs:nodejs node /app/server.js
fi

exec node /app/server.js
