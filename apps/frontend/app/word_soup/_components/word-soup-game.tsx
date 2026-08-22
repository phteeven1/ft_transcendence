'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSessionGuard } from '../../hooks/use-session-guard';
import { useGameSocket } from '../../hooks/use-game-socket';
import { useWordSoupGame } from '../../hooks/word-soup/use-word-soup-game';

import GameCourt from './game-court';
import AbandonPlayModal from '../../components/abandon-play-modal';
import PlayerScoreboardBanner from './player-scoreboard-banner';
import WordSoupIntroOverlay from './word-soup-intro-overlay';
import { GameOverOverlay } from '@/app/components/game/overlay';
import WordSoupEventBannerView from './word-soup-event-banner';
import WordSoupTitle from './word-soup-title';
import GameClock from '@/app/components/game-clock';
import GameRulesInfo from './game-rules-info';
import WordStats from './word-stats';
import { Button } from '../../components/ui/button';
import { MAX_COURT_WIDTH } from '../_lib/word-soup-constants';

export default function WordSoupGame() {
  const tCommon = useTranslations('common');
  const t = useTranslations('games.wordSoup');
  const tControls = useTranslations('games.controls');
  useSessionGuard();

  const searchParams = useSearchParams();
  const gameId = Number(searchParams.get('gameId'));
  const playerId = Number(searchParams.get('playerId'));
  const socket = useGameSocket(gameId, playerId);
  const ws = useWordSoupGame({ gameId, playerId, socket });
  const localHostClothesColor = ws.playerColours[playerId];

  const scoreboardProps = {
    players: ws.players,
    localPlayerId: playerId,
    playerColours: ws.playerColours,
    playerScores: ws.playerScores,
    playerStreaks: ws.playerStreaks,
    leftPlayers: ws.leftPlayers,
    frozenPlayers: ws.frozenPlayers,
    freezeSecondsByPlayer: ws.freezeSecondsByPlayer,
    scorePopup: ws.scorePopup,
  };

  if (ws.loading || !ws.game) {
    return (
      <div className="game-shell flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{tCommon('loadingGame')}</p>
      </div>
    );
  }

  if (ws.courtInitError) {
    return (
      <div className="game-shell flex-1 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-lg">
          <h2 className="text-lg font-semibold text-rose-800">{t('initErrorTitle')}</h2>
          <p className="mt-2 text-sm text-gray-600">{ws.courtInitError}</p>
          <button
            type="button"
            onClick={ws.retryInitCourt}
            className="mt-5 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-shell relative flex-1 overflow-x-auto">
      {!ws.isConnected && (
        <div
          className="sticky top-0 z-40 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900"
          role="status"
          aria-live="polite"
        >
          {t('reconnecting')}
        </div>
      )}
      {ws.actionError ? (
        <div
          className="sticky top-0 z-40 border-b border-rose-200 bg-rose-50 px-4 py-2 text-center text-sm font-medium text-rose-800"
          role="alert"
        >
          {ws.actionError}
        </div>
      ) : null}
      <div className="mx-auto flex w-full max-w-[1600px] justify-center px-3 py-3 sm:px-4 sm:py-4">
        <div
          className="w-full min-w-0"
          style={{ maxWidth: `calc(11.5rem + 1rem + ${MAX_COURT_WIDTH}px)` }}
        >
          {/*
            Desktop:
              row1: [title] [message banner + rules]  (controls right edge = court)
              row2: [players + word stats] [court]    (stats bottom = court bottom)
              row3: [back to lobby] [submit]          (button tops/bottoms align)
          */}
          <div className="grid w-full grid-cols-1 items-stretch gap-x-4 gap-y-2 sm:gap-y-2.5 lg:grid-cols-[11.5rem_minmax(0,1fr)]">
            {/* Title — top left, above scorecards */}
            <div className="lg:col-start-1 lg:row-start-1">
              <div className="flex h-full flex-col gap-2">
                <WordSoupTitle
                  wordsFound={ws.wordsFound}
                  totalWords={ws.solutionWords.length}
                />
              </div>
            </div>

            {/* Message + court controls — right edge flush with court.
                Banner may expand downward over the court when messages wrap. */}
            <div className="relative z-20 lg:col-start-2 lg:row-start-1">
              <div
                className="flex w-full items-start gap-2 sm:gap-3"
                style={{ maxWidth: MAX_COURT_WIDTH }}
              >
                <div className="min-w-0 flex-1">
                  <WordSoupEventBannerView
                    event={ws.eventBanner}
                    phase={ws.eventBannerPhase}
                    hostTier={ws.localHostTier}
                    hostAnimal={ws.localHostAnimal}
                    hostClothesColor={localHostClothesColor}
                  />
                </div>
                <div className="flex h-14 shrink-0 items-center sm:h-16">
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <GameRulesInfo />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile players */}
            <div className="lg:hidden">
              <PlayerScoreboardBanner {...scoreboardProps} orientation="horizontal" />
            </div>

            {/* Players + word stats — bottom of stats = bottom of court */}
            <aside
              className="hidden min-h-0 flex-col lg:col-start-1 lg:row-start-2 lg:flex"
              aria-label={t('playersAndStats')}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PlayerScoreboardBanner {...scoreboardProps} orientation="vertical" />
              </div>
              <div className="mt-auto shrink-0 pt-3">
                <GameClock 
                  startedAtMs={ws.playStartedAt}
                  stopped={ws.isGameOver || ws.showGameOverOverlay}
                  className="w-full justify-between"
                  label={t('timeLabel')}
                />
              </div>
              <div className="mt-auto shrink-0 pt-3">
                <WordStats
                  totalWords={ws.solutionWords.length}
                  wordsFound={ws.wordsFound}
                  wordsLeft={ws.wordsLeft}
                />
              </div>
            </aside>

            {/* Court */}
            <div
              className="relative z-0 min-w-0 w-full lg:col-start-2 lg:row-start-2"
              style={{ maxWidth: MAX_COURT_WIDTH }}
            >
              <GameCourt
                visibleCourt={ws.visibleCourt}
                playerColours={ws.playerColours}
                selectedCells={ws.selection}
                foundWordGroups={ws.foundWords}
                isLocalPlayerFrozen={ws.isLocalPlayerFrozen}
                freezeSecondsLeft={ws.freezeSecondsLeft}
                lettersVisible={ws.gameReady || !ws.showIntro}
                wordCelebration={ws.wordCelebration}
                onSelectionStart={ws.handleSelectionStart}
                onSelectionContinue={ws.handleSelectionContinue}
                onSelectionEnd={ws.handleSelectionEnd}
                overlay={
                  ws.showIntro ? (
                    <WordSoupIntroOverlay
                      phase={ws.introPhase}
                      bubbleText={ws.introBubbleText}
                      bubbleVisible={ws.introBubbleVisible}
                      wordRevealIndex={ws.wordRevealIndex}
                      totalWords={ws.introTotalWords}
                      countdownValue={ws.introCountdownValue}
                      solutionWords={ws.solutionWords}
                      hostTier={ws.localHostTier}
                      hostAnimal={ws.localHostAnimal}
                      hostClothesColor={localHostClothesColor}
                    />
                  ) : null
                }
              />
            </div>

            {/* Back to lobby — height-matched to Submit */}
            <div className="hidden h-full lg:col-start-1 lg:row-start-3 lg:block">
              <WordSoupSessionActions
                fillHeight
                onLeave={ws.handleLeaveClick}
                backLabel={tControls('backToLobby')}
              />
            </div>

            {/* Submit */}
            <div className="lg:col-start-2 lg:row-start-3">
              <div className="h-full w-full" style={{ maxWidth: MAX_COURT_WIDTH }}>
                <WordSoupSubmitGuessButton
                  fillHeight
                  onSubmitGuess={ws.handleSubmitGuess}
                  selectionCount={ws.selection.length}
                  isSubmittingGuess={ws.isSubmittingGuess}
                  isLocalPlayerFrozen={ws.isLocalPlayerFrozen}
                  hasLeftGame={ws.hasLeftGame}
                  frozenLabel={t('frozen', { seconds: ws.freezeSecondsLeft })}
                  submittingLabel={t('submitting')}
                  submitLabel={t('submitGuess')}
                />
              </div>
            </div>

            {/* Mobile: stats + session */}
            <div className="flex max-w-[11.5rem] flex-col gap-3 lg:hidden">
              <WordStats
                totalWords={ws.solutionWords.length}
                wordsFound={ws.wordsFound}
                wordsLeft={ws.wordsLeft}
              />
              <WordSoupSessionActions
                onLeave={ws.handleLeaveClick}
                backLabel={tControls('backToLobby')}
              />
            </div>
          </div>

        </div>

        {ws.showAbandonModal && (
          <AbandonPlayModal
            onStay={ws.closeAbandonModal}
            onLeave={ws.leaveToLobby}
            isLeaving={ws.isAbandoning}
            endsGame={ws.isLastRemaining}
          />
        )}
      </div>

      {ws.showGameOverOverlay && (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-50 flex justify-center px-3 sm:px-4">
          <div
            className="pointer-events-auto relative h-full w-full min-w-0"
            style={{ maxWidth: `calc(11.5rem + 1rem + ${MAX_COURT_WIDTH}px)` }}
          >
            <GameOverOverlay
              outroNamespace="games.wordSoup.outro"
              overlayId="word-soup-game-over-title"
              phase={ws.gameOverPhase}
              bubbleText={ws.gameOverBubbleText}
              bubbleVisible={ws.gameOverBubbleVisible}
              revealedPlayerIds={ws.gameOverRevealedPlayerIds}
              playersById={ws.gameOverPlayersById}
              playerColours={ws.playerColours}
              playerAvatarTiers={ws.playerAvatarTiers}
              playerAvatarAnimals={ws.playerAvatarAnimals}
              hostTier={ws.localHostTier}
              hostAnimal={ws.localHostAnimal}
              hostClothesColor={localHostClothesColor}
              localPlayerId={playerId}
              newlyUnlockedTier={ws.newlyUnlockedTier}
              showReturnButton={ws.showGameOverReturnButton}
              onReturnToLobby={ws.handleReturnToLobby}
            />
          </div>
        </div>
      )}
    </div>
  );
}

