'use client';

/*
this is where a player is redirected, when leaving a game, or when the game ends,
if session has run out. It is a dead end that requires new log in by parent
*/

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { PageShell } from '../components/ui/page-shell';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function SessionOver() {
  const { player, logoutPlayer } = useAuth();
  const router = useRouter();

  // Sign out the player as soon as we land here
  useEffect(() => {
    logoutPlayer();
  }, []);

  return (
    <PageShell narrow centered>
      <Card className="w-full text-center space-y-4">
        <h1 className="font-heading text-2xl font-bold text-foreground">Session over!</h1>
        <p className="text-muted-foreground text-sm">
          {player
            ? `Great playing, ${player.name}! Your session has ended.`
            : 'Your session has ended.'}
        </p>
        <p className="text-muted-foreground text-xs opacity-75">
          Ask a parent to start a new session when you want to play again.
        </p>
        {/* Space for game statistics in a future update */}
        <Button
          variant="accent"
          fullWidth
          onClick={() => router.push('/register')}
        >
          Ok
        </Button>
      </Card>
    </PageShell>
  );
}
