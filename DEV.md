# DEV.md — working on Dicteé

How the system is put together. Product and eval: [README.md](./README.md). Naming, git, and definition of done: [AGENTS.md](./AGENTS.md).

---

## Run locally

```bash
# create apps/backend/.env (Compose needs the file). Optional: packages/database/.env for Prisma CLI.
npm run dev:local    # Postgres in Docker; Nest :4000; Next :3000
npm run dev:stop     # stop Node apps and the Postgres container
```

HTTPS stack (Nginx on :80/:443, Nest and Next unpublished): `npm run build` (rebuild + start) or `npm run dev` (start only). Both run `scripts/docker-up.sh`, which prints `https://localhost` and this machine's LAN IPs. Use one of those URLs on every device. Stop with `npm run down`.

```bash
npm run db:generate
npm run db:migrate          # create + apply (dev)
npm run db:migrate:deploy   # apply committed migrations
npm run db:studio
```

Need `OPENAI_API_KEY` for AI vocab import. Mail is Nodemailer + Gmail SMTP (`MAIL_USER`, `MAIL_PASS` app password, `MAIL_FROM`). Docker Compose sets `APP_URL` to `https://<PUBLIC_HOST>` for invite links (overrides `APP_URL` in `apps/backend/.env`). Never commit `.env` files. The frontend has no `NEXT_PUBLIC_API_URL` — see REST vs WebSockets below.

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
  lib/api/             # only place that should call fetch(); attaches session headers
  lib/parent-session.ts
  lib/player-session.ts
apps/backend/src/
  app.module.ts
  users/               # sign-in, UserSession, UserSessionGuard
  players/             # Play Now, PlayerSession, PlayerSessionGuard
  groups/ vocabularies/ invitations/ mail/
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

UI components must not call `fetch('http://localhost:4000/...')`. They call `@/lib/api` (`usersApi`, `groupsApi`, `gamesApi`, …). `getApiBaseUrl()` in `lib/api/config.ts` is `${window.location.origin}/api` (same host the page was opened on).

- **`npm run dev:local`:** Next rewrites `/api/*` to Nest (`BACKEND_URL`, default `http://localhost:4000`). `getSocketUrl()` uses hostname port `4000` when the page is on port `3000`.
- **Docker / HTTPS:** Nginx serves the UI on `/`, proxies `/api/` to Nest, and proxies `/socket.io/` to Nest. The browser never talks to ports 3000 or 4000.

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
| `joinSession` `{ kind, id, token }` | `session:replaced` (kicked client) |
| `joinGroup` `{ groupId, playerId, token }` | `lobby:update`, `game:started` |
| `joinDashboard` `{ groupId, userId, token }` | `dashboard:update`, `membership:changed` |
| `joinGame` `{ gameId, playerId, token }` | `game:state`, `game:playerLeft` |
| `placeLetter` | `cell:locks` |
| `cell:lock` / `cell:unlock` | `game:finished` |
| `guess:submit` | `game:guessResult`, `game:wordGuessed`, `game:playerFrozen` / `game:playerUnfrozen`, `game:error` |

Rooms: `group:{id}` (lobby + dashboard), `user:{id}` (membership + parent session kick), `player:{id}` (Play Now kick), `game:{id}` (in play). `joinGroup`, `joinGame`, and `joinDashboard` validate the session token before joining. Disconnect releases cell locks.

The parent dashboard does not poll. The dashboard page owns one Socket.IO subscription (`joinDashboard`) and refetches when `dashboard:update` / `membership:changed` fire, or when the tab becomes visible. Group, player, and vocabulary mutation controllers emit those events after a successful write.

Mappers (`common/mappers.ts`) keep API JSON stable when Prisma field names differ (e.g. `inGroupId` → `inGroup`). The UI must not import `@ft-transcendence/database` or Prisma.

---

## Prisma

Schema is the source of truth: `packages/database/prisma/schema.prisma`. The backend depends on `@ft-transcendence/database`. Generated client is gitignored (`packages/database/generated/prisma/`).

`GroupMembership` replaced parallel `admins[]` / `members[]` arrays. Role is `ADMIN` or `MEMBER`. Crossword solution JSON lives on `Crossword` and is never sent to the client.

Every schema change needs a migration (`npm run db:migrate` from repo root). Do not use `prisma db push` for anything you intend to keep. CI and Docker run `db:migrate:deploy`.

---

## Vocabulary

