#!/bin/sh
# Brings the database schema up to date, then hands off to the server.
#
# `prisma db push` is idempotent: it makes the database match prisma/schema.prisma
# and does nothing when they already agree, so it is safe on every restart.
# Postgres may still be accepting connections a moment after the container is up,
# so the push is retried rather than failing the deploy on a cold start.
set -e

PRISMA="node /opt/prisma/node_modules/prisma/build/index.js"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] DATABASE_URL is not set — refusing to start." >&2
  exit 1
fi
if [ -z "${AUTH_SECRET:-}" ]; then
  echo "[entrypoint] AUTH_SECRET is not set — sessions cannot be signed. Refusing to start." >&2
  exit 1
fi

if [ "${SKIP_DB_PUSH:-}" = "1" ]; then
  echo "[entrypoint] SKIP_DB_PUSH=1 — leaving the schema alone."
else
  attempt=1
  # Deliberately without --accept-data-loss: a change that would drop a column
  # must stop the deploy and be looked at, not be applied silently to members'
  # records. Set SKIP_DB_PUSH=1 and run the push by hand to work through one.
  while true; do
    out=$($PRISMA db push --schema=/app/prisma/schema.prisma --skip-generate 2>&1) && break
    printf '%s\n' "$out" >&2

    # Only a connection problem is worth waiting out. Anything else — a broken
    # image, an unwritable engines directory, a destructive migration — will
    # fail identically on all ten attempts, and retrying it buries the real
    # error under a misleading "database not ready".
    case "$out" in
      *"Can't write to"*|*"EACCES"*|*"permission denied"*|*"Permission denied"*)
        echo "[entrypoint] the Prisma CLI cannot write inside its own install — this is an image problem, not a database one." >&2
        echo "[entrypoint] /opt/prisma must be owned by the user the container runs as. Refusing to start." >&2
        exit 1 ;;
      *"data loss"*|*"force reset"*)
        echo "[entrypoint] this schema change would lose data, so it was not applied. Refusing to start." >&2
        echo "[entrypoint] review it, then re-run the push by hand with SKIP_DB_PUSH=1 set." >&2
        exit 1 ;;
    esac

    if [ "$attempt" -ge 10 ]; then
      echo "[entrypoint] database still unreachable after $attempt attempts — refusing to start." >&2
      exit 1
    fi
    echo "[entrypoint] database not ready (attempt $attempt) — retrying in 3s…"
    attempt=$((attempt + 1))
    sleep 3
  done
  echo "[entrypoint] schema is up to date."
fi

exec "$@"
