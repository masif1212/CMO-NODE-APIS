# Stage 1: Builder
FROM node:18-slim AS builder
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends openssl

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Production image
FROM node:18-slim AS final
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies (excluding dev dependencies like prisma)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Create non-root user for security
RUN adduser --system --group nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 8080

# Start app or run migrations
CMD ["sh", "-c", "\
echo '--- TASK='$TASK; \
echo '--- DATABASE_URL='${DATABASE_URL:-(not set)}; \
if [ \"$TASK\" = \"migrate\" ]; then \
  echo '--- Running Prisma migration...'; \
  npx prisma migrate deploy || { echo '--- Migration failed'; exit 1; }; \
else \
  echo '--- Starting app...'; \
  node dist/server.js; \
fi"]
