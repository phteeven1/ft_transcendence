'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SelectionCell = { row: number; col: number };

type GuessResult = {
  success: boolean;
  message: string;
};

type UseWordSoupSelectionArgs = {
  gameReady: boolean;
  isGameOver: boolean;
  isLocalPlayerFrozen: boolean;
  isCelebrating: boolean;
  guessResult: GuessResult | null;
  emitSubmitGuess: (cells: SelectionCell[]) => void;
  onGuessSubmitted?: () => void;
  onGuessFailed?: () => void;
};

export function useWordSoupSelection({
  gameReady,
  isGameOver,
  isLocalPlayerFrozen,
  isCelebrating,
  guessResult,
  emitSubmitGuess,
  onGuessSubmitted,
  onGuessFailed,
}: UseWordSoupSelectionArgs) {
  const [selection, setSelection] = useState<SelectionCell[]>([]);
  const [selectionMessage, setSelectionMessage] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);

  const onGuessFailedRef = useRef(onGuessFailed);
  onGuessFailedRef.current = onGuessFailed;

  const lastProcessedGuessResultRef = useRef<GuessResult | null>(null);

  useEffect(() => {
    if (!guessResult) {
      lastProcessedGuessResultRef.current = null;
      return;
    }

    if (lastProcessedGuessResultRef.current === guessResult) {
      return;
    }

    lastProcessedGuessResultRef.current = guessResult;

    setSelectionMessage(guessResult.message);
    setIsSubmittingGuess(false);

    if (!guessResult.success) {
      setSelection([]);
      onGuessFailedRef.current?.();
    }
  }, [guessResult]);

  const handleSelectionStart = useCallback(
    (row: number, col: number) => {
      if (!gameReady || isGameOver || isLocalPlayerFrozen || isCelebrating) return;

      setIsSelecting(true);
      setSelection([{ row, col }]);
      setSelectionMessage('');
    },
    [gameReady, isGameOver, isLocalPlayerFrozen, isCelebrating],
  );

  const handleSelectionContinue = useCallback(
    (row: number, col: number) => {
      if (!gameReady || !isSelecting || isGameOver || isLocalPlayerFrozen || isCelebrating) {
        return;
      }

      setSelection((previous) => {
        if (previous.some((cell) => cell.row === row && cell.col === col)) {
          return previous;
        }

        if (previous.length === 0) {
          return [{ row, col }];
        }

        const current = previous[previous.length - 1];
        const deltaRow = row - current.row;
        const deltaCol = col - current.col;

        if (Math.abs(deltaRow) > 1 || Math.abs(deltaCol) > 1) {
          return previous;
        }

        if (previous.length === 1) {
          return [...previous, { row, col }];
        }

        const previousStep = {
          row: current.row - previous[previous.length - 2].row,
          col: current.col - previous[previous.length - 2].col,
        };

        if (deltaRow === previousStep.row && deltaCol === previousStep.col) {
          return [...previous, { row, col }];
        }

        return previous;
      });
    },
    [gameReady, isSelecting, isGameOver, isLocalPlayerFrozen, isCelebrating],
  );

  const handleSelectionEnd = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const handleSubmitGuess = useCallback(() => {
    if (!gameReady || isGameOver || isLocalPlayerFrozen || isCelebrating || isSubmittingGuess) {
      return;
    }

    if (selection.length < 2) {
      setSelectionMessage('Select at least two connected letters to submit a guess.');
      return;
    }

    setIsSubmittingGuess(true);
    onGuessSubmitted?.();
    emitSubmitGuess(selection);
  }, [
    gameReady,
    isGameOver,
    isLocalPlayerFrozen,
    isCelebrating,
    isSubmittingGuess,
    selection,
    emitSubmitGuess,
    onGuessSubmitted,
  ]);

  const clearSelection = useCallback(() => {
    setSelection([]);
    setSelectionMessage('');
  }, []);

  return {
    selection,
    selectionMessage,
    isSubmittingGuess,
    handleSelectionStart,
    handleSelectionContinue,
    handleSelectionEnd,
    handleSubmitGuess,
    clearSelection,
    setIsSubmittingGuess,
  };
}
