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
import { Member, Player, User } from '../../types';
import { usersApi } from '@/lib/api/users';
import { playersApi } from '@/lib/api/players';
import { useAuth } from '../../context/auth-context';

type Props = {
  member: Member;
};

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

function formatExpiresIn(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return '0 mins';
  const diffMins = Math.ceil(diffMs / 60000);
  return `${diffMins} min${diffMins !== 1 ? 's' : ''}`;
}

export default function MemberProfile({ member }: Props) {
  const { group } = useAuth();
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!group) return;
    setLoading(true);
    setFullUser(null);
    setPlayers([]);

    Promise.all([
      usersApi.getById(member.id),
      playersApi.findByParentInGroup(member.id, group.id),
    ])
      .then(([userData, playerData]) => {
        setFullUser(userData);
        setPlayers(playerData);
      })
      .catch((err) => {
        console.error('MemberProfile fetch failed:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [member.id, group?.id]);

  if (loading) {
    return <p className="text-sm text-gray-400 italic">Loading profile...</p>;
  }

  if (!fullUser) {
    return <p className="text-sm text-red-400 italic">Could not load profile.</p>;
  }

  const userBlock = (
    <div className="flex flex-col gap-1">
      <p className="font-semibold text-gray-800">{fullUser.name}</p>
      <p className="text-xs font-medium text-emerald-600">
        {member.isAdmin ? 'Admin' : 'Member'}
      </p>
      {fullUser.showEmail && (
        <p className="text-xs text-gray-500">{fullUser.email}</p>
      )}
      {fullUser.showRealName && fullUser.realName && (
        <p className="text-xs text-gray-500">{fullUser.realName}</p>
      )}
      {fullUser.showRelationshipComment && fullUser.relationshipComment && (
        <p className="text-xs text-gray-400 italic">{fullUser.relationshipComment}</p>
      )}
    </div>
  );

  const playersBlock = (
    <div className="flex flex-col gap-3">
      {players.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No players in this group.</p>
      ) : (
        players.map((p) => {
          const isInSession = p.sessionExpiresAt !== null;
          return (
            <div key={p.id} className="flex items-center gap-3">
              {/* Avatar placeholder — same height as three text rows */}
              <div className="w-10 h-[60px] rounded bg-emerald-100 flex-shrink-0" />
              <div className="flex flex-col justify-center">
                <p className="text-sm font-medium text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {isInSession ? 'In Game Session' : 'Currently Offline'}
                </p>
                <p className="text-xs text-gray-400">
                  {isInSession && p.sessionExpiresAt
                    ? `expires in ${formatExpiresIn(p.sessionExpiresAt)}`
                    : `since ${formatTimeAgo(p.lastSignout)}`}
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
      <div className="md:w-1/2 border border-emerald-200 rounded-lg px-4 py-3">
        {userBlock}
      </div>
      <div className="md:w-1/2 border border-emerald-200 rounded-lg px-4 py-3">
        {playersBlock}
      </div>
    </div>
  );
}