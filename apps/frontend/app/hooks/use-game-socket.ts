'use client';

/*
  Custom hook for in-game WebSocket communication.
  Connects to the game room and handles shared events plus game-specific payloads
  for word building and word soup.
  Follows the same pattern as useGroupSocket.
*/

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { IGameStatePayload, IPlaceLetterDto, ICellLocksPayload, ILockCellDto } from '@/lib/api/games/word-building.types';
import type { WordSoup} from '@/lib/api/games/word-soup/types';

interface GameSocketState {
  gameFinished: boolean;
  isConnected: boolean;
  gameState: IGameStatePayload | null;
  cellLocks: ICellLocksPayload | null;
  wordGuessed: WordSoup.WordGuessedDto | null;
  wordGuessedSeq: number;
  guessResult: { success: boolean; message: string; frozen?: boolean; frozenUntil?: number } | null;
  serverState: WordSoup.GameStateDto | null;
  frozenPlayers: Record<number, number>;
  freezeNotice: WordSoup.FreezeNoticeDto | null;
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
    gameFinished: false,
    isConnected: false,
    gameState: null,
    cellLocks: null,
    wordGuessed: null,
    wordGuessedSeq: 0,
    guessResult: null,
    serverState: null,
    frozenPlayers: {},
    freezeNotice: null,
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

    // word_building: flat payload. word_soup: { state } wrapper.
    socket.on('game:state', (payload: IGameStatePayload | { state: WordSoup.GameStateDto }) => {
      if (!active) return;
      if ('state' in payload) {
        setState((s) => ({
          ...s,
          serverState: payload.state,
          frozenPlayers: payload.state.frozenPlayers ?? s.frozenPlayers,
        }));
      } else {
        setState((s) => ({ ...s, gameState: payload }));
      }
    });

    // word_building: Backend broadcasts updated cell lock map after any reservation change.
    socket.on('cell:locks', (payload: ICellLocksPayload) => {
      if (!active) return;
      setState((s) => ({ ...s, cellLocks: payload }));
    });

    // word_soup: Backend broadcasts this when a player guesses a word.
    socket.on('game:wordGuessed', (payload: WordSoup.WordGuessedDto) => {
      if (!active) return;
      setState((s) => ({
        ...s,
        wordGuessed: payload,
        wordGuessedSeq: s.wordGuessedSeq + 1,
        serverState: payload.state ?? s.serverState,
        frozenPlayers: payload.state?.frozenPlayers ?? s.frozenPlayers,
      }));
    });

    // word_soup: Backend responds to the guessing player with success/failure.
    socket.on('game:guessResult', (payload: { success: boolean; message: string; frozen?: boolean; frozenUntil?: number }) => {
      if (!active) return;
      setState((s) => {
        const frozenPlayers = { ...s.frozenPlayers };
        if (payload.frozen && payload.frozenUntil) {
          frozenPlayers[playerId] = payload.frozenUntil;
        }
        return { ...s, guessResult: payload, frozenPlayers };
      });
    });

    socket.on('game:playerFrozen', (payload: { playerId: number; playerName: string; frozenUntil: number; durationSeconds: number; message: string }) => {
      if (!active) return;
      setState((s) => ({
        ...s,
        frozenPlayers: { ...s.frozenPlayers, [payload.playerId]: payload.frozenUntil },
        freezeNotice: {
          playerId: payload.playerId,
          playerName: payload.playerName,
          message: `${payload.playerName} is frozen for ${payload.durationSeconds}s! 🧊`,
        },
      }));
    });

    socket.on('game:playerUnfrozen', (payload: { playerId: number; playerName: string; message: string }) => {
      if (!active) return;
      setState((s) => {
        const frozenPlayers = { ...s.frozenPlayers };
        delete frozenPlayers[payload.playerId];
        return {
          ...s,
          frozenPlayers,
          freezeNotice: {
            playerId: payload.playerId,
            playerName: payload.playerName,
            message: payload.message,
          },
        };
      });
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

  const emitSubmitGuess = (selection: Array<{ row: number; col: number }>) => {
    socketRef.current?.emit('guess:submit', { gameId, playerId, selection });
  };

  return {
    ...state,
    emitPlaceLetter,
    emitCellLock,
    emitCellUnlock,
    emitSubmitGuess,
  };
}
