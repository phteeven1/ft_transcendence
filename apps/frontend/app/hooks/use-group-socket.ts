'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Game } from '../types';

interface GroupSocketState {
  pendingGames: Game[];
  startedGame: Game | null;
  isConnected: boolean;
}

export function useGroupSocket(groupId: number, playerId: number) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<GroupSocketState>({
    pendingGames: [],
    startedGame: null,
    isConnected: false,
  });

  useEffect(() => {
    if (!groupId || !playerId) return;

    let active = true;

    const socket = io(
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
      {
        transports: ['websocket'],
      },
    );
    socketRef.current = socket;

    socket.on('connect', () => {
      if (!active) return;
      setState((s) => ({ ...s, isConnected: true }));
      socket.emit('joinGroup', { groupId, playerId });
    });

    socket.on('disconnect', () => {
      if (!active) return;
      setState((s) => ({ ...s, isConnected: false }));
    });

    socket.on('lobby:update', ({ games }: { games: Game[] }) => {
      if (!active) return;
      setState((s) => ({
        ...s,
        pendingGames: games.filter((g) => !g.isActive && !g.isFinished),
      }));
    });

    socket.on('game:started', ({ game }: { game: Game }) => {
      if (!active) return;
      if (game.players.includes(playerId)) {
        setState((s) => ({ ...s, startedGame: game }));
      }
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [groupId, playerId]);

  return { ...state, socket: socketRef.current };
}
