# Web Minor — ORM (Prisma + PostgreSQL)

**Points:** 1 · **Category:** Web

## Summary

All persistent data goes through **Prisma ORM** on **PostgreSQL 16**. The schema lives in a shared package (`@ft-transcendence/database`) used by the NestJS backend. Migrations are version-controlled and applied in CI and on Docker startup.

## Demo steps

1. Show `packages/database/prisma/schema.prisma` — models and relations
2. Run `npm run db:studio` — browse live data
3. Show a service using Prisma (e.g. `groups.service.ts` → `prisma.group.findMany`)
4. Mention migrations: `npm run db:migrate:deploy` (8 migrations applied)

## Schema overview

| Model | Purpose |
|-------|---------|
| `User` | Parent accounts |
| `Group` | Organization / family group |
| `GroupMembership` | User ↔ group with `ADMIN` / `MEMBER` role |
| `Player` | Child profiles managed by parents |
| `PlayerSession` | Play Now session tokens |
| `Vocabulary` | Word lists for games |
| `Game` / `GamePlayer` | Multiplayer game instances |
| `GroupChatEntry` | Chat messages + activity log |
| `Invitation` | Email invite tokens |

Relations use foreign keys, cascades, and indexes (see schema file).

## Key files

| Layer | Path |
|-------|------|
| Schema | `packages/database/prisma/schema.prisma` |
| Migrations | `packages/database/prisma/migrations/` |
| Generated client | `packages/database/generated/prisma/` |
| Prisma service | `apps/backend/src/prisma/prisma.service.ts` |
| Setup guide | [DATABASE_SETUP.md](../../DATABASE_SETUP.md) |

## Commands

```bash
npm run db:generate          # regenerate client after schema change
npm run db:migrate           # dev: create + apply migration
npm run db:migrate:deploy    # prod/CI: apply committed migrations
npm run db:studio            # GUI
```

## Eval talking points

- “**Prisma** gives us type-safe queries and a single schema source of truth.”
- “**PostgreSQL** stores relational data — users, groups, games, vocabulary.”
- “Migrations run in **CI and Docker** so schema stays consistent across environments.”
