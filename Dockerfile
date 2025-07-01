# Stage 1: Builder
FROM node:18-slim AS builder
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends openssl

# Copy package files and install
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of your code
COPY . .

# Generate Prisma client (DO NOT RUN MIGRATIONS)
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Stage 2: Final production image
FROM node:18-slim AS final
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Secure runtime user
RUN adduser --system --group nextjs
RUN chown -R nextjs:nextjs /app
USER nextjs

EXPOSE 8080

# Start Next.js app (this assumes next.config.js is set correctly)
CMD ["node_modules/.bin/next", "start", "-p", "8080"]
