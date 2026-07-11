# Web Major — Real-time features (WebSockets)

**Points:** 2 · **Category:** Web

## Summary

Real-time updates use **Socket.IO** via NestJS `@WebSocketGateway`. Two main flows:

1. **Game lobby** — pending/ongoing games sync across all players in a group
2. **In-game** — Word Building grid, scores, cell locks, and game-finished events

Connection join/leave is handled; rooms are scoped by `group:{id}` and `game:{id}`.

## Demo steps

1. Open **Select Game** in two browser windows (two players, same group)
2. Player A starts a pending game → Player B sees lobby update without refresh
3. Both join Word Building → place a letter in window A → grid updates in window B
4. Show cell lock indicator when one player selects a cell

## Events (backend → clients)

| Event | Purpose |
|-------|---------|
| `lobby:update` | Game list changed (join, start, finish) |
| `game:state` | Crossword grid + scores updated |
| `game:finished` | Game ended, redirect players |
| `game:cellLocks` | Soft locks on cells being edited |
| `game:tileRevealed` | Tile reveal (puzzle games) |

## Events (clients → backend)

| Event | Purpose |
|-------|---------|
| `joinGroup` | Join lobby room for a group |
| `joinGame` | Join in-game room |
| `placeLetter` | Submit letter placement |
| `cell:lock` / `cell:unlock` | Reserve/release cell while editing |

## Key files

| Layer | Path |
|-------|------|
| WebSocket gateway | `apps/backend/src/games/game.gateway.ts` |
| In-game hook | `apps/frontend/app/hooks/use-game-socket.ts` |
| Lobby hook | `apps/frontend/app/hooks/use-group-socket.ts` |
| Lobby UI | `apps/frontend/app/select_game/page.tsx` |
| Game UI | `apps/frontend/app/word_building_scaffold/_components/word-building-game.tsx` |

## Technical notes

- Gateway: `@WebSocketGateway({ cors: { origin: '*' } })` on NestJS
- Client connects to backend URL (`NEXT_PUBLIC_API_URL`) with `socket.io-client`
- `OnGatewayDisconnect` cleans up cell locks when a player disconnects
- Room broadcasting: `server.to('game:${gameId}').emit(...)`

## Eval talking points

- “WebSockets keep the **lobby and crossword grid** in sync without polling.”
- “We use **Socket.IO rooms** so only relevant clients receive updates.”
- “Disconnect handling **releases cell locks** so other players aren’t blocked.”
