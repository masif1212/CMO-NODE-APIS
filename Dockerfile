# Dockerfile for Node.js Backend API (Handles migrations)

# Stage 1: Build Stage (compiles TypeScript)
FROM node:18-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Generate the Prisma Client for your API
RUN npx prisma generate
# Compile TypeScript to JavaScript in the /dist folder
RUN npm run build

# Stage 2: Final Production Stage
FROM node:18-slim AS final
WORKDIR /app
ENV NODE_ENV=production

# Copy production dependencies, compiled code, and prisma folder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
# This is crucial: copy the prisma schema and migrations folder
COPY --from=builder /app/prisma ./prisma

# Create a secure, non-root user
RUN adduser --system --group nodejs
USER nodejs

EXPOSE 8080

# This CMD can run the migration OR start the production server
CMD ["sh", "-c", "if [ \"$TASK\" = \"migrate\" ]; then npx prisma migrate deploy; else node dist/server.js; fi"]