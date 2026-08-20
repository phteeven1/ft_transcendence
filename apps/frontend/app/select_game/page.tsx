'use client';

/*
Lobby: REST for create / join / start; Socket.IO lobby:update and game:started
drive shared UI. Failures stay in the modal.
*/

import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { gamesApi, playersApi } from '@/lib/api';
import { translateAvatarTier } from '@/lib/i18n/progression-labels';
import {
  clearPlayerSession,
  getPlayerSession,
  isSessionExpired,
} from '@/lib/player-session';
import { restorePlayerFromSession } from '@/lib/restore-player-session';
import { consumePendingAvatarUnlock } from '@/lib/avatar-unlock';
import { Game } from '../types';
import InitiateGameModal from './_components/initiate-game-modal';
import JoinGameModal from './_components/join-game-modal';
import PendingGameButton from './_components/pending-game-button';
import { useSessionGuard } from '../hooks/use-session-guard';
import ForceStartModal from './_components/force-start-modal';
import { useGroupSocket } from '../hooks/use-group-socket';
import { useLobbyProgression } from '../hooks/use-lobby-progression';
import PuzzleWindow from './_components/puzzle-window';
import ProgressionPanel from './_components/progression/progression-panel';
import { AvatarTierThumb } from './_components/progression/avatar-tier-thumb';
import { Button } from '../components/ui/button';
import { Icon } from '../components/ui';

function getStartedGameRoute(
  gameName: string,
): '/word_building' | '/word_soup' | null {
  const normalizedName = gameName.trim().toLowerCase();

  if (normalizedName === 'word building') {
    return '/word_building';
  }

  if (normalizedName === 'word soup') {
    return '/word_soup';
  }

  return null;
}

// modal state. none = no modal is open. initiate = 'Initiate Game' modal is open,
// join = 'Join Game' modal is open
type ModalState =
  | { kind: 'none' }
  | { kind: 'initiate'; gameName: string }
  | { kind: 'join'; game: Game }
  | { kind: 'forceStart'; game: Game };

