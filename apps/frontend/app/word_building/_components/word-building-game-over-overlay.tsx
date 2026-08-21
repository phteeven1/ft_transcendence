'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  AvatarUnlockToast,
  GameOverlayShell,
  GameScorePanel,
  HostSpeechStack,
  OVERLAY_SCALE,
  ReturnToLobbyButton,
  SpeechBubble,
} from '@/app/components/game/overlay';
import type { GameOverPhase } from '@/app/hooks/game/use-game-over';
import type { GameFinishPlayerOutcomeDto } from '@/lib/api/games/types';
import { clearPendingAvatarUnlock } from '@/lib/avatar-unlock';

type WordBuildingGameOverOverlayProps = {
  phase: GameOverPhase;
  bubbleText: string;
  bubbleVisible: boolean;
  revealedPlayerIds: number[];
  playersById: Record<number, GameFinishPlayerOutcomeDto>;
  playerColours: Record<number, string>;
  localPlayerId: number;
  playerAvatarTiers?: Record<number, number>;
  playerAvatarAnimals?: Record<number, number>;
  hostTier?: number;
  hostAnimal?: number;
  hostClothesColor?: string;
  newlyUnlockedTier?: number | null;
  showReturnButton: boolean;
  onReturnToLobby: () => void;
};

export default function WordBuildingGameOverOverlay({
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
}: WordBuildingGameOverOverlayProps) {
  const t = useTranslations('games.wordBuilding.outro');
  const unlockTier =
    typeof newlyUnlockedTier === 'number' ? newlyUnlockedTier : null;
  const isClosing = phase === 'closing' || phase === 'closing-gap';

  useEffect(() => {
    if (unlockTier !== null && showReturnButton) {
      clearPendingAvatarUnlock(localPlayerId);
    }
  }, [localPlayerId, showReturnButton, unlockTier]);

  return (
    <GameOverlayShell
      role="dialog"
      ariaModal
      ariaLabelledBy="word-building-game-over-title"
    >
      <h2 id="word-building-game-over-title" className="sr-only">
        {t('gameOverTitle')}
      </h2>

      {unlockTier !== null && showReturnButton ? (
        <AvatarUnlockToast
          unlockTier={unlockTier}
          hostAnimal={hostAnimal}
        />
      ) : null}

      <div
        className={[
          'flex h-full w-full flex-col items-center',
          OVERLAY_SCALE.overlayPadClass,
          OVERLAY_SCALE.stackGapClass,
        ].join(' ')}
      >
        <HostSpeechStack
          bubble={
            <SpeechBubble
              text={bubbleText}
              visible={bubbleVisible}
              fixedHeight
            />
          }
          hostTier={hostTier}
          hostAnimal={hostAnimal}
          hostClothesColor={hostClothesColor}
        />

        <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overscroll-contain">
          <GameScorePanel
            revealedPlayerIds={revealedPlayerIds}
            playersById={playersById}
            playerColours={playerColours}
            playerAvatarTiers={playerAvatarTiers}
            playerAvatarAnimals={playerAvatarAnimals}
            labels={{
              finalScores: t('finalScores'),
              scoresComingUp: t('scoresComingUp'),
              pointsXp: ({ score, xp }) => t('pointsXp', { score, xp }),
              winner: t('winner'),
            }}
          />

          <div className="mt-1.5 flex w-full shrink-0 flex-col items-center justify-center sm:mt-2 lg:mt-3">
            <ReturnToLobbyButton
              showReturnButton={showReturnButton}
              isClosing={isClosing}
              returnLabel={t('returnToLobby')}
              almostDoneLabel={t('almostDone')}
              onReturnToLobby={onReturnToLobby}
            />
          </div>
        </div>
      </div>
    </GameOverlayShell>
  );
}
