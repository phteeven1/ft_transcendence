'use client';

/*
game lobby where players can initiate new games and join pending games initiated by others
polls every 3 s makes sure to sync game status between players
modal based workflow, and only games in the player's group, are displayed
session management prevents duplicate game tabs by redirecting to /already_in_game
error handling logs errors for failed API calls
Workflow example:
player A clicks 'New Word Building', which opens InitiateGameModal
player A sets waitingFor: 2, handleCreateGame creates a new pending game
player B sees the pending game and clicks it, opening JoinGameModal
player B confirms, and handleJoinGame adds them to the game
if the game now has enough players (waitingFor) it becomes active, and both players
are redirected to /play_game
Also, they are removed from all other pendning games that they have joined, 
but which are still waiting either for enough players, or for counter to finish.
If all players leave a game before it starts, it is destroyed
*/


import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { gamesApi } from '@/lib/api';
import { Game } from '../types';
import InitiateGameModal from './_components/initiate-game-modal';
import JoinGameModal from './_components/join-game-modal';
import PendingGameButton from './_components/pending-game-button';
import { useSessionGuard } from '../hooks/use-session-guard';
import ForceStartModal from './_components/force-start-modal';

// modal state. none = no modal is open. initiate = 'Initiate Game' modal is open,
// join = 'Join Game' modal is open
type ModalState =
  | { kind: 'none' }
  | { kind: 'initiate'; gameName: string }
  | { kind: 'join'; game: Game }
  | { kind: 'forceStart'; game: Game };


// manages list of pending games and modal states
// pendingGames stores list of pending not yet active games
// modal tracks modal state
export default function SelectGame() {
  const { player, logoutPlayer } = useAuth();
  const router = useRouter();
  useSessionGuard();

  const [pendingGames, setPendingGames] = useState<Game[]>([]);
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });

  const hasInitiated = (gameName: string): boolean =>
    pendingGames.some((g) => g.name === gameName && g.initiatedBy === player?.id);

  // guards against no player
  useEffect(() => {
    if (!player) {
      router.push('/');
      return;
    }
    // If this player is already in an active game, block this tab.
    // We do NOT redirect to play_game here — that would give them two active game tabs.
    // Instead we send them to a dead-end page.
    // TODO: replace with a session token system (see already_in_game/page.tsx for details).
    if (player.currentGameId !== null && player.currentGameId !== undefined) {
      router.push('/already_in_game');
    }
  }, []);

  // fetches all games in the players group
  // filters out active or finished games, keeping only pending ones
  // if player is already in active game, redirects to /play_game
  const syncGames = useCallback(async () => {
    if (!player) return;
    try {
      const allGroupGames = await gamesApi.findByGroup(player.inGroup);

      // If a game this player joined has become active, navigate to it
      const startedGame = allGroupGames.find(
        (g) => g.isActive && !g.isFinished && g.players.includes(player.id),
      );
      if (startedGame) {
        router.push(`/play_game?gameId=${startedGame.id}&playerId=${player.id}`);
        return;
      }

      setPendingGames(allGroupGames.filter((g) => !g.isActive && !g.isFinished));
    } catch (error) {
      console.error('syncGames failed:', error);
    }
  }, [player, router]);

  // polls for updates every 3 s
  useEffect(() => {
    syncGames();
    const interval = setInterval(syncGames, 3000);
    return () => clearInterval(interval);
  }, [syncGames]);

  // calls postCreateGame with gameName and waitingFor
  // adds new game to pendingGames and closes modal
  const handleCreateGame = async (gameName: string) => {
    if (!player) return;
    try {
      const newGame = await gamesApi.create({
        name: gameName,
        inGroup: player.inGroup,
        initiatedBy: player.id,
      });
      setPendingGames((prev) => [...prev, newGame]);
    } catch (error) {
      console.error('handleCreateGame failed:', error);
    }
    setModal({ kind: 'none' });
  };

  // calls postJoinGame to add current player to selected game
  // if the game then becomes active, it redirects to /play_game
  // otherwise, updates pendingGames list
  const handleJoinGame = async (game: Game) => {
    if (!player) return;
    try {
      const updatedGame = await gamesApi.join({
        gameId: game.id,
        playerId: player.id,
      });
      if (!updatedGame) return;
      if (updatedGame.isActive) {
        router.push(`/play_game?gameId=${updatedGame.id}&playerId=${player.id}`);
        return;
      }
      setPendingGames((prev) =>
        prev.map((g) => (g.id === updatedGame.id ? updatedGame : g)),
      );
    } catch (error) {
      console.error('handleJoinGame failed:', error);
    }
    setModal({ kind: 'none' });
  };

  // POSTs /games/start with whichever players have currently joined
  // this bypasses waiting until 5 mins has passed or until enough players have joined
  const handleForceStart = async (game: Game) => {
    try {
      await gamesApi.start({ gameId: game.id });
    } catch (error) {
      console.error('handleForceStart failed:', error);
    }
    setModal({ kind: 'none' });
  };

  // logs the player out and redirects to /register
  const handleFinishGame = () => {
    logoutPlayer();
    router.push('/register');
  };

  if (!player) return null;

  // layout. a greting for the player, then a grid of buttons:
  // 'New Word Building' and 'New Word Soup' opens initiateGameModal to create new game
  // one pending game button for each game in pendingGames
  // clicking button opens JoinGameModal, if player isn't already in game
  // then a 'Finish Game' button to log out
  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-4xl mx-auto p-4">

        <h1 className="text-2xl font-bold mb-2 text-center">Hi, {player.name}!</h1>
        <p className="text-sm text-gray-600 mb-8 text-center">Choose a game to play</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          <button
            onClick={() => setModal({ kind: 'initiate', gameName: 'Word Building' })}
            disabled={hasInitiated('Word Building')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-4 px-4 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            New Word Building
          </button>

          <button
            onClick={() => setModal({ kind: 'initiate', gameName: 'Word Soup' })}
            disabled={hasInitiated('Word Soup')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-4 px-4 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            New Word Soup
          </button>

          {pendingGames.map((game) => (
            <PendingGameButton
              key={game.id}
              game={game}
              currentPlayerId={player.id}
              onClick={() => {
                if (!game.players.includes(player.id)) {
                  setModal({ kind: 'join', game });
                }
              }}
              onForceStart={() => setModal({ kind: 'forceStart', game })}
            />
          ))}

        </div>

        <div className="mt-10 text-center">
          <button
            onClick={handleFinishGame}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-6 rounded transition-colors"
          >
            Finish Game
          </button>
        </div>
      </div>

      {modal.kind === 'initiate' && (
        <InitiateGameModal
          gameName={modal.gameName}
          onCancel={() => setModal({ kind: 'none' })}
          onCreate={() => handleCreateGame(modal.gameName)}
        />
      )}

      {modal.kind === 'join' && (
        <JoinGameModal
          game={modal.game}
          onCancel={() => setModal({ kind: 'none' })}
          onJoin={() => handleJoinGame(modal.game)}
        />
      )}

      {modal.kind === 'forceStart' && (
        <ForceStartModal
          game={modal.game}
          onCancel={() => setModal({ kind: 'none' })}
          onConfirm={() => handleForceStart(modal.game)}
        />
      )}
    </div>
  );
}