Add and edit share one dialog (`add-vocabulary.tsx`). Each group gets a hidden starter list (`TEST_VOCABULARY`) if none exists. Games use the group’s `currentVocabulary` (whatever the user last chose, or the starter if they have no custom list). Opening the dashboard does not change the active list. Names are unique per group. Entries: max 18 characters, whitespace stripped, unique words and unique meanings, at least 5 pairs (frontend + backend `vocabulary-entry-rules.ts`). AI import sends photos as `image_url` and PDFs as GPT-4o file parts (no pdf-parse). Extract requires a valid parent session (`x-user-id` / `x-user-session-token`) and group membership for the authenticated user plus `groupId`; HEIC is rejected.

---

## Player sessions (Play Now)

A parent session and a child session are different things.

- **Parent:** `POST /users/signin` and `POST /users/register` return `{ user, session }` (`user` and `session` are `null` on bad credentials or duplicate name/email). A `UserSession` row (one token per user) is replaced on each successful sign-in. The frontend stores `dicteeUserId`, `dicteeGroupId`, and `dicteeUserSessionToken` in `localStorage` (`parent-session.ts`). Hydrate calls `POST /users/validateSession` before `GET /users/:id`. Mutating parent routes require headers `x-user-id` and `x-user-session-token` (`UserSessionGuard`). `POST /users/changePassword` still returns `{ success: false }` when the old password is wrong; on success it replaces `UserSession` and returns the new token to that tab without emitting `session:replaced` (stolen tokens die immediately; other tabs die on the next 401). Expected Play Now / vocabulary-name / invite-mail failures are also 200 result objects so the browser console stays clean during eval. Logged-in parents hitting `/`, `/signin`, or `/register` are sent to `/dashboard`. A new sign-in kicks the previous client (`session:replaced` on Socket.IO room `user:{id}`). Play Now wipes parent credentials in **this browser** (`logout({ localOnly: true })`) so a child cannot open dashboard settings; the server `UserSession` stays, so a parent on another device is not kicked. Other same-browser parent tabs lose `localStorage` and are signed out.
- **Child:** dashboard Play Now → `POST /players/startSession` `{ playerId, minutes }` → one `PlayerSession` row (token, `expiresAt`). A second Play Now **replaces** the token and kicks the previous child (`session:replaced` on `player:{id}`). Frontend stores the token in **`sessionStorage`** (per tab, cleared on close) and sends the child to `/select_game`. Not a cookie. Leave session goes to `/session_over`; OK there goes to `/dashboard` if a parent is still in this tab, otherwise `/`.

Rules:

- One unexpired token per player. A second Play Now replaces it and kicks the other device. The Play Now dialog still offers **End session** to stop play without starting a new session.
- `GET /players/:id/activeSession` requires the parent session (`UserSessionGuard` + `assertCanManagePlayer`) and returns `{ expiresAt }` or `null`. The live child token is only on `startSession`.
- `select_game` validates on mount. Missing or expired → `/dashboard` if a parent is still in context, else `/`. Games in progress are not interrupted.
- Child mutations send `x-player-id` and `x-player-session-token`. Parent mutations send `x-user-id` and `x-user-session-token`. `@/lib/api` attaches whichever session is present (player wins if both exist).
- `POST /players/clearSession` is token-scoped for the child (and for the tab-close pending end). A parent **End session** force-clears. Stale pending ends cannot delete a newer token.
- Closing the Play Now tab writes a pending end in `localStorage` (player id **and** token). After `SESSION_CLOSE_GRACE_MS` (2s), another load or an already-open parent tab calls `clearSession` with that token. Refresh cancels the pending end because `sessionStorage` still has the token. Do not `sendBeacon` `clearSession` on `pagehide` — that event also fires on refresh.

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

- Parent restore is `localStorage` ids + unauthenticated `GET /users/:id`. Public GETs stay unauthenticated for the demo. Mutating parent/child routes use session headers. `GET /players/:id/activeSession` is parent-guarded and returns `expiresAt` only.
- Closing a Play Now tab ends the server token after a 2s grace window (`localStorage` pending end; refresh cancels it). Do not `sendBeacon` `clearSession` on `pagehide`.
- Word Soup is a real game, not a stub. Progression (XP, avatars, leaderboard) is claimed as gamification plus game statistics.
- Docker Nginx generates a new self-signed cert on every container start. `https://localhost` and a LAN IP are different origins (separate `localStorage`). A `.local` URL in the start script is only a hint — this repo does not run mDNS.
