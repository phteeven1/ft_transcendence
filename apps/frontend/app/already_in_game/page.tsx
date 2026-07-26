'use client';

import { useTranslations } from 'next-intl';

// This page is shown when a player tries to open a second tab while already in a game.
// It is intentionally a dead end — the player cannot navigate anywhere from here.
//
// TODO: replace the polling guard in select_game/page.tsx with a proper session token
// system. When a player enters play_game, the backend should issue a unique token for
// that player+game. A second tab loading play_game invalidates the first tab's token,
// which then kicks itself out via polling. That prevents two active tabs in the same game.

import { PageShell } from '../components/ui/page-shell';
import { Card } from '../components/ui/card';

export default function AlreadyInGame() {
  const t = useTranslations('session.alreadyInGame');

  return (
    <PageShell narrow centered>
      <Card className="w-full text-center">
        <h1 className="font-heading text-xl font-bold mb-3 text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('message')}
        </p>
      </Card>
    </PageShell>
  );
}