// pendingGames is kept in sync by lobby:update events pushed from the backend
export default function SelectGame() {
  const t = useTranslations('games.lobby');
  const tProgression = useTranslations('games.lobby.progression');
  const { player, user, authReady, logoutPlayer, loginAsPlayer, setSessionExpiresAt } = useAuth();
  const router = useRouter();
  useSessionGuard();

  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const [modalError, setModalError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [unlockToastTier, setUnlockToastTier] = useState<number | null>(null);
  const mountedPlayerIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    const bootstrap = async () => {
      const stored = getPlayerSession();
      const hadPlayerOnThisPage =
        mountedPlayerIdRef.current !== undefined &&
        mountedPlayerIdRef.current !== null;
      mountedPlayerIdRef.current = player?.id ?? null;

      if (!player) {
        if (hadPlayerOnThisPage) {
          setBootstrapping(false);
          setSessionReady(false);
          router.replace(user ? '/dashboard' : '/');
          return;
        }
        const restored = await restorePlayerFromSession({
          loginAsPlayer,
          setSessionExpiresAt,
        });

        if (cancelled) return;

        if (!restored) {
          setBootstrapping(false);
          router.push(user ? '/dashboard' : '/');
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
        router.push(user ? '/dashboard' : '/');
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
        router.push(user ? '/dashboard' : '/');
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [authReady, player, user, loginAsPlayer, logoutPlayer, router, setSessionExpiresAt]);

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

  // One-shot unlock toast after returning from a game (e.g. Word Building).
  useEffect(() => {
    if (!sessionReady || !player) return;
    const tier = consumePendingAvatarUnlock(player.id);
    if (tier === null) return;
    const frameId = requestAnimationFrame(() => {
      setUnlockToastTier(tier);
    });
    return () => cancelAnimationFrame(frameId);
  }, [sessionReady, player]);

  // navigate to the matching game page as soon as the backend tells us our game has started
  useEffect(() => {
    if (!startedGame || !player) return;
    if (startedGame.isFinished || !startedGame.isActive) return;
    const route = getStartedGameRoute(startedGame.name);
    if (!route) return;
    router.push(`${route}?gameId=${startedGame.id}&playerId=${player.id}`);
  }, [startedGame, player, router]);

  const hasInitiated = (gameName: string): boolean =>
    pendingGames.some(
      (g) => g.name === gameName && g.initiatedBy === player?.id,
    );

  // calls gamesApi.create via REST — UI does not update directly;
  // the backend emits lobby:update which triggers the WebSocket state update
  const handleCreateGame = async (gameName: string) => {
    if (!player) return;
    setModalError('');
    try {
        await gamesApi.create({
        name: gameName,
        inGroup: player.inGroup,
        initiatedBy: player.id,
      });
      setModal({ kind: 'none' });
    } catch {
      setModalError(t('actionFailed'));
    }
  };

  const handleJoinGame = async (game: Game) => {
    if (!player) return;
    setModalError('');
    try {
        await gamesApi.join({
        gameId: game.id,
        playerId: player.id,
      });
      setModal({ kind: 'none' });
    } catch {
      setModalError(t('actionFailed'));
    }
  };

  const handleForceStart = async (game: Game) => {
    setModalError('');
    try {
      await gamesApi.start({ gameId: game.id });
      setModal({ kind: 'none' });
    } catch {
      setModalError(t('actionFailed'));
    }
  };

  if (!player || !sessionReady) {
    if (bootstrapping) return null;
    return null;
  }

  // layout. a greeting for the player, then a grid of buttons:
  // 'Word Building' and 'Word Soup' buttons open initiateGameModal to create new game
  // one pending game button for each game in pendingGames
  // clicking button opens JoinGameModal, if player isn't already in game
  return (
    <>
      <div className="page-content">
        {unlockToastTier !== null && (
          <div
            className="mb-4 flex items-center gap-3 rounded-2xl border border-teal-300/60 bg-teal-50 px-4 py-3 text-teal-950 shadow-sm"
            role="status"
            aria-live="polite"
          >
            <AvatarTierThumb
              tier={unlockToastTier}
              animal={progression.myProgression?.avatarAnimal ?? 0}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{tProgression('unlockToastTitle')}</p>
              <p className="text-xs text-teal-900/80">
                {tProgression('unlockToastBody', {
                  label: translateAvatarTier(tProgression, unlockToastTier),
                })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUnlockToastTier(null)}
            >
              {tProgression('unlockToastDismiss')}
            </Button>
          </div>
        )}

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
            onClick={() => {
              setModalError('');
              setModal({ kind: 'initiate', gameName: 'Word Building' });
            }}
            disabled={hasInitiated('Word Building')}
          >
            <Icon name="puzzle" size={28} />
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
            onClick={() => {
              setModalError('');
              setModal({ kind: 'initiate', gameName: 'Word Soup' });
            }}
            disabled={hasInitiated('Word Soup')}
          >
            <Icon name="game" size={28} />
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
                  setModalError('');
                  setModal({ kind: 'join', game });
                }
              }}
              onForceStart={() => {
                setModalError('');
                setModal({ kind: 'forceStart', game });
              }}
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
            onEquipAnimal={(animal) => {
              void progression.equipAnimal(animal);
            }}
          />
        </div>
      </div>

      {modal.kind === 'initiate' && (
        <InitiateGameModal
          gameName={modal.gameName}
          error={modalError}
          onCancel={() => {
            setModalError('');
            setModal({ kind: 'none' });
          }}
          onCreate={() => handleCreateGame(modal.gameName)}
        />
      )}

      {modal.kind === 'join' && (
        <JoinGameModal
          game={modal.game}
          error={modalError}
          onCancel={() => {
            setModalError('');
            setModal({ kind: 'none' });
          }}
          onJoin={() => handleJoinGame(modal.game)}
        />
      )}

      {modal.kind === 'forceStart' && (
        <ForceStartModal
          game={modal.game}
          error={modalError}
          onCancel={() => {
            setModalError('');
            setModal({ kind: 'none' });
          }}
          onConfirm={() => handleForceStart(modal.game)}
        />
      )}
    </>
  );
}
