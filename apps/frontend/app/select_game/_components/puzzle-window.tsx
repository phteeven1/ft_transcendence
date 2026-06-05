'use client';

/*
Displays a randomly selected puzzle while the player waits for a multiplayer game.
Puzzles are picked at random on mount and on each Skip — not in order, fully random each time.
The window is 2:1 aspect ratio (width:height) matching the button grid width.
Each puzzle mounts fresh — no state carries over between skips.
*/

import { useState, useCallback } from 'react';
import ScramblePuzzle from '../_puzzles/scramble-puzzle';
import MeansWhatPuzzle from '../_puzzles/means-what-puzzle';
import CorrectionPuzzle from '../_puzzles/correction-puzzle';

const PUZZLE_COUNT = 3;

function randomPuzzleIndex(): number {
  return Math.floor(Math.random() * PUZZLE_COUNT);
}

export default function PuzzleWindow() {
  const [puzzleIndex, setPuzzleIndex] = useState<number>(randomPuzzleIndex);
  // key forces a full remount of the puzzle component on each skip,
  // destroying any internal state and guaranteeing a fresh instance
  const [key, setKey] = useState<number>(0);

  const handleSkip = useCallback(() => {
    setKey((k) => k + 1);
    setPuzzleIndex(randomPuzzleIndex());
  }, []);

  const renderPuzzle = () => {
    switch (puzzleIndex) {
      case 0:
        return <ScramblePuzzle key={key} onSkip={handleSkip} />;
      case 1:
        return <MeansWhatPuzzle key={key} onSkip={handleSkip} />;
      case 2:
        return <CorrectionPuzzle key={key} onSkip={handleSkip} />;
      default:
        return <ScramblePuzzle key={key} onSkip={handleSkip} />;
    }
  };

  return (
    // aspect-[2/1] gives height = half of width, matching the 2:1 spec
    <div className="w-full aspect-[2/1] border-2 border-emerald-400 rounded-xl bg-white overflow-hidden">
      {renderPuzzle()}
    </div>
  );
}