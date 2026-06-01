# ft_transcendence — Data & API Architecture

This document explains **everything implemented for persistence and API access** in this project: what existed before, what was added, **why** each decision was made, and how to work with it day to day.

It is written so you can present or defend the architecture in a review without reading the whole codebase.

---

## Table of contents

1. [Goals](#1-goals)
2. [High-level architecture](#2-high-level-architecture)
3. [PostgreSQL & Prisma (packages/database)](#3-postgresql--prisma-packagesdatabase)
4. [Backend (NestJS)](#4-backend-nestjs)
5. [Frontend API layer (dumb UI)](#5-frontend-api-layer-dumb-ui)
6. [Local development workflow](#6-local-development-workflow)
7. [Environment variables](#7-environment-variables)
8. [Commands reference](#8-commands-reference)
9. [Changing the schema or API](#9-changing-the-schema-or-api)
10. [Troubleshooting](#10-troubleshooting)
11. [Known follow-ups](#11-known-follow-ups)
12. [Entity relationship diagram](#12-entity-relationship-diagram)

---

## 1. Goals

| Goal | How we meet it |
|------|----------------|
| Persist users, groups, players, vocabularies, games, invitations | PostgreSQL 16 in Docker + Prisma schema |
| Keep existing REST JSON shapes | Backend `mappers.ts` + frontend DTO types |
| Schema changes are traceable | Prisma migrations only (no `db push` for releases) |
| Frontend does not know about Postgres/Prisma | All HTTP in `apps/frontend/lib/api/*` |
| Easy to extend without over-engineering | One folder per domain (`users`, `groups`, …) |
| Local dev on laptop | Postgres in Docker; Nest + Next on host via `dev:local` |

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser (Next.js)                                                       │
│  app/**           UI only — forms, navigation, React state               │
│  app/types.ts     Re-exports DTO aliases (User, Group, …)                │
│  lib/api/**       HTTP clients — URLs, methods, JSON bodies              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ REST (JSON)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NestJS (apps/backend)                                                   │
│  *Controller       HTTP routes (unchanged paths)                         │
│  *Service          Business + Prisma today (repository layer = follow-up)│
│  common/mappers.ts DB field names → API JSON (inGroupId → inGroup)       │
│  prisma/           PrismaClient + @prisma/adapter-pg                     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ SQL via Prisma
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL 16 (Docker, volume postgres_data)                            │
│  Schema defined in packages/database/prisma/schema.prisma                │
└─────────────────────────────────────────────────────────────────────────┘
```

**Dependency rule (what “dumb frontend” means here):**

- `app/register/page.tsx` may call `usersApi.register(...)` — it must **not** call `fetch('http://localhost:4000/...')`.
- UI must **not** import `@ft-transcendence/database` or Prisma.
- If the API URL changes, you edit **one** file: `lib/api/config.ts` (or `NEXT_PUBLIC_API_URL`).

This is **not** full strict layering on the backend yet (no repository interfaces). The backend still uses Prisma inside services; the important split for the 42 project is: **persistence vs HTTP on the server**, **HTTP client vs UI on the client**.

---

## 3. PostgreSQL & Prisma (packages/database)

### 3.1 Starting point

The backend already had in-memory types and arrays in Nest services (`UsersService`, `GroupsService`, …).  
`docker-compose.yml` already ran Postgres and set `DATABASE_URL` for the backend container.  
`schema.prisma` initially had only a placeholder `User` model.

### 3.2 Package layout

```
packages/database/
├── prisma/
│   ├── schema.prisma              # All models
│   └── migrations/
│       └── 20260531111356_init/   # First migration (committed)
├── prisma.config.ts               # Prisma 7: DATABASE_URL for CLI
├── package.json                   # @ft-transcendence/database
└── generated/prisma/              # Client output (gitignored, built on install)
```

The backend depends on this package:

```json
"@ft-transcendence/database": "file:../../packages/database"
```

### 3.3 Relational model (design choices)

#### GroupMembership instead of parallel arrays

In memory, groups had `admins[]` / `members[]` and users had `isAdminOf[]` / `isMemberOf[]`.

In the database:

```prisma
enum GroupRole { ADMIN MEMBER }

model GroupMembership {
  userId  Int
  groupId Int
  role    GroupRole
  @@unique([userId, groupId])
}
```

**Why:** Normalized data avoids duplicate membership state and simplifies “leave group” / “delete group”.  
**API unchanged:** `toApiGroup()` / `toApiUser()` in the backend rebuild the old array shapes.

#### GamePlayer join table

Games had `players: number[]`. The DB uses:

```prisma
model GamePlayer {
  gameId   Int
  playerId Int
  @@id([gameId, playerId])
}
```

**Why:** Many-to-many between games and player profiles.  
**API unchanged:** `toApiGame()` returns `players: number[]`.

#### Vocabulary word lists as PostgreSQL arrays

`words` and `meanings` are `String[]` columns.

**Why:** Matches the previous parallel-array API without a separate `VocabularyEntry` table.  
**Trade-off:** Harder to query single words in SQL; fine for this app.

#### Cascading deletes

Deleting a `Group` cascades to memberships, players, vocabularies, games, invitations.

**Why:** Matches previous `GroupsService.delete()` behavior without manual cleanup in multiple services.

#### Member is not a table

`Member` is still built at read time from `GroupMembership` + `User` (`findMembers()`).

### 3.4 Prisma 7 specifics

- **CLI config:** `prisma.config.ts` holds `datasource.url` (not in `schema.prisma`).
- **Client generation:** `generator` outputs to `generated/prisma` with `prisma-client-js`.
- **Runtime in Nest:** `PrismaService` uses `@prisma/adapter-pg` + `pg` (required for Prisma ORM 7 when constructing `PrismaClient`).

```typescript
// apps/backend/src/prisma/prisma.service.ts (concept)
const adapter = new PrismaPg({ connectionString: config.get('DATABASE_URL') });
super({ adapter });
```

### 3.5 Commands (database package)

From repo root:

| Command | Purpose |
|---------|---------|
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Create + apply migration (dev) |
| `npm run db:migrate:deploy` | Apply existing migrations |
| `npm run db:studio` | Prisma Studio GUI |

---

## 4. Backend (NestJS)

### 4.1 What changed

| Before | After |
|--------|--------|
| In-memory arrays in `*Service` | `PrismaService` queries |
| No migrations | `20260531111356_init` migration |
| — | `src/common/mappers.ts` maps DB → API JSON |
| — | `src/prisma/prisma.module.ts` global module |

**Controllers and routes were not renamed.** Examples:

- `POST /users/register`
- `GET /groups/:id`
- `GET /players/:id` (no `passAnswer` in response)

### 4.2 Mapper layer (why it exists)

Prisma uses names like `inGroupId`, `ofUserId`, `isCurrent`.  
The frontend historically expected `inGroup`, `ofUser`, and some UI code used `isCurrent` for vocabularies.

`apps/backend/src/common/mappers.ts` is the **compatibility boundary**:

- DB layer speaks Prisma types.
- HTTP layer speaks the **original JSON contract**.

When you add a field, update: schema → mapper → (optional) frontend DTO in `lib/api`.

### 4.3 Docker backend

`apps/backend/Dockerfile` builds from monorepo root:

1. Install `packages/database`, run `prisma generate`.
2. Build Nest app.
3. On container start: `prisma migrate deploy` then `node dist/main`.

`docker-compose.yml` sets `DATABASE_URL` with host `postgres` (Docker network).

---

## 5. Frontend API layer (dumb UI)

### 5.1 Why we added `lib/api`

Previously, **30+ components** called `fetch('http://localhost:4000/...')` directly. Problems:

- URL and port duplicated everywhere.
- Request body field names (`userName`, `vocabularyInGroup`, …) scattered in UI.
- Hard to mock or swap API base URL for staging/production.
- Violates “dumb UI”: pages knew HTTP details.

### 5.2 Structure (all domains)

```
apps/frontend/lib/api/
├── config.ts              # getApiBaseUrl() ← NEXT_PUBLIC_API_URL
├── http.ts                # apiRequest(), shared fetch + ApiError
├── errors.ts              # ApiError(status)
├── index.ts               # Public exports
├── users/
│   ├── types.ts           # UserDto, RegisterUserInput, …
│   ├── users.api.ts       # usersApi.register, signIn, getById
│   └── index.ts
├── groups/                # groupsApi.*
├── players/               # playersApi.*
├── vocabularies/          # vocabulariesApi.*
├── games/                 # gamesApi.*
└── invitations/           # invitationsApi.*
```

**Rule:** Only files under `lib/api/**` may know:

- Full URL paths (`/groups/create`, …)
- HTTP method + JSON body property names matching the backend

**Pages/components** call intent-based functions:

```typescript
import { usersApi } from '@/lib/api';

const user = await usersApi.register({
  userName: formData.userName,
  userPassword: formData.userPassword,
  userEmail: formData.userEmail,
});
```

### 5.3 DTOs vs `app/types.ts`

| Layer | File | Role |
|-------|------|------|
| API contract | `lib/api/users/types.ts` | `UserDto` — mirrors backend JSON |
| UI convenience | `app/types.ts` | `export type { UserDto as User }` etc. |

Existing imports `from '../types'` keep working. New code may import from `@/lib/api` directly.

### 5.4 Domain API surface (complete list)

#### usersApi

| Method | HTTP | Used by |
|--------|------|---------|
| `register(input)` | `POST /users/register` | register, accept_invitation |
| `signIn(input)` | `POST /users/signin` | signin, accept_invitation |
| `getById(id)` | `GET /users/:id` | auth-context `refreshUser` |

#### groupsApi

| Method | HTTP |
|--------|------|
| `create({ groupName, creatorId })` | `POST /groups/create` |
| `getById(groupId)` | `GET /groups/:id` |
| `getMembers(groupId)` | `GET /groups/:id/members` |
| `addMember`, `promote`, `demote`, `leave`, `rename`, `expel`, `delete` | `POST /groups/...` |

Used by: dashboard, create_group, manage_group, auth-context, accept_invitation, top-bar, …

#### playersApi

| Method | HTTP |
|--------|------|
| `create`, `rename`, `updatePassPhrase`, `remove` | `POST /players/...` |
| `getById(id)` | `GET /players/:id` |
| `findByParentInGroup(userId, groupId)` | `GET /players/parent/:userId/group/:groupId` |

#### vocabulariesApi

| Method | HTTP |
|--------|------|
| `create`, `setActive`, `rename`, `updateEntries`, `remove` | `POST /vocabularies/...` |
| `findByGroup(groupId)` | `GET /vocabularies/group/:groupId` |

**Note:** Backend returns `isCurrent`; DTO uses `isCurrent` (not `isActive`). UI list label “Active” reads `vocabulary.isCurrent`.

#### gamesApi

| Method | HTTP |
|--------|------|
| `create`, `join`, `start`, `leave`, `finish` | `POST /games/...` |
| `getById`, `findByGroup` | `GET /games/...` |

#### invitationsApi

| Method | HTTP |
|--------|------|
| `validateToken(token)` | `GET /invitations/validate/:token` |
| `send(input)` | `POST /invitations/send` |
| `accept({ token })` | `POST /invitations/accept` |

### 5.5 Shared HTTP helper

```typescript
// lib/api/http.ts
export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T>
```

- Prefixes `getApiBaseUrl()`.
- Sets `Content-Type: application/json` when body is present.
- Throws `ApiError` with HTTP status on failure.

Pages catch errors and show modals; they do not parse `Response` manually.

### 5.6 What we did **not** do (intentionally)

- No Redux/React Query (can be added later on top of `*Api`).
- No generated OpenAPI client (manual DTOs are enough for 42 scope).
- No repository pattern on the backend yet (next refactor step).
- No shared `packages/contracts` package between front and back.

---

## 6. Local development workflow

### 6.1 Recommended: `dev:local`

```bash
npm run dev:local
```

This script (`scripts/dev-local.sh`):

1. Starts Postgres (`docker compose up -d postgres`).
2. Waits until `pg_isready` succeeds.
3. Runs `npm run db:migrate:deploy`.
4. Starts Nest (`apps/backend`) and Next (`apps/frontend`) with `DATABASE_URL` pointing at **`localhost`**.

**Important:** `apps/backend/.env` must use `localhost` in `DATABASE_URL`, not `postgres`. The hostname `postgres` only resolves inside the Docker network.

### 6.2 Stop everything cleanly

```bash
npm run dev:stop
```

Stops processes on ports 3000/4000 and `docker compose stop postgres redis`.

| Flag | Effect |
|------|--------|
| `npm run dev:stop -- --keep-db` | Only Node apps |
| `npm run dev:stop -- --all` | `docker compose down` |
| `npm run dev:stop -- --purge` | `down -v` (deletes DB volume) |

`Ctrl+C` in `dev:local` stops frontend/backend only; Postgres keeps running until `dev:stop`.

### 6.3 Full Docker stack

```bash
docker compose up --build
```

Runs frontend, backend, postgres, redis. Backend runs migrations on start.

---

## 7. Environment variables

| Variable | Where | Local example |
|----------|--------|----------------|
| `DATABASE_URL` | Prisma CLI, Nest | `postgresql://postgres:postgres@localhost:5432/transcendence` |
| `DATABASE_URL` | Backend in Docker | `...@postgres:5432/...` |
| `NEXT_PUBLIC_API_URL` | Next.js | `http://localhost:4000` |
| `JWT_SECRET` | Backend | `supersecret` |
| `MAIL_*`, `APP_URL` | Invitations | see `apps/backend/.env.example` |

Copy examples:

- `packages/database/.env.example` → `packages/database/.env`
- `apps/backend/.env.example` → `apps/backend/.env`
- `apps/frontend/.env.example` → `apps/frontend/.env.local`

---

## 8. Commands reference

### Database (repo root)

```bash
docker compose up -d postgres
npm run db:generate
npm run db:migrate          # dev: new migration
npm run db:migrate:deploy   # apply committed migrations
npm run db:studio
```

### App dev

```bash
npm run dev:local
npm run dev:stop
```

### Inspect data in Postgres

```bash
docker compose exec postgres psql -U postgres -d transcendence -c 'SELECT id, name, email FROM "User";'
```

Or `npm run db:studio`.

---

## 9. Changing the schema or API

### Database schema

1. Edit `packages/database/prisma/schema.prisma`.
2. `npm run db:migrate` (name the migration).
3. Commit `prisma/migrations/<timestamp>_*`.
4. Update `apps/backend/src/common/mappers.ts` if API JSON changes.
5. Teammates: `npm run db:migrate:deploy`.

**Do not** use `prisma db push` for production-style releases (project rule).

### New backend endpoint

1. Add controller + service method.
2. Add mapper if DB shape ≠ JSON shape.
3. Add method to matching `lib/api/<domain>/<domain>.api.ts`.
4. Add/update DTO in `lib/api/<domain>/types.ts`.
5. Call `*Api` from UI — never raw `fetch` in `app/`.

### New frontend domain module

Copy the `users/` folder pattern:

1. `types.ts` — DTOs only.
2. `<domain>.api.ts` — functions using `apiRequest`.
3. Export from `lib/api/index.ts`.

---

## 10. Troubleshooting

| Problem | Cause / fix |
|---------|-------------|
| `ECONNREFUSED` on API | Postgres not running → `docker compose up -d postgres` |
| `ECONNREFUSED` with Nest on host | `DATABASE_URL` must use `localhost`, not `postgres` |
| `PrismaClient` / empty options error | Missing `@prisma/adapter-pg`; ensure `PrismaService` uses adapter |
| Migration drift | `npm run db:migrate:deploy` with Postgres up |
| `dev:local` exits immediately | Fixed: do not use `wait -n` on macOS Bash 3.2; script uses `wait $pid1 $pid2` |
| Register works in API but UI 500 | Check backend logs; verify `.env` and Postgres |
| Vocabulary “Active” badge missing | Use `isCurrent` from API (not `isActive`) |

---

## 11. Known follow-ups

**Backend**

- Password hashing (still plain text in DB).
- Set `User.currentGroupId` when user selects a group.
- Extract **repository interfaces** from services (true 3-layer backend).
- Remove duplicate membership upserts in `GroupsService.create`.

**Frontend**

- Wrap `accept_invitation` in `<Suspense>` for `useSearchParams` (Next build warning).
- Optional: React Query for polling (e.g. manage_group 5s refresh).
- Align `Game.waitingFor` with backend if player-lobby rules are finalized.

**Ops**

- Redis is in compose but not wired to app logic yet.

---

## 12. Entity relationship diagram

```mermaid
erDiagram
  User ||--o{ GroupMembership : has
  Group ||--o{ GroupMembership : has
  User ||--o{ Player : owns
  Group ||--o{ Player : contains
  Group ||--o{ Vocabulary : contains
  User ||--o{ Vocabulary : creates
  Group ||--o{ Game : hosts
  Player ||--o{ Game : initiates
  Game ||--o{ GamePlayer : includes
  Player ||--o{ GamePlayer : joins
  Group ||--o{ Invitation : sends
```

**Domain summary:** Users (parents) belong to groups as admin or member. They create **player profiles** for children and **vocabularies** inside a group. **Games** reference player IDs; invitations join users to groups via email token.

---

## File index (quick lookup)

| Path | Role |
|------|------|
| `packages/database/prisma/schema.prisma` | DB schema |
| `packages/database/prisma/migrations/` | SQL migrations |
| `apps/backend/src/prisma/` | Nest Prisma wiring |
| `apps/backend/src/common/mappers.ts` | Prisma → API JSON |
| `apps/backend/src/**/*.service.ts` | Business + DB access |
| `apps/frontend/lib/api/` | All frontend HTTP |
| `apps/frontend/app/types.ts` | DTO aliases for UI |
| `scripts/dev-local.sh` / `dev-stop.sh` | Local dev lifecycle |
| `docker-compose.yml` | Postgres, Redis, optional full stack |

---

*Last updated: reflects PostgreSQL + Prisma persistence, Nest mappers, and full frontend `lib/api` module split.*
