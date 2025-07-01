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

# Copy compiled app, Prisma client, and schema
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts # In case your seed file is here

# ✅ Install only what's needed for seeding
RUN npm install -g prisma ts-node typescript

# Create non-root user and assign file permissions
RUN adduser --system --group nodejs && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 8080

# ✅ Universal CMD supporting multiple TASKs
CMD ["sh", "-c", "\
echo '--- STARTING CONTAINER'; \
echo 'TASK=$TASK'; \
echo 'DATABASE_URL=${DATABASE_URL:-(not set)}'; \
if [ \"$TASK\" = \"migrate\" ]; then \
  echo '--- Running Prisma migration...'; \
  npx prisma migrate deploy && npx prisma db seed || echo '--- Seed failed or already executed'; \
elif [ \"$TASK\" = \"start\" ]; then \
  echo '--- Starting app with seeding check...'; \
  npx prisma db seed || echo '--- Seed already executed or failed'; \
  node dist/server.js; \
else \
  echo '❌ Invalid TASK specified (use migrate or start)'; \
  exit 1; \
fi"]
