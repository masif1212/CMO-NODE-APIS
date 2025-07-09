# --- Builder Stage ---
FROM node:18-slim AS builder

WORKDIR /app

# Install system dependencies needed for Node.js modules (e.g., for bcrypt, etc.)
# openssl is already there, but ensuring common build tools are present
RUN apt-get update && apt-get install -y --no-install-recommends openssl build-essential python3

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm install

# Copy the rest of the application source code
COPY . .

# Generate Prisma Client (needed before build if your code imports it)
RUN npx prisma generate

# Build the TypeScript application
RUN npm run build

# --- Final Stage ---
FROM node:18-slim AS final

WORKDIR /app

# Set NODE_ENV for production environment
ENV NODE_ENV=production

# Copy only necessary files from the builder stage
# This includes node_modules (which has @prisma/client and prisma CLI)
# and your compiled JavaScript code
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma # Keep prisma schema for migrations/seeding

# Create a non-root user for security
RUN adduser --system --group nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (Cloud Run will inject its own PORT env var, but this is good practice)
EXPOSE 3001

# Define the command to run the application or migrations/seeding
# The 'npx prisma' commands will use the 'prisma' CLI installed in node_modules
CMD ["sh", "-c", "\
if [ \"$TASK\" = \"migrate\" ]; then \
  echo 'Running migrate + seed'; \
  npx prisma migrate deploy && npx prisma db seed; \
else \
  echo 'Starting app'; \
  node dist/server.js; \
fi"]
