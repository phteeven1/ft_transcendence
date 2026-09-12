import HostCharacter from '@/app/components/game/host-character';
import { Icon } from '@/app/components/ui';
import type { GameFinishPlayerOutcomeDto } from '@/lib/api/games/types';
import { OVERLAY_SCALE } from './overlay-scale';

export type GameScorePanelLabels = {
  finalScores: string;
  scoresComingUp: string;
  pointsXp: (args: { score: number; xp: number }) => string;
  winner: string;
};

export type GameScorePanelProps = {
  revealedPlayerIds: number[];
  playersById: Record<number, GameFinishPlayerOutcomeDto>;
  playerColours: Record<number, string>;
  playerAvatarTiers?: Record<number, number>;
  playerAvatarAnimals?: Record<number, number>;
  labels: GameScorePanelLabels;
};

export function GameScorePanel({
  revealedPlayerIds,
  playersById,
  playerColours,
  playerAvatarTiers = {},
  playerAvatarAnimals = {},
  labels,
}: GameScorePanelProps) {
  return (
    <div
      className={[
        'w-full rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-sm',
        OVERLAY_SCALE.bubbleMaxWidthClass,
        OVERLAY_SCALE.scorePadClass,
      ].join(' ')}
    >
      <h3
        className={[
          'text-center font-semibold uppercase text-teal-100/85',
          OVERLAY_SCALE.labelClass,
        ].join(' ')}
      >
        {labels.finalScores}
      </h3>

      <ul className="mt-1.5 space-y-1 sm:mt-2 sm:space-y-1.5">
        {revealedPlayerIds.length === 0 ? (
          <li
            className={[
              'rounded-xl border border-dashed border-white/20 px-2 py-2 text-center text-teal-100/70',
              OVERLAY_SCALE.bubbleTextClass,
            ].join(' ')}
          >
            {labels.scoresComingUp}
          </li>
        ) : (
          revealedPlayerIds.map((playerId) => {
            const player = playersById[playerId];
            if (!player) return null;

            return (
              <li
                key={playerId}
                className={[
                  'game-overlay-score-row flex items-center rounded-xl border border-white/20 bg-white/95 shadow-sm',
                  OVERLAY_SCALE.scoreRowClass,
                ].join(' ')}
              >
                <HostCharacter
                  theme="animals"
                  clothesColor={playerColours[playerId] ?? '#5EEAD4'}
                  tier={playerAvatarTiers[playerId] ?? 0}
                  animal={playerAvatarAnimals[playerId] ?? 0}
                  className={`${OVERLAY_SCALE.scoreAvatarClass} shrink-0`}
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      'truncate font-semibold text-teal-950',
                      OVERLAY_SCALE.bubbleTextClass,
                    ].join(' ')}
                  >
                    {player.playerName}
                  </p>
                  <p
                    className={`${OVERLAY_SCALE.labelClass} normal-case tracking-normal text-teal-800/80`}
                  >
                    {labels.pointsXp({
                      score: player.score,
                      xp: player.xpAwarded,
                    })}
                  </p>
                </div>

                {player.isWinner && (
                  <Icon
                    name="crown"
                    size={18}
                    className="shrink-0 text-amber-500"
                    aria-label={labels.winner}
                  />
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
