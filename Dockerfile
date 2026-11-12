# syntax=docker/dockerfile:1
# One image for every environment (TRD 14, FE-NFR-7): configured only by
# environment variables, non-root, and happy on a read-only root filesystem
# with a writable /tmp. Build: docker build -t web-starter .

# The runtime's Alpine must match the one the Node image is built on (musl
# and libstdc++ versions).
ARG NODE_IMAGE=node:22-alpine3.24
ARG ALPINE_IMAGE=alpine:3.24

FROM ${NODE_IMAGE} AS node

# --- dependencies -----------------------------------------------------------
FROM node AS deps
WORKDIR /app
# The version in package.json "packageManager". Installed with npm because
# the corepack bundled with Node 22 cannot verify every pnpm release.
RUN npm install -g pnpm@12.18.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- build ------------------------------------------------------------------
FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# --- runtime ----------------------------------------------------------------
# Plain Alpine plus the node binary: the Node image's npm, corepack and yarn
# are not needed to run the standalone server and would double the size.
FROM ${ALPINE_IMAGE} AS runtime
RUN apk add --no-cache libstdc++
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Files belong to group 0 and stay read-only: OpenShift's restricted SCC runs
# the container as an arbitrary UID in group 0, which can still read them
# (TRD 14). Nothing under /app is written at runtime.
COPY --from=build --chown=1001:0 /app/.next/standalone ./
COPY --from=build --chown=1001:0 /app/.next/static ./.next/static
COPY --from=build --chown=1001:0 /app/public ./public
# Next.js writes its runtime cache under .next/cache; with a read-only root
# filesystem it goes to /tmp instead.
RUN ln -s /tmp/next-cache /app/.next/cache

USER 1001:0
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/healthz || exit 1
CMD ["node", "server.js"]