type WordSoupSessionActionsProps = {
  onLeave: () => void;
  backLabel: string;
  fillHeight?: boolean;
};

function WordSoupSessionActions({
  onLeave,
  backLabel,
  fillHeight = false,
}: WordSoupSessionActionsProps) {
  return (
    <div
      className={[
        'flex w-full flex-col gap-1.5',
        fillHeight ? 'h-full' : '',
      ].join(' ')}
    >
      <Button
        variant="primary"
        size="sm"
        fullWidth
        onClick={onLeave}
        className={fillHeight ? 'min-h-0 flex-1' : ''}
      >
        {backLabel}
      </Button>
    </div>
  );
}

type WordSoupSubmitGuessButtonProps = {
  onSubmitGuess: () => void;
  selectionCount: number;
  isSubmittingGuess: boolean;
  isLocalPlayerFrozen: boolean;
  hasLeftGame: boolean;
  frozenLabel: string;
  submittingLabel: string;
  submitLabel: string;
  fillHeight?: boolean;
};

function WordSoupSubmitGuessButton({
  onSubmitGuess,
  selectionCount,
  isSubmittingGuess,
  isLocalPlayerFrozen,
  hasLeftGame,
  frozenLabel,
  submittingLabel,
  submitLabel,
  fillHeight = false,
}: WordSoupSubmitGuessButtonProps) {
  return (
    <div className={['z-10 w-full', fillHeight ? 'h-full' : 'sticky bottom-2'].join(' ')}>
      <Button
        variant="secondary"
        fullWidth
        size="lg"
        onClick={onSubmitGuess}
        disabled={
          selectionCount < 2 ||
          isSubmittingGuess ||
          isLocalPlayerFrozen ||
          hasLeftGame
        }
        className={['shadow-md', fillHeight ? '!h-full' : ''].join(' ')}
      >
        {isLocalPlayerFrozen
          ? frozenLabel
          : isSubmittingGuess
            ? submittingLabel
            : submitLabel}
      </Button>
    </div>
  );
}
