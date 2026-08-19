'use client';

// A custom React hook that manages a WebSocket connection for a single player in a group lobby.
// It connects, listens for server events, and returns reactive state that the component can render.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Game } from '../types';
import { acquireSocket, releaseSocket } from '@/lib/socket';
import { useAuth } from '../context/auth-context';
import { shouldLeaveForReplacedPlayerToken } from '@/lib/apply-player-session-replaced';

interface GroupSocketState {
  pendingGames: Game[];
  startedGame: Game | null;
  isConnected: boolean;
  /** Bumps on every lobby:update so consumers can refetch side data (e.g. progression). */
  lobbyRevision: number;
}

export function useGroupSocket(groupId: number, playerId: number) {
  const { logoutPlayer } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<GroupSocketState>({
    pendingGames: [],
    startedGame: null,
    isConnected: false,
    lobbyRevision: 0,
  });

  useEffect(() => {
    if (groupId <= 0 || playerId <= 0) return;

    let active = true;
    const key = `group:${groupId}:${playerId}`;
    const socket = acquireSocket(key);

    const join = () => {
      if (!active) return;
      setState((s) => ({ ...s, isConnected: true }));
      socket.emit('joinGroup', { groupId, playerId });
    };

    const onDisconnect = () => {
      if (!active) return;
      setState((s) => ({ ...s, isConnected: false }));
    };

    const onLobbyUpdate = ({ games }: { games: Game[] }) => {
      if (!active) return;
      setState((s) => ({
        ...s,
        pendingGames: games.filter((g) => !g.isActive && !g.isFinished),
        lobbyRevision: s.lobbyRevision + 1,
      }));
    };

    const onGameStarted = ({ game }: { game: Game }) => {
      if (!active) return;
      if (game.players.includes(playerId)) {
        setState((s) => ({ ...s, startedGame: game }));
      }
    };

    const onSessionReplaced = (payload: { token: string }) => {
      if (!active) return;
      if (!shouldLeaveForReplacedPlayerToken(payload.token)) return;
      logoutPlayer();
      router.replace('/session_over');
    };

    socket.on('connect', join);
    socket.on('disconnect', onDisconnect);
    socket.on('lobby:update', onLobbyUpdate);
    socket.on('game:started', onGameStarted);
    socket.on('player:sessionReplaced', onSessionReplaced);

    if (socket.connected) join();

    return () => {
      active = false;
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
      socket.off('lobby:update', onLobbyUpdate);
      socket.off('game:started', onGameStarted);
      socket.off('player:sessionReplaced', onSessionReplaced);
      releaseSocket(key);
    };
  }, [groupId, playerId, logoutPlayer, router]);

  return state;
}
