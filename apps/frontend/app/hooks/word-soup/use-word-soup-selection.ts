'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface ISelectionCell {
  row: number;
  col: number;
}

interface IGuessResult {
  success: boolean;
  message: string;
  messageKey?: 'wrongPosition' | 'alreadyFoundElsewhere';
}

interface IUseWordSoupSelectionArgs {
  gameReady: boolean;
  isGameOver: boolean;
  hasLeftGame: boolean;
  isLocalPlayerFrozen: boolean;
  isCelebrating: boolean;
  guessResult: IGuessResult | null;
  emitSubmitGuess: (cells: ISelectionCell[]) => void;
  resolveGuessMessage?: (result: IGuessResult) => string;
  onGuessSubmitted?: () => void;
  onGuessFailed?: () => void;
  onGuessSucceeded?: () => void;
}

export function useWordSoupSelection({
  gameReady,
  isGameOver,
  hasLeftGame,
  isLocalPlayerFrozen,
  isCelebrating,
  guessResult,
  emitSubmitGuess,
  resolveGuessMessage,
  onGuessSubmitted,
  onGuessFailed,
  onGuessSucceeded,
}: IUseWordSoupSelectionArgs) {
  const [selection, setSelection] = useState<ISelectionCell[]>([]);
  const [selectionMessage, setSelectionMessage] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);

  const isSelectingRef = useRef(false);
  const onGuessFailedRef = useRef(onGuessFailed);
  const onGuessSucceededRef = useRef(onGuessSucceeded);
  const resolveGuessMessageRef = useRef(resolveGuessMessage);
  const lastProcessedGuessResultRef = useRef<IGuessResult | null>(null);

  useLayoutEffect(() => {
    onGuessFailedRef.current = onGuessFailed;
    onGuessSucceededRef.current = onGuessSucceeded;
    resolveGuessMessageRef.current = resolveGuessMessage;
  });

  useEffect(() => {
    if (!guessResult) {
      lastProcessedGuessResultRef.current = null;
      return;
    }
    if (lastProcessedGuessResultRef.current === guessResult) return;
    lastProcessedGuessResultRef.current = guessResult;

    const timeoutId = window.setTimeout(() => {
      setSelectionMessage(
        resolveGuessMessageRef.current?.(guessResult) ?? guessResult.message,
      );
      setIsSubmittingGuess(false);
      if (!guessResult.success) {
        setSelection([]);
        onGuessFailedRef.current?.();
      } else {
        onGuessSucceededRef.current?.();
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [guessResult]);

  const handleSelectionStart = useCallback(
    (row: number, col: number) => {
      if (
        !gameReady ||
        isGameOver ||
        hasLeftGame ||
        isLocalPlayerFrozen ||
        isCelebrating
      ) {
        return;
      }

      isSelectingRef.current = true;
      setIsSelecting(true);
      setSelection([{ row, col }]);
      setSelectionMessage('');
    },
    [gameReady, isGameOver, hasLeftGame, isLocalPlayerFrozen, isCelebrating],
  );

  const handleSelectionContinue = useCallback(
    (row: number, col: number) => {
      if (
        !gameReady ||
        !isSelectingRef.current ||
        isGameOver ||
        hasLeftGame ||
        isLocalPlayerFrozen ||
        isCelebrating
      ) {
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
    [gameReady, isGameOver, hasLeftGame, isLocalPlayerFrozen, isCelebrating],
  );

  const handleSelectionEnd = useCallback(() => {
    isSelectingRef.current = false;
    setIsSelecting(false);
  }, []);

  const handleSubmitGuess = useCallback(() => {
    if (
      !gameReady ||
      isGameOver ||
      hasLeftGame ||
      isLocalPlayerFrozen ||
      isCelebrating ||
      isSubmittingGuess
    ) {
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
    hasLeftGame,
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
    isSelecting,
    isSubmittingGuess,
    handleSelectionStart,
    handleSelectionContinue,
    handleSelectionEnd,
    handleSubmitGuess,
    clearSelection,
    setIsSubmittingGuess,
  };
}
