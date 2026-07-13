'use client';

//
// Extends the scaffold info panel with:
//   - Live score table (updated on every game:state event)
//   - Clue list (across / down)
//   - "Puzzle solved!" banner

import type { ClueEntry } from '@/lib/api/games/word-building.types';

type ScoreEntry = {
  playerId: number;
  score:    number;
};

type GameInfoColumnProps = {
  gameName:    string;
  startedTime: string | null;
  playerNames: Map<number, string>;
  scores:      ScoreEntry[];
  cluesAcross: Omit<ClueEntry, 'word'>[];
  cluesDown:   Omit<ClueEntry, 'word'>[];
  solved:      boolean;
};

/**
 * Renders the right-hand sidebar for the word-building game, including the
 * scoreboard, clue lists, and solved banner.
 *
 * @param gameName Display name of the game.
 * @param startedTime Start timestamp used for display.
 * @param playerNames Lookup table for player display names.
 * @param scores Current score entries from the backend.
 * @param cluesAcross Across clues with resolved coordinates.
 * @param cluesDown Down clues with resolved coordinates.
 * @param solved Whether the puzzle has been completed.
 */
export function GameInfoColumn({
  gameName,
  startedTime,
  playerNames,
  scores,
  cluesAcross,
  cluesDown,
  solved,
}: GameInfoColumnProps) {
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);

  return (
    <aside className="flex flex-col gap-4 w-full text-sm">
      {/* Game header */}
      <div>
        <h2 className="font-heading font-bold text-lg text-foreground">{gameName}</h2>
        {startedTime && (
          <p className="text-muted-foreground text-xs">
            Started {new Date(startedTime).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Solved banner */}
      {solved && (
        <div className="clay-panel px-3 py-2 text-primary font-semibold font-heading">
          🎉 Puzzle solved!
        </div>
      )}

      {/* Scoreboard */}
      <section>
        <h3 className="font-semibold font-heading text-foreground mb-1">Scores</h3>
        {sortedScores.length === 0 ? (
          <p className="text-muted-foreground italic">No points yet</p>
        ) : (
          <ul className="space-y-0.5">
            {sortedScores.map(({ playerId, score }) => (
              <li key={playerId} className="flex justify-between text-foreground">
                <span>{playerNames.get(playerId) ?? `Player ${playerId}`}</span>
                <span className="font-mono font-bold">{score}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Clue list — across */}
      {cluesAcross.length > 0 && (
        <section>
          <h3 className="font-semibold font-heading text-foreground mb-1">Across</h3>
          <ol className="space-y-1 list-none">
            {cluesAcross
              .slice()
              .sort((a, b) => a.number - b.number)
              .map(c => (
                <li key={c.number} className="flex gap-1">
                  <span className="font-bold w-5 shrink-0 text-foreground">{c.number}.</span>
                  <span className="text-muted-foreground">{c.clue}</span>
                </li>
              ))}
          </ol>
        </section>
      )}

      {/* Clue list — down */}
      {cluesDown.length > 0 && (
        <section>
          <h3 className="font-semibold font-heading text-foreground mb-1">Down</h3>
          <ol className="space-y-1 list-none">
            {cluesDown
              .slice()
              .sort((a, b) => a.number - b.number)
              .map(c => (
                <li key={c.number} className="flex gap-1">
                  <span className="font-bold w-5 shrink-0 text-foreground">{c.number}.</span>
                  <span className="text-muted-foreground">{c.clue}</span>
                </li>
              ))}
          </ol>
        </section>
      )}
    </aside>
  );
}

export default GameInfoColumn;
