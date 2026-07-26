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
import WordSoupEventBannerView from './word-soup-event-banner';
import WordSoupTitle from './word-soup-title';
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

  return (
    <div className="game-shell flex-1 overflow-x-auto">
      <div className="mx-auto flex w-full max-w-[1600px] justify-center px-3 py-3 sm:px-4 sm:py-4">
        {ws.showGameOverOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/80 px-4 backdrop-blur-sm">
            <div className="animate-[fadeIn_250ms_ease-out] w-full max-w-lg rounded-3xl border border-white/20 bg-white p-8 text-center shadow-2xl">
              <div className="mb-4 text-5xl drop-shadow-sm">🎉</div>
              <h2 className="text-3xl font-semibold text-emerald-800">Game complete!</h2>
              <p className="mt-3 text-sm text-gray-600">
                Everyone solved the board. What a brilliant round of Word Soup!
              </p>

              <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <div className="mb-3 flex justify-center gap-2 text-lg">
                  <span className="animate-bounce [animation-delay:0ms]">✨</span>
                  <span className="animate-bounce [animation-delay:120ms]">🎊</span>
                  <span className="animate-bounce [animation-delay:240ms]">✨</span>
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Final scores
                </h3>
                <ul className="mt-3 space-y-2 text-left">
                  {ws.sortedPlayers.map((player, index) => (
                    <li
                      key={player.id}
                      className="flex flex-col gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-700 shadow-sm sm:flex-row sm:justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                          #{index + 1}
                        </span>
                        <span>{player.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-right text-sm">
                        <span className="font-semibold text-emerald-800">
                          {ws.playerScores[player.id] ?? 0} pts
                        </span>
                        <span className="text-gray-600">
                          {ws.playerWordCounts[player.id] ?? 0} words
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={ws.handleReturnToLobby}
                className="mt-6 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Return to lobby
              </button>
            </div>
          </div>
        )}

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
              <WordSoupTitle
                wordsFound={ws.wordsFound}
                totalWords={ws.solutionWords.length}
              />
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
