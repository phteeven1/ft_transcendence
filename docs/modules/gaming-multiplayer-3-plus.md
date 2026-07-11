# Gaming Major — Multiplayer 3+ players

**Points:** 2 · **Category:** Gaming and user experience

## Summary

Word Building supports **three or more players** in a single game session. The lobby allows setting a required player count, joining pending games, and **force-start** when enough players are ready. Each player has an independent score; all share one crossword grid.

## Demo steps

1. Create 3+ player profiles under one group (Manage Players)
2. Start Play Now for each (or use separate browsers)
3. From Select Game, initiate Word Building waiting for **3 or 4 players**
4. Join from other windows until the game starts (or admin **force start**)
5. All three players place letters on the same grid — show scoreboard with 3 names

## Data model

- `Game` — one game instance per group lobby entry
- `GamePlayer` — many-to-many: multiple players per game
- `Player.currentGameId` — tracks active game per child profile
- Scores array in `game:state` payload — one entry per `playerId`

## Lobby features

| Feature | Description |
|---------|-------------|
| Pending games | Shows `joined/required` player count |
| Join pending | Players attach to waiting game |
| Force start | Parent can start before quota filled (`force-start-modal`) |
| Auto cleanup | Player removed from other pending games when one starts |

## Key files

| Layer | Path |
|-------|------|
| Game CRUD / join | `apps/backend/src/games/games.service.ts` |
| Lobby UI | `apps/frontend/app/select_game/page.tsx` |
| Force start modal | `apps/frontend/app/select_game/_components/force-start-modal.tsx` |
| Schema | `Game`, `GamePlayer` in `packages/database/prisma/schema.prisma` |

## Related modules

- Remote sync: [gaming-remote-players.md](./gaming-remote-players.md)
- Game rules: [gaming-word-building.md](./gaming-word-building.md)

## Eval talking points

- “Our game model supports **N players per game**, not just 1v1.”
- “The lobby shows **how many slots are filled** before the crossword starts.”
- “All players collaborate on **one shared grid** with individual scores.”
