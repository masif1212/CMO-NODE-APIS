# --- Builder Stage ---
FROM node:18-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl build-essential python3

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source
COPY . .

# Ensure prisma directory exists before continuing
RUN if [ ! -d "./prisma" ]; then echo "❌ ERROR: prisma directory not found"; exit 1; fi

# Generate Prisma Client
RUN npx prisma generate

# Build the app
RUN npm run build

# --- Final Stage ---
FROM node:18-slim AS final

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Create non-root user for security
RUN adduser --system --group nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001

CMD ["sh", "-c", "\
if [ \"$TASK\" = \"migrate\" ]; then \
  echo 'Running migrate + seed'; \
  npx prisma migrate deploy && npx prisma db seed; \
else \
  echo 'Starting app'; \
  node dist/server.js; \
fi"]
