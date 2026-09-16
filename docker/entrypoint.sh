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
  until $PRISMA db push --schema=/app/prisma/schema.prisma --skip-generate; do
    if [ "$attempt" -ge 10 ]; then
      echo "[entrypoint] schema sync failed after $attempt attempts — refusing to start." >&2
      exit 1
    fi
    echo "[entrypoint] database not ready (attempt $attempt) — retrying in 3s…"
    attempt=$((attempt + 1))
    sleep 3
  done
  echo "[entrypoint] schema is up to date."
fi

exec "$@"
