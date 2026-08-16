# DEV.md — working on Dicteé

How the system is put together. Product and eval: [README.md](./README.md). Naming, git, and definition of done: [AGENTS.md](./AGENTS.md).

---

## Run locally

```bash
# copy .env.example → packages/database/.env, apps/backend/.env, apps/frontend/.env
npm run dev:local    # Postgres in Docker; Nest :4000; Next :3000
npm run dev:stop     # stop Node apps and the Postgres container
```

Full stack: `docker compose up --build`.

```bash
npm run db:generate
npm run db:migrate          # create + apply (dev)
npm run db:migrate:deploy   # apply committed migrations
npm run db:studio
```

Need `OPENAI_API_KEY` for AI vocab import. Mail is Nodemailer + Gmail SMTP (`MAIL_USER`, `MAIL_PASS` app password, `MAIL_FROM`, `APP_URL`). Never commit `.env` files.

---

## Layout

```
apps/frontend/
  app/                 # Next.js App Router — one folder per page
    page.tsx           # landing
    layout.tsx         # TopBar, AuthProvider, LanguageProvider
    components/ui/     # clay component library
    context/           # auth-context, language-context
    hooks/             # session guard, sockets, game hooks
  lib/api/             # only place that should call fetch()
  lib/parent-session.ts
apps/backend/src/
  app.module.ts
  users/ groups/ players/ vocabularies/ invitations/ mail/
  games/               # lobby + shared gateway
    game.gateway.ts    # Socket.IO
    games.service.ts   # create / join / start / leave / finish
    word_building/
    word_soup/
  progression/         # XP, avatars, leaderboard (claimed eval module)
  prisma/              # PrismaService
  common/mappers.ts    # DB field names → API JSON
packages/database/
  prisma/schema.prisma
  prisma/migrations/
```

Frontend pages live under `app/<route>/`. Page-only components go in `_components/`. Shared types are re-exported from `app/types.ts` as DTO aliases.

`games/` is the lobby. It does not know how a crossword or word search works. Each game owns scoring, validation, and win conditions in its own folder.

---

## REST vs WebSockets

UI components must not call `fetch('http://localhost:4000/...')`. They call `@/lib/api` (`usersApi`, `groupsApi`, `gamesApi`, …). Base URL is `NEXT_PUBLIC_API_URL` in `lib/api/config.ts`.

| Channel | Job |
|---------|-----|
| REST | Mutations: create game, join, start, leave, CRUD |
| Socket.IO | Shared state after a mutation |

Typical lobby flow:

1. Player A clicks New Word Building.
2. Frontend `gamesApi.create(...)`.
3. Backend writes to Postgres, emits `lobby:update` to room `group:{groupId}`.
4. Every client in that room (including A) redraws from the event.

Do not optimistically patch the lobby from the REST response. Wait for the socket event.

Gateway: `apps/backend/src/games/game.gateway.ts` (`@WebSocketGateway({ cors: { origin: '*' } })`).

| Client → server | Server → clients |
|-----------------|------------------|
| `joinGroup` | `lobby:update`, `game:started` |
| `joinGame` | `game:state`, `game:playerLeft` |
| `placeLetter` | `cell:locks` |
| `cell:lock` / `cell:unlock` | `game:finished` |
| `guess:submit` | `game:guessResult`, `game:wordGuessed`, `game:playerFrozen` / `game:playerUnfrozen`, `game:error` |

Rooms: `group:{id}` (lobby), `game:{id}` (in play). Disconnect releases cell locks.

Mappers (`common/mappers.ts`) keep API JSON stable when Prisma field names differ (e.g. `inGroupId` → `inGroup`). The UI must not import `@ft-transcendence/database` or Prisma.

---

## Prisma

Schema is the source of truth: `packages/database/prisma/schema.prisma`. The backend depends on `@ft-transcendence/database`. Generated client is gitignored (`packages/database/generated/prisma/`).

