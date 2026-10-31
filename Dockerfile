FROM node:24-slim AS base
# pnpm's standalone binary from the official image. Corepack is deprecated and
# runs pnpm through a Node.js shim on every call.
COPY --from=ghcr.io/pnpm/pnpm:12.15.0 /opt/pnpm /opt/pnpm
RUN for bin in pnpm pn pnpx pnx; do ln -s "/opt/pnpm/$bin" "/usr/local/bin/$bin"; done

FROM base AS build
WORKDIR /app
# better-sqlite3 ships prebuilt binaries, but fall back to compiling if the
# prebuild is unavailable for this platform.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline
# Build-time placeholders: env validation only needs these to be non-empty. The
# real values are supplied at runtime, and keeping them on the RUN line avoids
# baking them into the image metadata.
RUN BETTER_AUTH_SECRET="docker-build-placeholder-not-used-at-runtime" \
    ORIGIN="https://skiftesgatan.se" \
    pnpm build

# adapter-node externalizes production dependencies (better-sqlite3), so the
# runtime image needs node_modules for them. Install just the production tree.
FROM base AS prod-deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
RUN pnpm install --frozen-lockfile --prod

FROM base
WORKDIR /app
# The only writable state is the SQLite file, which lives on a CapRover
# persistent directory mounted at /data.
RUN mkdir -p /data && chown node:node /data
COPY --from=build --chown=node:node /app/build build/
COPY --from=prod-deps --chown=node:node /app/node_modules node_modules/
COPY --chown=node:node package.json .
EXPOSE 3000
ENV NODE_ENV=production
ENV TZ=Europe/Stockholm
ENV SQLITE_PATH=/data/skiftesgatan.db
USER node

CMD ["node", "build"]
