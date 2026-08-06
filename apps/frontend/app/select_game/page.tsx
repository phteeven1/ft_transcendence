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
player A sees this and clicks 'Start Word Building', which opens ForceStartModal
player A confirms, handleForceStart starts the game via REST
backend emits game:started to all players in the group once game goes active
both players are redirected to the matching game page
Also, they are removed from all other pending games that they have joined.
If all players leave a game before it starts, it is destroyed
*/

import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { gamesApi, playersApi } from '@/lib/api';
import {
  clearPlayerSession,
  getPlayerSession,
  isSessionExpired,
} from '@/lib/player-session';
import { restorePlayerFromSession } from '@/lib/restore-player-session';
import { Game } from '../types';
import InitiateGameModal from './_components/initiate-game-modal';
import JoinGameModal from './_components/join-game-modal';
import PendingGameButton from './_components/pending-game-button';
import { useSessionGuard } from '../hooks/use-session-guard';
import { usePlayerSessionExitGuard } from '../hooks/use-player-session-exit-guard';
import ForceStartModal from './_components/force-start-modal';
import { useGroupSocket } from '../hooks/use-group-socket';
import { useLobbyProgression } from '../hooks/use-lobby-progression';
import PuzzleWindow from './_components/puzzle-window';
import ProgressionPanel from './_components/progression/progression-panel';
import { PageShell } from '../components/ui/page-shell';
import { Button } from '../components/ui/button';

function getStartedGameRoute(
  gameName: string,
): '/play_game' | '/word_building_scaffold' | '/word_soup_scaffold' {
  const normalizedName = gameName.trim().toLowerCase();

  if (normalizedName === 'word building') {
    return '/word_building_scaffold';
  }

  if (normalizedName === 'word soup') {
    return '/word_soup_scaffold';
  }

  return '/play_game';
}

// modal state. none = no modal is open. initiate = 'Initiate Game' modal is open,
// join = 'Join Game' modal is open
type ModalState =
  | { kind: 'none' }
  | { kind: 'initiate'; gameName: string }
  | { kind: 'join'; game: Game }
  | { kind: 'forceStart'; game: Game };

