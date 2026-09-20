# ZAMCOPS Member Portal — production image for self-hosting on your own VPS.
#
# Built on Next.js' `output: "standalone"` bundle: the runner carries only the
# server and the files it actually traced, not the whole node_modules tree.
#
#   docker compose up -d --build
#
# The Prisma CLI is installed into its own prefix (/opt/prisma) rather than into
# the app's node_modules — the standalone bundle ships a pruned node_modules and
# running `npm install` on top of it would prune what the server needs. The
# entrypoint calls the CLI by path to sync the schema before the server starts.

# ── Stage 1: dependencies ──────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
# `postinstall` runs `prisma generate`, which needs the schema copied above.
# Its `prisma db push` half is a no-op here: no database is reachable at build
# time, and the script already tolerates that.
RUN npm ci --no-audit --no-fund

# ── Stage 2: build ─────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next needs DATABASE_URL to exist while it collects page data. Nothing connects
# during the build, so a placeholder is enough — the real URL arrives at runtime.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    DIRECT_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate && npm run build

# ── Stage 3: the Prisma CLI, on its own ────────────────────────────────────
FROM node:22-bookworm-slim AS prisma-cli
WORKDIR /opt/prisma
# The app's manifest is copied under a name npm will not mistake for this
# stage's own package.json. It is read with an explicit JSON.parse rather than
# require(): require() picks its parser from the file extension, and on
# anything that is not .json it treats the contents as JavaScript, where a JSON
# object is a syntax error.
COPY package.json ./package.json.app
RUN VERSION="$(node -p "JSON.parse(require('fs').readFileSync('./package.json.app','utf8')).devDependencies.prisma")" \
    && test -n "$VERSION" \
    && rm package.json.app \
    && npm init -y > /dev/null \
    && npm install --no-audit --no-fund --omit=dev "prisma@${VERSION}"

# ── Stage 4: runner ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# OpenSSL is what Prisma's query engine links against; curl backs the healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    LOCAL_STORAGE_DIR=/data/uploads

# --chown here, not a later `chown -R`: the Prisma CLI writes a checksum/lock
# file into @prisma/engines when it resolves the engine binary, and it does
# that as the unprivileged `node` user below. Left root-owned (the default for
# COPY), every schema sync fails with "Can't write to
# .../@prisma/engines ... make sure you install prisma with the right
# permissions" — which looks like a database problem in the entrypoint's
# retry loop, but is a filesystem permission problem that never clears.
COPY --chown=node:node --from=prisma-cli /opt/prisma/node_modules /opt/prisma/node_modules
# The society's official forms, stamped at runtime to produce a member's
# documents. They are not under public/ — one carries a specimen letter with a
# real name on it, and none of them should be downloadable without a session.
COPY --from=builder /app/assets ./assets
# Maintenance commands are run inside this container — preflight, the R2 and
# album-track backfills. Without them the documented `docker compose exec app
# node scripts/…` lines fail with MODULE_NOT_FOUND, which is a confusing way to
# learn the file was never copied. They resolve @prisma/client and aws4fetch
# from the standalone bundle's own node_modules, one directory up.
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Uploads live on a mounted volume, owned by the unprivileged user the server
# runs as. `node` (uid 1000) ships with the base image.
#
# /opt/prisma is chowned too, and it is not optional: the Prisma CLI writes
# inside its own @prisma/engines directory when it resolves a query engine, so
# a root-owned tree makes every `prisma db push` fail as `node` with
# "Can't write to /opt/prisma/node_modules/@prisma/engines". The entrypoint
# then refuses to start and the container crash-loops with a healthy database.
RUN mkdir -p /data/uploads && chown -R node:node /data /app /opt/prisma
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
