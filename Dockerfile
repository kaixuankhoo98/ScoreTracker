# Build stage
FROM node:20-slim AS builder

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install
RUN cd client && npm install --legacy-peer-deps
RUN cd server && npm install
RUN cd shared && npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN cd server && npx prisma generate

# Build shared, client, and server
RUN cd shared && npm run build
RUN cd client && npm run build
RUN cd server && npm run build

# Production stage
FROM node:20-slim AS production

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for production
COPY package*.json ./
COPY server/package*.json ./server/

# Install production dependencies
RUN cd server && npm install --omit=dev

# Install tsx globally for seeding
RUN npm install -g tsx

# Copy Prisma schema and seed script
COPY server/prisma ./server/prisma
RUN cd server && npx prisma generate

# Copy built files
COPY --from=builder /app/server/dist ./server/dist
# Copy client build to where the server expects it (../public from dist/server/src)
COPY --from=builder /app/client/dist ./server/dist/server/public

# Expose port
EXPOSE 3000

# Start the server with migrations and seeding
WORKDIR /app/server
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx prisma db seed && node dist/server/src/index.js"]
