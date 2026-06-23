'use client';

/*
  Custom hook for in-game WebSocket communication.
  Connects to the game room and handles tile reveal and game-finished events.
  Follows the same pattern as useGroupSocket.
*/

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type RevealedTile = {
  row: number;
  col: number;
  char: string;
};

interface GameSocketState {
  revealedTile: RevealedTile | null;
  gameFinished: boolean;
  isConnected: boolean;
}

export function useGameSocket(gameId: number, playerId: number) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<GameSocketState>({
    revealedTile: null,
    gameFinished: false,
    isConnected: false,
  });

  useEffect(() => {
    if (!gameId || !playerId) return;

    let active = true;

    const socket = io(
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
      { transports: ['websocket'] },
    );
    socketRef.current = socket;

    socket.on('connect', () => {
      if (!active) return;
      setState((s) => ({ ...s, isConnected: true }));
      socket.emit('joinGame', { gameId, playerId });
    });

    socket.on('disconnect', () => {
      if (!active) return;
      setState((s) => ({ ...s, isConnected: false }));
    });

    // Backend broadcasts this when any player clicks a tile.
    // The orchestrator copies trueCourt[row][col] into visibleCourt[row][col].
    socket.on('game:tileRevealed', (tile: RevealedTile) => {
      if (!active) return;
      setState((s) => ({ ...s, revealedTile: tile }));
    });

    // Backend broadcasts this when the game is marked finished.
    socket.on('game:finished', () => {
      if (!active) return;
      setState((s) => ({ ...s, gameFinished: true }));
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [gameId, playerId]);

  const emitTileClick = (row: number, col: number) => {
    socketRef.current?.emit('tile:click', { gameId, playerId, row, col });
  };

  return { ...state, emitTileClick };
}
