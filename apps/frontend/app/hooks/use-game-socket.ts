'use client';

/*
  Custom hook for in-game WebSocket communication.
  Connects to the game room and handles tile reveal, game-finished,
  and the new game:state / placeLetter events for word building.
  Follows the same pattern as useGroupSocket.
*/

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { IGameStatePayload, IPlaceLetterDto, ICellLocksPayload, ILockCellDto } from '@/lib/api/games/word-building.types';

export type RevealedTile = {
  row: number;
  col: number;
  char: string;
};

interface GameSocketState {
  revealedTile: RevealedTile | null;
  gameFinished: boolean;
  isConnected: boolean;
  gameState: IGameStatePayload | null;
  cellLocks: ICellLocksPayload | null;
}

/**
 * Connects the active player to the game socket room and exposes the live websocket state.
 * The hook centralizes join, state, and finish handling for the word-building gameplay flow.
 *
 * @param gameId The game room to join.
 * @param playerId The current player using the socket.
 * @returns Connection state, the latest game payload, and emit helpers for tile clicks and letters.
 */
export function useGameSocket(gameId: number, playerId: number) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<GameSocketState>({
    revealedTile: null,
    gameFinished: false,
    isConnected: false,
    gameState: null,
    cellLocks: null,
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

    // word_soup: Backend broadcasts this when any player clicks a tile.
    socket.on('game:tileRevealed', (tile: RevealedTile) => {
      if (!active) return;
      setState((s) => ({ ...s, revealedTile: tile }));
    });

    // word_building: Backend broadcasts full visible court after every letter placement.
    socket.on('game:state', (payload: IGameStatePayload) => {
      if (!active) return;
      setState((s) => ({ ...s, gameState: payload }));
    });

    // word_building: Backend broadcasts updated cell lock map after any reservation change.
    socket.on('cell:locks', (payload: ICellLocksPayload) => {
      if (!active) return;
      setState((s) => ({ ...s, cellLocks: payload }));
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

  /**
   * Sends a tile-click event to the server so all clients can update their revealed-tile state.
   *
   * @param row Board row of the clicked tile.
   * @param col Board column of the clicked tile.
   */
  const emitTileClick = (row: number, col: number) => {
    socketRef.current?.emit('tile:click', { gameId, playerId, row, col });
  };

  /**
   * Sends a letter placement to the server and lets the backend broadcast the authoritative state.
   *
   * @param dto Placement payload containing the game, player, cell, and letter.
   */
  const emitPlaceLetter = useCallback((dto: IPlaceLetterDto) => {
    socketRef.current?.emit('placeLetter', dto);
  }, []);

  /**
   * Reserves a cell for the current player so others see the "is playing" indicator.
   *
   * @param dto Lock request with game, player, name, and cell coordinates.
   */
  const emitCellLock = useCallback((dto: ILockCellDto) => {
    socketRef.current?.emit('cell:lock', dto);
  }, []);

  /**
   * Releases a previously acquired cell reservation.
   *
   * @param row Cell row to release.
   * @param col Cell column to release.
   */
  const emitCellUnlock = useCallback((row: number, col: number) => {
    socketRef.current?.emit('cell:unlock', { gameId, playerId, row, col });
  }, [gameId, playerId]);

  return { ...state, emitTileClick, emitPlaceLetter, emitCellLock, emitCellUnlock };
}

