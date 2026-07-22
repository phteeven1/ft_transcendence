'use client';

import { useSearchParams } from 'next/navigation';

import { useSessionGuard } from '../../hooks/use-session-guard';
import { useGameSocket } from '../../hooks/use-game-socket';
import { useWordSoupGame } from '../../hooks/word-soup/use-word-soup-game';

import GameInfoColumn from './game-info-column';
import GameCourt from './game-court';
import GameControls from './game-controls';
import AbandonPlayModal from './abandon-play-modal';

export default function WordSoupGame() {
  useSessionGuard();

  const searchParams = useSearchParams();
  const gameId = Number(searchParams.get('gameId'));
  const playerId = Number(searchParams.get('playerId'));
  const socket = useGameSocket(gameId, playerId);
  const ws = useWordSoupGame({ gameId, playerId, socket });

  if (ws.loading || !ws.game) {
    return (
      <div className="game-shell flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="game-shell flex-1 overflow-x-auto">
      <div className="mx-auto max-w-[1600px] px-4 py-4">
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
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Final scores</h3>
                <ul className="mt-3 space-y-2 text-left">
                  {ws.sortedPlayers.map((player, index) => (
                    <li key={player.id} className="flex flex-col gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-700 shadow-sm sm:flex-row sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">#{index + 1}</span>
                        <span>{player.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-right text-sm">
                        <span className="font-semibold text-emerald-800">{ws.playerScores[player.id] ?? 0} pts</span>
                        <span className="text-gray-600">{ws.playerWordCounts[player.id] ?? 0} words</span>
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

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(180px,220px)] lg:items-start">
          <GameInfoColumn game={ws.game} players={ws.players} playerId={playerId} />

          <div className="flex flex-col gap-3">
            <div className="relative flex">
              <GameCourt
                visibleCourt={ws.visibleCourt}
                playerColours={ws.playerColours}
                selectedCells={ws.selection}
                foundWordGroups={ws.foundWords}
                isLocalPlayerFrozen={ws.isLocalPlayerFrozen}
                freezeSecondsLeft={ws.freezeSecondsLeft}
                wordCelebration={ws.wordCelebration}
                onSelectionStart={ws.handleSelectionStart}
                onSelectionContinue={ws.handleSelectionContinue}
                onSelectionEnd={ws.handleSelectionEnd}
              />
              {ws.showWordReveal && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-emerald-950/70 backdrop-blur-sm">
                  <div className="mx-4 max-w-[280px] rounded-2xl border border-white/20 bg-white/95 px-6 py-5 text-center shadow-xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700">Word Soup</p>
                    <p className="mt-3 text-2xl font-semibold text-emerald-900">{ws.solutionWords[ws.wordRevealIndex] ?? 'Ready!'}</p>
                    <p className="mt-2 text-sm text-gray-600">
                      {ws.solutionWords.length > 0
                        ? `Word ${ws.wordRevealIndex + 1} of ${ws.solutionWords.length}`
                        : 'Get ready...'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-emerald-200 bg-white/90 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Scoreboard</h2>
                <span className="text-xs text-gray-500">Points</span>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-emerald-50/70 p-3 text-center text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Total</p>
                  <p className="font-semibold text-gray-800">{ws.solutionWords.length}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Found</p>
                  <p className="font-semibold text-gray-800">{ws.wordsFound}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Left</p>
                  <p className="font-semibold text-gray-800">{ws.wordsLeft}</p>
                </div>
              </div>

              <ul className="space-y-2">
                {ws.players.map((player) => (
                  <li key={player.id} className="flex flex-col gap-2 rounded-lg bg-emerald-50/70 px-3 py-2 sm:flex-row sm:justify-between sm:items-center">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-sm border border-gray-200"
                        style={{ backgroundColor: ws.playerColours[player.id] ?? '#E5E7EB' }}
                      />
                      <span className="text-sm font-medium text-gray-800">{player.name}</span>
                      {player.id === playerId && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <span className="font-semibold">{ws.playerScores[player.id] ?? 0} pts</span>
                      <span>{ws.playerWordCounts[player.id] ?? 0} words</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-gray-700">
                <p className="font-semibold text-emerald-800">Rules</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>Select a contiguous word on the grid.</li>
                  <li>Submit your guess to score points.</li>
                  <li>Found words are highlighted in your player colour.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:pt-12">
            {ws.statusBanner && (
              <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 shadow-sm">
                {ws.statusBanner}
              </p>
            )}
            <GameControls
              onLeave={ws.handleLeaveClick}
              onGameOver={ws.handleGameOver}
              onSubmitGuess={ws.handleSubmitGuess}
              selectionCount={ws.selection.length}
              isSubmittingGuess={ws.isSubmittingGuess}
              isLocalPlayerFrozen={ws.isLocalPlayerFrozen}
              freezeSecondsLeft={ws.freezeSecondsLeft}
            />
            {ws.selectionMessage && (
              <p className="rounded border border-emerald-200 bg-white/80 px-3 py-2 text-sm text-gray-700">
                {ws.selectionMessage}
              </p>
            )}
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
