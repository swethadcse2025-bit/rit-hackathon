# Multi-stage build for production-grade TypeScript Node application

# Stage 1: Build dependencies and compile TS
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci

COPY src ./src

RUN npm run build
RUN npx prisma generate

# Stage 2: Production execution environment
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY .env ./

# Secure runtime as non-root user
RUN mkdir -p uploads logs && chown -R node:node /app
USER node

EXPOSE 5000

CMD ["node", "dist/main.js"]
