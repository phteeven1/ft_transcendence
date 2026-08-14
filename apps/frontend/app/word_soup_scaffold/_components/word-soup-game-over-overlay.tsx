'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { GameFinishPlayerOutcomeDto } from '@/lib/api/games/types';
import { clearPendingAvatarUnlock } from '@/lib/avatar-unlock';
import { translateAvatarTier } from '@/lib/i18n/progression-labels';
import type { GameOverPhase } from '@/app/hooks/word-soup/use-word-soup-game-over';
import SoupHostCharacter from './soup-host-character';
import type { CourtSize } from './court-size';
import { getOverlayScale, type OverlayScale } from './overlay-scale';

type WordSoupGameOverOverlayProps = {
  phase: GameOverPhase;
  bubbleText: string;
  bubbleVisible: boolean;

  revealedPlayerIds: number[];
  playersById: Record<number, GameFinishPlayerOutcomeDto>;
  playerColours: Record<number, string>;
  localPlayerId: number;

  // Avatar customisation
  playerAvatarTiers?: Record<number, number>;
  playerAvatarAnimals?: Record<number, number>;
  hostTier?: number;
  hostAnimal?: number;
  hostClothesColor?: string;
  newlyUnlockedTier?: number | null;

  showReturnButton: boolean;
  onReturnToLobby: () => void;
  courtSize?: CourtSize;
};

