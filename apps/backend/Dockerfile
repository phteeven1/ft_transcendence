# ---- Build ----
FROM node:26-alpine AS builder

WORKDIR /app

ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/transcendence

COPY packages/database/package.json packages/database/package-lock.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma
COPY packages/database/prisma.config.ts ./packages/database/
RUN cd packages/database && npm ci && npm run db:generate

COPY packages/database ./packages/database

COPY apps/backend/package.json apps/backend/package-lock.json apps/backend/.npmrc ./apps/backend/
RUN cd apps/backend && npm ci --ignore-scripts

COPY apps/backend ./apps/backend
# Host incremental cache must not be used: .dockerignore excludes dist/ but
# a copied tsconfig.build.tsbuildinfo would skip emitting dist/main.js.
RUN rm -f apps/backend/*.tsbuildinfo && cd apps/backend && npm run build

# ---- Production ----
FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/transcendence

COPY packages/database/package.json packages/database/package-lock.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma
COPY packages/database/prisma.config.ts ./packages/database/
COPY --from=builder /app/packages/database/generated ./packages/database/generated
RUN cd packages/database && npm ci --omit=dev --ignore-scripts

COPY apps/backend/package.json apps/backend/package-lock.json apps/backend/.npmrc ./apps/backend/
# Client already generated in builder; skip backend postinstall.
# .npmrc sets install-links=false so file: database stays a symlink and
# sees packages/database/generated (a packed copy would omit it).
RUN cd apps/backend && npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

WORKDIR /app/apps/backend

EXPOSE 4000

CMD ["sh", "-c", "cd /app/packages/database && npx prisma migrate deploy && node /app/apps/backend/dist/main"]
