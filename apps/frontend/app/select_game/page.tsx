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
import { Game } from '../types';
import InitiateGameModal from './_components/initiate-game-modal';
import JoinGameModal from './_components/join-game-modal';
import PendingGameButton from './_components/pending-game-button';
import { useSessionGuard } from '../hooks/use-session-guard';

// modal state. none = no modal is open. initiate = 'Initiate Game' modal is open,
// join = 'Join Game' modal is open
type ModalState =
  | { kind: 'none' }
  | { kind: 'initiate'; gameName: string }
  | { kind: 'join'; game: Game };


// POSTs to /games/create to create new game, with the following:
// name = name of the game, e.g. "Word Building"
// inGroup = groupId the game belongs to
// initiatedBy = playerId of the player that initiated the game
// waitingFor = number of players required to start
// fucntion returns a new Game object, or throws an error  
async function postCreateGame(
  name: string,
  inGroup: number,
  initiatedBy: number,
  waitingFor: number,
): Promise<Game> {
  const res = await fetch('http://localhost:4000/games/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, inGroup, initiatedBy, waitingFor }),
  });
  if (!res.ok) throw new Error(`Failed to create game: ${res.status}`);
  return res.json();
}

// POSTs to /games/join ta add player to existing game, with the following:
// gameId = the id of the game to join
// playerId = the id of the joining player
// function returns an updated Game object, or throws an error
async function postJoinGame(gameId: number, playerId: number): Promise<Game | null> {
  const res = await fetch('http://localhost:4000/games/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, playerId }),
  });
  if (!res.ok) throw new Error(`Failed to join game: ${res.status}`);
  return res.json();
}

// manages list of pending games and modal states
// pendingGames stores list of pending not yet active games
// modal tracks modal state
export default function SelectGame() {
  const { player, logoutPlayer } = useAuth();
  const router = useRouter();
  useSessionGuard();

  const [pendingGames, setPendingGames] = useState<Game[]>([]);
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });

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
      const allGroupGames: Game[] = await fetch(
        `http://localhost:4000/games/group/${player.inGroup}`,
      ).then((r) => r.json());

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
  const handleCreateGame = async (gameName: string, waitingFor: number) => {
    if (!player) return;
    try {
      const newGame = await postCreateGame(gameName, player.inGroup, player.id, waitingFor);
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
      const updatedGame = await postJoinGame(game.id, player.id);
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
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-4 px-4 rounded transition-colors"
          >
            New Word Building
          </button>

          <button
            onClick={() => setModal({ kind: 'initiate', gameName: 'Word Soup' })}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-4 px-4 rounded transition-colors"
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
          onCreate={(waitingFor) => handleCreateGame(modal.gameName, waitingFor)}
        />
      )}

      {modal.kind === 'join' && (
        <JoinGameModal
          game={modal.game}
          onCancel={() => setModal({ kind: 'none' })}
          onJoin={() => handleJoinGame(modal.game)}
        />
      )}
    </div>
  );
}
