# Gaming Major — Remote players

**Points:** 2 · **Category:** Gaming and user experience

## Summary

Two or more players on **separate browsers/computers** play the same Word Building game in real time. Letter placements, scores, cell locks, and game completion are broadcast via **WebSockets** so every client sees the same board state without manual refresh.

## Demo steps

1. Open two browsers (or one normal + one incognito) with two players in the same group
2. Both join the same Word Building game from **Select Game**
3. Player A types a letter → Player B’s grid updates immediately
4. Player B drags a tile from the rack → Player A sees the change
5. Finish the puzzle → both get the complete overlay and redirect

## How remote sync works

```
Player A (browser)                    Player B (browser)
      │                                      │
      ├─ placeLetter ──► NestJS gateway ────┤
      │                      │               │
      │                      ▼               │
      │              word-building.service   │
      │              (validate + score)      │
      │                      │               │
      ◄──── game:state broadcast ───────────►│
```

- Clients join room `game:{gameId}` via `joinGame`
- Server emits `game:state` after each valid placement
- `game:finished` redirects all players when the game ends
- Disconnect triggers lock cleanup (`OnGatewayDisconnect`)

## Key files

| Layer | Path |
|-------|------|
| Gateway | `apps/backend/src/games/game.gateway.ts` |
| Client hook | `apps/frontend/app/hooks/use-game-socket.ts` |
| Game UI | `apps/frontend/app/word_building_scaffold/_components/word-building-game.tsx` |

## Related modules

- WebSockets infrastructure: [websockets-realtime.md](./websockets-realtime.md)
- Game itself: [gaming-word-building.md](./gaming-word-building.md)

## Eval talking points

- “Players on **different machines** share one game room over Socket.IO.”
- “The backend is **authoritative** — clients don’t trust local-only state.”
- “We handle **disconnects** so cell locks don’t stick when a player leaves.”
