'use client';

/*
Game lobby where players can initiate new games and join pending games initiated by others
uses WebSockets to sync game status between players in real time
REST is used only for mutations (create, join, start) — the backend
then emits WebSocket events to all group members, which drives UI updates.
Session management prevents duplicate game tabs by redirecting to /already_in_game
error handling logs errors for failed API calls
Workflow example:
player A clicks 'New Word Building', which opens InitiateGameModal
player A confirms, handleCreateGame creates a new pending game via REST
backend emits lobby:update to all players in the group
player B sees the pending game appear and clicks it, opening JoinGameModal
player B confirms, handleJoinGame adds them to the game via REST
backend emits game:started to all players in the group once game goes active
both players are redirected to /play_game
Also, they are removed from all other pending games that they have joined.
If all players leave a game before it starts, it is destroyed
*/

import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { gamesApi } from '@/lib/api';
import { playersApi } from '@/lib/api';
import { Game } from '../types';
import InitiateGameModal from './_components/initiate-game-modal';
import JoinGameModal from './_components/join-game-modal';
import PendingGameButton from './_components/pending-game-button';
import { useSessionGuard } from '../hooks/use-session-guard';
import ForceStartModal from './_components/force-start-modal';
import { useGroupSocket } from '../hooks/use-group-socket';
import PuzzleWindow from './_components/puzzle-window';

// modal state. none = no modal is open. initiate = 'Initiate Game' modal is open,
// join = 'Join Game' modal is open
type ModalState =
  | { kind: 'none' }
  | { kind: 'initiate'; gameName: string }
  | { kind: 'join'; game: Game }
  | { kind: 'forceStart'; game: Game };

// manages list of pending games and modal states via WebSocket
// pendingGames is kept in sync by lobby:update events pushed from the backend
// modal tracks modal state
export default function SelectGame() {
  const { player, logoutPlayer } = useAuth();
  const router = useRouter();
  useSessionGuard();

  const [modal, setModal] = useState<ModalState>({ kind: 'none' });


  // THIS NEEDS TO BE REPLACED WITH A SESSION TOKEN SYSTEM
  // Guards against no player, and then checks fresh DB state to avoid stale auth context
  // redirects a player who is already in an active game (in another device or tab) according to DB
  useEffect(() => {
    if (!player) {  // guard against no player
      router.push('/');
      return;
    }
    (async () => {
      try {
        const fresh = await playersApi.getById(player.id);
        if (fresh?.currentGameId !== null && fresh?.currentGameId !== undefined) {
          router.push('/already_in_game');
        }
      } catch {
        router.push('/already_in_game'); // fail safe
      }
    })();
  }, []); // runs exactly once at mount

  // connect to the group's WebSocket room
  // pendingGames is updated automatically when the backend emits lobby:update
  // startedGame is set when the backend emits game:started for a game this player is in
  const { pendingGames, startedGame } = useGroupSocket(
    player?.inGroup ?? 0,
    player?.id ?? 0,
  );

  // navigate to play_game as soon as the backend tells us our game has started
  useEffect(() => {
    if (startedGame && player) {
      router.push(`/play_game?gameId=${startedGame.id}&playerId=${player.id}`);
    }
  }, [startedGame, player, router]);

  const hasInitiated = (gameName: string): boolean =>
    pendingGames.some((g) => g.name === gameName && g.initiatedBy === player?.id);

  // calls gamesApi.create via REST — UI does not update directly;
  // the backend emits lobby:update which triggers the WebSocket state update
  const handleCreateGame = async (gameName: string) => {
    if (!player) return;
    try {
      await gamesApi.create({
        name: gameName,
        inGroup: player.inGroup,
        initiatedBy: player.id,
      });
    } catch (error) {
      console.error('handleCreateGame failed:', error);
    }
    setModal({ kind: 'none' });
  };

  // calls gamesApi.join via REST — backend emits lobby:update or game:started
  // depending on whether the game is now full
  const handleJoinGame = async (game: Game) => {
    if (!player) return;
    try {
      await gamesApi.join({
        gameId: game.id,
        playerId: player.id,
      });
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

  // layout. a greeting for the player, then a grid of buttons:
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

        <div className="mt-6">
          <PuzzleWindow />
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={handleFinishGame}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-6 rounded transition-colors"
          >
            Exit Games
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