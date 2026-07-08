# Gaming Major — Complete web-based game

**Points:** 2 · **Category:** Gaming and user experience

## Summary

**Word Building** is a full multiplayer crossword game: puzzle generation from vocabulary, clear win condition (grid complete), live scoring, clues (across/down), keyboard and drag-and-drop input, and server-authoritative validation.

## Demo steps

1. Set active vocabulary list for the group
2. Start Play Now session for a child player
3. From **Select Game**, start Word Building (solo or wait for others)
4. Fill cells — show green (correct), blue (empty), red (wrong)
5. Complete puzzle → “Puzzle Complete!” overlay → return to lobby

## Game rules

- Crossword generated from group’s active vocabulary (up to 18×18 grid)
- Players place letters; server validates against solution
- **First correct placement** earns the point for that letter
- Puzzle ends when all cells are correct (`solved: true`)
- Pre-game puzzles (Scramble, Means-What) optional warm-up in lobby flow

## Key files

| Layer | Path |
|-------|------|
| Puzzle engine | `apps/backend/src/games/word_building/word-building-puzzle-engine.ts` |
| Game service | `apps/backend/src/games/word_building/word-building.service.ts` |
| REST init | `POST /games/:id/initWordBuildingCourt` |
| Frontend | `apps/frontend/app/word_building_scaffold/` |

## Related modules

- Remote sync: [gaming-remote-players.md](./gaming-remote-players.md)
- 3+ players: [gaming-multiplayer-3-plus.md](./gaming-multiplayer-3-plus.md)

## Eval talking points

- “Word Building is a **complete game** with generation, rules, scoring, and end state.”
- “The server owns the **solution grid**; clients only see the visible court.”
- “Players can use **keyboard or drag-and-drop tiles** to fill the crossword.”
