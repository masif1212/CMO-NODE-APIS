# 1. Builder Stage
FROM node:18-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# 2. Final Production Stage
FROM node:18-slim AS final
WORKDIR /app
ENV NODE_ENV=production

# Install Chrome for Puppeteer
RUN apt-get update && apt-get install -y wget ca-certificates --no-install-recommends \
    && wget -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y /tmp/chrome.deb \
    && rm -f /tmp/chrome.deb \
    && rm -rf /var/lib/apt/lists/*

# Copy built artifacts and dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Install specific dependencies needed for runtime commands
RUN npm install ts-node typescript @prisma/client prisma

# Create a non-root user
RUN adduser --system --group nodejs

# Create and configure the home directory for the non-root user
RUN mkdir -p /home/nodejs
ENV HOME=/home/nodejs
RUN chown -R nodejs:nodejs /app /home/nodejs

# Switch to the non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Define the command to run the application or migration tasks
CMD ["sh", "-c", "\
if [ \"$TASK\" = \"migrate\" ]; then \
  echo 'Running migrate + seed'; \
  npx prisma migrate deploy && npx prisma db seed; \
else \
  echo 'Starting app'; \
  node dist/server.js; \
fi"]