function SpeechBubble({
  text,
  visible,
  scale,
}: {
  text: string;
  visible: boolean;
  scale: OverlayScale;
}) {
  return (
    <div
      className={[
        'word-soup-intro-bubble relative mx-auto flex w-full items-center justify-center rounded-[1.75rem] border-[3px] border-teal-700 bg-white shadow-[4px_6px_0_rgba(15,118,110,0.25)] transition-opacity duration-300',
        scale.bubbleMaxWidthClass,
        scale.bubblePadClass,
        scale.outroBubbleHeightClass,
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
      aria-hidden={!visible}
    >
      <p
        className={[
          'line-clamp-3 w-full break-words whitespace-pre-wrap text-center font-bold leading-snug text-teal-950',
          scale.bubbleTextClass,
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

function ScorePanel({
  scale,
  revealedPlayerIds,
  playersById,
  playerColours,
  playerAvatarTiers,
  playerAvatarAnimals,
  t,
}: {
  scale: OverlayScale;
  revealedPlayerIds: number[];
  playersById: Record<number, GameFinishPlayerOutcomeDto>;
  playerColours: Record<number, string>;
  playerAvatarTiers: Record<number, number>;
  playerAvatarAnimals: Record<number, number>;
  t: ReturnType<typeof useTranslations<'games.wordSoup.outro'>>;
}) {
  return (
    <div
      className={[
        'w-full rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-sm',
        scale.bubbleMaxWidthClass,
        scale.scorePadClass,
      ].join(' ')}
    >
      <h3
        className={[
          'text-center font-semibold uppercase text-teal-100/85',
          scale.labelClass,
        ].join(' ')}
      >
        {t('finalScores')}
      </h3>

      <ul className="mt-1.5 space-y-1 sm:mt-2 sm:space-y-1.5">
        {revealedPlayerIds.length === 0 ? (
          <li
            className={[
              'rounded-xl border border-dashed border-white/20 px-2 py-2 text-center text-teal-100/70',
              scale.bubbleTextClass,
            ].join(' ')}
          >
            {t('scoresComingUp')}
          </li>
        ) : (
          revealedPlayerIds.map((playerId) => {
            const player = playersById[playerId];
            if (!player) return null;

            const colour = playerColours[playerId] ?? '#5EEAD4';
            const tier = playerAvatarTiers[playerId] ?? 0;
            const animal = playerAvatarAnimals[playerId] ?? 0;

            return (
              <li
                key={playerId}
                className={[
                  'word-soup-game-over-score-row flex items-center rounded-xl border border-white/20 bg-white/95 shadow-sm',
                  scale.scoreRowClass,
                ].join(' ')}
              >
                <SoupHostCharacter
                  theme="animals"
                  clothesColor={colour}
                  tier={tier}
                  animal={animal}
                  className={`${scale.scoreAvatarClass} shrink-0`}
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      'truncate font-semibold text-teal-950',
                      scale.bubbleTextClass,
                    ].join(' ')}
                  >
                    {player.playerName}
                  </p>

                  <p
                    className={`${scale.labelClass} normal-case tracking-normal text-teal-800/80`}
                  >
                    {t('pointsXp', {
                      score: player.score,
                      xp: player.xpAwarded,
                    })}
                  </p>
                </div>

                {player.isWinner && (
                  <span
                    className="shrink-0 text-sm sm:text-base"
                    aria-label={t('winner')}
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
  );
}

function resolveTierLabel(
  tProgression: ReturnType<typeof useTranslations<'games.lobby.progression'>>,
  tier: number,
): string {
  return translateAvatarTier(tProgression, tier);
}

export default function WordSoupGameOverOverlay({
  phase,
  bubbleText,
  bubbleVisible,
  revealedPlayerIds,
  playersById,
  localPlayerId,
  playerColours,
  playerAvatarTiers = {},
  playerAvatarAnimals = {},
  hostTier = 0,
  hostAnimal = 0,
  hostClothesColor,
  newlyUnlockedTier = null,
  showReturnButton,
  onReturnToLobby,
  courtSize = 'L',
}: WordSoupGameOverOverlayProps) {
  const t = useTranslations('games.lobby.progression');
  const tOutro = useTranslations('games.wordSoup.outro');

  const isClosing = phase === 'closing' || phase === 'closing-gap';
  const scale = getOverlayScale(courtSize);

  const unlockTier =
    typeof newlyUnlockedTier === 'number' ? newlyUnlockedTier : null;

  useEffect(() => {
    if (unlockTier === null) return;

    // Shown in-game — avoid a second toast when returning to the lobby.
    clearPendingAvatarUnlock(localPlayerId);
  }, [unlockTier, localPlayerId]);

  return (
    <div
      className="word-soup-intro-overlay absolute inset-0 z-30 overflow-hidden rounded-2xl bg-gradient-to-b from-teal-900/92 via-emerald-900/90 to-teal-950/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-soup-game-over-title"
    >
      <h2 id="word-soup-game-over-title" className="sr-only">
        {tOutro('gameOverTitle')}
      </h2>

      {unlockTier !== null && (
        <div
          className="absolute left-1/2 top-3 z-30 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-teal-300/60 bg-teal-50/95 px-4 py-3 text-teal-950 shadow-lg sm:top-4"
          role="status"
          aria-live="polite"
        >
          <SoupHostCharacter
            theme="animals"
            tier={unlockTier}
            animal={hostAnimal}
            size="default"
            className="shrink-0"
          />

          <div className="min-w-0">
            <p className="text-sm font-bold">{t('unlockToastTitle')}</p>
            <p className="text-xs text-teal-900/80">
              {t('unlockToastBody', {
                label: resolveTierLabel(t, unlockTier),
              })}
            </p>
          </div>
        </div>
      )}

      {/*
        Same relative stack on S/M/L:
        (bubble + host) → scrollable scores → pinned return button.

        Bubble and host remain one group so the speech-bubble tail
        stays aligned with the character.
      */}
      <div
        className={[
          'flex h-full w-full flex-col items-center',
          scale.overlayPadClass,
          scale.stackGapClass,
        ].join(' ')}
      >
        <div className="flex w-full shrink-0 flex-col items-center">
          <div
            className={[
              'relative z-10 w-full',
              scale.bubbleMaxWidthClass,
              scale.bubbleTailPadClass,
            ].join(' ')}
          >
            <SpeechBubble
              text={bubbleText}
              visible={bubbleVisible}
              scale={scale}
            />
          </div>

          <div className="relative z-0 shrink-0">
            <SoupHostCharacter
              animated
              theme="animals"
              clothesColor={hostClothesColor}
              tier={hostTier}
              animal={hostAnimal}
              className={scale.hostClass}
            />
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overscroll-contain">
          <ScorePanel
            scale={scale}
            revealedPlayerIds={revealedPlayerIds}
            playersById={playersById}
            playerColours={playerColours}
            playerAvatarTiers={playerAvatarTiers}
            playerAvatarAnimals={playerAvatarAnimals}
            t={tOutro}
          />
        </div>

        <div className="flex w-full shrink-0 flex-col items-center justify-center">
          {showReturnButton ? (
            <button
              type="button"
              onClick={onReturnToLobby}
              className={[
                'rounded-full bg-emerald-500 font-semibold text-white shadow-[0_4px_0_#047857] transition hover:bg-emerald-400 active:translate-y-0.5 active:shadow-none',
                scale.buttonClass,
              ].join(' ')}
            >
              {tOutro('returnToLobby')}
            </button>
          ) : isClosing ? (
            <p
              className={[
                'text-center font-medium uppercase text-teal-100/70',
                scale.labelClass,
              ].join(' ')}
            >
              {tOutro('almostDone')}
            </p>
          ) : (
            <button
              type="button"
              disabled
              tabIndex={-1}
              aria-hidden
              className={[
                'invisible rounded-full font-semibold',
                scale.buttonClass,
              ].join(' ')}
            >
              {tOutro('returnToLobby')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
