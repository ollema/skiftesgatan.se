FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

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
