'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { gamesApi, playersApi, wordSoupApi } from '@/lib/api';
import type { GameRosterPlayerDto } from '@/lib/api/games';
import type { WordSoupCourtCell, WordSoupFoundWord } from '@/lib/api/games/word-soup/types';
import type { Game } from '@/app/types';
import { useAuth } from '@/app/context/auth-context';
import { returnToLobbyOnce } from '@/app/hooks/game/game-leave.helpers';
import { COURT_COLS, COURT_ROWS } from '@/app/word_soup/_lib/word-soup-constants';

function createEmptyCourt(): WordSoupCourtCell[][] {
  return Array.from({ length: COURT_ROWS }, () =>
    Array.from({ length: COURT_COLS }, () => ({
      char: '',
      highlightedByPlayerId: undefined,
    })),
  );
}

function formatInitError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Could not load the Word Soup board.';
}

function isEndedGameError(error: unknown): boolean {
  const message = formatInitError(error).toLowerCase();
  return (
    message.includes('already finished') ||
    message.includes('game not found') ||
    /game \d+ not found/.test(message)
  );
}

export function useWordSoupInit(gameId: number, playerId: number) {
  const router = useRouter();
  const { loginAsPlayer, setSessionExpiresAt } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courtReady, setCourtReady] = useState(false);
  const [courtInitError, setCourtInitError] = useState<string | null>(null);
  const [courtRetryToken, setCourtRetryToken] = useState(0);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<GameRosterPlayerDto[]>([]);
  const [visibleCourt, setVisibleCourt] = useState<WordSoupCourtCell[][]>(createEmptyCourt);
  const [playerColours, setPlayerColours] = useState<Record<number, string>>({});
  const [playerScores, setPlayerScores] = useState<Record<number, number>>({});
  const [playerWordCounts, setPlayerWordCounts] = useState<Record<number, number>>({});
  const [playerStreaks, setPlayerStreaks] = useState<Record<number, number>>({});
  const [leftPlayers, setLeftPlayers] = useState<Record<number, string>>({});
  const [solutionWords, setSolutionWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<WordSoupFoundWord[]>([]);
  const [hasPlayerSeenIntro, setHasPlayerSeenIntro] = useState(false);
  const [introStartedAt, setIntroStartedAt] = useState<number | null>(null);
  const [playStartedAt, setPlayStartedAt] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [initialFrozenPlayers, setInitialFrozenPlayers] = useState<Record<number, number>>({});
  const [activeCourtInitKey, setActiveCourtInitKey] = useState(`${gameId}:${playerId}:0`);

  const courtInitKey = `${gameId}:${playerId}:${courtRetryToken}`;
  if (courtInitKey !== activeCourtInitKey) {
    setActiveCourtInitKey(courtInitKey);
    setCourtReady(false);
    setCourtInitError(null);
  }

  const hasLeftForLobbyRef = useRef(false);

  const leaveFinishedGameForLobby = useCallback(() => {
    returnToLobbyOnce(hasLeftForLobbyRef, {
      router,
      loginAsPlayer,
      setSessionExpiresAt,
      method: 'replace',
    });
  }, [loginAsPlayer, router, setSessionExpiresAt]);

  useEffect(() => {
    if (!gameId || !playerId) {
      router.push('/');
      return;
    }
    if (hasLeftForLobbyRef.current) return;

    let isMounted = true;

    const load = async () => {
      const [loadedGame, player] = await Promise.all([
        gamesApi.getById({ gameId }).catch(() => null),
        playersApi.getById(playerId).catch(() => null),
      ]);

      if (!loadedGame) {
        // Game gone (e.g. cleaned up after finish) — return to lobby if session is live.
        await leaveFinishedGameForLobby();
        return;
      }

      const hasLeftThisGame = player != null && player.currentGameId !== gameId;

      if (loadedGame.isFinished || hasLeftThisGame) {
        await leaveFinishedGameForLobby();
        return;
      }

      const loadedPlayers = await gamesApi
        .getPlayersForGame(gameId)
        .catch(() => [] as GameRosterPlayerDto[]);

      if (!isMounted) return;

      setGame(loadedGame);
      setPlayers(loadedPlayers);
      setLoading(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [gameId, playerId, router, leaveFinishedGameForLobby]);

  useEffect(() => {
    if (!game) return;
    if (hasLeftForLobbyRef.current) return;

    let isMounted = true;

    const init = async () => {
      try {
        const result = await wordSoupApi.initCourt({ gameId });

        if (!isMounted) return;

        setVisibleCourt(result.visibleCourt);
        setPlayerColours(result.playerColours);
        setPlayerScores(result.playerScores);
        setPlayerWordCounts(result.playerWordCounts);
        setPlayerStreaks(result.playerStreaks ?? {});
        setLeftPlayers(result.leftPlayers ?? {});
        setSolutionWords(result.solutionWords);
        setFoundWords(result.foundWords);
        setHasPlayerSeenIntro(result.hasPlayerSeenIntro);
        setIntroStartedAt(result.introStartedAt ?? Date.now());
        setPlayStartedAt(result.playStartedAt ?? null);
        setIsComplete(result.isComplete ?? false);
        setInitialFrozenPlayers(result.frozenPlayers ?? {});
        setCourtInitError(null);
        setCourtReady(true);
      } catch (error) {
        if (!isMounted) return;
        if (isEndedGameError(error) || game.isFinished) {
          await leaveFinishedGameForLobby();
          return;
        }
        setCourtReady(false);
        setCourtInitError(formatInitError(error));
      }
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, [game, gameId, playerId, courtRetryToken, leaveFinishedGameForLobby]);

  const retryInitCourt = useCallback(() => {
    setCourtRetryToken((token) => token + 1);
  }, []);

  return {
    loading,
    courtReady,
    courtInitError,
    retryInitCourt,
    game,
    players,
    visibleCourt,
    setVisibleCourt,
    playerColours,
    playerScores,
    setPlayerScores,
    playerWordCounts,
    setPlayerWordCounts,
    playerStreaks,
    setPlayerStreaks,
    leftPlayers,
    setLeftPlayers,
    solutionWords,
    foundWords,
    setFoundWords,
    hasPlayerSeenIntro,
    introStartedAt,
    playStartedAt,
    isComplete,
    initialFrozenPlayers,
  };
}
