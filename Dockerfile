# Stage 1: Builder
FROM node:18-slim AS builder
WORKDIR /app

# Install openssl for Prisma engine checksum verification
RUN apt-get update && apt-get install -y --no-install-recommends openssl

# Install dependencies including prisma CLI
COPY package.json package-lock.json* ./
RUN npm install

# Install Prisma CLI globally to avoid runtime writes
RUN npm install -g prisma

# Copy code and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Final
FROM node:18-slim AS final
WORKDIR /app
ENV NODE_ENV=production

# Install global Prisma CLI here too
RUN npm install -g prisma

# Copy artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Create secure non-root user and ensure permissions
RUN adduser --system --group nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 8080

# Reliable, verbose CMD
CMD ["sh", "-c", "\
echo '--- TASK='$TASK; \
echo '--- DATABASE_URL='${DATABASE_URL:-(not set)}; \
if [ \"$TASK\" = \"migrate\" ]; then \
  echo '--- Running Prisma migration...'; \
  prisma migrate deploy || { echo '--- Migration failed'; exit 1; }; \
else \
  echo '--- Starting app...'; \
  node dist/server.js; \
fi"]