// manages list of pending games and modal states via WebSocket
// pendingGames is kept in sync by lobby:update events pushed from the backend
// manages list of pending games and modal states via WebSocket
// pendingGames is kept in sync by lobby:update events pushed from the backend
// modal tracks modal state
export default function SelectGame() {
  const t = useTranslations('games.lobby');
  const { player, logoutPlayer, loginAsPlayer, setSessionExpiresAt } = useAuth();
  const router = useRouter();
  useSessionGuard();

  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const [sessionReady, setSessionReady] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  const { markIntentionalExit } = usePlayerSessionExitGuard({
    enabled: sessionReady && player !== null,
    playerId: player?.id ?? 0,
    onIntentionalExit: () => {
      clearPlayerSession();
      logoutPlayer();
    },
  });

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const stored = getPlayerSession();

      if (!player) {
        const restored = await restorePlayerFromSession({
          loginAsPlayer,
          setSessionExpiresAt,
        });

        if (cancelled) return;

        if (!restored) {
          setBootstrapping(false);
          router.push('/');
          return;
        }

        setSessionReady(true);
        setBootstrapping(false);
        return;
      }

      if (
        !stored ||
        stored.playerId !== player.id ||
        isSessionExpired(stored.expiresAt)
      ) {
        clearPlayerSession();
        logoutPlayer();
        setBootstrapping(false);
        router.push('/');
        return;
      }

      try {
        const result = await playersApi.validateSession({
          playerId: player.id,
          token: stored.token,
        });
        if (cancelled) return;
        setSessionExpiresAt(new Date(result.expiresAt).getTime());
        setSessionReady(true);
        setBootstrapping(false);
      } catch {
        if (cancelled) return;
        clearPlayerSession();
        logoutPlayer();
        setBootstrapping(false);
        router.push('/');
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [player, loginAsPlayer, logoutPlayer, router, setSessionExpiresAt]);

  // connect to the group's WebSocket room
  // pendingGames is updated automatically when the backend emits lobby:update
  // startedGame is set when the backend emits game:started for a game this player is in
  const { pendingGames, startedGame, lobbyRevision } = useGroupSocket(
    player?.inGroup ?? 0,
    player?.id ?? 0,
  );

  const progression = useLobbyProgression({
    groupId: player?.inGroup ?? 0,
    playerId: player?.id ?? 0,
    enabled: sessionReady && Boolean(player),
    refreshToken: lobbyRevision,
  });

  // navigate to the matching game page as soon as the backend tells us our game has started
  useEffect(() => {
    if (startedGame && player) {
      const route = getStartedGameRoute(startedGame.name);
      router.push(`${route}?gameId=${startedGame.id}&playerId=${player.id}`);
    }
  }, [startedGame, player, router]);

  const hasInitiated = (gameName: string): boolean =>
    pendingGames.some(
      (g) => g.name === gameName && g.initiatedBy === player?.id,
    );

  // calls gamesApi.create via REST — UI does not update directly;
  // the backend emits lobby:update which triggers the WebSocket state update
  const handleCreateGame = async (gameName: string) => {
    if (!player) return;
    try {
        await gamesApi.create({  // backend will handle returning updated game - no need for assignment (i.e. "const newGame =")
        name: gameName,
        inGroup: player.inGroup,
        initiatedBy: player.id,
      });
    } catch (error) {
      console.error('handleCreateGame failed:', error);
    }
    setModal({ kind: 'none' });
  };

  // calls postJoinGame to add current player to selected game
  // if the game then becomes active, it redirects to the matching game page
  // otherwise, updates pendingGames list
  const handleJoinGame = async (game: Game) => {
    if (!player) return;
    try {
        await gamesApi.join({ // backend will handle returning updated game - no need for assignment (i.e. "const updatedGame =")
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

  const handleFinishGame = async () => {
    if (!player) return;
    markIntentionalExit();
    try {
      await playersApi.clearSession(player.id);
    } catch (error) {
      console.error('handleFinishGame clearSession failed:', error);
    }
    logoutPlayer();
    router.push('/register');
  };

  if (!player || !sessionReady) {
    if (bootstrapping) return null;
    return null;
  }

  // layout. a greeting for the player, then a grid of buttons:
  // 'Word Building' and 'Word Soup' buttons open initiateGameModal to create new game
  // one pending game button for each game in pendingGames
  // clicking button opens JoinGameModal, if player isn't already in game
  // then a 'Exit Games' button to log out
  return (
    <>
      <PageShell>
        <h1 className="font-heading text-2xl font-bold mb-2 text-center text-foreground">
          {t('greeting', { name: player.name })}
        </h1>
        <p className="text-sm text-muted-foreground mb-8 text-center">
          {t('subtitle')}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Button
            variant="accent"
            size="lg"
            fullWidth
            className="clay-tile min-h-[5rem] flex flex-col items-center justify-center gap-1"
            onClick={() =>
              setModal({ kind: 'initiate', gameName: 'Word Building' })
            }
            disabled={hasInitiated('Word Building')}
          >
            <span className="text-lg font-bold">{t('wordBuilding')}</span>
            <span className="text-xs font-normal opacity-90">
              {t('createNewGame')}
            </span>
          </Button>

          <Button
            variant="accent"
            size="lg"
            fullWidth
            className="clay-tile min-h-[5rem] flex flex-col items-center justify-center gap-1"
            onClick={() =>
              setModal({ kind: 'initiate', gameName: 'Word Soup' })
            }
            disabled={hasInitiated('Word Soup')}
          >
            <span className="text-lg font-bold">{t('wordSoup')}</span>
            <span className="text-xs font-normal opacity-90">
              {t('createNewGame')}
            </span>
          </Button>

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

        <div className="mt-6">
          <ProgressionPanel
            localPlayerId={player.id}
            leaderboard={progression.leaderboard}
            myStats={progression.myStats}
            myProgression={progression.myProgression}
            loading={progression.loading}
            error={progression.error}
            equipping={progression.equipping}
            equipError={progression.equipError}
            onEquipAvatar={(tier) => {
              void progression.equipAvatar(tier);
            }}
          />
        </div>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={handleFinishGame}>
            {t('exitGames')}
          </Button>
        </div>
      </PageShell>

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
    </>
  );
}
