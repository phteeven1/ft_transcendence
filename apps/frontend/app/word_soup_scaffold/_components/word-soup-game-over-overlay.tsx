'use client';

import type { GameFinishPlayerOutcomeDto } from '@/lib/api/games/types';
import type { GameOverPhase } from '@/app/hooks/word-soup/use-word-soup-game-over';
import SoupHostCharacter from './soup-host-character';

type WordSoupGameOverOverlayProps = {
  phase: GameOverPhase;
  bubbleText: string;
  bubbleVisible: boolean;
  revealedPlayerIds: number[];
  playersById: Record<number, GameFinishPlayerOutcomeDto>;
  playerColours: Record<number, string>;
  showReturnButton: boolean;
  onReturnToLobby: () => void;
};

function SpeechBubble({
  text,
  visible,
}: {
  text: string;
  visible: boolean;
}) {
  return (
    <div
      className={[
        'word-soup-intro-bubble relative max-w-[min(100%,22rem)] rounded-[1.75rem] border-[3px] border-teal-700 bg-white px-5 py-4 shadow-[4px_6px_0_rgba(15,118,110,0.25)] transition-all duration-300',
        visible ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-95 opacity-0',
      ].join(' ')}
      aria-hidden={!visible}
    >
      <p
        className="min-h-[1.5em] text-center text-base font-bold leading-snug text-teal-950 sm:text-lg"
        aria-live="polite"
        aria-atomic="true"
      >
        <span>{text}</span>
        {visible && (
          <span className="word-soup-intro-caret ml-0.5 inline-block align-baseline text-teal-500">
            ▌
          </span>
        )}
      </p>
      <span
        className="absolute left-1/2 top-full -mt-px -translate-x-1/2"
        aria-hidden="true"
      >
        <span className="block h-0 w-0 border-x-[14px] border-t-[16px] border-x-transparent border-t-teal-700" />
        <span className="absolute left-1/2 top-0 -translate-x-1/2 border-x-[11px] border-t-[13px] border-x-transparent border-t-white" />
      </span>
    </div>
  );
}

export default function WordSoupGameOverOverlay({
  phase,
  bubbleText,
  bubbleVisible,
  revealedPlayerIds,
  playersById,
  playerColours,
  showReturnButton,
  onReturnToLobby,
}: WordSoupGameOverOverlayProps) {
  const isClosing = phase === 'closing' || phase === 'closing-gap';

  return (
    <div
      className="word-soup-intro-overlay absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-teal-900/92 via-emerald-900/90 to-teal-950/95 px-3 py-4 backdrop-blur-md sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-soup-game-over-title"
    >
      <h2 id="word-soup-game-over-title" className="sr-only">
        Game over results
      </h2>

      <div className="flex w-full max-w-3xl flex-col items-stretch gap-4 sm:gap-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-center sm:gap-6">
          <div className="flex flex-col items-center gap-4 sm:min-w-0 sm:flex-1">
            <SpeechBubble text={bubbleText} visible={bubbleVisible} />
            <SoupHostCharacter
              animated
              className="h-24 w-24 sm:h-32 sm:w-32"
            />
          </div>

          <div className="w-full sm:max-w-xs sm:flex-1">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3 shadow-inner backdrop-blur-sm sm:p-4">
              <h3 className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-teal-100/85">
                Final scores
              </h3>
              <ul className="mt-3 space-y-2">
                {revealedPlayerIds.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-white/20 px-3 py-4 text-center text-sm text-teal-100/70">
                    Scores coming up…
                  </li>
                ) : (
                  revealedPlayerIds.map((playerId) => {
                    const player = playersById[playerId];
                    if (!player) return null;
                    const colour = playerColours[playerId] ?? '#5EEAD4';
                    return (
                      <li
                        key={playerId}
                        className="word-soup-game-over-score-row flex items-center gap-3 rounded-xl border border-white/20 bg-white/95 px-3 py-2.5 shadow-sm"
                      >
                        <SoupHostCharacter
                          clothesColor={colour}
                          className="h-10 w-10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-teal-950">
                            {player.playerName}
                          </p>
                          <p className="text-xs text-teal-800/80">
                            {player.score} pts · +{player.xpAwarded} XP
                          </p>
                        </div>
                        {player.isWinner && (
                          <span className="shrink-0 text-lg" aria-label="Winner">
                            🏆
                          </span>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        </div>

        {showReturnButton && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onReturnToLobby}
              className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_#047857] transition hover:bg-emerald-400 active:translate-y-0.5 active:shadow-none"
            >
              Return to lobby
            </button>
          </div>
        )}

        {isClosing && !showReturnButton && (
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-teal-100/70">
            Almost done…
          </p>
        )}
      </div>
    </div>
  );
}
