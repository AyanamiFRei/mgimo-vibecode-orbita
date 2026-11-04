FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder --chown=node:node /app/.next/standalone ./.next/standalone
COPY --from=builder --chown=node:node /app/lib ./lib
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/tooling ./tooling
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run db:setup && exec npm start"]
