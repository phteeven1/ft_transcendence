'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Player } from '@/app/types';
import type { WordSoup } from '@/lib/api/games/word-soup/types';

const WORD_SOUP_TILE_ANIM_MS = 150;
const POINTS_PER_WORD = 10;

type WordGuessed = WordSoup.WordGuessedDto;

export type WordCelebration = {
  playerId: number;
  orderedCells: Array<{ row: number; col: number }>;
  activeIndex: number;
};

export type WordFoundCelebrationResult = {
  playerId: number;
  playerName: string;
  word: string;
  /** True when this find leaves exactly one word remaining. */
  isPenultimate: boolean;
};

type UseWordSoupCelebrationProps = {
  wordGuessedSeq: number;
  wordGuessed: WordGuessed | null;

  players: Player[];

  solutionWords: string[];

  setPlayerScores: (
    scores: Record<number, number>
  ) => void;

  setPlayerWordCounts: (
    counts: Record<number, number>
  ) => void;

  setFoundWords: React.Dispatch<
    React.SetStateAction<WordSoup.FoundWord[]>
  >;

  setVisibleCourt: (
    court: WordSoup.CourtCell[][]
  ) => void;

  onCelebrationStart?: () => void;
  /** Fires as soon as scores update (start of tile celebration). */
  onScoreAwarded?: (result: { playerId: number; points: number }) => void;
  onWordFound?: (result: WordFoundCelebrationResult) => void;
  clearSelection?: () => void;
  setIsSubmittingGuess?: (value: boolean) => void;
};

function orderCellsAlongDirection(
  cells: Array<{ row: number; col: number }>,
  direction?: [number, number],
): Array<{ row: number; col: number }> {
  if (cells.length <= 1) return cells;
  if (!direction) return cells;

  const [dr, dc] = direction;
  return [...cells].sort(
    (a, b) => a.row * dr + a.col * dc - (b.row * dr + b.col * dc),
  );
}

export function useWordSoupCelebration({
  wordGuessedSeq,
  wordGuessed,
  players,
  solutionWords,

  setPlayerScores,
  setPlayerWordCounts,
  setFoundWords,
  setVisibleCourt,
  onCelebrationStart,
  onScoreAwarded,
  onWordFound,
  clearSelection,
  setIsSubmittingGuess,

}: UseWordSoupCelebrationProps) {

  const [wordCelebration, setWordCelebration] =
    useState<WordCelebration | null>(null);

  const celebrationActiveRef =
    useRef(false);

  const celebrationRunRef =
    useRef(0);

  const celebrationTimeoutsRef =
    useRef<number[]>([]);

  const lastProcessedGuessSeqRef =
    useRef(0);

  const pendingCourtRef =
    useRef<WordSoup.CourtCell[][] | null>(null);

  const playersRef =
    useRef(players);

  const solutionWordsRef =
    useRef(solutionWords);

  const onWordFoundRef = useRef(onWordFound);
  const onScoreAwardedRef = useRef(onScoreAwarded);

  playersRef.current = players;
  solutionWordsRef.current = solutionWords;
  onWordFoundRef.current = onWordFound;
  onScoreAwardedRef.current = onScoreAwarded;

  useEffect(() => {
    return () => {
      celebrationRunRef.current += 1;
      celebrationTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      celebrationTimeoutsRef.current = [];
    };
  }, []);

  useLayoutEffect(() => {
    if (!wordGuessedSeq) return;
    if (lastProcessedGuessSeqRef.current === wordGuessedSeq) return;
    if (!wordGuessed) return;

    lastProcessedGuessSeqRef.current = wordGuessedSeq;
    celebrationTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    celebrationTimeoutsRef.current = [];
    celebrationActiveRef.current = true;
    onCelebrationStart?.();
    clearSelection?.();
    setIsSubmittingGuess?.(false);

    const runId = celebrationRunRef.current + 1;
    celebrationRunRef.current = runId;

    pendingCourtRef.current =
      wordGuessed.state?.visibleCourt ?? pendingCourtRef.current;

    if (wordGuessed.playerScores) {
      setPlayerScores(wordGuessed.playerScores);
    }

    if (wordGuessed.state?.playerWordCounts) {
      setPlayerWordCounts(wordGuessed.state.playerWordCounts);
    }

    const playerName =
      wordGuessed.playerName ??
      playersRef.current.find((p) => p.id === wordGuessed.playerId)?.name ??
      `Player #${wordGuessed.playerId}`;

    const orderedCells = orderCellsAlongDirection(
      wordGuessed.cells,
      wordGuessed.direction,
    );

    const points = wordGuessed.pointsEarned ?? POINTS_PER_WORD;

    onScoreAwardedRef.current?.({
      playerId: Number(wordGuessed.playerId),
      points,
    });

    const totalWords =
      wordGuessed.state?.solutionWords.length ?? solutionWordsRef.current.length;

    const solvedCount = wordGuessed.state?.foundWords.length ?? 0;
    const isPenultimate = totalWords > 1 && solvedCount === totalWords - 1;

    const pendingFoundWord: WordSoup.FoundWord = {
      playerId: wordGuessed.playerId,
      word: wordGuessed.word,
      cells: wordGuessed.cells,
      direction: wordGuessed.direction,
    };

    setWordCelebration({
      playerId: wordGuessed.playerId,
      orderedCells,
      activeIndex: 0,
    });

    const schedule = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        if (celebrationRunRef.current !== runId) return;
        callback();
      }, delay);
      celebrationTimeoutsRef.current.push(timeoutId);
    };

    const lastIndex = Math.max(orderedCells.length - 1, 0);

    for (let index = 1; index <= lastIndex; index += 1) {
      schedule(() => {
        setWordCelebration((current) => {
          if (!current) return current;
          return { ...current, activeIndex: index };
        });
      }, index * WORD_SOUP_TILE_ANIM_MS);
    }

    const animationEndMs = lastIndex * WORD_SOUP_TILE_ANIM_MS + 180;

    schedule(() => {
      setFoundWords((previous) => {
        const exists = previous.some(
          (entry) =>
            entry.playerId === pendingFoundWord.playerId &&
            entry.cells.length === pendingFoundWord.cells.length &&
            entry.cells.every(
              (cell: { row: number; col: number }, index: number) =>
                cell.row === pendingFoundWord.cells[index].row &&
                cell.col === pendingFoundWord.cells[index].col,
            ),
        );
        return exists ? previous : [...previous, pendingFoundWord];
      });

      if (pendingCourtRef.current) {
        setVisibleCourt(pendingCourtRef.current);
      }

      onWordFoundRef.current?.({
        playerId: wordGuessed.playerId,
        playerName,
        word: wordGuessed.word,
        isPenultimate,
      });

      setWordCelebration(null);
      celebrationActiveRef.current = false;
      pendingCourtRef.current = null;
    }, animationEndMs);
  }, [wordGuessedSeq]);

  return {
    wordCelebration,
    celebrationActiveRef,
    pendingCourtRef,
  };
}
