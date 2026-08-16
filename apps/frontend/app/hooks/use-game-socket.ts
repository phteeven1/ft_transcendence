'use client';

/*
  Custom hook for in-game WebSocket communication.
  Connects to the game room and handles shared events plus game-specific payloads
  for word building and word soup.
  Follows the same pattern as useGroupSocket.
*/

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { IGameStatePayload, IPlaceLetterDto, ICellLocksPayload, ILockCellDto } from '@/lib/api/games/word-building.types';
import type { 
  WordSoupWordGuessedDto,
  WordSoupGuessResultDto,
  WordSoupDto,
  WordSoupFreezeNoticeDto,
} from '@/lib/api/games/word-soup/types';
import type { GameFinishOutcomeDto } from '@/lib/api/games/types';
import { stashPendingAvatarUnlock } from '@/lib/avatar-unlock';
import { acquireSocket, releaseSocket } from '@/lib/socket';

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
    if (gameId <= 0 || playerId <= 0) return;

    let active = true;
    const key = `game:${gameId}:${playerId}`;
    const socket = acquireSocket(key);
    socketRef.current = socket;

    const join = () => {
      if (!active) return;
      setState((s) => ({ ...s, isConnected: true }));
      socket.emit('joinGame', { gameId, playerId });
    };

    const onDisconnect = () => {
      if (!active) return;
      setState((s) => ({ ...s, isConnected: false }));
    };

    const onGameState = (payload: IGameStatePayload | { state: WordSoupDto }) => {
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
    };

    const onCellLocks = (payload: ICellLocksPayload) => {
      if (!active) return;
      setState((s) => ({ ...s, cellLocks: payload }));
    };

    const onWordGuessed = (payload: WordSoupWordGuessedDto) => {
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
    };

    const onGuessResult = (payload: WordSoupGuessResultDto) => {
      if (!active) return;
      setState((s) => {
        const frozenPlayers = { ...s.frozenPlayers };
        const playerStreaks = { ...s.playerStreaks };
        if (payload.frozen && payload.frozenUntil) {
          frozenPlayers[playerId] = payload.frozenUntil;
          playerStreaks[playerId] = 0;
        }
        return { ...s, guessResult: payload, frozenPlayers, playerStreaks };
      });
    };

    const onPlayerFrozen = (payload: {
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
          [payload.playerId]: 0,
        },
        freezeNotice: {
          playerId: payload.playerId,
          playerName: payload.playerName,
          message: `${payload.playerName} is frozen for ${payload.durationSeconds}s! 🧊`,
          kind: 'freeze',
        },
      }));
    };

    const onPlayerUnfrozen = (payload: {
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
    };

    const onPlayerLeft = (payload: {
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
    };

    const onGameFinished = (payload?: { outcome?: GameFinishOutcomeDto | null }) => {
      if (!active) return;
      const outcome = payload?.outcome ?? null;
      const unlock = outcome?.players.find(
        (entry) =>
          entry.playerId === playerId &&
          typeof entry.newlyUnlockedTier === 'number',
      )?.newlyUnlockedTier;
      if (typeof unlock === 'number') {
        stashPendingAvatarUnlock(playerId, unlock);
      }
      setState((s) => ({
        ...s,
        gameFinished: true,
        finishOutcome: outcome ?? s.finishOutcome,
      }));
    };

    socket.on('connect', join);
    socket.on('disconnect', onDisconnect);
    socket.on('game:state', onGameState);
    socket.on('cell:locks', onCellLocks);
    socket.on('game:wordGuessed', onWordGuessed);
    socket.on('game:guessResult', onGuessResult);
    socket.on('game:playerFrozen', onPlayerFrozen);
    socket.on('game:playerUnfrozen', onPlayerUnfrozen);
    socket.on('game:playerLeft', onPlayerLeft);
    socket.on('game:finished', onGameFinished);

    if (socket.connected) join();

    return () => {
      active = false;
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
      socket.off('game:state', onGameState);
      socket.off('cell:locks', onCellLocks);
      socket.off('game:wordGuessed', onWordGuessed);
      socket.off('game:guessResult', onGuessResult);
      socket.off('game:playerFrozen', onPlayerFrozen);
      socket.off('game:playerUnfrozen', onPlayerUnfrozen);
      socket.off('game:playerLeft', onPlayerLeft);
      socket.off('game:finished', onGameFinished);
      if (socketRef.current === socket) socketRef.current = null;
      releaseSocket(key);
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
