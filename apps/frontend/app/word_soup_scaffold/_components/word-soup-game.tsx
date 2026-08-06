'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSessionGuard } from '../../hooks/use-session-guard';
import { useGameSocket } from '../../hooks/use-game-socket';
import { useWordSoupGame } from '../../hooks/word-soup/use-word-soup-game';

import GameCourt from './game-court';
import AbandonPlayModal from './abandon-play-modal';
import PlayerScoreboardBanner from './player-scoreboard-banner';
import WordSoupIntroOverlay from './word-soup-intro-overlay';
import WordSoupGameOverOverlay from './word-soup-game-over-overlay';
import WordSoupEventBannerView from './word-soup-event-banner';
import WordSoupTitle from './word-soup-title';
import GameClock from '@/app/components/game-clock';
import CourtControls from './court-controls';
import WordStats from './word-stats';
import SessionActions from './session-actions';
import SubmitGuessButton from './submit-guess-button';
import { computeGridWidth } from './court-size';
import { useCourtSize } from './use-court-size';

const MAX_COURT_FRAME_WIDTH = computeGridWidth('L');

export default function WordSoupGame() {
  const tCommon = useTranslations('common');
  useSessionGuard();

  const searchParams = useSearchParams();
  const gameId = Number(searchParams.get('gameId'));
  const playerId = Number(searchParams.get('playerId'));
  const socket = useGameSocket(gameId, playerId);
  const ws = useWordSoupGame({ gameId, playerId, socket });
  const { courtSize, courtWidthPx, frameRef, onCourtSizeChange } = useCourtSize();

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
          <h2 className="text-lg font-semibold text-rose-800">Couldn&apos;t start Word Soup</h2>
          <p className="mt-2 text-sm text-gray-600">{ws.courtInitError}</p>
          <button
            type="button"
            onClick={ws.retryInitCourt}
            className="mt-5 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-shell flex-1 overflow-x-auto">
      {!ws.isConnected && (
        <div
          className="sticky top-0 z-40 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900"
          role="status"
          aria-live="polite"
        >
          Reconnecting to the game server…
        </div>
      )}
      <div className="mx-auto flex w-full max-w-[1600px] justify-center px-3 py-3 sm:px-4 sm:py-4">
        <div
          className="w-full min-w-0"
          style={{ maxWidth: `calc(11.5rem + 1rem + ${MAX_COURT_FRAME_WIDTH}px)` }}
        >
          {/*
            Desktop:
              row1: [title] [message banner + S/M/L/info]  (controls right edge = court)
              row2: [players + word stats] [court]         (stats bottom = court bottom)
              row3: [leave / game over] [submit]           (button tops/bottoms align)
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

            {/* Message + court controls — right edge flush with court */}
            <div className="lg:col-start-2 lg:row-start-1">
              <div
                className="flex items-center gap-2 sm:gap-3"
                style={{ width: courtWidthPx, maxWidth: '100%' }}
              >
                <div className="min-w-0 flex-1">
                  <WordSoupEventBannerView
                    event={ws.eventBanner}
                    phase={ws.eventBannerPhase}
                    hostTier={ws.localHostTier}
                  />
                </div>
                <CourtControls
                  courtSize={courtSize}
                  onCourtSizeChange={onCourtSizeChange}
                />
              </div>
            </div>

            {/* Mobile players */}
            <div className="lg:hidden">
              <PlayerScoreboardBanner {...scoreboardProps} orientation="horizontal" />
            </div>

            {/* Players + word stats — bottom of stats = bottom of court */}
            <aside
              className="hidden min-h-0 flex-col lg:col-start-1 lg:row-start-2 lg:flex"
              aria-label="Players and word counts"
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PlayerScoreboardBanner {...scoreboardProps} orientation="vertical" />
              </div>
              <div className="mt-auto shrink-0 pt-3">
                <GameClock 
                  startedAtMs={ws.playStartedAt}
                  stopped={ws.isGameOver || ws.showGameOverOverlay}
                  className="w-full justify-between"
                  label="Time"
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
              ref={frameRef}
              className="min-w-0 lg:col-start-2 lg:row-start-2"
              style={{ maxWidth: MAX_COURT_FRAME_WIDTH }}
            >
              <div style={{ width: courtWidthPx, maxWidth: '100%' }}>
                <GameCourt
                  courtSize={courtSize}
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
                        hostTier={ws.localHostTier}
                      />
                    ) : ws.showGameOverOverlay ? (
                      <WordSoupGameOverOverlay
                        phase={ws.gameOverPhase}
                        bubbleText={ws.gameOverBubbleText}
                        bubbleVisible={ws.gameOverBubbleVisible}
                        revealedPlayerIds={ws.gameOverRevealedPlayerIds}
                        playersById={ws.gameOverPlayersById}
                        playerColours={ws.playerColours}
                        playerAvatarTiers={ws.playerAvatarTiers}
                        hostTier={ws.localHostTier}
                        localPlayerId={playerId}
                        newlyUnlockedTier={ws.newlyUnlockedTier}
                        showReturnButton={ws.showGameOverReturnButton}
                        onReturnToLobby={ws.handleReturnToLobby}
                      />
                    ) : null
                  }
                />
              </div>
            </div>

            {/* Leave / Game Over — height-matched to Submit */}
            <div className="hidden h-full lg:col-start-1 lg:row-start-3 lg:block">
              <SessionActions
                fillHeight
                onLeave={ws.handleLeaveClick}
                onGameOver={ws.handleGameOver}
              />
            </div>

            {/* Submit */}
            <div className="lg:col-start-2 lg:row-start-3">
              <div style={{ width: courtWidthPx, maxWidth: '100%' }} className="h-full">
                <SubmitGuessButton
                  fillHeight
                  courtSize={courtSize}
                  onSubmitGuess={ws.handleSubmitGuess}
                  selectionCount={ws.selection.length}
                  isSubmittingGuess={ws.isSubmittingGuess}
                  isLocalPlayerFrozen={ws.isLocalPlayerFrozen}
                  freezeSecondsLeft={ws.freezeSecondsLeft}
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
              <SessionActions
                onLeave={ws.handleLeaveClick}
                onGameOver={ws.handleGameOver}
              />
            </div>
          </div>
        </div>

        {ws.showAbandonModal && (
          <AbandonPlayModal
            onStay={ws.closeAbandonModal}
            onLeave={ws.abandonPlay}
            isLeaving={ws.isAbandoning}
          />
        )}
      </div>
    </div>
  );
}
