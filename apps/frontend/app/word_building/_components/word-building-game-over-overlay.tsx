'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { GameFinishPlayerOutcomeDto } from '@/lib/api/games/types';
import { clearPendingAvatarUnlock } from '@/lib/avatar-unlock';
import { translateAvatarTier } from '@/lib/i18n/progression-labels';
import HostCharacter from '@/app/components/game/host-character';

// Visual scale constants matching the Word Soup outro layout.
const SCALE = {
  hostClass: 'h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24',
  bubbleMaxWidthClass: 'max-w-[min(100%,22rem)]',
  bubblePadClass: 'px-3 py-2 sm:px-4 sm:py-3 lg:px-5 lg:py-4',
  outroBubbleHeightClass: 'h-[3.75rem] sm:h-[4.5rem] lg:h-[5.75rem]',
  bubbleTextClass: 'text-sm lg:text-base',
  labelClass: 'text-[10px] tracking-[0.18em] lg:text-xs lg:tracking-[0.22em]',
  overlayPadClass: 'px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-3',
  stackGapClass: 'gap-1.5 sm:gap-2 lg:gap-3',
  bubbleTailPadClass: 'pb-3.5 sm:pb-4',
  scorePadClass: 'p-2 sm:p-2.5 lg:p-4',
  scoreRowClass: 'gap-2 px-2 py-1.5 sm:px-2.5 lg:gap-3 lg:px-3 lg:py-2.5',
  scoreAvatarClass: 'h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10',
  buttonClass: 'px-4 py-2 text-xs sm:px-5 lg:px-6 lg:py-2.5 lg:text-sm',
} as const;

type WordBuildingGameOverOverlayProps = {
  playersById: Record<number, GameFinishPlayerOutcomeDto>;
  playerOrder: number[];
  playerColours: Record<number, string>;
  localPlayerId: number;
  playerAvatarTiers?: Record<number, number>;
  playerAvatarAnimals?: Record<number, number>;
  hostTier?: number;
  hostAnimal?: number;
  hostClothesColor?: string;
  newlyUnlockedTier?: number | null;
  onReturnToLobby: () => void;
};

