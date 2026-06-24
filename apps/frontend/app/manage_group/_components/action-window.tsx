'use client';
/*
  Action window displayed at the bottom of manage_group.
  Contains tabs for switching between different panels.
  Currently: Member Profile and Group Chat.
  Tabs are designed to accommodate additional panels in the future.
  The selected member is passed down to MemberProfile.
*/
import { useState } from 'react';
import { Member } from '../../types';
import MemberProfile from './member-profile';
import GroupChat from './group-chat';
import GameSessionOverview from './game-session-overview';

type Tab = 'profile' | 'chat' | 'games';

type Props = {
  selectedMember: Member | null;
  groupId: number;
  members: Member[];
};

export default function ActionWindow({ selectedMember, groupId, members }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Member Profile' },
    { id: 'chat', label: 'Group Chat' },
    { id: 'games', label: 'Game Session' },
  ];

  return (
    <div className="border border-emerald-400 rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-emerald-400">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600'
                : 'bg-emerald-100 text-gray-500 hover:bg-emerald-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-3 bg-white">
        {activeTab === 'profile' && (
          selectedMember
            ? <MemberProfile member={selectedMember} />
            : <p className="text-sm text-gray-400 italic">Select a member to view their profile.</p>
        )}
        {activeTab === 'chat' && (
          <GroupChat groupId={groupId} members={members} />
        )}
        {activeTab === 'games' && <GameSessionOverview />}
      </div>
    </div>
  );
}