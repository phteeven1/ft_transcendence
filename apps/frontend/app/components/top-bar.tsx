'use client';
import FlagMenu from './flag-menu';
import AuthButton from './auth-button';
import { useAuth } from '../context/auth-context';
import { groupsApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function TopBar() {
  const t = useTranslations('nav');
  const { user, group, player, sessionExpiresAt } = useAuth();
  const [playerGroupName, setPlayerGroupName] = useState<string | null>(null);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!player) return;
    const fetchGroupName = async () => {
      try {
        const data = await groupsApi.getById(player.inGroup);
        setPlayerGroupName(data.name);
      } catch (error) {
        console.error('TopBar: failed to fetch player group name:', error);
      }
    };
    void fetchGroupName();
  }, [player]);

  useEffect(() => {
    if (!sessionExpiresAt) return;
    const update = () => {
      const mins = Math.ceil((sessionExpiresAt - Date.now()) / 60000);
      setMinutesLeft(Math.max(0, mins));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt]);

  // Derived for display instead of setPlayerGroupName(null) / setMinutesLeft(null) in the
  // effects above — same outcome (no stale group name or timer when player/session ends), but
  // clearing state inside useEffect triggers react-hooks/set-state-in-effect (ESLint).
  const displayedGroupName = player ? playerGroupName : null;
  const displayedMinutesLeft = sessionExpiresAt != null ? minutesLeft : null;

  return (
    <header className="clay-topbar flex items-center justify-between px-4 md:px-6 py-3">
      <div className="flex items-center gap-4 min-w-0">
        <span className="font-heading font-bold text-xl text-primary shrink-0">{t('brand')}</span>
        {player ? (
          <span className="text-sm text-muted-foreground truncate">
            {t('playingAs')} <strong className="text-foreground">{player.name}</strong>
            {displayedGroupName && (
              <span>
                {' '}
                {t('inGroup')} <strong className="text-foreground">{displayedGroupName}</strong>
              </span>
            )}
            {displayedMinutesLeft !== null && (
              <span className="ml-2 text-xs opacity-75">
                {t('minLeft', { minutes: displayedMinutesLeft })}
              </span>
            )}
          </span>
        ) : user ? (
          <span className="text-sm text-muted-foreground truncate">
            {t('signedInAs')} <strong className="text-foreground">{user.name}</strong>
            {group && (
              <span>
                {' '}
                {t('inGroup')} <strong className="text-foreground">{group.name}</strong>
              </span>
            )}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <FlagMenu />
        <AuthButton />
      </div>
    </header>
  );
}
