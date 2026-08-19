# AGENTS.md

Rules for coding agents working in this repo. Architecture and workflows: [DEV.md](./DEV.md). Product and eval: [README.md](./README.md).

Do not add markdown files. Do not rewrite large game files (`word-building.service.ts`, `word-soup.service.ts`, `use-word-soup-game.ts`, the puzzle engine) unless the user asked.

Ask before adding a dependency.

---

## Git

- Branch from `development`: `feature/...`, `fix/...`, `refactor/...`.
- PR into `development` (1 approval, squash merge).
- `main` only from `development` (2 approvals, squash). Tag releases on `main`.
- No direct pushes to `main` or `development`. No force-push on those branches.
- Never commit `.env`, `node_modules`, or secrets.

Commits — one logical change, conventional prefix:

```
feat: ...
fix: ...
refactor: ...
chore: ...
```

CI (`.github/workflows/ci.yml`) runs migrate, backend tests, frontend lint/build. Do not claim there is no CI. A change is done when types, lint, and the app still run.

---

## TypeScript and naming

- English identifiers. Intent over implementation. No type suffixes (`userObj`).
- `camelCase` variables and functions. `PascalCase` classes, types, enums.
- Interfaces: `I` prefix (`IPlaceLetterDto`).
- Enum values and constants: `UPPER_SNAKE_CASE`.
- Files: kebab-case (`word-building.service.ts`).
- `"strict": true` stays on. No `any` unless justified. Explicit return types on exported functions.
- One job per function. Early returns. Prefer small helpers over deep nesting.
- Prettier. No commented-out dead code. Booleans read as questions (`isAuthenticated`).
- No unexplained magic numbers — name them.

---

## NestJS

- Controllers: HTTP only. No Prisma, no business rules.
- Services: logic and database. Inject via constructor. Never `new SomeService()`.
- After adding a module, import it in `app.module.ts` (or the parent module). Game modules go through `games.module.ts`.

---

## Prisma

- Schema lives in `packages/database/prisma/schema.prisma`.
- Every schema change is a migration (`npm run db:migrate` from repo root).
- Never `prisma db push` for something that should last. Never edit the production database by hand.

---

## Frontend

- Pages and components call `@/lib/api`. Never `fetch` the backend URL from `app/`.
- Keep logic out of JSX. Shared UI lives in `app/components/ui/`.
- Tailwind utilities only. No ad-hoc inline CSS. No emoji as UI icons — use `Icon`.
- After a lobby/game mutation, wait for the Socket.IO event to update shared UI. See [DEV.md](./DEV.md).
- User-facing failures belong in the UI (`text-destructive`, dialog error, existing banners). Do not `throw`, `console.error`, or `alert` for those. `@/lib/api` may throw so callers can `catch` and render; callers must not rethrow. Keep React provider invariants (`useAuth` / `useLanguage` throw if used outside their provider). Backend Nest `console.error` stays for server logs.

---

## Scope

- Prefer the smallest change that matches existing patterns.
- Do not invent JWT, Redis usage, friends, or extra markdown unless asked.
- Parent identity is `UserSession` (`dicteeUserId` + `dicteeUserSessionToken` in `localStorage` via `parent-session.ts`). Child Play Now is dashboard start → `PlayerSession` in `sessionStorage`. One live token per user and per player; a new sign-in or Play Now replaces the row and kicks the previous client. Do not rewrite that auth in passing (no JWT unless asked).
