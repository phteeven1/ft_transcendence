'use client';
/*
  Displays the profile of a selected group member inside ActionWindow.
  Two-block layout: user info (left/top) and their players (right/bottom).
  Desktop and landscape mobile (md+): blocks side by side.
  Portrait mobile (below md): blocks stacked vertically.
  Fetches full UserDto on mount via usersApi.getById(member.id).
  Fetches PlayerDto[] via playersApi.findByParentInGroup(member.id, group.id).
  showEmail, showRealName, showRelationshipComment are the member's own privacy settings.
*/

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Member, Player, User } from '../../types';
import { usersApi } from '@/lib/api/users';
import { playersApi } from '@/lib/api/players';
import { useAuth } from '../../context/auth-context';
import { Card } from '../../components/ui';

type Props = {
  member: Member;
};

export default function MemberProfile({ member }: Props) {
  const t = useTranslations('group.profile');
  const tCommon = useTranslations('common');
  const { group } = useAuth();
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadedForMemberId, setLoadedForMemberId] = useState<number | null>(null);

  function formatTimeAgo(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return t('minutesAgo', { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('hoursAgo', { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return t('daysAgo', { count: diffDays });
  }

  function formatExpiresIn(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    if (diffMs <= 0) return t('zeroMins');
    const diffMins = Math.ceil(diffMs / 60000);
    return `${diffMins} min${diffMins !== 1 ? 's' : ''}`;
  }

  useEffect(() => {
    if (!group) return;
    let cancelled = false;

    Promise.all([
      usersApi.getById(member.id),
      playersApi.findByParentInGroup(member.id, group.id),
    ])
      .then(([userData, playerData]) => {
        if (cancelled) return;
        setFullUser(userData);
        setPlayers(playerData);
        setLoadedForMemberId(member.id);
      })
      .catch((err) => {
        console.error('MemberProfile fetch failed:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [member.id, group]);

  const loading = !group || loadedForMemberId !== member.id;

  if (loading) {
    return <p className="text-sm text-muted-foreground italic">{t('loading')}</p>;
  }

  if (!fullUser) {
    return <p className="text-sm text-destructive italic">{t('loadFailed')}</p>;
  }

  const userBlock = (
    <div className="flex flex-col gap-1">
      <p className="font-semibold text-foreground">{fullUser.name}</p>
      <p className="text-xs font-medium text-primary">
        {member.isAdmin ? tCommon('admin') : tCommon('member')}
      </p>
      {fullUser.showEmail && (
        <p className="text-xs text-muted-foreground">{fullUser.email}</p>
      )}
      {fullUser.showRealName && fullUser.realName && (
        <p className="text-xs text-muted-foreground">{fullUser.realName}</p>
      )}
      {fullUser.showRelationshipComment && fullUser.relationshipComment && (
        <p className="text-xs text-muted-foreground italic">{fullUser.relationshipComment}</p>
      )}
    </div>
  );

  const playersBlock = (
    <div className="flex flex-col gap-3">
      {players.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{t('noPlayers')}</p>
      ) : (
        players.map((p) => {
          const isInSession = p.sessionExpiresAt !== null;
          return (
            <div key={p.id} className="flex items-center gap-3">
              {/* Avatar placeholder — same height as three text rows */}
              <div className="w-10 h-[60px] rounded bg-muted flex-shrink-0" />
              <div className="flex flex-col justify-center">
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isInSession ? t('inGameSession') : t('currentlyOffline')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isInSession && p.sessionExpiresAt
                    ? t('expiresIn', { time: formatExpiresIn(p.sessionExpiresAt) })
                    : t('since', { time: formatTimeAgo(p.lastSignout) })}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <Card className="md:w-1/2 !p-4">
        {userBlock}
      </Card>
      <Card className="md:w-1/2 !p-4">
        {playersBlock}
      </Card>
    </div>
  );
}
