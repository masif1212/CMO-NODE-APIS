# ---- Stage 1: Build ----
FROM node:18-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Stage 2: Final Image ----
FROM node:18-slim AS final
WORKDIR /app
ENV NODE_ENV=production

# Copy only what's needed in the final image
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma/seed.ts ./prisma/seed.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json  # optional, but needed by ts-node

# Install only tools needed for seeding
RUN npm install -g ts-node typescript prisma

# Secure non-root user
RUN adduser --system --group nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Cloud Run will inject PORT env; don't hardcode
EXPOSE 3001

# Entrypoint logic
CMD ["sh", "-c", "\
echo 'TASK: $TASK'; \
if [ \"$TASK\" = \"migrate\" ]; then \
  echo 'Running migrate + seed'; \
  npx prisma migrate deploy && npx prisma db seed; \
elif [ \"$TASK\" = \"start\" ]; then \
  echo 'Running seed and starting app'; \
  npx prisma db seed || echo 'Seed skipped or failed'; \
  node dist/server.js; \
else \
  echo '❌ Invalid TASK. Use TASK=migrate or TASK=start'; \
  exit 1; \
fi"]
