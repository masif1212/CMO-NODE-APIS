# Dockerfile for Node.js Backend API with Prisma migration + seed

# Stage 1: Build
FROM node:18-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:18-slim AS final
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Install ts-node for seeding (if seed.ts is in TypeScript)
RUN npm install -g ts-node typescript prisma

RUN adduser --system --group nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Match Cloud Run assigned port
EXPOSE 3001

CMD ["sh", "-c", "\
echo '--- STARTING CONTAINER'; \
echo \"PORT=\$PORT | TASK=\$TASK\"; \
if [ \"$TASK\" = \"migrate\" ]; then \
  echo '🔁 Running migration and seed'; \
  npx prisma migrate deploy && npx prisma db seed; \
elif [ \"$TASK\" = \"start\" ]; then \
  echo '🚀 Starting application'; \
  npx prisma db seed || echo '⚠️ Seed failed/skipped'; \
  node dist/server.js; \
else \
  echo '❌ Invalid TASK specified (use migrate or start)'; \
  exit 1; \
fi"]
