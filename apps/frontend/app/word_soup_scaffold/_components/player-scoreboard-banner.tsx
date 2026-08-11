'use client';

import type { GameRosterPlayerDto } from '@/lib/api/games';
import SoupHostCharacter from './soup-host-character';

type ScoreboardPlayerStatus = 'active' | 'frozen' | 'left';

type PlayerScoreboardBannerProps = {
  players: GameRosterPlayerDto[];
  localPlayerId: number;
  playerColours: Record<number, string>;
  playerScores: Record<number, number>;
  playerStreaks: Record<number, number>;
  leftPlayers: Record<number, string>;
  frozenPlayers: Record<number, number>;
  freezeSecondsByPlayer: Record<number, number>;
  /** Brief +points float over the scoring player's card. */
  scorePopup?: { playerId: number; points: number; id: number } | null;
  /** Vertical stack for the left rail; horizontal wrap for compact rows. */
  orientation?: 'horizontal' | 'vertical';
};

function getPlayerStatus(
  playerId: number,
  leftPlayers: Record<number, string>,
  frozenPlayers: Record<number, number>,
): ScoreboardPlayerStatus {
  if (leftPlayers[playerId]) return 'left';
  if ((frozenPlayers[playerId] ?? 0) > Date.now()) return 'frozen';
  return 'active';
}

const STATUS_BOX_CLASS: Record<ScoreboardPlayerStatus, string> = {
  active: 'border-emerald-300 bg-emerald-100/90 text-emerald-950',
  frozen: 'border-sky-300 bg-sky-100/90 text-sky-950',
  left: 'border-gray-300 bg-gray-200/90 text-gray-600',
};

function FlameIcon({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/word-soup/flame.png"
      alt=""
      aria-hidden="true"
      className={['object-contain', className].filter(Boolean).join(' ')}
      draggable={false}
    />
  );
}

function SnowflakeIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 2v20M4.9 6.5l14.2 11M4.9 17.5l14.2-11M2 12h20" />
    </svg>
  );
}

function CrossIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function StatusSymbol({
  status,
  streak,
  freezeSeconds,
}: {
  status: ScoreboardPlayerStatus;
  streak: number;
  freezeSeconds: number;
}) {
  if (status === 'left') {
    return (
      <span className="inline-flex items-center text-gray-500" title="Left the game">
        <CrossIcon className="h-4 w-4" />
      </span>
    );
  }

  if (status === 'frozen') {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-sky-700"
        title={`Frozen: ${freezeSeconds}s`}
      >
        <SnowflakeIcon className="h-4 w-4" />
        <span className="text-xs font-bold tabular-nums">{freezeSeconds}</span>
      </span>
    );
  }

  if (streak >= 2) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-orange-700"
        title={`Scoring streak: ${streak}`}
      >
        <FlameIcon className="h-5 w-5" />
        <span className="text-xs font-bold tabular-nums">{streak}</span>
      </span>
    );
  }

  return null;
}

export default function PlayerScoreboardBanner({
  players,
  localPlayerId,
  playerColours,
  playerScores,
  playerStreaks,
  leftPlayers,
  frozenPlayers,
  freezeSecondsByPlayer,
  scorePopup = null,
  orientation = 'horizontal',
}: PlayerScoreboardBannerProps) {
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={
        isVertical
          ? 'flex w-full flex-col items-stretch gap-1.5'
          : 'flex w-full flex-wrap justify-start gap-1.5 sm:gap-2'
      }
      role="list"
      aria-label="Player scoreboard"
    >
      {players.map((player) => {
        const status = getPlayerStatus(player.id, leftPlayers, frozenPlayers);
        const colour = playerColours[player.id] ?? '#9CA3AF';
        const score = playerScores[player.id] ?? 0;
        const streak = playerStreaks[player.id] ?? 0;
        const freezeSeconds = freezeSecondsByPlayer[player.id] ?? 0;
        const isYou = player.id === localPlayerId;
        const showPointsPopup =
          scorePopup !== null && Number(scorePopup.playerId) === Number(player.id);

        const pts = Number.isFinite(Number(scorePopup?.points))
          ? Number(scorePopup?.points)
          : 10;

        return (
          <div
            key={player.id}
            role="listitem"
            className={[
              'relative isolate inline-flex items-center gap-1.5 overflow-hidden rounded-xl border px-2 py-1.5 shadow-sm transition-colors sm:px-2.5 sm:py-2',
              isVertical ? 'w-full max-w-none' : 'max-w-full shrink',
              STATUS_BOX_CLASS[status],
              status === 'left' ? 'opacity-75' : '',
            ].join(' ')}
          >
            {showPointsPopup && (
              <div
                key={scorePopup.id}
                className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-emerald-600"
                aria-hidden="true"
              />
            )}

            <SoupHostCharacter
              theme="animals"
              clothesColor={colour}
              tier={player.avatarTier ?? 0}
              animal={player.avatarAnimal ?? 0}
              size="thumb"
              className="relative z-10 h-8 w-8 shrink-0 sm:h-9 sm:w-9"
              title={`${player.name} avatar`}
            />

            <div
              className={[
                'relative z-10 min-w-0',
                isVertical ? 'flex-1' : 'max-w-[4.5rem] sm:max-w-[7rem]',
              ].join(' ')}
            >
              <div className="flex items-center gap-1">
                <span
                  className={[
                    'truncate text-xs font-semibold sm:text-sm',
                    showPointsPopup ? 'text-white' : '',
                  ].join(' ')}
                  title={player.name}
                >
                  {player.name}
                </span>
                {isYou && (
                  <span
                    className={[
                      'hidden shrink-0 text-[10px] font-bold uppercase tracking-wide sm:inline',
                      showPointsPopup ? 'text-white/80' : 'opacity-70',
                    ].join(' ')}
                  >
                    You
                  </span>
                )}
              </div>
              <p
                className={[
                  'text-sm font-black tabular-nums leading-tight sm:text-base',
                  showPointsPopup ? 'text-amber-200' : '',
                ].join(' ')}
              >
                {showPointsPopup ? `+${pts}` : score}
              </p>
            </div>

            <div className="relative z-10">
              <StatusSymbol
                status={status}
                streak={streak}
                freezeSeconds={freezeSeconds}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
