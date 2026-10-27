FROM node:24-slim AS base
# pnpm's standalone binary from the official image. Corepack is deprecated and
# runs pnpm through a Node.js shim on every call.
COPY --from=ghcr.io/pnpm/pnpm:12.15.0 /opt/pnpm /opt/pnpm
RUN for bin in pnpm pn pnpx pnx; do ln -s "/opt/pnpm/$bin" "/usr/local/bin/$bin"; done

FROM base AS build
WORKDIR /app
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

FROM base
WORKDIR /app
COPY --from=build /app/build build/
COPY package.json .
EXPOSE 3000
ENV NODE_ENV=production
ENV TZ=Europe/Stockholm

CMD ["node", "build"]
