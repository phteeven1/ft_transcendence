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
import type { 
  WordSoupWordGuessedDto,
  WordSoupGuessResultDto,
  WordSoupDto,
  WordSoupFreezeNoticeDto,
} from '@/lib/api/games/word-soup/types';
import type { GameFinishOutcomeDto } from '@/lib/api/games/types';

interface GameSocketState {
  gameFinished: boolean;
  finishOutcome: GameFinishOutcomeDto | null;
  isConnected: boolean;
  gameState: IGameStatePayload | null;
  cellLocks: ICellLocksPayload | null;
  wordGuessed: WordSoupWordGuessedDto | null;
  wordGuessedSeq: number;
  guessResult: WordSoupGuessResultDto | null;
  serverState: WordSoupDto | null;
  frozenPlayers: Record<number, number>;
  freezeNotice: WordSoupFreezeNoticeDto | null;
  leftPlayers: Record<number, string>;
  playerLeftNotice: { playerId: number; playerName: string } | null;
  playerStreaks: Record<number, number>;
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
    finishOutcome: null,
    isConnected: false,
    gameState: null,
    cellLocks: null,
    wordGuessed: null,
    wordGuessedSeq: 0,
    guessResult: null,
    serverState: null,
    frozenPlayers: {},
    freezeNotice: null,
    leftPlayers: {},
    playerLeftNotice: null,
    playerStreaks: {},
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
    socket.on('game:state', (payload: IGameStatePayload | { state: WordSoupDto }) => {
      if (!active) return;
      if ('state' in payload) {
        setState((s) => ({
          ...s,
          serverState: payload.state,
          frozenPlayers: payload.state.frozenPlayers ?? s.frozenPlayers,
          leftPlayers: payload.state.leftPlayers ?? s.leftPlayers,
          playerStreaks: payload.state.playerStreaks ?? s.playerStreaks,
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
    socket.on('game:wordGuessed', (payload: WordSoupWordGuessedDto) => {
      if (!active) return;
      setState((s) => ({
        ...s,
        wordGuessed: payload,
        wordGuessedSeq: s.wordGuessedSeq + 1,
        serverState: payload.state ?? s.serverState,
        frozenPlayers: payload.state?.frozenPlayers ?? s.frozenPlayers,
        leftPlayers: payload.state?.leftPlayers ?? s.leftPlayers,
        playerStreaks: payload.state?.playerStreaks ?? s.playerStreaks,
      }));
    });

    // word_soup: Backend responds to the guessing player with success/failure.
    socket.on('game:guessResult', (payload: WordSoupGuessResultDto) => {
      if (!active) return;
      setState((s) => {
        const frozenPlayers = { ...s.frozenPlayers };
        const playerStreaks = { ...s.playerStreaks };
        if (payload.frozen && payload.frozenUntil) {
          frozenPlayers[playerId] = payload.frozenUntil;
          // Wrong guess ends the streak immediately for the local player.
          playerStreaks[playerId] = 0;
        }
        return { ...s, guessResult: payload, frozenPlayers, playerStreaks };
      });
    });

    socket.on('game:playerFrozen', (payload: {
      playerId: number;
      playerName: string;
      frozenUntil: number;
      durationSeconds: number;
      playerStreaks?: Record<number, number>;
      kind?: 'freeze';
    }) => {
      if (!active) return;
      setState((s) => ({
        ...s,
        frozenPlayers: { ...s.frozenPlayers, [payload.playerId]: payload.frozenUntil },
        playerStreaks: {
          ...(payload.playerStreaks ?? s.playerStreaks),
          // Always clear the frozen player's streak even if meta is partial.
          [payload.playerId]: 0,
        },
        freezeNotice: {
          playerId: payload.playerId,
          playerName: payload.playerName,
          message: `${payload.playerName} is frozen for ${payload.durationSeconds}s! 🧊`,
          kind: 'freeze',
        },
      }));
    });

    socket.on('game:playerUnfrozen', (payload: {
      playerId: number;
      playerName: string;
      message: string;
      kind?: 'unfreeze';
      playerStreaks?: Record<number, number>;
    }) => {
      if (!active) return;
      setState((s) => {
        const frozenPlayers = { ...s.frozenPlayers };
        delete frozenPlayers[payload.playerId];
        return {
          ...s,
          frozenPlayers,
          playerStreaks: {
            ...(payload.playerStreaks ?? s.playerStreaks),
            // Streak was broken by the freeze — keep it cleared after thaw.
            [payload.playerId]: 0,
          },
          freezeNotice: {
            playerId: payload.playerId,
            playerName: payload.playerName,
            message: payload.message,
            kind: 'unfreeze',
          },
        };
      });
    });

    socket.on('game:playerLeft', (payload: {
      playerId: number;
      playerName: string;
      leftPlayers?: Record<number, string>;
      playerStreaks?: Record<number, number>;
      state?: WordSoupDto;
    }) => {
      if (!active) return;
      setState((s) => ({
        ...s,
        leftPlayers: payload.leftPlayers ?? {
          ...s.leftPlayers,
          [payload.playerId]: payload.playerName,
        },
        playerStreaks: payload.playerStreaks ?? payload.state?.playerStreaks ?? s.playerStreaks,
        serverState: payload.state ?? s.serverState,
        playerLeftNotice: {
          playerId: payload.playerId,
          playerName: payload.playerName,
        },
      }));
    });

    // Backend broadcasts this when the game is marked finished.
    socket.on('game:finished', (payload?: { outcome?: GameFinishOutcomeDto | null }) => {
      if (!active) return;
      setState((s) => ({
        ...s,
        gameFinished: true,
        finishOutcome: payload?.outcome ?? s.finishOutcome,
      }));
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

  const emitSubmitGuess = useCallback((selection: Array<{ row: number; col: number }>) => {
    socketRef.current?.emit('guess:submit', { gameId, playerId, selection });
  }, [gameId, playerId]);

  return {
    ...state,
    emitPlaceLetter,
    emitCellLock,
    emitCellUnlock,
    emitSubmitGuess,
  };
}
