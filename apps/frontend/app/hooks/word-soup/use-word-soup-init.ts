'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { gamesApi, playersApi, wordSoupApi } from '@/lib/api';
import type { WordSoup } from '@/lib/api/games/word-soup/types';
import type { Game, Player } from '@/app/types';
import { COURT_COLS, COURT_ROWS } from '@/app/word_soup_scaffold/_components/court-size';

function createEmptyCourt(): WordSoup.CourtCell[][] {
  return Array.from({ length: COURT_ROWS }, () =>
    Array.from({ length: COURT_COLS }, () => ({
      char: '',
      highlightedByPlayerId: undefined,
    })),
  );
}

async function loadPlayersByIds(playerIds: number[]): Promise<Player[]> {
  const results = await Promise.all(
    playerIds.map((id) => playersApi.getById(id).catch(() => null)),
  );
  return results.filter((player): player is Player => player !== null);
}

export function useWordSoupInit(gameId: number, playerId: number) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [courtReady, setCourtReady] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [visibleCourt, setVisibleCourt] = useState<WordSoup.CourtCell[][]>(createEmptyCourt);
  const [playerColours, setPlayerColours] = useState<Record<number, string>>({});
  const [playerScores, setPlayerScores] = useState<Record<number, number>>({});
  const [playerWordCounts, setPlayerWordCounts] = useState<Record<number, number>>({});
  const [playerStreaks, setPlayerStreaks] = useState<Record<number, number>>({});
  const [leftPlayers, setLeftPlayers] = useState<Record<number, string>>({});
  const [solutionWords, setSolutionWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<WordSoup.FoundWord[]>([]);
  const [hasPlayerSeenIntro, setHasPlayerSeenIntro] = useState(false);
  const [introStartedAt, setIntroStartedAt] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [initialFrozenPlayers, setInitialFrozenPlayers] = useState<Record<number, number>>({});

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

      const loadedPlayers = await loadPlayersByIds(loadedGame.players);

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
    setCourtReady(false);

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
        setIsComplete(result.isComplete ?? false);
        setInitialFrozenPlayers(result.frozenPlayers ?? {});
        setCourtReady(true);
      } catch (error) {
        console.error('useWordSoupInit: failed to init court', error);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [game, gameId, playerId]);

  return {
    loading,
    courtReady,
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
    isComplete,
    initialFrozenPlayers,
  };
}
