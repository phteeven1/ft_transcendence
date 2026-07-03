import { Suspense } from 'react';
import WordBuildingPlaceholderClient from './_components/word-building-game';

/**
 * Lightweight loading shell shown while the crossword scaffold client initializes.
 *
 * @returns A minimal loading screen that matches the game background.
 */
function WordBuildingLoading() {
  return (
    <div className="min-h-screen bg-emerald-200 flex items-center justify-center">
      <p className="text-gray-600">Loading game...</p>
    </div>
  );
}

/**
 * Suspense wrapper for the word-building scaffold route.
 * This lets the page defer client bootstrapping without showing a blank screen.
 *
 * @returns The playable word-building scaffold page.
 */
export default function WordBuildingPage() {
  return (
    <Suspense fallback={<WordBuildingLoading />}>
      <WordBuildingPlaceholderClient />
    </Suspense>
  );
}
