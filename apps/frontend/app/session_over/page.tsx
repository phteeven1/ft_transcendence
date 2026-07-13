'use client';

/*
this is where a player is redirected, when leaving a game, or when the game ends,
if session has run out. It is a dead end that requires new log in by parent
*/

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../context/auth-context';
import { PageShell } from '../components/ui/page-shell';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function SessionOver() {
  const t = useTranslations('session.over');
  const tCommon = useTranslations('common');
  const { player, logoutPlayer } = useAuth();
  const router = useRouter();

  // Sign out the player as soon as we land here
  useEffect(() => {
    logoutPlayer();
  }, [logoutPlayer]);

  return (
    <PageShell narrow centered>
      <Card className="w-full text-center space-y-4">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">
          {player ? t('messageWithName', { name: player.name }) : t('messageGeneric')}
        </p>
        <p className="text-muted-foreground text-xs opacity-75">
          {t('askParent')}
        </p>
        {/* Space for game statistics in a future update */}
        <Button
          variant="accent"
          fullWidth
          onClick={() => router.push('/register')}
        >
          {tCommon('ok')}
        </Button>
      </Card>
    </PageShell>
  );
}
