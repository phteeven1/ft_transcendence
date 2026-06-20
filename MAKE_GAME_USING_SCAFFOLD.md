# Building a Game Using the Scaffold

This document explains how to build a new multiplayer vocabulary game on top of the existing scaffold structure. It covers the file layout, what the scaffold provides, how data flows from backend to frontend, and how to extend the game with new functionality.

The two existing games — **Word Building** and **Word Soup** — follow this pattern exactly. Use either as a reference while reading this document.

---

## Table of Contents

1. [File structure](#1-file-structure)
2. [What the scaffold provides](#2-what-the-scaffold-provides)
3. [The two court arrays](#3-the-two-court-arrays)
4. [How court data flows from backend to frontend](#4-how-court-data-flows-from-backend-to-frontend)
5. [Why vocabulary is not fetched directly](#5-why-vocabulary-is-not-fetched-directly)
6. [WebSockets: what is wired and how to extend](#6-websockets-what-is-wired-and-how-to-extend)
7. [Step-by-step: adding a new game](#7-step-by-step-adding-a-new-game)

---

## 1. File structure

### Backend

```
apps/backend/src/games/
├── game.gateway.ts               ← shared WebSocket gateway (do not touch)
├── games.controller.ts           ← shared REST routes (do not touch)
├── games.service.ts              ← shared game logic (do not touch)
├── games.module.ts               ← imports your game module (add yours here)
│
├── word_building/
│   ├── word-building.service.ts  ← YOUR ALGORITHM GOES HERE
│   ├── word-building.controller.ts
│   └── word-building.module.ts
│
└── word_soup/
    ├── word-soup.service.ts      ← YOUR ALGORITHM GOES HERE
    ├── word-soup.controller.ts
    └── word-soup.module.ts
```

The files you touch are inside your game's subfolder only. The shared files above it handle lobby, joining, starting, finishing, and WebSocket rooms — none of that needs to change.

### Frontend

```
apps/frontend/
├── app/
│   ├── word_building_scaffold/
│   │   ├── page.tsx                     ← Suspense boundary, do not touch
│   │   └── _components/
│   │       ├── word-building-game.tsx   ← orchestrator, wire your logic here
│   │       ├── game-court.tsx           ← grid renderer, set COURT_COLS/ROWS here
│   │       ├── court-tile.tsx           ← single tile, extend CourtCell here
│   │       ├── game-info-column.tsx     ← info panel, extend display here
│   │       ├── game-controls.tsx        ← buttons, add controls here
│   │       └── abandon-play-modal.tsx   ← do not touch
│   │
│   └── word_soup_scaffold/
│       └── _components/
│           └── (same structure)
│
├── hooks/
│   └── use-game-socket.ts               ← WebSocket hook, extend events here
│
└── lib/api/games/
    ├── games.api.ts                     ← shared API calls, do not touch
    ├── word-building.api.ts             ← YOUR game's API call
    └── word-soup.api.ts                 ← YOUR game's API call
```

---

## 2. What the scaffold provides

When a player enters the game page, the scaffold automatically handles all of the following without you writing any code:

- Reading `gameId` and `playerId` from the URL
- Fetching the game record and the list of players
- Connecting to the WebSocket game room
- Rendering the info panel (game name, start time, player list)
- Rendering the S/M/L size selector and the court grid
- Handling tile clicks and broadcasting them to all players via WebSocket
- Handling Leave Game (one player exits, session ends)
- Handling Game Over (all players are sent back to the lobby simultaneously)
- Redirecting all players when the game finishes

What you provide as a game developer:

- The algorithm that populates `trueCourt` (the correct layout)
- The algorithm that populates `visibleCourt` (what players see at the start)
- Any additional game logic (scoring, animations, special tile types, etc.)

---

## 3. The two court arrays

Every game is built around two parallel grids of identical dimensions:

```
trueCourt[row][col]    — the correct answer grid
visibleCourt[row][col] — what players currently see
```

Each cell is a `CourtCell` object. Right now it only holds a character:

```ts
type CourtCell = {
  char: string;
};
```

This type is intentionally minimal. As you develop the game, add fields to `CourtCell` in `court-tile.tsx` to carry whatever extra information your game needs — for example:

```ts
type CourtCell = {
  char: string;
  revealedByPlayerId?: number;  // who revealed this tile
  isHighlighted?: boolean;      // for word-completion effects
  color?: string;               // for player color coding
};
```

### How the two grids interact

At game start, `visibleCourt` contains placeholder characters (e.g. `'X'` or `'S'`) and `trueCourt` contains the correct layout from the vocabulary.

When a player clicks a tile at `[row][col]`:

1. The client emits `tile:click` to the backend
2. The backend broadcasts `game:tileRevealed` with `{ row, col }` to all players in the game room
3. Every client receives the event and copies `trueCourt[row][col]` into `visibleCourt[row][col]`
4. The grid re-renders showing the revealed character

This means `trueCourt` never changes after mount — it is the reference. Only `visibleCourt` changes as players interact.

### Grid dimensions

The grid size is controlled by two constants that appear in three places and must always be kept in sync:

| File | Constants |
|------|-----------|
| `game-court.tsx` | `COURT_COLS`, `COURT_ROWS` |
| `word-building-game.tsx` (or your orchestrator) | `COURT_COLS`, `COURT_ROWS` |
| `word-building.service.ts` (or your service) | `COURT_COLS`, `COURT_ROWS` |

Change all three together when resizing the grid.

---

## 4. How court data flows from backend to frontend

```
game mounts
    ↓
frontend calls POST /games/:id/initWordBuildingCourt
    ↓
WordBuildingService.initCourt(gameId)
    ↓
  fetches group's active vocabulary from database
  runs trueCourt algorithm  ← TEAMMATE IMPLEMENTS THIS
  runs visibleCourt algorithm  ← TEAMMATE IMPLEMENTS THIS
    ↓
returns { trueCourt, visibleCourt }
    ↓
frontend stores both in React state
    ↓
GameCourt renders visibleCourt
```

The key point is that the frontend never runs the layout algorithms. It only receives the result. This means your teammate can completely rewrite the crossword or word-soup algorithm on the backend without the frontend developer needing to change anything.

### Where to implement the algorithms

Open your game's service file, for example `word-building.service.ts`. You will find two clearly marked placeholder sections:

```ts
// Placeholder: teammate replaces this with the real crossword algorithm.
// ... fill trueCourt here ...

// Placeholder: teammate replaces this with the real clutter algorithm.
// ... fill visibleCourt here ...
```

Replace the placeholder logic with your real algorithm. The function signature and return type must stay the same.

---

## 5. Why vocabulary is not fetched directly

The frontend orchestrator (`word-building-game.tsx`) does not fetch the vocabulary. This is intentional.

The backend `initCourt` method fetches the group's active vocabulary itself, via `game.group.currentVocabulary`. The frontend receives only the two populated court arrays.

**Reasons:**

- The algorithm that uses the vocabulary belongs on the backend — it would make no sense to send the raw vocabulary to the frontend just so the frontend can run an algorithm and send the result back
- Different games use the vocabulary differently (crossword layout vs. word soup layout vs. future games) — keeping it on the backend means each game service is self-contained
- The frontend info panel no longer displays vocabulary details, so there is no reason to fetch it on the frontend at all

If a future game needs to display vocabulary information to players (e.g. showing a word list as a hint), fetch it separately in the orchestrator and pass it to `GameInfoColumn` as a prop.

---

## 6. WebSockets: what is wired and how to extend

### What is already wired

The WebSocket connection is managed by the `useGameSocket` hook in `apps/frontend/hooks/use-game-socket.ts`.

On mount it:
- Connects to the Socket.IO server
- Emits `joinGame` → backend puts this socket in the `game:${gameId}` room

Events already handled:

| Event | Direction | What happens |
|-------|-----------|--------------|
| `tile:click` | client → server | player clicked a tile |
| `game:tileRevealed` | server → all clients | copy trueCourt cell into visibleCourt |
| `game:finished` | server → all clients | redirect all players to /select_game |

On the backend, `game.gateway.ts` handles these events.

### Adding new events

**Step 1 — Backend: add a handler in `game.gateway.ts`**

```ts
@SubscribeMessage('your:event')
handleYourEvent(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { gameId: number; /* your fields */ },
) {
  this.server.to(`game:${data.gameId}`).emit('game:yourBroadcast', {
    /* payload */
  });
}
```

**Step 2 — Frontend: listen in `use-game-socket.ts`**

Add a new state field and a listener in the `useEffect`:

```ts
const [yourEvent, setYourEvent] = useState<YourType | null>(null);

socket.on('game:yourBroadcast', (payload: YourType) => {
  if (!active) return;
  setState((s) => ({ ...s, yourEvent: payload }));
});
```

Expose it in the return value:

```ts
return { ...state, yourEvent, emitTileClick };
```

**Step 3 — Frontend: react to it in the orchestrator**

```ts
const { revealedTile, gameFinished, yourEvent, emitTileClick } = useGameSocket(gameId, playerId);

useEffect(() => {
  if (!yourEvent) return;
  // update state, trigger animation, etc.
}, [yourEvent]);
```

**Step 4 — Frontend: emit from the orchestrator or a component**

```ts
const handleSomething = () => {
  emitYourEvent(/* args */); // add this to useGameSocket's return
};
```

### Examples of events you might add

| Feature | Client emits | Server broadcasts |
|---------|-------------|-------------------|
| Player scores a point | `player:scored` | `game:scoreUpdate` |
| Word completed | `word:completed` | `game:wordHighlight` |
| Player moves a piece | `piece:move` | `game:piecePosition` |
| Timer update | — | `game:timerTick` |
| Chat message | `game:message` | `game:message` |

---

## 7. Step-by-step: adding a new game

Say you want to add a game called **Word Race**.

### Backend

1. Create folder `apps/backend/src/games/word_race/`

2. Create `word-race.service.ts`:
```ts
@Injectable()
export class WordRaceService {
  constructor(private readonly prisma: PrismaService) {}

  async initCourt(gameId: number) {
    // fetch game + vocabulary, build trueCourt and visibleCourt
  }
}
```

3. Create `word-race.controller.ts`:
```ts
@Controller('games')
export class WordRaceController {
  constructor(private readonly wordRaceService: WordRaceService) {}

  @Post(':id/initWordRaceCourt')
  initCourt(@Param('id') id: string) {
    return this.wordRaceService.initCourt(Number(id));
  }
}
```

4. Create `word-race.module.ts` and register service + controller.

5. Import `WordRaceModule` in `games.module.ts`.

### Frontend

6. Create `apps/frontend/lib/api/games/word-race.api.ts`:
```ts
export const wordRaceApi = {
  initCourt(gameId: number) {
    return apiRequest(`/games/${gameId}/initWordRaceCourt`, { method: 'POST' });
  },
};
```

7. Export it from `lib/api/index.ts`.

8. Copy `word_building_scaffold/` to `word_race_scaffold/`, rename files, update:
   - Component name in `word-race-game.tsx`
   - API call from `wordBuildingApi.initCourt` to `wordRaceApi.initCourt`
   - `COURT_COLS` and `COURT_ROWS` if the grid size differs
   - The route in `select_game/page.tsx` `getStartedGameRoute()` function

9. Add a button for Word Race in `select_game/page.tsx`.

That's it. The WebSocket infrastructure, session handling, lobby, and navigation all work without any changes.
