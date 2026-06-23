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

  // Update minutes remaining once per minute
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
    <header className="flex items-center justify-between px-6 py-3 bg-emerald-200 border-b border-emerald-300">
      <div className="flex items-center gap-4">
        <span className="font-bold text-lg">Dictee</span>
        {player ? (
          <span className="text-sm text-gray-600">
            Playing as <strong>{player.name}</strong>
            {playerGroupName && (
              <span> in group <strong>{playerGroupName}</strong></span>
            )}
            {minutesLeft !== null && (
              <span className="ml-3 text-xs text-gray-400">
                {minutesLeft} min left
              </span>
            )}
          </span>
        ) : user ? (
          <span className="text-sm text-gray-600">
            Signed in as <strong>{user.name}</strong>
            {group && (
              <span> in group <strong>{group.name}</strong></span>
            )}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        <FlagMenu />
        <AuthButton />
      </div>
    </header>
  );
}
