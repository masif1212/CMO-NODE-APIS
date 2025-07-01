# Dockerfile for Node.js Backend API (Handles migrations and seeding with better logging)

# Stage 1: Build Stage (compiles TypeScript)
FROM node:18-slim AS builder
WORKDIR /app

# Install openssl for Prisma CLI if needed
RUN apt-get update && apt-get install -y --no-install-recommends openssl

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Final Production Image
FROM node:18-slim AS final
WORKDIR /app
ENV NODE_ENV=production

# Copy required artifacts from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN adduser --system --group nodejs

# ✅ Fix: ensure all files are owned by the app user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 8080

# ✅ CMD handles both migration and normal run, including seeding if applicable
CMD ["sh", "-c", "\
echo '--- STARTING CONTAINER'; \
echo 'TASK=$TASK'; \
echo 'DATABASE_URL=${DATABASE_URL:-(not set)}'; \
if [ \"$TASK\" = \"migrate\" ]; then \
  echo '--- Starting Prisma migration...'; \
  npx prisma migrate deploy || { echo '--- Prisma migration failed with exit code $?'; exit 1; }; \
else \
  echo '--- Running Prisma generate and seeding system data...'; \
  npx prisma generate && npx prisma db seed || echo '--- Seed failed (possibly already seeded)'; \
  echo '--- Starting app server...'; \
  node dist/server.js; \
fi"]
