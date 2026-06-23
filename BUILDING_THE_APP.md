# Building the App

This document explains how the codebase is structured, how the frontend and backend communicate, and what you need to know to add a new game.

---

## Project Structure

```
ft_transcendence/
├── apps/
│   ├── frontend/        # Next.js app
│   └── backend/         # NestJS app
├── packages/
│   └── database/
│       └── prisma/      # Schema and migrations
├── scripts/
│   └── dev-local.sh     # Start the app in dev mode
└── docker-compose.yml
```

---

## Starting the App

**Recommended (Postgres in Docker, apps locally):**

```bash
npm run dev:local
```

Opens at [http://localhost:3000](http://localhost:3000). See [README.md](./README.md) for full setup.

**Full Docker stack:**

```bash
docker compose up --build
```

- Frontend changes hot-reload instantly.
- Backend changes: restart `dev:local` or the Nest watch process.

---

## Frontend Structure

All frontend code lives under `apps/frontend/app/`.

### Special files at the top level of `app/`

| File | Purpose |
|------|---------|
| `page.tsx` | Landing page (browser starts here) |
| `layout.tsx` | Wraps all pages in `TopBar`, `AuthContext`, and `LanguageContext` |
| `types.ts` | Shared frontend types (User, Player, Group, Game, etc.) |
| `global.css` | Global styles |

### Special directories (not pages)

| Directory | Purpose |
|-----------|---------|
| `components/` | Components shared across multiple pages |
| `context/` | `auth-context.tsx` (login state, current player/user) and `language-context.tsx` (language selection, not yet implemented) |
| `hooks/` | Custom React hooks, e.g. `use-session-guard`, `use-group-socket` |
| `lib/api/` | All HTTP calls to the backend, organized by domain |

### Page directories

Every other directory is a page. Next.js routes by directory name:

```
app/
├── select_game/
│   ├── page.tsx              # The page itself
│   └── _components/          # Components used only by this page
│       ├── pending-game-button.tsx
│       ├── initiate-game-modal.tsx
│       └── ...
├── play_game/
│   ├── page.tsx
│   └── _components/
└── ...
```

`page.tsx` is the layout scaffold. It holds state, handlers, and composes components. Components receive only what they need via typed props.

---

## Backend Structure

All backend code lives under `apps/backend/src/`.

Each domain has its own directory:

```
src/
├── games/
│   ├── games.module.ts       # Lobby logic only: create, join, start, leave
│   ├── games.controller.ts   # HTTP routes (GET / POST)
│   └── games.service.ts      # Business logic and DB access
├── word_building/
│   ├── word-building.module.ts
│   ├── word-building.controller.ts
│   └── word-building.service.ts
├── word_soup/
│   ├── word-soup.module.ts
│   ├── word-soup.controller.ts
│   └── word-soup.service.ts
├── groups/
├── players/
├── users/
├── vocabularies/
├── invitations/
├── prisma/                   # PrismaService (DB connection)
├── common/
│   └── mappers.ts            # Translates DB field names to API JSON
├── gateways/
│   └── group.gateway.ts      # WebSocket gateway (see below)
└── app.module.ts             # Root module — all other modules must be imported here
```

### The games/ module vs game-specific modules

`games/` is the **lobby layer**. It handles everything that happens before a game starts: creating, joining, force-starting, and leaving pending games. It knows nothing about what happens inside a game.

Each game gets its own module (`word_building/`, `word_soup/`, etc.) that owns all in-game logic: player actions, game state, scoring, and win conditions. This keeps games self-contained — one developer per game, no merge conflicts in shared files, and a game can be removed by deleting its directory and its import in `app.module.ts`.

### Controller vs Service

- **Controller** — handles HTTP only. Routes requests to the service. No logic here.
- **Service** — does the actual work: DB queries, business rules, emitting WebSocket events.

### Adding a new backend module

After creating `xxx.module.ts`, `xxx.controller.ts`, `xxx.service.ts`, you must import the module in `app.module.ts` or NestJS will not see it.

---

## How Frontend and Backend Communicate

There are two channels: REST and WebSockets. They have different jobs.

### REST — for mutations

The frontend calls REST endpoints to perform actions:

- Create a game
- Join a game
- Force-start a game
- Leave a game

These live under `apps/frontend/lib/api/`. Never call `fetch()` directly from a page or component — always go through the API layer:

```ts
import { gamesApi } from '@/lib/api';

await gamesApi.create({ name, inGroup, initiatedBy });
```

### WebSockets — for real-time state

The backend emits WebSocket events after any mutation that changes shared state. The frontend listens and updates the UI reactively.

**You do not update the UI after a REST call. You wait for the WebSocket event.**

Example flow:

1. Player A clicks "New Word Building"
2. Frontend calls `gamesApi.create(...)` via REST
3. Backend writes to DB, then emits `lobby:update` to everyone in the group room
4. All connected players (including A) receive `lobby:update` and their UI updates

This means the UI is always consistent across all players without any polling.

---

## WebSocket Architecture

### Backend: `group.gateway.ts`

The NestJS Gateway manages WebSocket connections. Key events:

| Event (client → server) | What it does |
|--------------------------|--------------|
| `joinGroup` | Adds the socket to a room named after the group |

| Event (server → client) | When it fires |
|--------------------------|---------------|
| `lobby:update` | After any game is created, joined, left, or started — sends full game list for the group |
| `game:started` | When a game transitions to active |

### Frontend: `hooks/use-group-socket.ts`

Custom hook that manages the WebSocket connection for a player in a group. Call it at the top of any page that needs real-time lobby state:

```ts
const { pendingGames, startedGame, socket } = useGroupSocket(
  player.inGroup,
  player.id,
);
```

| Returned value | Type | Use |
|---------------|------|-----|
| `pendingGames` | `Game[]` | Render the lobby list |
| `startedGame` | `Game \| null` | Navigate to play_game when non-null |
| `isConnected` | `boolean` | Show connection status if needed |
| `socket` | `Socket \| null` | Emit events (join, leave, etc.) |

---

## Adding a New Game

Here is the full checklist for adding a new game (e.g. "Word Soup").

### 1. Add the lobby button in `select_game/page.tsx`

```tsx
<button
  onClick={() => setModal({ kind: 'initiate', gameName: 'Word Soup' })}
  disabled={hasInitiated('Word Soup')}
>
  New Word Soup
</button>
```

No other changes needed in `select_game` — the lobby, pending game buttons, join flow, and navigation to the game page are all game-agnostic.

### 2. Create the frontend game page

Each game gets its own page directory:

```
app/word_soup/
├── page.tsx
└── _components/
    ├── game-grid.tsx
    ├── player-cursor.tsx
    └── ...
```

The page receives `gameId` and `playerId` as query parameters:

```ts
const searchParams = useSearchParams();
const gameId = Number(searchParams.get('gameId'));
const playerId = Number(searchParams.get('playerId'));
```

Call `useSessionGuard()` at the top of the page — all player-facing pages need it.

### 3. Create the frontend API module

Add a new domain folder under `lib/api/`:

```
lib/api/
└── word_soup/
    ├── types.ts           # DTOs for this game's actions and state
    ├── word-soup.api.ts   # API functions calling your backend endpoints
    └── index.ts
```

Export it from `lib/api/index.ts` so pages can import cleanly:

```ts
import { wordSoupApi } from '@/lib/api';
```

### 4. Create the backend game module

Create a self-contained module for the game:

```
src/word_soup/
├── word-soup.module.ts
├── word-soup.controller.ts   # In-game REST endpoints
└── word-soup.service.ts      # All in-game logic and DB access
```

`word-soup.service.ts` owns everything that happens inside the game: player actions, state transitions, scoring, win condition. It does **not** handle lobby logic (joining/leaving pending games) — that stays in `games/`.

Register the module in `app.module.ts`:

```ts
imports: [
  // ...existing modules
  WordSoupModule,
]
```

### 5. Connect to the game's WebSocket room

In your game page, the player joins a game-specific room so the backend can push state updates only to players in that game:

```ts
socket?.emit('joinGame', { gameId, playerId });
```

Listen for game state events:

```ts
socket?.on('game:state', ({ state }) => {
  // update local game state
});
```

In `group.gateway.ts`, add a handler for `joinGame` that puts the socket into a game room, and inject your game service to delegate in-game events:

```ts
this.server.to(`game:${gameId}`).emit('game:state', { state });
```

### 6. Update the database if needed

If your game needs new fields or tables, update `packages/database/prisma/schema.prisma` and run:

```bash
npm run db:migrate
```

Commit the generated migration file. Teammates run `npm run db:migrate:deploy` to apply it.

### Removing a game

To remove a game entirely:

1. Delete `src/word_soup/` from the backend
2. Delete `app/word_soup/` from the frontend
3. Delete `lib/api/word_soup/` and remove its export from `lib/api/index.ts`
4. Remove the button from `select_game/page.tsx`
5. Remove the module import from `app.module.ts`
6. If it had its own DB tables, write a migration to drop them

Nothing outside these files knows about the game.

---

## Session and Auth

`auth-context.tsx` holds the current logged-in state:

- `user` — the parent (null if no parent is logged in)
- `player` — the active player profile (null between games)
- `sessionExpiresAt` — timestamp set when a parent starts a player session

Call `useSessionGuard()` at the top of any player-facing page. It checks every 30 seconds whether the session has expired and redirects to `/session_over` if so. This is separate from WebSockets — it enforces the time limit a parent sets for their child's session.

---

## Workflow Summary

When adding any new feature:

1. Find (or create) the frontend page
2. Add the button/component to `page.tsx`
3. Add the handler in `page.tsx`
4. Add the API call in `lib/api/<domain>/<domain>.api.ts`
5. Add the backend controller route and service method in the correct module (`games/` for lobby actions, `word_soup/` for in-game actions)
6. If it changes shared state: emit a WebSocket event from the service
7. If the schema changed: create a migration

---

## Language Support

`language-context.tsx` is set up but not yet implemented. The app detects the selected language (English, German, French) but all text is currently in English. When implementing a game, use the language context hook rather than hardcoding strings, so translations can be added later.
