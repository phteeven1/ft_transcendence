import { Suspense } from 'react';
import WordBuildingPlaceholderClient from './_components/word-building-game';

function WordBuildingLoading() {
  return (
    <div className="min-h-screen bg-emerald-200 flex items-center justify-center">
      <p className="text-gray-600">Loading game...</p>
    </div>
  );
}

export default function WordBuildingPage() {
  return (
    <Suspense fallback={<WordBuildingLoading />}>
      <WordBuildingPlaceholderClient />
    </Suspense>
  );
}
