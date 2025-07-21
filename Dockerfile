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

# =========================================================================
# === ADD THIS BLOCK TO INSTALL CHROME FOR PUPPETEER ======================
# =========================================================================
RUN apt-get update && apt-get install -y \
    gnupg \
    wget \
    --no-install-recommends \
    # Download the key and store it in the keyrings directory
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    # Add the repository, pointing to the new key
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    # Install Chrome and its dependencies
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libexpat1 libgbm1 libgtk-3-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libxss1 libxtst6 xdg-utils \
    --no-install-recommends \
    # Clean up APT caches
    && rm -rf /var/lib/apt/lists/*
# =========================================================================
# === END OF BLOCK FOR PUPPETEER ==========================================
# =========================================================================

# Copy built artifacts and dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Install specific dependencies needed for runtime commands (like seeding)
RUN npm install ts-node typescript @prisma/client prisma

# Create a non-root user for security
RUN adduser --system --group nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (Cloud Run will automatically use the PORT env var)
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