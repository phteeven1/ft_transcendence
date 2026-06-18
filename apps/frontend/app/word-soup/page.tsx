import { Suspense } from 'react';
import WordSoupPlaceholderClient from './_components/game-placeholder-client';

function WordSoupLoading() {
  return (
    <div className="min-h-screen bg-emerald-200 flex items-center justify-center">
      <p className="text-gray-600">Loading game...</p>
    </div>
  );
}

export default function WordSoupPage() {
  return (
    <Suspense fallback={<WordSoupLoading />}>
      <WordSoupPlaceholderClient />
    </Suspense>
  );
}
