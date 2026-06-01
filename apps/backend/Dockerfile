FROM node:22-alpine

WORKDIR /app

# Database package (schema + client)
COPY packages/database/package.json packages/database/package-lock.json ./packages/database/
RUN cd packages/database && npm ci

COPY packages/database/prisma ./packages/database/prisma
COPY packages/database/prisma.config.ts packages/database/tsconfig.json ./packages/database/

ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/transcendence
RUN cd packages/database && npm run db:generate

# Backend
COPY apps/backend/package.json apps/backend/package-lock.json ./apps/backend/
RUN cd apps/backend && npm ci

COPY apps/backend ./apps/backend
COPY packages/database ./packages/database

RUN cd apps/backend && npm run build

WORKDIR /app/apps/backend

EXPOSE 4000

CMD ["sh", "-c", "cd /app/packages/database && npx prisma migrate deploy && node dist/main"]
