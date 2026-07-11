import { Suspense } from 'react';
import PlayGameClient from './play-game-client';
import { PageShell } from '../components/ui/page-shell';

function PlayGameLoading() {
  return (
    <PageShell centered narrow>
      <p className="text-muted-foreground">Loading game...</p>
    </PageShell>
  );
}

export default function PlayGamePage() {
  return (
    <Suspense fallback={<PlayGameLoading />}>
      <PlayGameClient />
    </Suspense>
  );
}
