# Dockerfile for Node.js Backend API with migration + seed

# Stage 1: Build Stage
FROM node:18-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Final Production Image
FROM node:18-slim AS final
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Install dev tools globally to support seed script
RUN npm install -g ts-node typescript prisma

RUN adduser --system --group nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 8080

# Entrypoint with conditional logic
CMD ["sh", "-c", "\
echo '--- STARTING CONTAINER'; \
echo \"TASK=\$TASK\"; \
echo \"DATABASE_URL=\${DATABASE_URL:-(not set)}\"; \
if [ \"\$TASK\" = \"migrate\" ]; then \
  echo '--- Running migrations and seed...'; \
  npx prisma migrate deploy && npx prisma db seed || echo '❌ Seed failed (continuing)'; \
  exit 0; \
elif [ \"\$TASK\" = \"start\" ]; then \
  echo '--- Running app seed (if needed)...'; \
  npx prisma db seed || echo '❌ Seed failed (continuing)'; \
  echo '--- Starting server...'; \
  node dist/server.js; \
else \
  echo '❌ Invalid TASK specified. Use migrate or start'; \
  exit 1; \
fi"]

