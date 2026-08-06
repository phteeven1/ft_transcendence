'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { gamesApi, wordSoupApi } from '@/lib/api';
import type { GameRosterPlayerDto } from '@/lib/api/games';
import type { WordSoupCourtCell, WordSoupFoundWord } from '@/lib/api/games/word-soup/types';
import type { Game } from '@/app/types';
import { COURT_COLS, COURT_ROWS } from '@/app/word_soup_scaffold/_lib/word-soup-constants';

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

export function useWordSoupInit(gameId: number, playerId: number) {
  const router = useRouter();

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

  useEffect(() => {
    if (!gameId || !playerId) {
      router.push('/');
      return;
    }

    let isMounted = true;

    const load = async () => {
      const loadedGame = await gamesApi.getById({ gameId }).catch(() => null);
      if (!loadedGame) {
        router.push('/');
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

    load();

    return () => {
      isMounted = false;
    };
  }, [gameId, playerId, router]);

  useEffect(() => {
    if (!game) return;

    let isMounted = true;

    const init = async () => {
      try {
        const result = await wordSoupApi.initCourt({ gameId, playerId });

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
        setCourtReady(false);
        setCourtInitError(formatInitError(error));
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [game, gameId, playerId, courtRetryToken]);

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