`GroupMembership` replaced parallel `admins[]` / `members[]` arrays. Role is `ADMIN` or `MEMBER`. Crossword solution JSON lives on `Crossword` and is never sent to the client.

Every schema change needs a migration (`npm run db:migrate` from repo root). Do not use `prisma db push` for anything you intend to keep. CI and Docker run `db:migrate:deploy`.

---

## Vocabulary

Add and edit share one dialog (`add-vocabulary.tsx`). Each group gets a hidden starter list (`TEST_VOCABULARY`) if none exists; custom lists always become the active list. Names are unique per group. Entries: max 18 characters, whitespace stripped, unique words and unique meanings, at least 5 pairs (frontend + backend `vocabulary-entry-rules.ts`). AI import sends photos as `image_url` and PDFs as GPT-4o file parts (no pdf-parse). Extract requires group membership (`userId` + `groupId`); HEIC is rejected.

---

## Player sessions (Play Now)

A parent session and a child session are different things.

- **Parent:** `POST /users/signin` returns the user object. `AuthContext` hydrates from `localStorage` via `parent-session.ts` (`dicteeUserId` / `dicteeGroupId`) with unauthenticated `GET /users/:id`. Demo-only ID restore — not a real session. There is no JWT.
- **Child:** dashboard Play Now → `POST /players/startSession` `{ playerId, minutes }` → one `PlayerSession` row (token, `expiresAt`). Frontend stores the token in **`sessionStorage`** (per tab, cleared on close) and sends the child to `/select_game`. Not a cookie. Parent `User` / `Group` stay in `AuthContext` while the child plays.

Rules:

- One unexpired token per player. A second Play Now while one is live is rejected unless the parent ends it first.
- `select_game` validates on mount. Missing or expired → `/dashboard` if a parent is still in context, else `/`. Games in progress are not interrupted.
- Requests that need a child session send headers `x-player-id` and `x-player-session-token`. Progression routes use `PlayerSessionGuard`.
- `POST /players/clearSession` deletes the token immediately (leave session, or **End session** in the Play Now dialog).
- Closing the tab clears `sessionStorage` but leaves the server token until `expiresAt` or parent force-clear. Do not `sendBeacon` on `pagehide` — that event also fires on refresh and would delete the server token while `sessionStorage` still has it.

This exists so two tabs cannot play as the same child, and so `currentGameId` is not the only notion of “is this child online”.

---

## Adding a game

Lobby stays in `games/` (controller, service, gateway). Do not fork those for a new game.

Backend: `apps/backend/src/games/<name>/` (module, controller, service), then import the module from `games.module.ts`.

Frontend:

- Lobby button in `select_game/page.tsx`
- Page under `app/<name>/` (Word Building and Word Soup already follow this)
- API under `lib/api/games/`
- Extend `use-game-socket.ts` only if you need new events

The server builds the puzzle from the group’s **active vocabulary**. The client renders what the server returns. For Word Building, `POST /games/:id/initWordBuildingCourt` runs the puzzle engine; `solution` stays on the server.

---

## Design

Claymorphism UI. Tokens: `apps/frontend/app/design-tokens.json` and `globals.css`. Components: `apps/frontend/app/components/ui/` (Button, Input, Card, Dialog, PageShell, Panel, Chip, Dropdown, Icon — plus `index.ts`). Fonts: system `ui-sans-serif` stack (`--font-heading` / `--font-body` in `globals.css`). Use the `Icon` component for UI glyphs, not emoji.

---

## Pitfalls (true today)

- Parent restore is `localStorage` ids + unauthenticated `GET /users/:id`. Most REST routes have no auth guard; many POSTs trust a body `userId`. Fine for a demo, not production auth.
- Closing a Play Now tab orphans the `PlayerSession` row until `expiresAt` or the parent uses **End session**. Do not restore a `pagehide` beacon.
- Word Soup is a real game, not a stub. Progression (XP, avatars, leaderboard) is claimed as gamification plus game statistics.
