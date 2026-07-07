import { Suspense } from 'react';
import WordSoupPlaceholderClient from './_components/word-soup-game';

function WordSoupLoading() {
  return (
    <div className="game-shell min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <p className="text-muted-foreground">Loading game...</p>
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
