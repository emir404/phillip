# Deploy target: the @nutz/dashboard Next.js app (analytics UI + ingestion API).
# Build context is the repo root so the workspace dependency (@nutz/phillip) is
# available. `docker build -t phillip-dashboard . && docker run -p 5174:5174 \
#   -v phillip-data:/data phillip-dashboard`

FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# --- install + build ---
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/phillip/package.json packages/phillip/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @nutz/dashboard build

# --- run ---
FROM base AS run
ENV NODE_ENV=production
# The JSON store persists here; mount a volume so data survives restarts.
ENV PHILLIP_DATA_FILE=/data/phillip.json
VOLUME ["/data"]
COPY --from=build /app ./
EXPOSE 5174
CMD ["pnpm", "--filter", "@nutz/dashboard", "start"]
