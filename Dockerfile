FROM node:18-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-slim AS final
WORKDIR /app
ENV NODE_ENV=production

# Copy all dependencies and build output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Required for ts-node to run seed.ts
RUN npm install -g ts-node typescript prisma

RUN adduser --system --group nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001  # Still let Cloud Run assign PORT

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
