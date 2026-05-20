#!/bin/sh
set -e

# DATABASE_PATH: full path to the SQLite file (parent directory must be writable).
db_path="${DATABASE_PATH:-/data/keepsupabasealive.db}"
db_dir=$(dirname "$db_path")

echo "keepsupabasealive: entrypoint uid=$(id -u) gid=$(id -g) db_dir=${db_dir} DATABASE_PATH=${db_path}" >&2

mkdir -p "$db_dir"

fail_write() {
  cat >&2 <<EOF
keepsupabasealive: cannot write SQLite directory: $db_dir (DATABASE_PATH=$db_path)

Typical Coolify fixes:
  • Storages → add a **volume** with destination /data (leave Source Path empty). Do **not** mount a single **file** as the database — SQLite needs the whole directory for WAL files.
  • If you bind-mount a **host folder**, chown on the host:  chown -R 1001:1001 /path/to/that/folder
  • If Coolify sets a **custom container user**, clear it so this entrypoint can run as root once and chown, or keep the user and pre-chown that folder to match.

Current UID: $(id -u)  GID: $(id -g)
EOF
  exit 1
}

# Default: Docker runs this script as root once; we chown the DB dir then exec node as nextjs.
if [ "$(id -u)" = "0" ]; then
  if ! chown -R nextjs:nodejs "$db_dir" 2>/dev/null; then
    echo "keepsupabasealive: note: chown $db_dir failed (bind mounts may ignore it); checking write as nextjs…" >&2
  fi
  wt="$db_dir/.ksa-write-test-$PPID"
  rm -f "$wt" 2>/dev/null || true
  if ! su-exec nextjs:nodejs sh -c 'rm -f "$1" 2>/dev/null; : >"$1" && rm -f "$1"' _ "$wt"; then
    fail_write
  fi
  exec su-exec nextjs:nodejs "$@"
fi

# Non-root container user (e.g. Coolify forced UID): entrypoint cannot chown — dir must already be writable.
wt="$db_dir/.ksa-write-test-$PPID"
rm -f "$wt" 2>/dev/null || true
if ! ( : >"$wt" && rm -f "$wt" ); then
  fail_write
fi

exec "$@"
