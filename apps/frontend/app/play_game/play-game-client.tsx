'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { gamesApi, playersApi } from '@/lib/api';
import { Game, Player } from '../types';
import { useSessionGuard } from '../hooks/use-session-guard';
import { useAuth } from '../context/auth-context';
import {
  clearPlayerSession,
  getPlayerSession,
  isSessionExpired,
} from '@/lib/player-session';
import { restorePlayerFromSession } from '@/lib/restore-player-session';
import AbandonPlayModal from './_components/abandon-play-modal';
import { PageShell } from '../components/ui/page-shell';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

async function loadPlayersByIds(playerIds: number[]): Promise<Player[]> {
  const results = await Promise.all(
    playerIds.map((id) => playersApi.getById(id).catch(() => null)),
  );
  return results.filter((p): p is Player => p !== null);
}

export default function PlayGameClient() {
  const tInfo = useTranslations('games.info');
  const tControls = useTranslations('games.controls');
  const tCommon = useTranslations('common');
  const tLobby = useTranslations('games.lobby');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { logoutPlayer, loginAsPlayer, setSessionExpiresAt } = useAuth();
  useSessionGuard();

  const gameId = Number(searchParams.get('gameId'));
  const playerId = Number(searchParams.get('playerId'));

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);

  useEffect(() => {
    if (!gameId || !playerId) {
      router.push('/');
      return;
    }
    const load = async () => {
      const loadedGame = await gamesApi.getById({ gameId }).catch(() => null);
      if (!loadedGame || loadedGame.isFinished) {
        const stored = getPlayerSession();
        if (stored && !isSessionExpired(stored.expiresAt)) {
          await restorePlayerFromSession({ loginAsPlayer, setSessionExpiresAt });
          router.replace('/select_game');
          return;
        }
        router.replace('/session_over');
        return;
      }
      setGame(loadedGame);
      const loadedPlayers = await loadPlayersByIds(loadedGame.players);
      setPlayers(loadedPlayers);
      setLoading(false);
    };
    void load();
  }, [gameId, playerId, router, loginAsPlayer, setSessionExpiresAt]);

  useEffect(() => {
    if (!gameId) return;
    const interval = setInterval(async () => {
      const updatedGame = await gamesApi.getById({ gameId }).catch(() => null);
      if (!updatedGame || updatedGame.isFinished) {
        router.push('/select_game');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [gameId, router]);

  const abandonPlay = async () => {
    setIsAbandoning(true);
    try {
      await gamesApi.abandonPlay({ gameId, playerId });
    } catch (error) {
      console.error('abandonPlay failed:', error);
    } finally {
      clearPlayerSession();
      logoutPlayer();
      setShowAbandonModal(false);
      router.push('/session_over');
    }
  };

  const handleLeaveClick = () => {
    setShowAbandonModal(true);
  };

  const handleGameOver = async () => {
    await gamesApi.finish({ gameId });
    router.push('/select_game');
  };

  if (loading || !game) {
    return (
      <PageShell centered narrow>
        <p className="text-muted-foreground">{tCommon('loadingGame')}</p>
      </PageShell>
    );
  }

  const initiatorPlayer = players.find((p) => p.id === game.initiatedBy);
  const startedTime = game.startedTime ? new Date(game.startedTime) : null;
  const normalizedGameName = game.name.trim().toLowerCase();
  const displayGameName =
    normalizedGameName === 'word building'
      ? tLobby('wordBuilding')
      : normalizedGameName === 'word soup'
        ? tLobby('wordSoup')
        : game.name;

  return (
    <>
      <PageShell narrow>
        <h1 className="font-heading text-2xl font-bold mb-1 text-center text-foreground">{displayGameName}</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          {tInfo('gameNumber', { id: game.id })}
        </p>

        <Card className="clay-panel space-y-3 mb-8">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {tInfo('started')}
            </span>
            <p className="text-foreground font-medium">
              {startedTime ? startedTime.toLocaleTimeString() : tCommon('emDash')}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {tInfo('initiatedBy')}
            </span>
            <p className="text-foreground font-medium">
              {initiatorPlayer
                ? initiatorPlayer.name
                : tCommon('playerNumber', { id: game.initiatedBy })}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {tInfo('players')}
            </span>
            <ul className="mt-1 space-y-1">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="text-foreground font-medium flex items-center gap-2"
                >
                  {p.name}
                  {p.id === playerId && (
                    <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded">
                      {tCommon('you')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="space-y-3">
          <Button variant="primary" fullWidth onClick={handleLeaveClick}>
            {tControls('leaveGame')}
          </Button>
          <Button variant="destructive" fullWidth onClick={handleGameOver}>
            {tControls('gameOver')}
          </Button>
        </div>
      </PageShell>

      {showAbandonModal && (
        <AbandonPlayModal
          onStay={() => setShowAbandonModal(false)}
          onLeave={abandonPlay}
          isLeaving={isAbandoning}
        />
      )}
    </>
  );
}
