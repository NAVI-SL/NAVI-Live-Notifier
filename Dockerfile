# Reviewed Node 24 runtime; resolve and pin image digests before public deployment.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=dependencies --chown=node:node /app /app
COPY --from=build --chown=node:node /app/deployment /app/deployment
USER node
ENTRYPOINT ["node", "deployment/start.mjs"]
CMD ["web"]
