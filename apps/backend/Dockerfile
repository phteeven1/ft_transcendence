FROM node:22-alpine

WORKDIR /app

# Database package (schema + client)
# Copy all database files BEFORE npm ci so postinstall can run prisma generate
COPY packages/database ./packages/database
RUN cd packages/database && npm ci

ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/transcendence

# Backend
COPY apps/backend/package.json apps/backend/package-lock.json ./apps/backend/
RUN cd apps/backend && npm ci

COPY apps/backend ./apps/backend
COPY packages/database ./packages/database

RUN cd apps/backend && npm run build

WORKDIR /app/apps/backend

EXPOSE 4000

CMD ["sh", "-c", "cd /app/packages/database && npx prisma migrate deploy && cd /app/apps/backend && node dist/main"]
