'use client';

import type { GameFinishPlayerOutcomeDto } from '@/lib/api/games/types';
import type { GameOverPhase } from '@/app/hooks/word-soup/use-word-soup-game-over';
import SoupHostCharacter from './soup-host-character';
import type { CourtSize } from './court-size';

type WordSoupGameOverOverlayProps = {
  phase: GameOverPhase;
  bubbleText: string;
  bubbleVisible: boolean;
  revealedPlayerIds: number[];
  playersById: Record<number, GameFinishPlayerOutcomeDto>;
  playerColours: Record<number, string>;
  showReturnButton: boolean;
  onReturnToLobby: () => void;
  courtSize?: CourtSize;
};

function SpeechBubble({
  text,
  visible,
  compact,
}: {
  text: string;
  visible: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        'word-soup-intro-bubble relative w-full rounded-[1.75rem] border-[3px] border-teal-700 bg-white shadow-[4px_6px_0_rgba(15,118,110,0.25)] transition-all duration-300',
        compact ? 'max-w-[min(100%,16rem)] px-3 py-2.5' : 'max-w-[min(100%,22rem)] px-5 py-4',
        visible ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-95 opacity-0',
      ].join(' ')}
      aria-hidden={!visible}
    >
      <p
        className={[
          'min-h-[1.5em] text-center font-bold leading-snug text-teal-950 break-words whitespace-pre-wrap',
          compact ? 'text-sm' : 'text-base sm:text-lg',
        ].join(' ')}
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
  courtSize = 'L',
}: WordSoupGameOverOverlayProps) {
  const isClosing = phase === 'closing' || phase === 'closing-gap';
  const compact = courtSize === 'S';

  return (
    <div
      className="word-soup-intro-overlay absolute inset-0 z-30 flex flex-col items-center justify-start overflow-y-auto overscroll-contain rounded-2xl bg-gradient-to-b from-teal-900/92 via-emerald-900/90 to-teal-950/95 px-2 py-2 backdrop-blur-md sm:justify-center sm:px-4 sm:py-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-soup-game-over-title"
    >
      <h2 id="word-soup-game-over-title" className="sr-only">
        Game over results
      </h2>

      <div
        className={[
          'flex w-full max-w-3xl flex-col items-stretch',
          compact ? 'gap-2' : 'gap-4 sm:gap-5',
        ].join(' ')}
      >
        <div
          className={[
            'flex flex-col items-center',
            compact
              ? 'gap-2'
              : 'gap-4 sm:flex-row sm:items-end sm:justify-center sm:gap-6',
          ].join(' ')}
        >
          <div
            className={[
              'flex flex-col items-center',
              compact ? 'gap-2' : 'gap-4 sm:min-w-0 sm:flex-1',
            ].join(' ')}
          >
            <SpeechBubble text={bubbleText} visible={bubbleVisible} compact={compact} />
            <SoupHostCharacter
              animated
              className={compact ? 'h-14 w-14' : 'h-24 w-24 sm:h-32 sm:w-32'}
            />
          </div>

          <div className={compact ? 'w-full' : 'w-full sm:max-w-xs sm:flex-1'}>
            <div
              className={[
                'rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-sm',
                compact ? 'p-2' : 'p-3 sm:p-4',
              ].join(' ')}
            >
              <h3
                className={[
                  'text-center font-semibold uppercase text-teal-100/85',
                  compact ? 'text-[10px] tracking-[0.16em]' : 'text-xs tracking-[0.22em]',
                ].join(' ')}
              >
                Final scores
              </h3>
              <ul className={compact ? 'mt-2 space-y-1.5' : 'mt-3 space-y-2'}>
                {revealedPlayerIds.length === 0 ? (
                  <li
                    className={[
                      'rounded-xl border border-dashed border-white/20 text-center text-teal-100/70',
                      compact ? 'px-2 py-2 text-xs' : 'px-3 py-4 text-sm',
                    ].join(' ')}
                  >
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
                        className={[
                          'word-soup-game-over-score-row flex items-center rounded-xl border border-white/20 bg-white/95 shadow-sm',
                          compact ? 'gap-2 px-2 py-1.5' : 'gap-3 px-3 py-2.5',
                        ].join(' ')}
                      >
                        <SoupHostCharacter
                          clothesColor={colour}
                          className={compact ? 'h-8 w-8 shrink-0' : 'h-10 w-10 shrink-0'}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={[
                              'truncate font-semibold text-teal-950',
                              compact ? 'text-xs' : 'text-sm',
                            ].join(' ')}
                          >
                            {player.playerName}
                          </p>
                          <p className={compact ? 'text-[10px] text-teal-800/80' : 'text-xs text-teal-800/80'}>
                            {player.score} pts · +{player.xpAwarded} XP
                          </p>
                        </div>
                        {player.isWinner && (
                          <span
                            className={compact ? 'shrink-0 text-sm' : 'shrink-0 text-lg'}
                            aria-label="Winner"
                          >
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
              className={[
                'rounded-full bg-emerald-500 font-semibold text-white shadow-[0_4px_0_#047857] transition hover:bg-emerald-400 active:translate-y-0.5 active:shadow-none',
                compact ? 'px-4 py-2 text-xs' : 'px-6 py-2.5 text-sm',
              ].join(' ')}
            >
              Return to lobby
            </button>
          </div>
        )}

        {isClosing && !showReturnButton && (
          <p
            className={[
              'text-center font-medium uppercase text-teal-100/70',
              compact ? 'text-[10px] tracking-[0.14em]' : 'text-xs tracking-[0.18em]',
            ].join(' ')}
          >
            Almost done…
          </p>
        )}
      </div>
    </div>
  );
}