function SpeechBubble({ text }: { text: string }) {
  return (
    <div
      className={[
        'relative mx-auto flex w-full items-center justify-center rounded-[1.75rem] border-[3px] border-teal-700 bg-white shadow-[4px_6px_0_rgba(15,118,110,0.25)]',
        SCALE.bubbleMaxWidthClass,
        SCALE.bubblePadClass,
        SCALE.outroBubbleHeightClass,
      ].join(' ')}
    >
      <p
        className={[
          'line-clamp-3 w-full break-words whitespace-pre-wrap text-center font-bold leading-snug text-teal-950',
          SCALE.bubbleTextClass,
        ].join(' ')}
      >
        {text}
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

function ScorePanel({
  playerOrder,
  playersById,
  playerColours,
  playerAvatarTiers,
  playerAvatarAnimals,
  t,
}: {
  playerOrder: number[];
  playersById: Record<number, GameFinishPlayerOutcomeDto>;
  playerColours: Record<number, string>;
  playerAvatarTiers: Record<number, number>;
  playerAvatarAnimals: Record<number, number>;
  t: ReturnType<typeof useTranslations<'games.wordBuilding.outro'>>;
}) {
  return (
    <div
      className={[
        'w-full rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-sm',
        SCALE.bubbleMaxWidthClass,
        SCALE.scorePadClass,
      ].join(' ')}
    >
      <h3
        className={[
          'text-center font-semibold uppercase text-teal-100/85',
          SCALE.labelClass,
        ].join(' ')}
      >
        {t('finalScores')}
      </h3>

      <ul className="mt-1.5 space-y-1 sm:mt-2 sm:space-y-1.5">
        {playerOrder.map((playerId) => {
          const player = playersById[playerId];
          if (!player) return null;

          const colour = playerColours[playerId] ?? '#5EEAD4';
          const tier = playerAvatarTiers[playerId] ?? 0;
          const animal = playerAvatarAnimals[playerId] ?? 0;

          return (
            <li
              key={playerId}
              className={[
                'flex items-center rounded-xl border border-white/20 bg-white/95 shadow-sm',
                SCALE.scoreRowClass,
              ].join(' ')}
            >
              <HostCharacter
                theme="animals"
                clothesColor={colour}
                tier={tier}
                animal={animal}
                className={`${SCALE.scoreAvatarClass} shrink-0`}
              />

              <div className="min-w-0 flex-1">
                <p
                  className={[
                    'truncate font-semibold text-teal-950',
                    SCALE.bubbleTextClass,
                  ].join(' ')}
                >
                  {player.playerName}
                </p>

                <p className={`${SCALE.labelClass} normal-case tracking-normal text-teal-800/80`}>
                  {t('pointsXp', { score: player.score, xp: player.xpAwarded })}
                </p>
              </div>

              {player.isWinner && (
                <span className="shrink-0 text-sm sm:text-base" aria-label={t('winner')}>
                  🏆
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function WordBuildingGameOverOverlay({
  playersById,
  playerOrder,
  playerColours,
  localPlayerId,
  playerAvatarTiers = {},
  playerAvatarAnimals = {},
  hostTier = 0,
  hostAnimal = 0,
  hostClothesColor,
  newlyUnlockedTier = null,
  onReturnToLobby,
}: WordBuildingGameOverOverlayProps) {
  const t = useTranslations('games.wordBuilding.outro');
  const tProgression = useTranslations('games.lobby.progression');

  const unlockTier = typeof newlyUnlockedTier === 'number' ? newlyUnlockedTier : null;

  useEffect(() => {
    if (unlockTier === null) return;
    clearPendingAvatarUnlock(localPlayerId);
  }, [unlockTier, localPlayerId]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-teal-900/92 via-emerald-900/90 to-teal-950/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-building-game-over-title"
    >
      <h2 id="word-building-game-over-title" className="sr-only">
        {t('gameOverTitle')}
      </h2>

      {unlockTier !== null && (
        <div
          className="absolute left-1/2 top-3 z-30 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-teal-300/60 bg-teal-50/95 px-4 py-3 text-teal-950 shadow-lg sm:top-4"
          role="status"
          aria-live="polite"
        >
          <HostCharacter
            theme="animals"
            tier={unlockTier}
            animal={hostAnimal}
            size="default"
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold">{tProgression('unlockToastTitle')}</p>
            <p className="text-xs text-teal-900/80">
              {tProgression('unlockToastBody', {
                label: translateAvatarTier(tProgression, unlockTier),
              })}
            </p>
          </div>
        </div>
      )}

      <div
        className={[
          'flex h-full w-full flex-col items-center',
          SCALE.overlayPadClass,
          SCALE.stackGapClass,
        ].join(' ')}
      >
        {/* Speech bubble + host character */}
        <div className="flex w-full shrink-0 flex-col items-center">
          <div
            className={[
              'relative z-10 w-full',
              SCALE.bubbleMaxWidthClass,
              SCALE.bubbleTailPadClass,
            ].join(' ')}
          >
            <SpeechBubble text={t('puzzleComplete')} />
          </div>

          <div className="relative z-0 shrink-0">
            <HostCharacter
              animated
              theme="animals"
              clothesColor={hostClothesColor}
              tier={hostTier}
              animal={hostAnimal}
              className={SCALE.hostClass}
            />
          </div>
        </div>

        {/* Scrollable score panel */}
        <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overscroll-contain">
          <ScorePanel
            playerOrder={playerOrder}
            playersById={playersById}
            playerColours={playerColours}
            playerAvatarTiers={playerAvatarTiers}
            playerAvatarAnimals={playerAvatarAnimals}
            t={t}
          />
        </div>

        {/* Return to Lobby button — always visible */}
        <div className="flex w-full shrink-0 flex-col items-center justify-center">
          <button
            type="button"
            onClick={onReturnToLobby}
            className={[
              'rounded-full bg-emerald-500 font-semibold text-white shadow-[0_4px_0_#047857] transition hover:bg-emerald-400 active:translate-y-0.5 active:shadow-none',
              SCALE.buttonClass,
            ].join(' ')}
          >
            {t('returnToLobby')}
          </button>
        </div>
      </div>
    </div>
  );
}
