# Dockerfile for Node.js Backend API with migration + seed support

# Stage 1: Build
FROM node:18-slim AS builder
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends openssl

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy app source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the app
RUN npm run build

# Stage 2: Production
FROM node:18-slim AS final
WORKDIR /app

ENV NODE_ENV=production

# Install minimal runtime dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# ✅ Required for seeding with TypeScript
RUN npm install -g prisma ts-node typescript

# Set user and permissions
RUN adduser --system --group nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Don't hardcode port — Cloud Run provides it
EXPOSE 3001

# Start logic
CMD ["node", "dist/server.js"]

# CMD ["sh", "-c", "\
#   echo '--- STARTING CONTAINER'; \
#   echo \"PORT=\$PORT\"; \
#   if [ \"\$TASK\" = \"migrate\" ]; then \
#     echo '--- Running migrations and seed...'; \
#     npx prisma migrate deploy && npx prisma db seed || echo '❌ Seed failed (continuing)'; \
#     exit 0; \
#   elif [ \"\$TASK\" = \"start\" ]; then \
#     echo '--- Starting server...'; \
#     node dist/server.js; \
#   else \
#     echo '❌ Invalid TASK specified. Use migrate or start'; \
#     exit 1; \
#   fi"]
