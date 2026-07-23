'use client';

import type { Player } from '@/app/types';
import SoupHostCharacter from './soup-host-character';

export type ScoreboardPlayerStatus = 'active' | 'frozen' | 'left';

type PlayerScoreboardBannerProps = {
  players: Player[];
  localPlayerId: number;
  playerColours: Record<number, string>;
  playerScores: Record<number, number>;
  playerStreaks: Record<number, number>;
  leftPlayers: Record<number, string>;
  frozenPlayers: Record<number, number>;
  freezeSecondsByPlayer: Record<number, number>;
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
}: PlayerScoreboardBannerProps) {
  return (
    <div
      className="flex w-full justify-start gap-2 overflow-x-auto pb-1"
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

        return (
          <div
            key={player.id}
            role="listitem"
            className={[
              'inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 shadow-sm transition-colors',
              STATUS_BOX_CLASS[status],
              status === 'left' ? 'opacity-75' : '',
            ].join(' ')}
          >
            <SoupHostCharacter
              clothesColor={colour}
              className="h-9 w-9 shrink-0"
              title={`${player.name} avatar`}
            />

            <div className="min-w-0 max-w-[5.5rem] sm:max-w-[7rem]">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-semibold" title={player.name}>
                  {player.name}
                </span>
                {isYou && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide opacity-70">
                    You
                  </span>
                )}
              </div>
              <p className="text-base font-bold tabular-nums leading-tight">{score}</p>
            </div>

            <StatusSymbol
              status={status}
              streak={streak}
              freezeSeconds={freezeSeconds}
            />
          </div>
        );
      })}
    </div>
  );
}
