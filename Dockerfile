# Dockerfile for Node.js Backend API with migration + seed

# Stage 1: Build Stage
FROM node:18-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Image
FROM node:18-slim AS final
WORKDIR /app
ENV NODE_ENV=production

# Copy files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# ✅ Install ts-node, typescript, and prisma to run seed
RUN npm install ts-node typescript prisma

# Add secure user
RUN adduser --system --group nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose backend port
EXPOSE 8080

# Entry point for container
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
