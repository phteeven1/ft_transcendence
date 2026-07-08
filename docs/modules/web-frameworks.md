# Web Major — Frontend + backend frameworks

**Points:** 2 · **Category:** Web

## Summary

Dicteé uses a **full-stack TypeScript** architecture with two dedicated frameworks:

- **Frontend:** Next.js 16 (App Router) + React 19
- **Backend:** NestJS 11 (modules, controllers, services, dependency injection)

Both are production frameworks with routing, structured architecture, and built-in conventions — not bare libraries.

## Demo steps

1. Show project layout: `apps/frontend/` (Next.js) and `apps/backend/` (NestJS)
2. Open a frontend page (e.g. `/dashboard`) — React components, App Router
3. Show a backend module (e.g. `groups.module.ts`) — controller → service → Prisma
4. Run `npm run dev:local` — both apps start together

## Stack details

| Layer | Technology | Version (approx.) |
|-------|------------|-------------------|
| Frontend framework | Next.js | 16.x |
| UI library | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Backend framework | NestJS | 11.x |
| Runtime | Node.js | 22 (CI) |

## Key files

| Layer | Path |
|-------|------|
| Frontend entry | `apps/frontend/app/layout.tsx` |
| Frontend config | `apps/frontend/package.json`, `next.config.ts` |
| Backend root module | `apps/backend/src/app.module.ts` |
| Backend bootstrap | `apps/backend/src/main.ts` |
| Nest config | `apps/backend/nest-cli.json`, `apps/backend/package.json` |

## Architecture

```
Browser → Next.js (port 3000) → REST / WebSocket → NestJS (port 4000) → Prisma → PostgreSQL
```

NestJS modules include: `users`, `groups`, `players`, `vocabularies`, `games`, `chat`, `invitations`, `mail`.

## Eval talking points

- “We use **Next.js** for the UI and **NestJS** for a modular API — both count as frameworks under the subject definition.”
- “Shared **TypeScript** types and Prisma client keep frontend and backend aligned.”
- “NestJS gives us **controllers, services, and WebSocket gateways** in one structured backend.”

More: [TECHSTACK.md](../../TECHSTACK.md), [BUILDING_THE_APP.md](../../BUILDING_THE_APP.md)
