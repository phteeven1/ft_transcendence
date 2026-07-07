'use client';
import FlagMenu from './flag-menu';
import AuthButton from './auth-button';
import { useAuth } from '../context/auth-context';
import { groupsApi } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function TopBar() {
  const { user, group, player, sessionExpiresAt } = useAuth();
  const [playerGroupName, setPlayerGroupName] = useState<string | null>(null);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!player) {
      setPlayerGroupName(null);
      return;
    }
    const fetchGroupName = async () => {
      try {
        const data = await groupsApi.getById(player.inGroup);
        setPlayerGroupName(data.name);
      } catch (error) {
        console.error('TopBar: failed to fetch player group name:', error);
      }
    };
    fetchGroupName();
  }, [player]);

  useEffect(() => {
    if (!sessionExpiresAt) {
      setMinutesLeft(null);
      return;
    }
    const update = () => {
      const mins = Math.ceil((sessionExpiresAt - Date.now()) / 60000);
      setMinutesLeft(Math.max(0, mins));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt]);

  return (
    <header className="clay-topbar flex items-center justify-between px-4 md:px-6 py-3">
      <div className="flex items-center gap-4 min-w-0">
        <span className="font-heading font-bold text-xl text-primary shrink-0">Dicteé</span>
        {player ? (
          <span className="text-sm text-muted-foreground truncate">
            Playing as <strong className="text-foreground">{player.name}</strong>
            {playerGroupName && (
              <span>
                {' '}
                in group <strong className="text-foreground">{playerGroupName}</strong>
              </span>
            )}
            {minutesLeft !== null && (
              <span className="ml-2 text-xs opacity-75">{minutesLeft} min left</span>
            )}
          </span>
        ) : user ? (
          <span className="text-sm text-muted-foreground truncate">
            Signed in as <strong className="text-foreground">{user.name}</strong>
            {group && (
              <span>
                {' '}
                in group <strong className="text-foreground">{group.name}</strong>
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
