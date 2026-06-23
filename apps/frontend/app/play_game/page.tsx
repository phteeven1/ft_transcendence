import { Suspense } from 'react';
import PlayGameClient from './play-game-client';

function PlayGameLoading() {
  return (
    <div className="min-h-screen bg-emerald-200 flex items-center justify-center">
      <p className="text-gray-600">Loading game...</p>
    </div>
  );
}

export default function PlayGamePage() {
  return (
    <Suspense fallback={<PlayGameLoading />}>
      <PlayGameClient />
    </Suspense>
  );
}
